// This source file is part of the MyHeart Counts project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

import admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import type { PendingHealthSampleDeletion } from "./pendingHealthSampleDeletion.js";
import { FHIRObservationStatus } from "../../models/index.js";
import { CollectionsService } from "../database/collections.js";

const MAX_QUEUE_RETRIES = 10;
const QUEUE_BATCH_SIZE = 500;
const QUEUE_CONCURRENCY_LIMIT = 10;
const MAX_BACKOFF_MS = 3_600_000;

const NOT_FOUND_BASE_DELAY_MS = 30_000;
const TRANSIENT_ERROR_BASE_DELAY_MS = 60_000;

const PERMITTED_COLLECTION_PATTERN =
  /^(?:HealthObservations|SensorKitObservations)_[A-Za-z][A-Za-z0-9]*$/;

const VALID_REASONS = new Set(["TRANSIENT_ERROR", "NOT_FOUND"]);

const KNOWN_ERROR_CODES: Record<string | number, string> = {
  5: "NOT_FOUND",
  "not-found": "NOT_FOUND",
  4: "DEADLINE_EXCEEDED",
  "deadline-exceeded": "DEADLINE_EXCEEDED",
  8: "RESOURCE_EXHAUSTED",
  "resource-exhausted": "RESOURCE_EXHAUSTED",
  14: "UNAVAILABLE",
  unavailable: "UNAVAILABLE",
};

const sanitizeErrorForStorage = (error: unknown): string => {
  if (error !== null && typeof error === "object") {
    const code = (error as { code?: unknown }).code;
    if (code !== undefined) {
      const mapped: string | undefined =
        KNOWN_ERROR_CODES[code as string | number];
      if (mapped) return mapped;
      if (typeof code === "number") return `GRPC_${code}`;
      if (typeof code === "string") return code;
    }
  }
  return "UNKNOWN_ERROR";
};

export class HealthSampleDeletionQueueService {
  private readonly collections: CollectionsService;

  constructor(firestore?: admin.firestore.Firestore) {
    this.collections = new CollectionsService(firestore ?? admin.firestore());
  }

  async enqueue(params: {
    userId: string;
    collection: string;
    documentId: string;
    jobId: string;
    requestingUserId: string;
    reason: "TRANSIENT_ERROR" | "NOT_FOUND";
    lastError: string | null;
  }): Promise<void> {
    const now = Timestamp.now();
    const baseDelayMs =
      params.reason === "NOT_FOUND" ?
        NOT_FOUND_BASE_DELAY_MS
      : TRANSIENT_ERROR_BASE_DELAY_MS;
    const nextRetryAt = Timestamp.fromMillis(now.toMillis() + baseDelayMs);

    const sanitizedLastError =
      params.lastError !== null ?
        sanitizeErrorForStorage(params.lastError)
      : null;

    const item: PendingHealthSampleDeletion = {
      userId: params.userId,
      collection: params.collection,
      documentId: params.documentId,
      jobId: params.jobId,
      requestingUserId: params.requestingUserId,
      reason: params.reason,
      lastError: sanitizedLastError,
      retryCount: 0,
      createdAt: now,
      nextRetryAt,
    };

    await this.collections
      .pendingHealthSampleDeletions(params.userId)
      .add(item);
  }

  async processQueue(): Promise<{
    processed: number;
    succeeded: number;
    requeued: number;
    deadLettered: number;
    skipped: number;
  }> {
    const now = Timestamp.now();
    const snapshot = await this.collections.allPendingHealthSampleDeletions
      .where("nextRetryAt", "<=", now)
      .orderBy("nextRetryAt", "asc")
      .limit(QUEUE_BATCH_SIZE)
      .get();

    if (snapshot.empty) {
      logger.info("No pending health sample deletions to process");
      return {
        processed: 0,
        succeeded: 0,
        requeued: 0,
        deadLettered: 0,
        skipped: 0,
      };
    }

    logger.info(`Processing ${snapshot.size} pending health sample deletions`, {
      count: snapshot.size,
    });

    let succeeded = 0;
    let requeued = 0;
    let deadLettered = 0;
    let skipped = 0;

    const results = await this.runWithConcurrencyLimit(
      snapshot.docs,
      QUEUE_CONCURRENCY_LIMIT,
      async (doc) => this.processQueueItem(doc),
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        switch (result.value) {
          case "succeeded":
            succeeded++;
            break;
          case "requeued":
            requeued++;
            break;
          case "dead-lettered":
            deadLettered++;
            break;
          case "skipped":
            skipped++;
            break;
        }
      } else {
        logger.error(
          `Unhandled error processing queue item: ${String(result.reason)}`,
        );
      }
    }

    logger.info(
      `Queue processing complete: ${succeeded} succeeded, ${requeued} requeued, ${deadLettered} dead-lettered, ${skipped} skipped`,
      { processed: snapshot.size, succeeded, requeued, deadLettered, skipped },
    );

