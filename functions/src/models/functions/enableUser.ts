// This source file is part of the MyHeart Counts project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

import { z } from "zod";

export const enableUserInputSchema = z.object({
  userId: z.string(),
});

export type EnableUserInput = z.input<typeof enableUserInputSchema>;

export type EnableUserOutput = undefined;
