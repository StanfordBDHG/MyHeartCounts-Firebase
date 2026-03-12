// This source file is part of the MyHeart Counts project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

import { expect } from "chai";
import { Timestamp } from "firebase-admin/firestore";
import { HealthSampleDeletionQueueService } from "./healthSampleDeletionQueueService.js";
import { FHIRObservationStatus } from "../../models/index.js";
import { describeWithEmulators } from "../../tests/functions/testEnvironment.js";

describeWithEmulators("service: HealthSampleDeletionQueueService", (env) => {
  let queueService: HealthSampleDeletionQueueService;

  beforeEach(() => {
    queueService = new HealthSampleDeletionQueueService(env.firestore);
  });

  describe("enqueue", () => {
    it("should add an item to the pending deletions collection", async () => {
      await queueService.enqueue({
        userId: "user1",
        collection: "heartRateObservations",
        documentId: "doc1",
        jobId: "job1",
        requestingUserId: "user1",
        reason: "NOT_FOUND",
        lastError: "Error: 5 NOT_FOUND",
      });

      const snapshot = await env.firestore
        .collection("users")
        .doc("user1")
        .collection("pendingHealthSampleDeletions")
        .get();
      expect(snapshot.size).to.equal(1);

      const data = snapshot.docs[0].data();
      expect(data.userId).to.equal("user1");
      expect(data.collection).to.equal("heartRateObservations");
      expect(data.documentId).to.equal("doc1");
      expect(data.jobId).to.equal("job1");
      expect(data.reason).to.equal("NOT_FOUND");
      expect(data.retryCount).to.equal(0);
      expect(data.lastError).to.equal("Error: 5 NOT_FOUND");
    });

    it("should set nextRetryAt 30s in the future for NOT_FOUND", async () => {
      const before = Timestamp.now().toMillis();

      await queueService.enqueue({
        userId: "user1",
        collection: "heartRateObservations",
        documentId: "doc1",
        jobId: "job1",
        requestingUserId: "user1",
        reason: "NOT_FOUND",
        lastError: null,
      });

      const snapshot = await env.firestore
        .collection("users")
        .doc("user1")
        .collection("pendingHealthSampleDeletions")
        .get();
      const data = snapshot.docs[0].data();
      const nextRetryMs = (data.nextRetryAt as Timestamp).toMillis();
      expect(nextRetryMs).to.be.greaterThanOrEqual(before + 30_000);
      expect(nextRetryMs).to.be.lessThanOrEqual(before + 32_000);
    });

    it("should set nextRetryAt 60s in the future for TRANSIENT_ERROR", async () => {
      const before = Timestamp.now().toMillis();

      await queueService.enqueue({
        userId: "user1",
        collection: "heartRateObservations",
        documentId: "doc1",
        jobId: "job1",
        requestingUserId: "user1",
        reason: "TRANSIENT_ERROR",
        lastError: "Error: 4 DEADLINE_EXCEEDED",
      });

      const snapshot = await env.firestore
        .collection("users")
        .doc("user1")
        .collection("pendingHealthSampleDeletions")
        .get();
      const data = snapshot.docs[0].data();
      const nextRetryMs = (data.nextRetryAt as Timestamp).toMillis();
      expect(nextRetryMs).to.be.greaterThanOrEqual(before + 60_000);
      expect(nextRetryMs).to.be.lessThanOrEqual(before + 62_000);
    });
  });

  describe("processQueue", () => {
    it("should return zeros when queue is empty", async () => {
      const result = await queueService.processQueue();
      expect(result.processed).to.equal(0);
      expect(result.succeeded).to.equal(0);
      expect(result.requeued).to.equal(0);
      expect(result.deadLettered).to.equal(0);
    });

    it("should successfully process a queued item when the document exists", async () => {
      const userId = await env.createUser({});

      // Create the target document
      await env.firestore
        .collection("users")
        .doc(userId)
        .collection("heartRateObservations")
        .doc("doc1")
        .set({ status: "final", value: 72 });

      // Enqueue with a past nextRetryAt so it's ready to process
      await env.firestore
        .collection("users")
        .doc(userId)
        .collection("pendingHealthSampleDeletions")
        .add({
          userId,
          collection: "heartRateObservations",
          documentId: "doc1",
          jobId: "job1",
          requestingUserId: userId,
          reason: "NOT_FOUND",
          lastError: null,
          retryCount: 0,
          createdAt: Timestamp.now(),
          nextRetryAt: Timestamp.fromMillis(0),
        });

      const result = await queueService.processQueue();
      expect(result.succeeded).to.equal(1);
      expect(result.processed).to.equal(1);

      // Verify the document was updated
      const doc = await env.firestore
        .collection("users")
        .doc(userId)
        .collection("heartRateObservations")
        .doc("doc1")
        .get();
      expect(doc.data()?.status).to.equal(
        FHIRObservationStatus.entered_in_error,
      );

      // Verify the queue item was removed
      const queueSnapshot = await env.firestore
        .collection("users")
        .doc(userId)
        .collection("pendingHealthSampleDeletions")
        .get();
      expect(queueSnapshot.size).to.equal(0);
    });

    it("should requeue a failed item with incremented retryCount", async () => {
      // Enqueue with a non-existent document (will fail on update)
      await env.firestore
        .collection("users")
        .doc("nonexistent-user")
        .collection("pendingHealthSampleDeletions")
        .add({
          userId: "nonexistent-user",
          collection: "heartRateObservations",
          documentId: "nonexistent-doc",
          jobId: "job1",
          requestingUserId: "user1",
          reason: "NOT_FOUND",
          lastError: null,
          retryCount: 0,
          createdAt: Timestamp.now(),
          nextRetryAt: Timestamp.fromMillis(0),
        });

      const result = await queueService.processQueue();
      expect(result.requeued).to.equal(1);

      // Verify retryCount was incremented
      const queueSnapshot = await env.firestore
        .collection("users")
        .doc("nonexistent-user")
        .collection("pendingHealthSampleDeletions")
        .get();
      expect(queueSnapshot.size).to.equal(1);
      expect(queueSnapshot.docs[0].data().retryCount).to.equal(1);
    });

    it("should move item to dead-letter after max retries", async () => {
      await env.firestore
        .collection("users")
        .doc("nonexistent-user")
        .collection("pendingHealthSampleDeletions")
        .add({
          userId: "nonexistent-user",
          collection: "heartRateObservations",
          documentId: "nonexistent-doc",
          jobId: "job1",
          requestingUserId: "user1",
          reason: "TRANSIENT_ERROR",
          lastError: "Error: 4 DEADLINE_EXCEEDED",
          retryCount: 9,
          createdAt: Timestamp.now(),
          nextRetryAt: Timestamp.fromMillis(0),
        });

      const result = await queueService.processQueue();
      expect(result.deadLettered).to.equal(1);

      // Verify item was removed from pending
      const pendingSnapshot = await env.firestore
        .collection("users")
        .doc("nonexistent-user")
        .collection("pendingHealthSampleDeletions")
        .get();
      expect(pendingSnapshot.size).to.equal(0);

      // Verify item was added to dead-letter
      const failedSnapshot = await env.firestore
        .collection("users")
        .doc("nonexistent-user")
        .collection("failedHealthSampleDeletions")
        .get();
      expect(failedSnapshot.size).to.equal(1);

      const failedData = failedSnapshot.docs[0].data();
      expect(failedData.documentId).to.equal("nonexistent-doc");
      expect(failedData.retryCount).to.equal(10);
      expect(failedData.failedAt).to.be.an.instanceOf(Timestamp);
    });

    it("should not process items with future nextRetryAt", async () => {
      await env.firestore
        .collection("users")
        .doc("user1")
        .collection("pendingHealthSampleDeletions")
        .add({
          userId: "user1",
          collection: "heartRateObservations",
          documentId: "doc1",
          jobId: "job1",
          requestingUserId: "user1",
          reason: "NOT_FOUND",
          lastError: null,
          retryCount: 0,
          createdAt: Timestamp.now(),
          nextRetryAt: Timestamp.fromMillis(Date.now() + 3_600_000),
        });

      const result = await queueService.processQueue();
      expect(result.processed).to.equal(0);

      // Item should still be in queue
      const snapshot = await env.firestore
        .collection("users")
        .doc("user1")
        .collection("pendingHealthSampleDeletions")
        .get();
      expect(snapshot.size).to.equal(1);
    });
  });
});
