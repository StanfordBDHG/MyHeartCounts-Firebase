// This source file is part of the MyHeart Counts project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

import type { Timestamp } from "@google-cloud/firestore";
import { expect } from "chai";
import admin from "firebase-admin";
import { DateTime } from "luxon";
import { it, describe } from "mocha";
import { planOnboardingReminders } from "./planOnboardingReminder.js";
import { describeWithEmulators } from "../tests/functions/testEnvironment.js";

/* eslint-disable @typescript-eslint/no-unused-expressions */

describeWithEmulators("function: planOnboardingReminder", (env) => {
  describe("Onboarding reminder creation", () => {
    it("creates reminder for user enrolled 1 day ago with incomplete onboarding", async () => {
      const enrollmentDate = new Date();
      enrollmentDate.setDate(enrollmentDate.getDate() - 1);

      const userId = "test-user-onboarding-incomplete";
      await env.firestore
        .collection("users")
        .doc(userId)
        .set({
          timeZone: "America/New_York",
          dateOfEnrollment: admin.firestore.Timestamp.fromDate(enrollmentDate),
          mostRecentOnboardingStep: "someIntermediateStep",
          preferredNotificationTime: "09:00",
        });

      await planOnboardingReminders();

      const backlogSnapshot = await env.firestore
        .collection("users")
        .doc(userId)
        .collection("notificationBacklog")
        .get();

      expect(backlogSnapshot.size).to.equal(1);

      const reminder = backlogSnapshot.docs[0].data();
      const reminderDocId = backlogSnapshot.docs[0].id;
      expect(reminder.category).to.equal("onboarding-reminder");
      expect(reminder.title).to.equal("Finish Onboarding into MHC!");
      expect(reminder.body).to.equal(
        "Complete your setup to start tracking your heart health with MyHeartCounts.",
      );
      expect(reminder.timestamp).to.be.instanceOf(admin.firestore.Timestamp);
      expect(reminder.isLLMGenerated).to.be.false;
      expect(reminder.id).to.be.a("string");
      expect(reminder.id).to.equal(reminderDocId);
      expect(reminder.id).to.match(
        /^[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}$/,
      );
    });

    it("creates reminder for user with undefined mostRecentOnboardingStep", async () => {
      const enrollmentDate = new Date();
      enrollmentDate.setDate(enrollmentDate.getDate() - 1);

      const userId = "test-user-no-onboarding-step";
      await env.firestore
        .collection("users")
        .doc(userId)
        .set({
          timeZone: "America/New_York",
          dateOfEnrollment: admin.firestore.Timestamp.fromDate(enrollmentDate),
          preferredNotificationTime: "09:00",
        });

      await planOnboardingReminders();

      const backlogSnapshot = await env.firestore
        .collection("users")
        .doc(userId)
        .collection("notificationBacklog")
        .get();

      expect(backlogSnapshot.size).to.equal(1);
      expect(backlogSnapshot.docs[0].data().category).to.equal(
        "onboarding-reminder",
      );
    });

    it("skips users who completed onboarding", async () => {
      const enrollmentDate = new Date();
      enrollmentDate.setDate(enrollmentDate.getDate() - 1);

      const userId = "test-user-onboarding-complete";
      await env.firestore
        .collection("users")
        .doc(userId)
        .set({
          timeZone: "America/New_York",
          dateOfEnrollment: admin.firestore.Timestamp.fromDate(enrollmentDate),
          mostRecentOnboardingStep: "finalStep",
          preferredNotificationTime: "09:00",
        });

      await planOnboardingReminders();

      const backlogSnapshot = await env.firestore
        .collection("users")
        .doc(userId)
        .collection("notificationBacklog")
        .get();

      expect(backlogSnapshot.size).to.equal(0);
    });

    it("skips users enrolled more than 1 day ago", async () => {
      const enrollmentDate = new Date();
      enrollmentDate.setDate(enrollmentDate.getDate() - 3);

      const userId = "test-user-enrolled-too-long";
      await env.firestore
        .collection("users")
        .doc(userId)
        .set({
          timeZone: "America/New_York",
          dateOfEnrollment: admin.firestore.Timestamp.fromDate(enrollmentDate),
          mostRecentOnboardingStep: "someStep",
          preferredNotificationTime: "09:00",
        });

      await planOnboardingReminders();

      const backlogSnapshot = await env.firestore
        .collection("users")
        .doc(userId)
        .collection("notificationBacklog")
        .get();

      expect(backlogSnapshot.size).to.equal(0);
    });

    it("skips users enrolled less than 1 day ago", async () => {
      const userId = "test-user-enrolled-recently";
      await env.firestore
        .collection("users")
        .doc(userId)
        .set({
          timeZone: "America/New_York",
          dateOfEnrollment: admin.firestore.Timestamp.fromDate(new Date()),
          mostRecentOnboardingStep: "someStep",
          preferredNotificationTime: "09:00",
        });

      await planOnboardingReminders();

      const backlogSnapshot = await env.firestore
        .collection("users")
        .doc(userId)
        .collection("notificationBacklog")
        .get();

      expect(backlogSnapshot.size).to.equal(0);
    });

    it("skips disabled users", async () => {
      const enrollmentDate = new Date();
      enrollmentDate.setDate(enrollmentDate.getDate() - 1);

      const userId = "test-user-disabled";
      await env.firestore
        .collection("users")
        .doc(userId)
        .set({
          timeZone: "America/New_York",
          dateOfEnrollment: admin.firestore.Timestamp.fromDate(enrollmentDate),
          mostRecentOnboardingStep: "someStep",
          preferredNotificationTime: "09:00",
          disabled: true,
        });

      await planOnboardingReminders();

      const backlogSnapshot = await env.firestore
        .collection("users")
        .doc(userId)
        .collection("notificationBacklog")
        .get();

      expect(backlogSnapshot.size).to.equal(0);
    });

    it("skips users who have withdrawn from the study", async () => {
      const enrollmentDate = new Date();
      enrollmentDate.setDate(enrollmentDate.getDate() - 1);

      const userId = "test-user-withdrawn";
      await env.firestore
        .collection("users")
        .doc(userId)
        .set({
          timeZone: "America/New_York",
          dateOfEnrollment: admin.firestore.Timestamp.fromDate(enrollmentDate),
          mostRecentOnboardingStep: "someStep",
          preferredNotificationTime: "09:00",
          hasWithdrawnFromStudy: true,
        });

      await planOnboardingReminders();

      const backlogSnapshot = await env.firestore
        .collection("users")
        .doc(userId)
        .collection("notificationBacklog")
        .get();

      expect(backlogSnapshot.size).to.equal(0);
    });

    it("skips users without timeZone", async () => {
      const enrollmentDate = new Date();
      enrollmentDate.setDate(enrollmentDate.getDate() - 1);

      const userId = "test-user-no-timezone";
      await env.firestore
        .collection("users")
        .doc(userId)
        .set({
          dateOfEnrollment: admin.firestore.Timestamp.fromDate(enrollmentDate),
          mostRecentOnboardingStep: "someStep",
        });

      await planOnboardingReminders();

      const backlogSnapshot = await env.firestore
        .collection("users")
        .doc(userId)
        .collection("notificationBacklog")
        .get();

      expect(backlogSnapshot.size).to.equal(0);
    });

    it("skips users without dateOfEnrollment", async () => {
      const userId = "test-user-no-enrollment";
      await env.firestore.collection("users").doc(userId).set({
        timeZone: "America/New_York",
        mostRecentOnboardingStep: "someStep",
      });

      await planOnboardingReminders();

      const backlogSnapshot = await env.firestore
        .collection("users")
        .doc(userId)
        .collection("notificationBacklog")
        .get();

      expect(backlogSnapshot.size).to.equal(0);
    });
  });

  describe("Deduplication", () => {
    it("does not create duplicate if onboarding-reminder already in backlog", async () => {
      const enrollmentDate = new Date();
      enrollmentDate.setDate(enrollmentDate.getDate() - 1);

      const userId = "test-user-dedup-backlog";
      await env.firestore
        .collection("users")
        .doc(userId)
        .set({
          timeZone: "America/New_York",
          dateOfEnrollment: admin.firestore.Timestamp.fromDate(enrollmentDate),
          mostRecentOnboardingStep: "someStep",
          preferredNotificationTime: "09:00",
        });

      // Pre-populate backlog with existing onboarding reminder
      await env.firestore
        .collection("users")
        .doc(userId)
        .collection("notificationBacklog")
        .doc("existing-reminder")
        .set({
          id: "existing-reminder",
          title: "Finish Onboarding into MHC!",
          body: "Complete your setup to start tracking your heart health with MyHeartCounts.",
          timestamp: admin.firestore.Timestamp.now(),
          category: "onboarding-reminder",
          isLLMGenerated: false,
          generatedAt: admin.firestore.Timestamp.now(),
        });

      await planOnboardingReminders();

      const backlogSnapshot = await env.firestore
        .collection("users")
        .doc(userId)
        .collection("notificationBacklog")
        .get();

      expect(backlogSnapshot.size).to.equal(1);
    });

    it("does not create duplicate if onboarding-reminder already in history", async () => {
      const enrollmentDate = new Date();
      enrollmentDate.setDate(enrollmentDate.getDate() - 1);

      const userId = "test-user-dedup-history";
      await env.firestore
        .collection("users")
        .doc(userId)
        .set({
          timeZone: "America/New_York",
          dateOfEnrollment: admin.firestore.Timestamp.fromDate(enrollmentDate),
          mostRecentOnboardingStep: "someStep",
          preferredNotificationTime: "09:00",
        });

      // Pre-populate history with existing onboarding reminder
      await env.firestore
        .collection("users")
        .doc(userId)
        .collection("notificationHistory")
        .doc("sent-reminder")
        .set({
          title: "Finish Onboarding into MHC!",
          body: "Complete your setup to start tracking your heart health with MyHeartCounts.",
          originalTimestamp: admin.firestore.Timestamp.now(),
          processedTimestamp: admin.firestore.Timestamp.now(),
          status: "sent",
          category: "onboarding-reminder",
          isLLMGenerated: false,
        });

      await planOnboardingReminders();

      const backlogSnapshot = await env.firestore
        .collection("users")
        .doc(userId)
        .collection("notificationBacklog")
        .get();

      expect(backlogSnapshot.size).to.equal(0);
    });
  });

  describe("Time zone handling", () => {
    it("schedules reminder at preferred notification time in user timezone", async () => {
      const enrollmentDate = new Date();
      enrollmentDate.setDate(enrollmentDate.getDate() - 1);

      const userId = "test-user-timezone";
      await env.firestore
        .collection("users")
        .doc(userId)
        .set({
          timeZone: "America/New_York",
          dateOfEnrollment: admin.firestore.Timestamp.fromDate(enrollmentDate),
          mostRecentOnboardingStep: "someStep",
          preferredNotificationTime: "14:30",
        });

      await planOnboardingReminders();

      const backlogSnapshot = await env.firestore
        .collection("users")
        .doc(userId)
        .collection("notificationBacklog")
        .get();

      expect(backlogSnapshot.size).to.equal(1);

      const reminder = backlogSnapshot.docs[0].data();
      const timestamp = reminder.timestamp as Timestamp;
      const utcDate = timestamp.toDate();
      const localDateTime = DateTime.fromJSDate(utcDate, {
        zone: "America/New_York",
      });
      expect(localDateTime.hour).to.equal(14);
      expect(localDateTime.minute).to.equal(30);
    });

    it("falls back to 09:00 when preferredNotificationTime is missing", async () => {
      const enrollmentDate = new Date();
      enrollmentDate.setDate(enrollmentDate.getDate() - 1);

      const userId = "test-user-no-notif-time";
      await env.firestore
        .collection("users")
        .doc(userId)
        .set({
          timeZone: "America/New_York",
          dateOfEnrollment: admin.firestore.Timestamp.fromDate(enrollmentDate),
          mostRecentOnboardingStep: "someStep",
        });

      await planOnboardingReminders();

      const backlogSnapshot = await env.firestore
        .collection("users")
        .doc(userId)
        .collection("notificationBacklog")
        .get();

      expect(backlogSnapshot.size).to.equal(1);

      const reminder = backlogSnapshot.docs[0].data();
      const timestamp = reminder.timestamp as Timestamp;
      const utcDate = timestamp.toDate();
      const localDateTime = DateTime.fromJSDate(utcDate, {
        zone: "America/New_York",
      });
      expect(localDateTime.hour).to.equal(9);
      expect(localDateTime.minute).to.equal(0);
    });
  });
});
