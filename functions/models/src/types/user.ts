//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { z } from 'zod'
import {
  userRegistrationConverter,
  userRegistrationInputConverter,
  UserRegistration,
} from './userRegistration.js'
import { type UserType } from './userType.js'
import { dateConverter } from '../helpers/dateConverter.js'
import { Lazy } from '../helpers/lazy.js'
import { SchemaConverter } from '../helpers/schemaConverter.js'

export const userConverter = new Lazy(
  () =>
    new SchemaConverter({
      schema: userRegistrationInputConverter.value.schema
        .extend({
          dateOfEnrollment: dateConverter.schema,
          invitationCode: z.string(),
          lastActiveDate: dateConverter.schema,
        })
        .transform((values) => new User(values)),
      encode: (object) => ({
        ...userRegistrationConverter.value.encode(object),
        lastActiveDate: dateConverter.encode(object.lastActiveDate),
        dateOfEnrollment: dateConverter.encode(object.dateOfEnrollment),
        invitationCode: object.invitationCode,
      }),
    }),
)

export class User extends UserRegistration {
  // Properties

  readonly dateOfEnrollment: Date
  readonly invitationCode: string
  readonly lastActiveDate: Date

  // Constructor

  constructor(input: {
    type: UserType
    disabled: boolean
    organization?: string
    dateOfBirth?: Date
    clinician?: string
    receivesAppointmentReminders: boolean
    receivesInactivityReminders: boolean
    receivesMedicationUpdates: boolean
    receivesQuestionnaireReminders: boolean
    receivesRecommendationUpdates: boolean
    receivesVitalsReminders: boolean
    receivesWeightAlerts: boolean
    language?: string
    timeZone?: string
    dateOfEnrollment: Date
    invitationCode: string
    lastActiveDate: Date
  }) {
    super(input)
    this.dateOfEnrollment = input.dateOfEnrollment
    this.invitationCode = input.invitationCode
    this.lastActiveDate = input.lastActiveDate
  }
}
