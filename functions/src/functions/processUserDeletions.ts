//
// This source file is part of the Stanford Biodesign Digital Health MyHeart Counts open-source project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2025 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { Storage } from "@google-cloud/storage";
import type { User } from "@stanfordbdhg/myheartcounts-models";
import { logger } from "firebase-functions/v2";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { privilegedServiceAccount } from "./helpers.js";
import type { Document } from "../services/database/databaseService.js";
import { getServiceFactory } from "../services/factory/getServiceFactory.js";

const storage = new Storage();

export const deleteUserStorageFiles = async (userId: string): Promise<void> => {
  const bucketName = process.env.GCLOUD_PROJECT;
  if (!bucketName) {
    logger.error("GCLOUD_PROJECT environment variable not set");
    return;
  }

  const bucket = storage.bucket(`${bucketName}.appspot.com`);
  const prefix = `users/${userId}/`;

  try {
    const [files] = await bucket.getFiles({ prefix });

    if (files.length === 0) {
      logger.info(`No storage files found for user ${userId}`);
      return;
    }

    logger.info(`Deleting ${files.length} storage files for user ${userId}`);

    const deletePromises = files.map((file) => file.delete());
    await Promise.all(deletePromises);

    logger.info(`Successfully deleted storage files for user ${userId}`);
  } catch (error) {
    logger.error(`Failed to delete storage files for user ${userId}:`, error);
    throw error;
  }
};

// Type representing the raw user data with additional Firestore fields
interface UserDataWithDeletion extends Record<string, unknown> {
  toBeDeleted?: boolean;
}

export const processUserDeletions = async (): Promise<void> => {
  const factory = getServiceFactory();
  const userService = factory.user();

  try {
    const users = await userService.getAllPatients();
    const usersToDelete = users.filter((user: Document<User>) => {
      const userData = user.content as unknown as UserDataWithDeletion;
      return userData.toBeDeleted === true;
    });

    if (usersToDelete.length === 0) {
      logger.info("No users marked for deletion found");
      return;
    }

    logger.info(`Found ${usersToDelete.length} users marked for deletion`);

    for (const user of usersToDelete) {
      const userId = user.id;

      try {
        logger.info(`Processing deletion for user ${userId}`);

        await deleteUserStorageFiles(userId);

        await userService.deleteUser(userId);

        logger.info(`Successfully completed deletion for user ${userId}`);
      } catch (error) {
        logger.error(`Failed to delete user ${userId}:`, error);
      }
    }
  } catch (error) {
    logger.error("Error processing user deletions:", error);
  }
};

export const processUserDeletionsScheduled = onSchedule(
  {
    schedule: "every 30 minutes",
    timeZone: "UTC",
    timeoutSeconds: 1800,
    serviceAccount: privilegedServiceAccount,
  },
  async (_event) => {
    logger.info("Starting scheduled user deletion process");
    await processUserDeletions();
    logger.info("Completed scheduled user deletion process");
  },
);
