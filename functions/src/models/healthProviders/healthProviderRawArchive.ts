// This source file is part of the MyHeart Counts project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

import { z } from "zod";
import { HealthProviderId } from "./healthProviderId.js";
import { dateConverter } from "../helpers/dateConverter.js";
import { Lazy } from "../helpers/lazy.js";
import { SchemaConverter } from "../helpers/schemaConverter.js";

/**
 * Pointer to a zstd-compressed raw provider payload archived in Cloud Storage
 * at `users/{uid}/healthProviderRawArchives/{id}`. The blob lives at
 * `storagePath` in the default bucket; this document is server-only and lets
 * the blob be found and verified without listing Cloud Storage.
 */
export const healthProviderRawArchiveConverter = new Lazy(
  () =>
    new SchemaConverter({
      schema: z.object({
        provider: z.nativeEnum(HealthProviderId),
        dataType: z.string(),
        storagePath: z.string(),
        byteSize: z.number(),
        sha256: z.string(),
        since: dateConverter.schema,
        until: dateConverter.schema,
        createdAt: dateConverter.schema,
      }),
      encode: (object) => ({
        provider: object.provider,
        dataType: object.dataType,
        storagePath: object.storagePath,
        byteSize: object.byteSize,
        sha256: object.sha256,
        since: dateConverter.encode(object.since),
        until: dateConverter.encode(object.until),
        createdAt: dateConverter.encode(object.createdAt),
      }),
    }),
);

export type HealthProviderRawArchiveDocument = z.output<
  typeof healthProviderRawArchiveConverter.value.schema
>;
