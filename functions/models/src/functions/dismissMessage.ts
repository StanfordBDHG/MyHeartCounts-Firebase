// This source file is part of the MyHeart Counts project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

import { z } from "zod";
import { optionalish, optionalishDefault } from "../helpers/optionalish.js";

export const dismissMessageInputSchema = z.object({
  userId: optionalish(z.string()),
  messageId: z.string(),
  didPerformAction: optionalishDefault(z.boolean(), false),
});
export type DismissMessageInput = z.input<typeof dismissMessageInputSchema>;

export type DismissMessageOutput = undefined;
