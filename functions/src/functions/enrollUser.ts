//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {z} from "zod";
import {logger} from "firebase-functions";
import {validatedOnCall} from "./helpers.js";
import {getServiceFactory} from "../services/factory/getServiceFactory.js";

// New simplified schema without invitation code
const enrollUserPublicSchema = z.object({});

export const enrollUser = validatedOnCall(
  "enrollUser",
  enrollUserPublicSchema,
  async (request) => {
    const factory = getServiceFactory();
    const credential = factory.credential(request.auth);
    const triggerService = factory.trigger();
    const userService = factory.user();

    const userId = credential.userId;

    // Direct enrollment without invitation
    const userDoc = await userService.enrollUserDirectly(userId, {
      isSingleSignOn: false,
    });

    logger.debug(
      `setupUser: User '${userId}' successfully enrolled in the study directly`,
    );

    await triggerService.userEnrolled(userDoc);

    logger.debug(`setupUser: User '${userId}' enrollment triggers finished`);
  },
);
