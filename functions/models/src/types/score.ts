//
// This source file is part of the MyHeartCounts-Firebase project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { z } from 'zod'
import { dateConverter } from '../helpers/dateConverter.js'
import { optionalish } from '../helpers/optionalish.js'
import { SchemaConverter } from '../helpers/schemaConverter.js'

export class Score {
  readonly questionnaireResponseId?: string
  readonly date: Date
  readonly overallScore: number
  readonly domainScores: Record<string, number | undefined>

  constructor(input: {
    questionnaireResponseId?: string
    date: Date
    overallScore: number
    domainScores: Record<string, number | undefined>
  }) {
    this.questionnaireResponseId = input.questionnaireResponseId
    this.date = input.date
    this.overallScore = input.overallScore
    this.domainScores = input.domainScores
  }
}

export const scoreConverter = new SchemaConverter({
  schema: z
    .object({
      questionnaireResponseId: optionalish(z.string()),
      date: dateConverter.schema,
      overallScore: z.number().min(0).max(100),
      domainScores: z.record(z.number().min(0).max(100).optional()),
    })
    .transform((values) => new Score(values)),
  encode: (object) => ({
    questionnaireResponseId: object.questionnaireResponseId ?? null,
    date: dateConverter.encode(object.date),
    overallScore: object.overallScore,
    domainScores: object.domainScores,
  }),
})
