//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

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
