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
  messages = 'messages',
  heartRateObservations = 'heartRateObservations',
}

export const defaultSeedInputSchema = z.object({
  date: dateConverter.schema.default(new Date().toISOString()),
  only: optionalishDefault(
    z.nativeEnum(DebugDataComponent).array(),
    Object.values(DebugDataComponent),
  ),
  onlyUserCollections: optionalishDefault(
    z.nativeEnum(UserDebugDataComponent).array(),
    Object.values(UserDebugDataComponent),
  ),
  staticData: optionalish(updateStaticDataInputSchema),
  userData: optionalishDefault(
    z
      .object({
        userId: z.string(),
        only: optionalishDefault(
          z.nativeEnum(UserDebugDataComponent).array(),
          Object.values(UserDebugDataComponent),
        ),
      })
      .array(),
    [],
  ),
})

export type DefaultSeedInput = z.input<typeof defaultSeedInputSchema>
export type DefaultSeedOutput = Record<string, never>
