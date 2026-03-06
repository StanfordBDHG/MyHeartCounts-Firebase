// This source file is part of the MyHeart Counts project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

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
