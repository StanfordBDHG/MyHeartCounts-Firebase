// This source file is part of the MyHeart Counts project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

import { randomUUID } from "crypto";
import { expect } from "chai";
import admin from "firebase-admin";
import { DateTime } from "luxon";
import { it, describe } from "mocha";
import { createNudgeNotifications } from "./planNudges.js";
import {
  PosttrialNudgeService,
  createPosttrialNudgeNotifications,
} from "./planPosttrialNudges.js";
import { describeWithEmulators } from "../tests/functions/testEnvironment.js";

const daysAgo = (days: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
};

const baseEligibleUser = (overrides: Record<string, unknown> = {}) => ({
  timeZone: "America/New_York",
  dateOfEnrollment: admin.firestore.Timestamp.fromDate(daysAgo(22)),
  lastActiveDate: admin.firestore.Timestamp.fromDate(daysAgo(1)),
  participantGroup: 1,
  userLanguage: "en",
  preferredNotificationTime: "09:00",
  didOptInToTrial: true,
  mostRecentOnboardingStep: "finalStep",
  extendedActivityNudgesOptIn: true,
  ...overrides,
});

describeWithEmulators("function: planPosttrialNudges", (env) => {
  describe("Eligibility — skip paths", () => {
    it("skips users with extendedActivityNudgesOptIn=false", async () => {
      const userId = "posttrial-skip-opt-out";
      await env.firestore
        .collection("users")
        .doc(userId)
        .set(baseEligibleUser({ extendedActivityNudgesOptIn: false }));

      await createPosttrialNudgeNotifications();

      const backlog = await env.firestore
        .collection("users")
        .doc(userId)
        .collection("notificationBacklog")
        .get();
      expect(backlog.size).to.equal(0);
    });

    it("skips users whose trial is not yet complete (< 21 days since enrollment)", async () => {
      const userId = "posttrial-skip-too-early";
      await env.firestore
        .collection("users")
        .doc(userId)
        .set(
          baseEligibleUser({
            dateOfEnrollment: admin.firestore.Timestamp.fromDate(daysAgo(20)),
          }),
        );

      await createPosttrialNudgeNotifications();

      const backlog = await env.firestore
        .collection("users")
        .doc(userId)
        .collection("notificationBacklog")
        .get();
      expect(backlog.size).to.equal(0);
    });

    it("skips users whose lastActiveDate is older than 14 days", async () => {
      const userId = "posttrial-skip-inactive";
      await env.firestore
        .collection("users")
        .doc(userId)
        .set(
          baseEligibleUser({
            lastActiveDate: admin.firestore.Timestamp.fromDate(daysAgo(20)),
          }),
        );

      await createPosttrialNudgeNotifications();

      const backlog = await env.firestore
        .collection("users")
        .doc(userId)
        .collection("notificationBacklog")
        .get();
      expect(backlog.size).to.equal(0);
    });

    it("skips users with didOptInToTrial=false", async () => {
      const userId = "posttrial-skip-no-trial-optin";
      await env.firestore
        .collection("users")
        .doc(userId)
        .set(baseEligibleUser({ didOptInToTrial: false }));

      await createPosttrialNudgeNotifications();

      const backlog = await env.firestore
        .collection("users")
        .doc(userId)
        .collection("notificationBacklog")
        .get();
      expect(backlog.size).to.equal(0);
    });

    it("skips users whose onboarding is not complete", async () => {
      const userId = "posttrial-skip-onboarding";
      await env.firestore
        .collection("users")
        .doc(userId)
        .set(baseEligibleUser({ mostRecentOnboardingStep: "demographics" }));

      await createPosttrialNudgeNotifications();

      const backlog = await env.firestore
        .collection("users")
        .doc(userId)
        .collection("notificationBacklog")
        .get();
      expect(backlog.size).to.equal(0);
    });

    it("skips disabled users", async () => {
      const userId = "posttrial-skip-disabled";
      await env.firestore
        .collection("users")
        .doc(userId)
        .set(baseEligibleUser({ disabled: true }));

      await createPosttrialNudgeNotifications();

      const backlog = await env.firestore
        .collection("users")
        .doc(userId)
        .collection("notificationBacklog")
        .get();
      expect(backlog.size).to.equal(0);
    });

    it("skips users who have withdrawn from the study", async () => {
      const userId = "posttrial-skip-withdrawn";
      await env.firestore
        .collection("users")
        .doc(userId)
        .set(baseEligibleUser({ hasWithdrawnFromStudy: true }));

      await createPosttrialNudgeNotifications();

      const backlog = await env.firestore
        .collection("users")
        .doc(userId)
        .collection("notificationBacklog")
        .get();
      expect(backlog.size).to.equal(0);
    });
  });

  describe("LLM failure — no fallback", () => {
    it("creates 0 nudges when the OpenAI call fails (no predefined fallback)", async () => {
      const userId = "posttrial-llm-failure";
      await env.firestore
        .collection("users")
        .doc(userId)
        .set(
          baseEligibleUser({
            genderIdentity: "female",
            dateOfBirth: new Date("1990-01-01"),
            comorbidities: {},
            preferredWorkoutTypes: "HIIT,walk,strength,yoga/pilates,bicycle",
          }),
        );

      await createPosttrialNudgeNotifications();

      const backlog = await env.firestore
        .collection("users")
        .doc(userId)
        .collection("notificationBacklog")
        .get();

      // No API key in the emulator → generateLLMNudge returns null after
      // retries → user is skipped for the day with no predefined fallback.
      expect(backlog.size).to.equal(0);
    });
  });

  describe("Deduplication", () => {
    it("does not create a duplicate nudge if one already exists for the target local day", async () => {
      const userId = "posttrial-dedup";
      const userData = baseEligibleUser({
        timeZone: "UTC",
        preferredNotificationTime: "09:00",
      });
      await env.firestore.collection("users").doc(userId).set(userData);

      // Pre-seed a nudge-posttrial backlog doc for the same upcoming local
      // day the function would target (= "next upcoming 09:00 UTC slot").
      const nowUtc = DateTime.utc();
      let target = nowUtc.set({
        hour: 9,
        minute: 0,
        second: 0,
        millisecond: 0,
      });
      if (target <= nowUtc) {
        target = target.plus({ days: 1 });
      }
      const preSeedId = randomUUID().toUpperCase();
      await env.firestore
        .collection("users")
        .doc(userId)
        .collection("notificationBacklog")
        .doc(preSeedId)
        .set({
          id: preSeedId,
          title: "Pre-seeded",
          body: "Pre-seeded post-trial nudge",
          timestamp: admin.firestore.Timestamp.fromDate(target.toJSDate()),
          category: "nudge-posttrial",
          isLLMGenerated: true,
          generatedAt: admin.firestore.Timestamp.now(),
        });

      await createPosttrialNudgeNotifications();

      // Still exactly the one pre-seeded doc — dedup prevented a second
      // write (and no LLM call was made).
      const backlog = await env.firestore
        .collection("users")
        .doc(userId)
        .collection("notificationBacklog")
        .get();
      expect(backlog.size).to.equal(1);
      expect(backlog.docs[0].id).to.equal(preSeedId);
    });
  });

  describe("Coexistence with planNudges", () => {
    it("planNudges (day 7) user is untouched by planPosttrialNudges", async () => {
      const userId = "coexist-trial-user";
      await env.firestore
        .collection("users")
        .doc(userId)
        .set({
          timeZone: "America/New_York",
          dateOfEnrollment: admin.firestore.Timestamp.fromDate(daysAgo(7)),
          lastActiveDate: admin.firestore.Timestamp.fromDate(daysAgo(1)),
          participantGroup: 1,
          userLanguage: "en",
          preferredNotificationTime: "09:00",
          didOptInToTrial: true,
          mostRecentOnboardingStep: "finalStep",
          extendedActivityNudgesOptIn: false, // explicit opt-out of posttrial
        });

      await createNudgeNotifications();
      await createPosttrialNudgeNotifications();

      const backlog = await env.firestore
        .collection("users")
        .doc(userId)
        .collection("notificationBacklog")
        .get();

      // Exactly the 7 trial-predefined nudges — posttrial added nothing
      // (neither a regular posttrial nudge nor a welcome nudge).
      expect(backlog.size).to.equal(7);
      for (const doc of backlog.docs) {
        const category = doc.data().category as string | undefined;
        expect(category).to.equal("nudge-predefined");
        expect(category).to.not.equal("nudge-posttrial");
        expect(category).to.not.equal("nudge-posttrial-welcome");
      }
    });

    it("a posttrial-eligible user (day 22) is untouched by planNudges", async () => {
      const userId = "coexist-posttrial-user";
      await env.firestore
        .collection("users")
        .doc(userId)
        .set(
          baseEligibleUser({
            genderIdentity: "female",
            dateOfBirth: new Date("1990-01-01"),
            comorbidities: {},
          }),
        );

      // planNudges runs first; user is past day 14 so no trial nudges
      // should be created for them.
      await createNudgeNotifications();

      const backlogAfterTrial = await env.firestore
        .collection("users")
        .doc(userId)
        .collection("notificationBacklog")
        .get();
      expect(backlogAfterTrial.size).to.equal(0);
    });
  });

  describe("Welcome notification", () => {
    const WELCOME_TITLE = "Physical Activity Nudges Extended";
    const WELCOME_BODY =
      "Daily nudges for your preferred activities continue after trial! Manage anytime in Profile/Settings under long-term nudges toggle.";

    it("schedules the welcome nudge on first-time eligibility", async () => {
      const userId = "posttrial-welcome-first";
      const userData = baseEligibleUser();
      await env.firestore.collection("users").doc(userId).set(userData);

      const firstNudgeTarget = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const service = new PosttrialNudgeService(env.firestore);

      const scheduled = await service.scheduleWelcomeIfNeeded(
        userId,
        userData,
        firstNudgeTarget,
      );

      expect(scheduled).to.equal(true);

      const backlog = await env.firestore
        .collection("users")
        .doc(userId)
        .collection("notificationBacklog")
        .get();
      expect(backlog.size).to.equal(1);

      const doc = backlog.docs[0].data();
      expect(doc.category).to.equal("nudge-posttrial-welcome");
      expect(doc.title).to.equal(WELCOME_TITLE);
      expect(doc.body).to.equal(WELCOME_BODY);
      expect(doc.isLLMGenerated).to.equal(false);

      const ts = doc.timestamp as admin.firestore.Timestamp;
      expect(ts.toDate().getTime()).to.equal(
        firstNudgeTarget.getTime() - 60 * 60 * 1000,
      );

      const userAfter = await env.firestore
        .collection("users")
        .doc(userId)
        .get();
      expect(userAfter.data()?.posttrialWelcomeNudgeScheduled).to.equal(true);
    });

    it("is idempotent when the flag is already set", async () => {
      const userId = "posttrial-welcome-idempotent";
      const userData = baseEligibleUser({
        posttrialWelcomeNudgeScheduled: true,
      });
      await env.firestore.collection("users").doc(userId).set(userData);

      const firstNudgeTarget = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const service = new PosttrialNudgeService(env.firestore);

      const scheduled = await service.scheduleWelcomeIfNeeded(
        userId,
        userData,
        firstNudgeTarget,
      );

      expect(scheduled).to.equal(false);

      const backlog = await env.firestore
        .collection("users")
        .doc(userId)
        .collection("notificationBacklog")
        .get();
      expect(backlog.size).to.equal(0);
    });

    it("writes the welcome nudge timestamp exactly 1 hour before the first nudge", async () => {
      const userId = "posttrial-welcome-precision";
      const userData = baseEligibleUser();
      await env.firestore.collection("users").doc(userId).set(userData);

      // Pick an arbitrary future instant (not round-number) to prove
      // we're doing millisecond-precise arithmetic.
      const firstNudgeTarget = new Date(
        Date.now() + 17 * 60 * 60 * 1000 + 34 * 60 * 1000 + 27_000,
      );
      const service = new PosttrialNudgeService(env.firestore);

      await service.scheduleWelcomeIfNeeded(userId, userData, firstNudgeTarget);

      const backlog = await env.firestore
        .collection("users")
        .doc(userId)
        .collection("notificationBacklog")
        .get();
      const ts = backlog.docs[0].data().timestamp as admin.firestore.Timestamp;
      expect(ts.toDate().getTime()).to.equal(
        firstNudgeTarget.getTime() - 3_600_000,
      );
    });

    it("still schedules when the computed welcome time lands in the recent past", async () => {
      const userId = "posttrial-welcome-past";
      const userData = baseEligibleUser();
      await env.firestore.collection("users").doc(userId).set(userData);

      // Target only 30 minutes in the future → welcome = target − 1 h is 30
      // minutes in the past. sendNudges will deliver it on its next poll.
      const firstNudgeTarget = new Date(Date.now() + 30 * 60 * 1000);
      const service = new PosttrialNudgeService(env.firestore);

      const scheduled = await service.scheduleWelcomeIfNeeded(
        userId,
        userData,
        firstNudgeTarget,
      );

      expect(scheduled).to.equal(true);

      const backlog = await env.firestore
        .collection("users")
        .doc(userId)
        .collection("notificationBacklog")
        .get();
      expect(backlog.size).to.equal(1);

      const ts = backlog.docs[0].data().timestamp as admin.firestore.Timestamp;
      expect(ts.toDate().getTime()).to.be.lessThan(Date.now());

      const userAfter = await env.firestore
        .collection("users")
        .doc(userId)
        .get();
      expect(userAfter.data()?.posttrialWelcomeNudgeScheduled).to.equal(true);
    });

    it("refuses to schedule when didOptInToTrial is not true (defensive gate)", async () => {
      const userId = "posttrial-welcome-no-trial-optin";
      const userData = baseEligibleUser({ didOptInToTrial: false });
      await env.firestore.collection("users").doc(userId).set(userData);

      const firstNudgeTarget = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const service = new PosttrialNudgeService(env.firestore);

      const scheduled = await service.scheduleWelcomeIfNeeded(
        userId,
        userData,
        firstNudgeTarget,
      );

      expect(scheduled).to.equal(false);

      const backlog = await env.firestore
        .collection("users")
        .doc(userId)
        .collection("notificationBacklog")
        .get();
      expect(backlog.size).to.equal(0);

      const userAfter = await env.firestore
        .collection("users")
        .doc(userId)
        .get();
      expect(userAfter.data()?.posttrialWelcomeNudgeScheduled).to.not.equal(
        true,
      );
    });
  });
});
