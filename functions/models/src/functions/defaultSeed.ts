//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { z } from 'zod'
import { updateStaticDataInputSchema } from './updateStaticData.js'
import { dateConverter } from '../helpers/dateConverter.js'
import { optionalish, optionalishDefault } from '../helpers/optionalish.js'

export enum DebugDataComponent {
  users = 'users',
}

export enum UserDebugDataComponent {
  consent = 'consent',
  appointments = 'appointments',
  messages = 'messages',
  bodyWeightObservations = 'bodyWeightObservations',
  bloodPressureObservations = 'bloodPressureObservations',
  dryWeightObservations = 'dryWeightObservations',
  heartRateObservations = 'heartRateObservations',
  creatinineObservations = 'creatinineObservations',
  eGfrObservations = 'eGfrObservations',
  potassiumObservations = 'potassiumObservations',
  questionnaireResponses = 'questionnaireResponses',
  symptomScores = 'symptomScores',
  stepCountObservations = 'stepCountObservations',
}

export const defaultSeedInputSchema = z.object({
  date: dateConverter.schema.default(new Date().toISOString()),
  only: optionalishDefault(
    z.nativeEnum(DebugDataComponent).array(),
    Object.values(DebugDataComponent),
  ),
  onlyUserCollections: optionalishDefault(
    z.union([
      z.nativeEnum(UserDebugDataComponent),
      z.literal('healthKitObservations') // Add custom value for HealthKit
    ]).array(),
    [...Object.values(UserDebugDataComponent), 'healthKitObservations'],
  ),
  staticData: optionalish(updateStaticDataInputSchema),
  userData: optionalishDefault(
    z
      .object({
        userId: z.string(),
        only: optionalishDefault(
          z.union([
            z.nativeEnum(UserDebugDataComponent),
            z.literal('healthKitObservations') // Add custom value for HealthKit
          ]).array(),
          [...Object.values(UserDebugDataComponent), 'healthKitObservations'],
        ),
      })
      .array(),
    [],
  ),
})

export type DefaultSeedInput = z.input<typeof defaultSeedInputSchema>
export type DefaultSeedOutput = Record<string, never>
