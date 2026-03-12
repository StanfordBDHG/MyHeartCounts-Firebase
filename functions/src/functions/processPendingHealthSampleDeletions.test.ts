// This source file is part of the MyHeart Counts project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

import { expect } from "chai";
import { Timestamp } from "firebase-admin/firestore";
import { HealthSampleDeletionQueueService } from "../services/healthSamples/healthSampleDeletionQueueService.js";
import { describeWithEmulators } from "../tests/functions/testEnvironment.js";

describeWithEmulators(
  "function: processPendingHealthSampleDeletions",
  (env) => {
    it("should process pending items from the queue", async () => {
      const userId = await env.createUser({});

      // Create a document that needs to be marked
      await env.firestore
        .collection("users")
        .doc(userId)
        .collection("HealthObservations_HKQuantityTypeIdentifierHeartRate")
        .doc("doc1")
        .set({ status: "final", value: 72 });

      // Add a pending deletion item with past nextRetryAt
      await env.firestore
        .collection("users")
        .doc(userId)
        .collection("pendingHealthSampleDeletions")
        .add({
          userId,
          collection: "HealthObservations_HKQuantityTypeIdentifierHeartRate",
          documentId: "doc1",
          jobId: "job1",
          requestingUserId: userId,
          reason: "NOT_FOUND",
          lastError: null,
          retryCount: 0,
          createdAt: Timestamp.now(),
          nextRetryAt: Timestamp.fromMillis(0),
        });

      // Directly invoke the queue service (same as the scheduled function does)
      const queueService = new HealthSampleDeletionQueueService(env.firestore);
      const result = await queueService.processQueue();

      expect(result.processed).to.equal(1);
      expect(result.succeeded).to.equal(1);

      // Verify queue is empty
      const pendingSnapshot = await env.firestore
        .collection("users")
        .doc(userId)
        .collection("pendingHealthSampleDeletions")
        .get();
      expect(pendingSnapshot.size).to.equal(0);
    });

    it("should handle an empty queue gracefully", async () => {
      const queueService = new HealthSampleDeletionQueueService(env.firestore);
      const result = await queueService.processQueue();

      expect(result.processed).to.equal(0);
      expect(result.succeeded).to.equal(0);
      expect(result.requeued).to.equal(0);
      expect(result.deadLettered).to.equal(0);
    });
  },
);
