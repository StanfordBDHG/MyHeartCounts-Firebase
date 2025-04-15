//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { z } from 'zod'
import { Lazy } from '../helpers/lazy.js'
import { optionalish } from '../helpers/optionalish.js'
import { SchemaConverter } from '../helpers/schemaConverter.js'

export const userAuthConverter = new Lazy(
  () =>
    new SchemaConverter({
      schema: z
        .object({
          email: optionalish(z.string()),
          displayName: optionalish(z.string()),
          phoneNumber: optionalish(z.string()),
          photoURL: optionalish(z.string()),
        })
        .transform((values) => new UserAuth(values)),
      encode: (object) => ({
        email: object.email ?? null,
        displayName: object.displayName ?? null,
        phoneNumber: object.phoneNumber ?? null,
        photoURL: object.photoURL ?? null,
      }),
    }),
)

export class UserAuth {
  // Properties

  readonly email?: string
  readonly displayName?: string
  readonly phoneNumber?: string
  readonly photoURL?: string

  // Constructor

  constructor(input: {
    email?: string
    displayName?: string
    phoneNumber?: string
    photoURL?: string
  }) {
    this.email = input.email
    this.displayName = input.displayName
    this.phoneNumber = input.phoneNumber
    this.photoURL = input.photoURL
  }
}
