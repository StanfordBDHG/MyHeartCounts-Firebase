//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { z } from "zod";

export const disableUserInputSchema = z.object({
  userId: z.string(),
});

export type DisableUserInput = z.input<typeof disableUserInputSchema>;

export type DisableUserOutput = undefined;
