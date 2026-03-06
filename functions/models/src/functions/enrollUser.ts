// This source file is part of the MyHeart Counts project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

import { z } from "zod";

export const enrollUserInputSchema = z.object({});
export type EnrollUserInputSchema = z.input<typeof enrollUserInputSchema>;

export type EnrollUserOutputSchema = undefined;
