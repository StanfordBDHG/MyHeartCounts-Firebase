//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  average,
  type FHIRQuestionnaireResponse,
  SymptomScore,
} from '@stanfordbdhg/engagehf-models'
import { type SymptomScoreCalculator } from './symptomScoreCalculator.js'

export class DefaultSymptomScoreCalculator implements SymptomScoreCalculator {
  // Methods

  calculate(questionnaireResponse: FHIRQuestionnaireResponse): SymptomScore {
    const response = questionnaireResponse.symptomQuestionnaireResponse

    const result = {
      questionnaireResponseId: questionnaireResponse.id,
      date: questionnaireResponse.authored,
      overallScore: 0,
      socialLimitsScore: undefined as number | undefined,
      physicalLimitsScore: undefined as number | undefined,
      qualityOfLifeScore: undefined as number | undefined,
      symptomFrequencyScore: undefined as number | undefined,
      dizzinessScore: response.answer9,
    }

    const physicalLimitsAnswers = [
      response.answer1a,
      response.answer1b,
      response.answer1c,
    ]
      .filter((x) => x !== 6)
      .map((x) => (100 * (x - 1)) / 4)

    result.physicalLimitsScore =
      physicalLimitsAnswers.length >= 2 ?
        average(physicalLimitsAnswers)
      : undefined

    const symptomFrequencyAnswers = [
      (response.answer2 - 1) / 4,
      (response.answer3 - 1) / 6,
      (response.answer4 - 1) / 6,
      (response.answer5 - 1) / 4,
    ].map((x) => x * 100)

    result.symptomFrequencyScore = average(symptomFrequencyAnswers)

    const qualityOfLifeAnswers = [response.answer6, response.answer7].map(
      (x) => (100 * (x - 1)) / 4,
    )
    result.qualityOfLifeScore = average(qualityOfLifeAnswers)

    const socialLimitsAnswers = [
      response.answer8a,
      response.answer8b,
      response.answer8c,
    ]
      .filter((x) => x !== 6)
      .map((x) => (100 * (x - 1)) / 4)

    result.socialLimitsScore =
      socialLimitsAnswers.length >= 2 ? average(socialLimitsAnswers) : undefined

    const domainScores = [
      result.physicalLimitsScore,
      result.symptomFrequencyScore,
      result.qualityOfLifeScore,
      result.socialLimitsScore,
    ].flatMap((score) => (score !== undefined ? [score] : []))
    result.overallScore = average(domainScores) ?? 0

    return new SymptomScore(result)
  }
}
