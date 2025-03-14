//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {onSchedule} from "firebase-functions/v2/scheduler";
import {serviceAccount} from "./helpers.js";
import {getServiceFactory} from "../services/factory/getServiceFactory.js";

export const onScheduleEveryMorning = onSchedule(
  {
    schedule: "0 8 * * *",
    timeZone: "America/Los_Angeles",
    serviceAccount: serviceAccount,
  },
  async () => getServiceFactory().trigger().everyMorning(),
);

export const onScheduleUpdateMedicationRecommendations = onSchedule(
  {
    schedule: "0 0 * * *",
    timeZone: "America/Los_Angeles",
    serviceAccount: serviceAccount,
  },
  async () =>
    getServiceFactory().trigger().updateRecommendationsForAllPatients(),
);
