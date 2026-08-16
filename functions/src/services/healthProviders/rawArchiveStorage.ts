// This source file is part of the MyHeart Counts project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

import { createHash, randomUUID } from "crypto";
import { type Bucket } from "@google-cloud/storage";
import { compress } from "@mongodb-js/zstd";
import { logger } from "firebase-functions/v2";
import { type ProviderRawArchive } from "./healthProviderAdapter.js";
import { type HealthProviderId } from "../../models/index.js";
import { type DatabaseService } from "../database/databaseService.js";

export const rawArchiveStoragePath = (
  userId: string,
  provider: HealthProviderId,
  dataType: string,
  fileId: string,
): string =>
  `users/${userId}/${provider}HealthSamples/${provider}_${dataType}_${fileId}.json.zstd`;

/**
 * Compress and upload each raw payload to Cloud Storage, then write one
 * Firestore pointer document per blob (no per-sample Firestore writes). A
 * failure on one archive is logged and skipped rather than dropping the rest.
 */
export const archiveRawPayloads = async (params: {
  bucket: Bucket;
  databaseService: DatabaseService;
  userId: string;
  provider: HealthProviderId;
  archives: ProviderRawArchive[];
  since: Date;
  until: Date;
}): Promise<void> => {
  const { bucket, databaseService, userId, provider, archives, since, until } =
    params;

  for (const archive of archives) {
    try {
      const compressed = await compress(
        Buffer.from(JSON.stringify(archive.payload), "utf8"),
      );
      const fileId = randomUUID();
      const storagePath = rawArchiveStoragePath(
        userId,
        provider,
        archive.dataType,
        fileId,
      );
      await bucket
        .file(storagePath)
        .save(compressed, { contentType: "application/zstd" });

      await databaseService.setDocument(
        (collections) =>
          collections.healthProviderRawArchives(userId).doc(fileId),
        {
          provider,
          dataType: archive.dataType,
          storagePath,
          byteSize: compressed.length,
          sha256: createHash("sha256").update(compressed).digest("hex"),
          since,
          until,
          createdAt: new Date(),
        },
      );
    } catch (error) {
      logger.error(
        `archiveRawPayloads: failed to archive ${provider}/${archive.dataType} for ${userId}: ${String(error)}`,
      );
    }
  }
};
