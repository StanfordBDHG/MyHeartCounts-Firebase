//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { z } from 'zod'
import { UserType } from './userType.js'
import { dateConverter } from '../helpers/dateConverter.js'
import { Lazy } from '../helpers/lazy.js'
import { optionalish, optionalishDefault } from '../helpers/optionalish.js'
import { SchemaConverter } from '../helpers/schemaConverter.js'

export const userRegistrationInputConverter = new Lazy(
  () =>
    new SchemaConverter({
      schema: z.object({
        type: z.nativeEnum(UserType),
        disabled: optionalishDefault(z.boolean(), false),
        dateOfBirth: optionalish(dateConverter.schema),
        clinician: optionalish(z.string()),
        organization: optionalish(z.string()), // Added organization property
        receivesInactivityReminders: optionalish(z.boolean()),
        receivesQuestionnaireReminders: optionalish(z.boolean()),
        receivesRecommendationUpdates: optionalish(z.boolean()),
        receivesWeightAlerts: optionalish(z.boolean()), // Added for compatibility
        receivesMedicationUpdates: optionalish(z.boolean()), // Added for compatibility
        receivesVitalsReminders: optionalish(z.boolean()), // Added for compatibility
        receivesAppointmentReminders: optionalish(z.boolean()), // Added for compatibility
        language: optionalish(z.string()),
        timeZone: optionalish(z.string()),
        invitationCode: optionalish(z.string()), // Added for compatibility
      }),
      encode: (object) => ({
        type: object.type,
        disabled: object.disabled,
        dateOfBirth:
          object.dateOfBirth ? dateConverter.encode(object.dateOfBirth) : null,
        clinician: object.clinician ?? null,
        organization: object.organization ?? null,
        receivesInactivityReminders: object.receivesInactivityReminders ?? null,
        receivesQuestionnaireReminders:
          object.receivesQuestionnaireReminders ?? null,
        receivesRecommendationUpdates:
          object.receivesRecommendationUpdates ?? null,
        receivesWeightAlerts: object.receivesWeightAlerts ?? null,
        receivesMedicationUpdates: object.receivesMedicationUpdates ?? null,
        receivesVitalsReminders: object.receivesVitalsReminders ?? null,
        receivesAppointmentReminders: object.receivesAppointmentReminders ?? null,
        language: object.language ?? null,
        timeZone: object.timeZone ?? null,
        invitationCode: object.invitationCode ?? null,
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
  type: z.nativeEnum(UserType),
  disabled: optionalishDefault(z.boolean(), false),
  organization: optionalish(z.string()),
})

export type UserClaims = z.output<typeof userClaimsSchema>

export class UserRegistration {
  // Stored Properties

  readonly type: UserType
  readonly disabled: boolean

  readonly dateOfBirth?: Date
  readonly clinician?: string
  readonly organization?: string

  readonly receivesInactivityReminders?: boolean
  readonly receivesQuestionnaireReminders?: boolean
  readonly receivesRecommendationUpdates?: boolean
  readonly receivesWeightAlerts?: boolean
  readonly receivesMedicationUpdates?: boolean
  readonly receivesVitalsReminders?: boolean
  readonly receivesAppointmentReminders?: boolean

  readonly language?: string
  readonly timeZone?: string
  readonly invitationCode?: string

  // Computed Properties

  get claims(): UserClaims {
    return {
      type: this.type,
      disabled: this.disabled,
      organization: this.organization,
    }
  }

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
  }) {
    this.type = input.type
    this.disabled = input.disabled
    this.dateOfBirth = input.dateOfBirth
    this.clinician = input.clinician
    this.organization = input.organization
    this.receivesInactivityReminders = input.receivesInactivityReminders
    this.receivesQuestionnaireReminders = input.receivesQuestionnaireReminders
    this.receivesRecommendationUpdates = input.receivesRecommendationUpdates
    this.receivesWeightAlerts = input.receivesWeightAlerts
    this.receivesMedicationUpdates = input.receivesMedicationUpdates
    this.receivesVitalsReminders = input.receivesVitalsReminders
    this.receivesAppointmentReminders = input.receivesAppointmentReminders
    this.language = input.language
    this.timeZone = input.timeZone
    this.invitationCode = input.invitationCode
  }
}
