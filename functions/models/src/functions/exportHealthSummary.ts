// This source file is part of the MyHeart Counts project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

import { z } from "zod";
import { optionalish } from "../helpers/optionalish.js";

export const exportHealthSummaryInputSchema = z.object({
  userId: z.string(),
  languages: optionalish(z.array(z.string())),
  weightUnit: optionalish(z.string()),
});
export type ExportHealthSummaryInput = z.input<
  typeof exportHealthSummaryInputSchema
>;

export interface ExportHealthSummaryOutput {
  content: string;
}
