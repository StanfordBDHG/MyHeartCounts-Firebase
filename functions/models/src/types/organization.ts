//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { z } from 'zod'
import { Lazy } from '../helpers/lazy.js'
import { SchemaConverter } from '../helpers/schemaConverter.js'

export const organizationConverter = new Lazy(
  () =>
    new SchemaConverter({
      schema: z
        .object({
          name: z.string(),
          contactName: z.string(),
          phoneNumber: z.string(),
          emailAddress: z.string(),
          ssoProviderId: z.string(),
        })
        .transform((values) => new Organization(values)),
      encode: (object) => ({
        name: object.name,
        contactName: object.contactName,
        phoneNumber: object.phoneNumber,
        emailAddress: object.emailAddress,
        ssoProviderId: object.ssoProviderId,
      }),
    }),
)

export class Organization {
  // Properties
  readonly name: string
  readonly contactName: string
  readonly phoneNumber: string
  readonly emailAddress: string
  readonly ssoProviderId: string

  // Constructor
  constructor(input: {
    name: string
    contactName: string
    phoneNumber: string
    emailAddress: string
    ssoProviderId: string
  }) {
    this.name = input.name
    this.contactName = input.contactName
    this.phoneNumber = input.phoneNumber
    this.emailAddress = input.emailAddress
    this.ssoProviderId = input.ssoProviderId
  }
}
