// This source file is part of the MyHeart Counts project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

import {
  disableUserInputSchema,
  type DisableUserOutput,
} from "@stanfordbdhg/myheartcounts-models";
import { validatedOnCall, privilegedServiceAccount } from "./helpers.js";
import { getServiceFactory } from "../services/factory/getServiceFactory.js";

export const disableUser = validatedOnCall(
  "disableUser",
  disableUserInputSchema,
  async (request): Promise<DisableUserOutput> => {
    const factory = getServiceFactory();
    const credential = factory.credential(request.auth);
    const userId = request.data.userId;
    const userService = factory.user();

    credential.checkAuthenticated();

    await userService.disableUser(userId);
  },
  {
    invoker: "public",
    serviceAccount: privilegedServiceAccount,
  },
);
