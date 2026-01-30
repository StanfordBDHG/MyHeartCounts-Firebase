//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { z } from "zod";
import { userAuthConverter } from "../types/userAuth.js";

export const updateUserInformationInputSchema = z.object({
  userId: z.string(),
  data: z.object({
    auth: z.lazy(() => userAuthConverter.value.schema),
  }),
});
export type UpdateUserInformationInput = z.input<
  typeof updateUserInformationInputSchema
>;

export type UpdateUserInformationOutput = undefined;
