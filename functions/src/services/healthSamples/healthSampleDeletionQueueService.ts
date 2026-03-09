// This source file is part of the MyHeart Counts project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

import { FHIRObservationStatus } from "@stanfordbdhg/myheartcounts-models";
import admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import type { PendingHealthSampleDeletion } from "./pendingHealthSampleDeletion.js";
import { CollectionsService } from "../database/collections.js";

const MAX_QUEUE_RETRIES = 10;
const QUEUE_BATCH_SIZE = 500;
const QUEUE_CONCURRENCY_LIMIT = 10;
const MAX_BACKOFF_MS = 3_600_000;

const NOT_FOUND_BASE_DELAY_MS = 30_000;
const TRANSIENT_ERROR_BASE_DELAY_MS = 60_000;

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

    const item: PendingHealthSampleDeletion = {
      userId: params.userId,
      collection: params.collection,
      documentId: params.documentId,
      jobId: params.jobId,
      requestingUserId: params.requestingUserId,
      reason: params.reason,
      lastError: params.lastError,
      retryCount: 0,
      createdAt: now,
      nextRetryAt,
    };

    await this.collections.pendingHealthSampleDeletions.add(item);
  }

  async processQueue(): Promise<{
    processed: number;
    succeeded: number;
    requeued: number;
    deadLettered: number;
  }> {
    const now = Timestamp.now();
    const snapshot = await this.collections.pendingHealthSampleDeletions
      .where("nextRetryAt", "<=", now)
      .orderBy("nextRetryAt", "asc")
      .limit(QUEUE_BATCH_SIZE)
      .get();

    if (snapshot.empty) {
      logger.info("No pending health sample deletions to process");
      return { processed: 0, succeeded: 0, requeued: 0, deadLettered: 0 };
    }

    logger.info(`Processing ${snapshot.size} pending health sample deletions`, {
      count: snapshot.size,
    });

    let succeeded = 0;
    let requeued = 0;
    let deadLettered = 0;

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
        }
      } else {
        logger.error(
          `Unhandled error processing queue item: ${String(result.reason)}`,
        );
      }
    }

    logger.info(
      `Queue processing complete: ${succeeded} succeeded, ${requeued} requeued, ${deadLettered} dead-lettered`,
      { processed: snapshot.size, succeeded, requeued, deadLettered },
    );

    return {
      processed: snapshot.size,
      succeeded,
      requeued,
      deadLettered,
    };
  }

  private async processQueueItem(
    doc: FirebaseFirestore.QueryDocumentSnapshot,
  ): Promise<"succeeded" | "requeued" | "dead-lettered"> {
    const item = doc.data() as PendingHealthSampleDeletion;
    const ref = this.collections.firestore
      .collection("users")
      .doc(item.userId)
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
            userId: item.userId,
            collection: item.collection,
            documentId: item.documentId,
            retryCount: newRetryCount,
            lastError: String(error),
          },
        );

        await this.collections.failedHealthSampleDeletions.add({
          ...item,
          retryCount: newRetryCount,
          lastError: String(error),
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
        lastError: String(error),
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
