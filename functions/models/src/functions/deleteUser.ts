// This source file is part of the MyHeart Counts project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

import { z } from "zod";

export const deleteUserInputSchema = z.object({
  userId: z.string(),
});
export type DeleteUserInput = z.input<typeof deleteUserInputSchema>;

export type DeleteUserOutput = undefined;
