//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { z } from 'zod'

export function optionalish<T extends z.ZodTypeAny>(type: T) {
  return type.or(z.null().transform(() => undefined)).optional()
}

export function optionalishDefault<T extends z.ZodTypeAny>(
  type: T,
  defaultValue: z.output<T>,
) {
  return (
    type
      .or(z.null().transform(() => undefined))
      .optional()
      /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
      .transform((value) => value ?? defaultValue)
  )
}
