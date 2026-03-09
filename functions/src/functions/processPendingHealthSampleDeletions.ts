// This source file is part of the MyHeart Counts project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

import { logger } from "firebase-functions/v2";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { privilegedServiceAccount } from "./helpers.js";
import { HealthSampleDeletionQueueService } from "../services/healthSamples/healthSampleDeletionQueueService.js";

export const processPendingHealthSampleDeletions = onSchedule(
  {
    schedule: "every 30 minutes",
    timeZone: "UTC",
    timeoutSeconds: 540,
    serviceAccount: privilegedServiceAccount,
  },
  async (_event) => {
    logger.info("Starting scheduled pending health sample deletion processing");
    const queueService = new HealthSampleDeletionQueueService();
    const result = await queueService.processQueue();
    logger.info(
      "Completed scheduled pending health sample deletion processing",
      result,
    );
  },
);
