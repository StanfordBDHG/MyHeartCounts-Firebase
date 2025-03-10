//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { z } from 'zod'
import { dateConverter } from '../helpers/dateConverter.js'
import { Lazy } from '../helpers/lazy.js'
import { optionalish } from '../helpers/optionalish.js'
import { SchemaConverter } from '../helpers/schemaConverter.js'

export const symptomScoreConverter = new Lazy(
  () =>
    new SchemaConverter({
      schema: z
        .object({
          questionnaireResponseId: optionalish(z.string()),
          date: dateConverter.schema,
          overallScore: z.number().min(0).max(100),
          physicalLimitsScore: optionalish(z.number().min(0).max(100)),
          symptomFrequencyScore: optionalish(z.number().min(0).max(100)),
          socialLimitsScore: optionalish(z.number().min(0).max(100)),
          qualityOfLifeScore: optionalish(z.number().min(0).max(100)),
          dizzinessScore: z.number().min(0).max(5),
        })
        .transform((values) => new SymptomScore(values)),
      encode: (object) => ({
        questionnaireResponseId: object.questionnaireResponseId ?? null,
        date: dateConverter.encode(object.date),
        overallScore: object.overallScore,
        physicalLimitsScore: object.physicalLimitsScore ?? null,
        symptomFrequencyScore: object.symptomFrequencyScore ?? null,
        socialLimitsScore: object.socialLimitsScore ?? null,
        qualityOfLifeScore: object.qualityOfLifeScore ?? null,
        dizzinessScore: object.dizzinessScore,
      }),
    }),
)

export class SymptomScore {
  // Properties

  readonly questionnaireResponseId?: string
  readonly date: Date
  readonly overallScore: number
  readonly physicalLimitsScore?: number
  readonly symptomFrequencyScore?: number
  readonly socialLimitsScore?: number
  readonly qualityOfLifeScore?: number
  readonly dizzinessScore: number

  // Constructor

  constructor(input: {
    questionnaireResponseId?: string
    date: Date
    overallScore: number
    physicalLimitsScore?: number
    symptomFrequencyScore?: number
    socialLimitsScore?: number
    qualityOfLifeScore?: number
    dizzinessScore: number
  }) {
    this.questionnaireResponseId = input.questionnaireResponseId
    this.date = input.date
    this.overallScore = input.overallScore
    this.physicalLimitsScore = input.physicalLimitsScore
    this.symptomFrequencyScore = input.symptomFrequencyScore
    this.socialLimitsScore = input.socialLimitsScore
    this.qualityOfLifeScore = input.qualityOfLifeScore
    this.dizzinessScore = input.dizzinessScore
  }
}