    return {
      processed: snapshot.size,
      succeeded,
      requeued,
      deadLettered,
      skipped,
    };
  }

  private parseOwnerUserId(
    doc: FirebaseFirestore.QueryDocumentSnapshot,
  ): string | null {
    // Path: users/{userId}/pendingHealthSampleDeletions/{docId}
    const segments = doc.ref.path.split("/");
    if (
      segments.length === 4 &&
      segments[0] === "users" &&
      segments[2] === "pendingHealthSampleDeletions" &&
      segments[1].length > 0
    ) {
      return segments[1];
    }
    return null;
  }

  private validateQueueItem(
    item: PendingHealthSampleDeletion,
    ownerUserId: string,
  ): string | null {
    if (item.userId !== ownerUserId) {
      return `payload userId '${item.userId}' does not match path-derived owner '${ownerUserId}'`;
    }
    if (
      typeof item.collection !== "string" ||
      !PERMITTED_COLLECTION_PATTERN.test(item.collection)
    ) {
      return `collection '${item.collection}' is not a permitted collection name`;
    }
    if (
      typeof item.documentId !== "string" ||
      item.documentId.length === 0 ||
      item.documentId.includes("/")
    ) {
      return `invalid documentId '${item.documentId}'`;
    }
    if (typeof item.retryCount !== "number" || item.retryCount < 0) {
      return `invalid retryCount '${String(item.retryCount)}'`;
    }
    if (typeof item.reason !== "string" || !VALID_REASONS.has(item.reason)) {
      return `invalid reason '${item.reason}'`;
    }
    return null;
  }

  private async processQueueItem(
    doc: FirebaseFirestore.QueryDocumentSnapshot,
  ): Promise<"succeeded" | "requeued" | "dead-lettered" | "skipped"> {
    const ownerUserId = this.parseOwnerUserId(doc);
    if (ownerUserId === null) {
      logger.error(
        `Skipping queue item with unexpected path: '${doc.ref.path}'`,
      );
      await doc.ref.delete();
      return "skipped";
    }

    const item = doc.data() as PendingHealthSampleDeletion;

    const validationError = this.validateQueueItem(item, ownerUserId);
    if (validationError !== null) {
      logger.error(
        `Skipping invalid queue item '${doc.ref.path}': ${validationError}`,
        {
          path: doc.ref.path,
          ownerUserId,
          payloadUserId: item.userId,
          collection: item.collection,
          documentId: item.documentId,
        },
      );
      await doc.ref.delete();
      return "skipped";
    }

    const ref = this.collections.firestore
      .collection("users")
      .doc(ownerUserId)
      .collection(item.collection)
      .doc(item.documentId);

    try {
      await ref.update({ status: FHIRObservationStatus.entered_in_error });
      await doc.ref.delete();
      return "succeeded";
    } catch (error) {
      const newRetryCount = item.retryCount + 1;

      if (newRetryCount >= MAX_QUEUE_RETRIES) {
        logger.error(
          `Moving item to dead-letter after ${MAX_QUEUE_RETRIES} retries: '${item.documentId}' in '${item.collection}' for job '${item.jobId}'`,
          {
            jobId: item.jobId,
            userId: ownerUserId,
            collection: item.collection,
            documentId: item.documentId,
            retryCount: newRetryCount,
            lastError: String(error),
          },
        );

        await this.collections.failedHealthSampleDeletions(ownerUserId).add({
          ...item,
          retryCount: newRetryCount,
          lastError: sanitizeErrorForStorage(error),
          failedAt: Timestamp.now(),
        });
        await doc.ref.delete();
        return "dead-lettered";
      }

      const baseDelayMs =
        item.reason === "NOT_FOUND" ?
          NOT_FOUND_BASE_DELAY_MS
        : TRANSIENT_ERROR_BASE_DELAY_MS;
      const backoffMs = Math.min(
        baseDelayMs * Math.pow(2, newRetryCount),
        MAX_BACKOFF_MS,
      );
      const nextRetryAt = Timestamp.fromMillis(
        Timestamp.now().toMillis() + backoffMs,
      );

      await doc.ref.update({
        retryCount: newRetryCount,
        nextRetryAt,
        lastError: sanitizeErrorForStorage(error),
      });

      return "requeued";
    }
  }

  private async runWithConcurrencyLimit<T, R>(
    items: T[],
    limit: number,
    fn: (item: T) => Promise<R>,
  ): Promise<Array<PromiseSettledResult<R>>> {
    const results = new Array<PromiseSettledResult<R>>(items.length);
    let nextIndex = 0;

    const worker = async (): Promise<void> => {
      while (nextIndex < items.length) {
        const index = nextIndex++;
        try {
          results[index] = {
            status: "fulfilled",
            value: await fn(items[index]),
          };
        } catch (error) {
          results[index] = { status: "rejected", reason: error };
        }
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(limit, items.length) }, worker),
    );

    return results;
  }
}
