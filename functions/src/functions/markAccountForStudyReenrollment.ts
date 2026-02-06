//
// This source file is part of the Stanford Biodesign Digital Health MyHeart Counts open-source project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2025 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { https, logger } from "firebase-functions/v2";
import { z } from "zod";
import { validatedOnCall, defaultServiceAccount } from "./helpers.js";
import { getServiceFactory } from "../services/factory/getServiceFactory.js";

const markAccountForStudyReenrollmentInputSchema = z.object({});

interface MarkAccountForStudyReenrollmentOutput {
  success: boolean;
  reenrolledAt: string;
}

export const markAccountForStudyReenrollment = validatedOnCall(
  "markAccountForStudyReenrollment",
  markAccountForStudyReenrollmentInputSchema,
  async (request): Promise<MarkAccountForStudyReenrollmentOutput> => {
    const factory = getServiceFactory();
    const credential = factory.credential(request.auth);
    const userService = factory.user();

    const userId = request.auth?.uid;
    if (!userId) {
      throw new https.HttpsError(
        "unauthenticated",
        "User must be authenticated",
      );
    }

    credential.checkUser(userId);

    const user = await userService.getUser(userId);
    if (!user) {
      throw new https.HttpsError("not-found", "User account not found");
    }

    if (user.content.disabled) {
      throw new https.HttpsError(
        "failed-precondition",
        "Cannot re-enroll disabled account in study",
      );
    }

    const reenrolledAt = new Date();
    await userService.markAccountForStudyReenrollment(userId, reenrolledAt);

    logger.info(`User ${userId} successfully re-enrolled in the study`);

    return {
      success: true,
      reenrolledAt: reenrolledAt.toISOString(),
    };
  },
  {
    invoker: "public",
    serviceAccount: defaultServiceAccount,
  },
);
