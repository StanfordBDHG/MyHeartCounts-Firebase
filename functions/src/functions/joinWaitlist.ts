// This source file is part of the MyHeart Counts project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

import admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { validatedOnCall, defaultServiceAccount } from "./helpers.js";
import {
  joinWaitlistInputSchema,
  type JoinWaitlistOutput,
} from "../models/index.js";

export const joinWaitlist = validatedOnCall(
  "joinWaitlist",
  joinWaitlistInputSchema,
  async (request): Promise<JoinWaitlistOutput> => {
    await admin.firestore().collection("waitlist").add({
      region: request.data.region,
      email: request.data.email,
      createdAt: FieldValue.serverTimestamp(),
    });
  },
  {
    invoker: "public",
    serviceAccount: defaultServiceAccount,
  },
);
