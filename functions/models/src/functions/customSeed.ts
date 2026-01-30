//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { z } from "zod";
import { optionalish } from "../helpers/optionalish.js";
import { userConverter } from "../types/user.js";

export const userSeedingOptionsSchema = z.object({
  auth: z.object({
    uid: optionalish(z.string()),
    email: z.string(),
    password: z.string(),
    displayName: z.string(),
  }),
  user: optionalish(z.lazy(() => userConverter.value.schema)),
  collections: optionalish(z.record(z.record(z.any()))),
});
export type UserSeedingOptions = z.output<typeof userSeedingOptionsSchema>;

export const customSeedingOptionsSchema = z.object({
  users: userSeedingOptionsSchema.array(),
  firestore: optionalish(z.record(z.record(z.any()))),
});
export type CustomSeedingOptions = z.output<typeof customSeedingOptionsSchema>;
