//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { z } from 'zod'
import { dateConverter } from '../helpers/dateConverter.js'
import { Lazy } from '../helpers/lazy.js'
import { optionalish, optionalishDefault } from '../helpers/optionalish.js'
import { SchemaConverter } from '../helpers/schemaConverter.js'

export const userRegistrationInputConverter = new Lazy(
  () =>
    new SchemaConverter({
      schema: z.object({
        disabled: optionalishDefault(z.boolean(), false),
        dateOfBirth: optionalish(dateConverter.schema),
        language: optionalish(z.string()),
        timeZone: optionalish(z.string()),
        participantGroup: optionalish(z.number().int()),
      }),
      encode: (object) => ({
        disabled: object.disabled,
        dateOfBirth:
          object.dateOfBirth ? dateConverter.encode(object.dateOfBirth) : null,
        language: object.language ?? null,
        timeZone: object.timeZone ?? null,
        participantGroup: object.participantGroup ?? null,
      }),
    }),
)

export const userRegistrationConverter = new Lazy(
  () =>
    new SchemaConverter({
      schema: userRegistrationInputConverter.value.schema.transform(
        (values) => new UserRegistration(values),
      ),
      encode: (object) => userRegistrationInputConverter.value.encode(object),
    }),
)

export const userClaimsSchema = z.object({
  disabled: optionalishDefault(z.boolean(), false),
})

export type UserClaims = z.output<typeof userClaimsSchema>

export class UserRegistration {
  // Stored Properties

  readonly disabled: boolean

  readonly dateOfBirth?: Date

  readonly language?: string
  readonly timeZone?: string
  readonly participantGroup?: number

  // Computed Properties

  get claims(): UserClaims {
    return {
      disabled: this.disabled,
    }
  }

  // Constructor

  constructor(input: {
    disabled: boolean
    dateOfBirth?: Date
    language?: string
    timeZone?: string
    participantGroup?: number
  }) {
    this.disabled = input.disabled
    this.dateOfBirth = input.dateOfBirth
    this.language = input.language
    this.timeZone = input.timeZone
    this.participantGroup = input.participantGroup
  }
}
