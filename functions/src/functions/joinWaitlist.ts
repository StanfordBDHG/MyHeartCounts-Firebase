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
    const region = request.data.region.toLowerCase();
    const email = request.data.email.toLowerCase();
    const docId = `${region}_${email}`;

    await admin.firestore().collection("waitlist").doc(docId).set(
      {
        region: region,
        email: email,
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  },
  {
    invoker: "public",
    serviceAccount: defaultServiceAccount,
  },
  { logRequestData: false },
);
