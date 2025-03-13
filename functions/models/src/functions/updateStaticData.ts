//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { z } from 'zod'
import { optionalishDefault } from '../helpers/optionalish.js'

export enum CachingStrategy {
  expectCache = 'expectCache',
  ignoreCache = 'ignoreCache',
  updateCache = 'updateCache',
  updateCacheIfNeeded = 'updateCacheIfNeeded',
}

export enum StaticDataComponent {
  questionnaires = 'questionnaires',
  videoSections = 'videoSections',
}

export const updateStaticDataInputSchema = z.object({
  only: optionalishDefault(
    z.array(z.nativeEnum(StaticDataComponent)),
    Object.values(StaticDataComponent),
  ),
  cachingStrategy: optionalishDefault(
    z.nativeEnum(CachingStrategy),
    CachingStrategy.updateCacheIfNeeded,
  ),
})
export type UpdateStaticDataInput = z.input<typeof updateStaticDataInputSchema>
export type UpdateStaticDataOutput = Record<string, never>
