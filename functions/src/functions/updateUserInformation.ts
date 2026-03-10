// This source file is part of the MyHeart Counts project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

import { validatedOnCall, defaultServiceAccount } from "./helpers.js";
import {
  updateUserInformationInputSchema,
  type UpdateUserInformationOutput,
} from "../models/index.js";
import { getServiceFactory } from "../services/factory/getServiceFactory.js";

export const updateUserInformation = validatedOnCall(
  "updateUserInformation",
  updateUserInformationInputSchema,
  async (request): Promise<UpdateUserInformationOutput> => {
    const factory = getServiceFactory();
    const credential = factory.credential(request.auth);
    const userService = factory.user();

    credential.checkUser(request.data.userId);

    await userService.updateAuth(request.data.userId, request.data.data.auth);
  },
  {
    invoker: "public",
    serviceAccount: defaultServiceAccount,
  },
);
