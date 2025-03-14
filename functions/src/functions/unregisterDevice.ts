//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  unregisterDeviceInputSchema,
  type UnregisterDeviceOutput,
} from "@stanfordbdhg/engagehf-models";
import {validatedOnCall} from "./helpers.js";
import {getServiceFactory} from "../services/factory/getServiceFactory.js";

export const unregisterDevice = validatedOnCall(
  "unregisterDevice",
  unregisterDeviceInputSchema,
  async (request): Promise<UnregisterDeviceOutput> => {
    const factory = getServiceFactory();
    const credential = factory.credential(request.auth);
    await factory
      .message()
      .unregisterDevice(
        credential.userId,
        request.data.notificationToken,
        request.data.platform,
      );
  },
);
