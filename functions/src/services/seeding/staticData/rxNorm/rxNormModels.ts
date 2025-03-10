//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { optionalish } from '@stanfordbdhg/engagehf-models'
import { z } from 'zod'

export const rxTermInfo = z.object({
  displayName: optionalish(z.string()),
  fullName: optionalish(z.string()),
  rxnormDoseForm: optionalish(z.string()),
  strength: optionalish(z.string()),
})

export type RxTermInfo = z.output<typeof rxTermInfo>

export const rxNormPropConcept = z.object({
  propCategory: z.string(),
  propName: z.string(),
  propValue: z.string(),
})

export type RxNormPropConcept = z.output<typeof rxNormPropConcept>

export const rxNormAllPropertiesResponse = z.object({
  propConceptGroup: z.object({
    propConcept: rxNormPropConcept.array(),
  }),
})

export type RxNormAllPropertiesResponse = z.output<
  typeof rxNormAllPropertiesResponse
>

export const rxNormConceptProperty = z.object({
  rxcui: z.string(),
  name: z.string(),
  tty: z.string(),
  language: z.string(),
})

export type RxNormConceptProperty = z.output<typeof rxNormConceptProperty>

export const rxNormConceptGroup = z.object({
  tty: z.string(),
  conceptProperties: rxNormConceptProperty.array(),
})

export const rxNormDrugGroup = z.object({
  conceptGroup: rxNormConceptGroup.array(),
})

export const rxNormRelatedDrugGroupResponse = z.object({
  relatedGroup: optionalish(rxNormDrugGroup),
})

export type RxNormRelatedDrugGroupResponse = z.output<
  typeof rxNormRelatedDrugGroupResponse
>
