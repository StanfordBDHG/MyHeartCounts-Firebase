//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { Timestamp } from 'firebase-admin/firestore'
import { z } from 'zod'
import { SchemaConverter } from './schemaConverter.js'

export const dateConverter = new SchemaConverter({
  schema: z.union([
    z.string().transform((string, context) => {
      try {
        const date = new Date(string)
        if (isNaN(date.getTime())) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Invalid date',
          })
          return z.NEVER
        }
        return date
      } catch (error) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: String(error),
        })
        return z.NEVER
      }
    }),
    z
      .object({
        toDate: z.function().returns(z.date()),
      })
      .transform((timestamp) => timestamp.toDate()),
    z.null().transform(() => new Date()),
  ]),
  encode: (object) => {
    if (!(object instanceof Date)) {
      return Timestamp.now() // Default to current timestamp if null
    }
    return Timestamp.fromDate(object)
  },
})
