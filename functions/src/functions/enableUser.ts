// This source file is part of the MyHeart Counts project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

import { validatedOnCall, privilegedServiceAccount } from "./helpers.js";
import {
  enableUserInputSchema,
  type EnableUserOutput,
} from "../models/index.js";
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
