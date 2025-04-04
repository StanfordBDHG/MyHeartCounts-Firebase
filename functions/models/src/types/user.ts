//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

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
          lastActiveDate: dateConverter.schema,
        })
        .transform((values) => new User(values)),
      encode: (object) => ({
        ...userRegistrationConverter.value.encode(object),
        lastActiveDate: dateConverter.encode(object.lastActiveDate),
        dateOfEnrollment: dateConverter.encode(object.dateOfEnrollment),
      }),
    }),
)

export class User extends UserRegistration {
  // Properties

  readonly dateOfEnrollment: Date
  readonly lastActiveDate: Date

  // Constructor

  constructor(input: {
    type: UserType
    disabled: boolean
    dateOfBirth?: Date
    clinician?: string
    organization?: string
    receivesInactivityReminders?: boolean
    receivesQuestionnaireReminders?: boolean
    receivesRecommendationUpdates?: boolean
    receivesWeightAlerts?: boolean
    receivesMedicationUpdates?: boolean
    receivesVitalsReminders?: boolean
    receivesAppointmentReminders?: boolean
    language?: string
    timeZone?: string
    invitationCode?: string
    dateOfEnrollment: Date
    lastActiveDate: Date
  }) {
    super(input)
    this.dateOfEnrollment = input.dateOfEnrollment
    this.lastActiveDate = input.lastActiveDate
  }
}
