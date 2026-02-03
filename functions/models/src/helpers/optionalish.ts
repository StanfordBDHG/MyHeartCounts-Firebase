//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { z } from "zod";

export const optionalish = <T extends z.ZodTypeAny>(type: T) =>
  type.or(z.null().transform(() => undefined)).optional();

export const optionalishDefault = <T extends z.ZodTypeAny>(
  type: T,
  defaultValue: z.output<T>,
) =>
  type
    .or(z.null().transform(() => undefined))
    .optional()
    /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
    .transform((value) => value ?? defaultValue);
