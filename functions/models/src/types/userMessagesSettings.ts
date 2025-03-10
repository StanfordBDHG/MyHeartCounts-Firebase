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

export const userMessagesSettingsConverter = new Lazy(
  () =>
    new SchemaConverter({
      schema: z
        .object({
          dailyRemindersAreActive: optionalish(z.boolean()),
          textNotificationsAreActive: optionalish(z.boolean()),
          medicationRemindersAreActive: optionalish(z.boolean()),
        })
        .transform((values) => new UserMessagesSettings(values)),
      encode: (object) => ({
        dailyRemindersAreActive: object.dailyRemindersAreActive ?? null,
        textNotificationsAreActive: object.textNotificationsAreActive ?? null,
        medicationRemindersAreActive:
          object.medicationRemindersAreActive ?? null,
      }),
    }),
)

export class UserMessagesSettings {
  // Properties

  readonly dailyRemindersAreActive?: boolean
  readonly textNotificationsAreActive?: boolean
  readonly medicationRemindersAreActive?: boolean

  // Constructor

  constructor(input: {
    dailyRemindersAreActive?: boolean
    textNotificationsAreActive?: boolean
    medicationRemindersAreActive?: boolean
  }) {
    this.dailyRemindersAreActive = input.dailyRemindersAreActive
    this.textNotificationsAreActive = input.textNotificationsAreActive
    this.medicationRemindersAreActive = input.medicationRemindersAreActive
  }
}
