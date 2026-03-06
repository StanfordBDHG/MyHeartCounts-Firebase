// This source file is part of the MyHeart Counts project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

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
