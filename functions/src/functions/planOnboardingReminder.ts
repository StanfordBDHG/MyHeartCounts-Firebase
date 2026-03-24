// This source file is part of the MyHeart Counts project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

import { randomUUID } from "crypto";
import admin from "firebase-admin";
import { logger } from "firebase-functions";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { DateTime } from "luxon";
import { privilegedServiceAccount } from "./helpers.js";

interface OnboardingReminderUserData {
  dateOfEnrollment?: Date | string | admin.firestore.Timestamp;
  mostRecentOnboardingStep?: string;
  timeZone?: string;
  preferredNotificationTime?: string;
  disabled?: boolean;
  hasWithdrawnFromStudy?: boolean;
}

export class OnboardingReminderService {
  // Properties

  private static readonly DEFAULT_NOTIFICATION_TIME = "09:00";
  private static readonly ONBOARDING_REMINDER_CATEGORY = "onboarding-reminder";
  private readonly firestore: admin.firestore.Firestore;

  // Constructor

  constructor(firestore?: admin.firestore.Firestore) {
    this.firestore = firestore ?? admin.firestore();
  }

  // Methods

  getDaysSinceEnrollment(
    dateOfEnrollment: admin.firestore.Timestamp | Date | string,
  ): number {
    let enrollmentDate: Date;

    if (
      dateOfEnrollment &&
      typeof dateOfEnrollment === "object" &&
      "toDate" in dateOfEnrollment
    ) {
      enrollmentDate = dateOfEnrollment.toDate();
    } else if (dateOfEnrollment instanceof Date) {
      enrollmentDate = dateOfEnrollment;
    } else {
      enrollmentDate = new Date(dateOfEnrollment);
    }

    const now = new Date();
    const timeDiff = now.getTime() - enrollmentDate.getTime();
    return Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  }

  private async hasExistingOnboardingReminder(
    userId: string,
  ): Promise<boolean> {
    const backlogSnapshot = await this.firestore
      .collection("users")
      .doc(userId)
      .collection("notificationBacklog")
      .where(
        "category",
        "==",
        OnboardingReminderService.ONBOARDING_REMINDER_CATEGORY,
      )
      .limit(1)
      .get();

    if (!backlogSnapshot.empty) {
      return true;
    }

    const historySnapshot = await this.firestore
      .collection("users")
      .doc(userId)
      .collection("notificationHistory")
      .where(
        "category",
        "==",
        OnboardingReminderService.ONBOARDING_REMINDER_CATEGORY,
      )
      .where("status", "==", "sent")
      .limit(1)
      .get();

    return !historySnapshot.empty;
  }

  async planOnboardingReminders(): Promise<void> {
    const usersSnapshot = await this.firestore.collection("users").get();

    let usersProcessed = 0;
    let remindersCreated = 0;

    for (const userDoc of usersSnapshot.docs) {
      try {
        const userData = userDoc.data() as OnboardingReminderUserData;
        const userId = userDoc.id;
        usersProcessed++;

        if (userData.disabled === true) {
          continue;
        }

        if (userData.hasWithdrawnFromStudy === true) {
          continue;
        }

        if (!userData.timeZone || !userData.dateOfEnrollment) {
          continue;
        }

        if (userData.mostRecentOnboardingStep === "finalStep") {
          continue;
        }

        const daysSinceEnrollment = this.getDaysSinceEnrollment(
          userData.dateOfEnrollment,
        );

        if (daysSinceEnrollment !== 1) {
          continue;
        }

        const alreadyExists = await this.hasExistingOnboardingReminder(userId);
        if (alreadyExists) {
          logger.info(
            `Skipping onboarding reminder for user ${userId}: already exists`,
          );
          continue;
        }

        const rawPrefTime = userData.preferredNotificationTime?.trim();
        const preferredTime =
          rawPrefTime !== undefined && rawPrefTime !== "" ?
            rawPrefTime
          : OnboardingReminderService.DEFAULT_NOTIFICATION_TIME;

        const [hourStr, minuteStr] = preferredTime.split(":");
        const hour = Number(hourStr);
        const minute = Number(minuteStr);

        const userDateTime = DateTime.now()
          .setZone(userData.timeZone)
          .set({ hour, minute, second: 0, millisecond: 0 });

        const utcTime = userDateTime.toUTC().toJSDate();

        const nudgeId = randomUUID().toUpperCase();

        await this.firestore
          .collection("users")
          .doc(userId)
          .collection("notificationBacklog")
          .doc(nudgeId)
          .set({
            id: nudgeId,
            title: "Finish Onboarding into MHC!",
            body: "Complete your setup to start tracking your heart health with My Heart Counts.",
            timestamp: admin.firestore.Timestamp.fromDate(utcTime),
            category: OnboardingReminderService.ONBOARDING_REMINDER_CATEGORY,
            isLLMGenerated: false,
            generatedAt: admin.firestore.Timestamp.now(),
          });

        remindersCreated++;
        logger.info(`Created onboarding reminder for user ${userId}`);
      } catch (error) {
        logger.error(
          `Error planning onboarding reminder for user ${userDoc.id}: ${String(error)}`,
        );
      }
    }

    logger.info(
      `Onboarding reminder planning complete: ${remindersCreated} reminders created for ${usersProcessed} users processed`,
    );
  }
}

let onboardingReminderService: OnboardingReminderService | undefined;

const getOnboardingReminderService = (): OnboardingReminderService => {
  onboardingReminderService ??= new OnboardingReminderService();
  return onboardingReminderService;
};

export const planOnboardingReminders = () =>
  getOnboardingReminderService().planOnboardingReminders();

export const onScheduleOnboardingReminderCreation = onSchedule(
  {
    schedule: "0 8 * * *",
    timeZone: "UTC",
    serviceAccount: privilegedServiceAccount,
  },
  async () => {
    logger.info("Starting onboarding reminder planning");

    try {
      await getOnboardingReminderService().planOnboardingReminders();
      logger.info("Onboarding reminder planning complete");
    } catch (error) {
      logger.error(`Error in onboarding reminder planning: ${String(error)}`);
    }
  },
);
