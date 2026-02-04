//
// This source file is part of the Stanford Biodesign Digital Health MyHeart Counts open-source project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2025 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  enableUserInputSchema,
  type EnableUserOutput,
} from "@stanfordbdhg/myheartcounts-models";
import { validatedOnCall, privilegedServiceAccount } from "./helpers.js";
import { getServiceFactory } from "../services/factory/getServiceFactory.js";

export const enableUser = validatedOnCall(
  "enableUser",
  enableUserInputSchema,
  async (request): Promise<EnableUserOutput> => {
    const factory = getServiceFactory();
    const credential = factory.credential(request.auth);
    const userId = request.data.userId;
    const userService = factory.user();

    credential.checkAuthenticated();

    await userService.enableUser(userId);
  },
  {
    invoker: "public",
    serviceAccount: privilegedServiceAccount,
  },
);
