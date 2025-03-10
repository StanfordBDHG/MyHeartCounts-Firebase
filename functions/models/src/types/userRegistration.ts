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
        organization: optionalish(z.string()),
        dateOfBirth: optionalish(dateConverter.schema),
        clinician: optionalish(z.string()),
        providerName: optionalish(z.string()),
        receivesAppointmentReminders: optionalishDefault(z.boolean(), true),
        receivesInactivityReminders: optionalishDefault(z.boolean(), true),
        receivesMedicationUpdates: optionalishDefault(z.boolean(), true),
        receivesQuestionnaireReminders: optionalishDefault(z.boolean(), true),
        receivesRecommendationUpdates: optionalishDefault(z.boolean(), true),
        receivesVitalsReminders: optionalishDefault(z.boolean(), true),
        receivesWeightAlerts: optionalishDefault(z.boolean(), true),
        language: optionalish(z.string()),
        timeZone: optionalish(z.string()),
      }),
      encode: (object) => ({
        type: object.type,
        disabled: object.disabled,
        organization: object.organization ?? null,
        dateOfBirth:
          object.dateOfBirth ? dateConverter.encode(object.dateOfBirth) : null,
        clinician: object.clinician ?? null,
        providerName: object.providerName ?? null,
        receivesAppointmentReminders: object.receivesAppointmentReminders,
        receivesInactivityReminders: object.receivesInactivityReminders,
        receivesMedicationUpdates: object.receivesMedicationUpdates,
        receivesQuestionnaireReminders: object.receivesQuestionnaireReminders,
        receivesRecommendationUpdates: object.receivesRecommendationUpdates,
        receivesVitalsReminders: object.receivesVitalsReminders,
        receivesWeightAlerts: object.receivesWeightAlerts,
        language: object.language ?? null,
        timeZone: object.timeZone ?? null,
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
  organization: optionalish(z.string()),
  disabled: optionalishDefault(z.boolean(), false),
})

export type UserClaims = z.output<typeof userClaimsSchema>

export class UserRegistration {
  // Stored Properties

  readonly type: UserType
  readonly disabled: boolean
  readonly organization?: string

  readonly dateOfBirth?: Date
  readonly clinician?: string
  readonly providerName?: string

  readonly receivesAppointmentReminders: boolean
  readonly receivesInactivityReminders: boolean
  readonly receivesMedicationUpdates: boolean
  readonly receivesQuestionnaireReminders: boolean
  readonly receivesRecommendationUpdates: boolean
  readonly receivesVitalsReminders: boolean
  readonly receivesWeightAlerts: boolean

  readonly language?: string
  readonly timeZone?: string

  // Computed Properties

  get claims(): UserClaims {
    const result: UserClaims = {
      type: this.type,
      disabled: this.disabled,
    }
    if (this.organization !== undefined) {
      result.organization = this.organization
    }
    return result
  }

  // Constructor

  constructor(input: {
    type: UserType
    disabled: boolean
    organization?: string
    dateOfBirth?: Date
    clinician?: string
    providerName?: string
    receivesAppointmentReminders: boolean
    receivesInactivityReminders: boolean
    receivesMedicationUpdates: boolean
    receivesQuestionnaireReminders: boolean
    receivesRecommendationUpdates: boolean
    receivesVitalsReminders: boolean
    receivesWeightAlerts: boolean
    language?: string
    timeZone?: string
  }) {
    this.type = input.type
    this.disabled = input.disabled
    this.organization = input.organization
    this.dateOfBirth = input.dateOfBirth
    this.clinician = input.clinician
    this.providerName = input.providerName
    this.receivesAppointmentReminders = input.receivesAppointmentReminders
    this.receivesInactivityReminders = input.receivesInactivityReminders
    this.receivesMedicationUpdates = input.receivesMedicationUpdates
    this.receivesQuestionnaireReminders = input.receivesQuestionnaireReminders
    this.receivesRecommendationUpdates = input.receivesRecommendationUpdates
    this.receivesVitalsReminders = input.receivesVitalsReminders
    this.receivesWeightAlerts = input.receivesWeightAlerts
    this.language = input.language
    this.timeZone = input.timeZone
  }
}
