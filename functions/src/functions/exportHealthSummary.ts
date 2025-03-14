//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  exportHealthSummaryInputSchema,
  type ExportHealthSummaryOutput,
  QuantityUnit,
} from "@stanfordbdhg/engagehf-models";
import {https} from "firebase-functions/v2";
import {validatedOnCall} from "./helpers.js";
import {generateHealthSummary} from "../healthSummary/generate.js";
import {UserRole} from "../services/credential/credential.js";
import {getServiceFactory} from "../services/factory/getServiceFactory.js";

export const exportHealthSummary = validatedOnCall(
  "exportHealthSummary",
  exportHealthSummaryInputSchema,
  async (request): Promise<ExportHealthSummaryOutput> => {
    const factory = getServiceFactory();
    const credential = factory.credential(request.auth);

    const userService = factory.user();
    const user = await userService.getUser(request.data.userId);

    credential.check(
      UserRole.admin,
      UserRole.user(request.data.userId),
      ...(user?.content.organization ?
        [
          UserRole.owner(user.content.organization),
          UserRole.clinician(user.content.organization),
        ] :
        []),
    );

    const weightUnit = [QuantityUnit.lbs, QuantityUnit.kg].find(
      (unit) => unit.code === request.data.weightUnit,
    );

    if (request.data.weightUnit !== undefined && weightUnit === undefined) {
      throw new https.HttpsError("invalid-argument", "Invalid weight unit");
    }

    const now = new Date();
    const healthSummaryService = factory.healthSummary();
    const data = await healthSummaryService.getHealthSummaryData(
      request.data.userId,
      now,
      weightUnit ?? QuantityUnit.lbs,
    );
    const pdf = generateHealthSummary(data, {
      languages:
        user?.content.language !== undefined ? [user.content.language] : [],
    });

    return {content: pdf.toString("base64")};
  },
);
