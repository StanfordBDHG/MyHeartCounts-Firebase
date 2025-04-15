//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { type z } from 'zod'
import { type Lazy } from './lazy'

export class SchemaConverter<Schema extends z.ZodTypeAny, Encoded> {
  // Properties

  readonly schema: Schema
  readonly encode: (value: z.output<Schema>) => Encoded

  get value(): this {
    return this
  }

  // Constructor

  constructor(input: {
    schema: Schema
    encode: (value: z.output<Schema>) => Encoded
  }) {
    this.schema = input.schema
    this.encode = input.encode
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export type InferEncoded<Input> =
  Input extends SchemaConverter<any, any> ? ReturnType<Input['encode']>
  : Input extends Lazy<SchemaConverter<any, any>> ?
    ReturnType<Input['value']['encode']>
  : never
/* eslint-enable @typescript-eslint/no-explicit-any */
