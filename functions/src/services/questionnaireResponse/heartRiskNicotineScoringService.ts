//
// This source file is part of the MyHeartCounts-Firebase project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { randomUUID } from 'crypto'
import {
  type Score,
  type FHIRQuestionnaireResponse,
  type FHIRObservation,
} from '@stanfordbdhg/myheartcounts-models'
import { logger } from 'firebase-functions'
import {
  scoreToObservation,
  getNicotineObservationConfig,
} from './fhirObservationConverter.js'
import { DefaultNicotineScoreCalculator } from './nicotineScoringService.js'
import { QuestionnaireResponseService } from './questionnaireResponseService.js'
import {
  type Document,
  type DatabaseService,
} from '../database/databaseService.js'
import type { MessageService } from '../message/messageService.js'

export class HeartRiskNicotineScoringQuestionnaireResponseService extends QuestionnaireResponseService {
  private readonly databaseService: DatabaseService
  private readonly messageService: MessageService
  private readonly scoreCalculator: DefaultNicotineScoreCalculator

  constructor(input: {
    databaseService: DatabaseService
    messageService: MessageService
  }) {
    super()
    this.databaseService = input.databaseService
    this.messageService = input.messageService
    this.scoreCalculator = new DefaultNicotineScoreCalculator()
  }

  async handle(
    userId: string,
    response: Document<FHIRQuestionnaireResponse>,
    options: { isNew: boolean },
  ): Promise<boolean> {
    // Check if this service handles this questionnaire type
    const targetQuestionnaireUrls = [
      'https://myheartcounts.stanford.edu/fhir/survey/heartRisk',
    ]

    if (!targetQuestionnaireUrls.includes(response.content.questionnaire)) {
      return false
    }

    try {
      // Calculate score from smoking question only
      const score = this.calculateScore(response.content)
      if (score === null) return false

      // Store FHIR observation in the same collection as the dedicated nicotine questionnaire
      await this.storeFHIRObservation(userId, response.id, score)

      logger.info(
        `HeartRiskNicotineScoringService: Processed Heart Risk questionnaire smoking response for user ${userId}, overall score: ${score.overallScore}`,
      )

      return true
    } catch (error) {
      logger.error(
        `HeartRiskNicotineScoringService: Error processing Heart Risk questionnaire smoking response for user ${userId}: ${String(error)}`,
      )
      throw error
    }
  }

  private calculateScore(response: FHIRQuestionnaireResponse): Score | null {
    try {
      const smokingStatus = this.extractSmokingStatus(response)
      if (smokingStatus === null) {
        logger.warn(
          'No smoking status found in Heart Risk questionnaire response',
        )
        return null
      }
      return this.scoreCalculator.calculate(smokingStatus)
    } catch (error) {
      logger.error(
        `Failed to calculate nicotine score from Heart Risk questionnaire: ${String(error)}`,
      )
      return null
    }
  }

  private extractSmokingStatus(
    response: FHIRQuestionnaireResponse,
  ): string | null {
    // Expected linkId for the smoking question in Heart Risk questionnaire
    const linkId = '1a18f004-e6ab-4ee8-d5b2-284389d15e14'

    try {
      const responseItem = response.leafResponseItem(linkId)
      if (!responseItem?.answer || responseItem.answer.length === 0) {
        return null
      }

      const answer = responseItem.answer[0]
      if (answer.valueCoding?.display) {
        return answer.valueCoding.display
      }

      logger.warn(`No valueCoding.display found for linkId '${linkId}'`)
      return null
    } catch (error) {
      logger.warn(
        `Failed to extract smoking status for ${linkId}: ${String(error)}`,
      )
      return null
    }
  }

  private async storeFHIRObservation(
    userId: string,
    questionnaireResponseId: string,
    score: Score,
  ): Promise<void> {
    const config = getNicotineObservationConfig()
    const observationId = randomUUID()
    const observation = scoreToObservation(
      score,
      config,
      questionnaireResponseId,
      observationId,
      userId,
    )

    // Store in the same collection as the dedicated nicotine questionnaire
    const collectionName =
      'HealthObservations_MHCCustomSampleTypeNicotineExposure'

    return this.databaseService.runTransaction((collections, transaction) => {
      const ref = collections
        .userHealthObservations(userId, collectionName)
        .doc(observationId)
      transaction.set(ref, observation)
    })
  }
}
