// This source file is part of the MyHeart Counts project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

import { z } from "zod";
import { ISOCountryCode } from "../types/isoCountryCode.js";

export const joinWaitlistInputSchema = z.object({
  region: z.nativeEnum(ISOCountryCode),
  email: z.string().trim().email(),
});
export type JoinWaitlistInput = z.input<typeof joinWaitlistInputSchema>;

export type JoinWaitlistOutput = undefined;
