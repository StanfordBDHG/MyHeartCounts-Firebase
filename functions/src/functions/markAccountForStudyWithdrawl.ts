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

const markAccountForStudyWithdrawlInputSchema = z.object({});

interface MarkAccountForStudyWithdrawlOutput {
  success: boolean;
  withdrawnAt: string;
}

export const markAccountForStudyWithdrawl = validatedOnCall(
  "markAccountForStudyWithdrawl",
  markAccountForStudyWithdrawlInputSchema,
  async (request): Promise<MarkAccountForStudyWithdrawlOutput> => {
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
        "Cannot mark disabled account for study withdrawal",
      );
    }

    const withdrawnAt = new Date();
    await userService.markAccountForStudyWithdrawl(userId, withdrawnAt);

    logger.info(
      `User ${userId} successfully marked their account for study withdrawal`,
    );

    return {
      success: true,
      withdrawnAt: withdrawnAt.toISOString(),
    };
  },
  {
    invoker: "public",
    serviceAccount: defaultServiceAccount,
  },
);
