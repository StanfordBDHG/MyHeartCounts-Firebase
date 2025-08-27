//
// This source file is part of the MyHeartCounts-Firebase project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { randomUUID } from 'crypto'
import {
  Score,
  type FHIRQuestionnaireResponse,
  type FHIRObservation,
} from '@stanfordbdhg/myheartcounts-models'
import { logger } from 'firebase-functions'
import {
  scoreToObservation,
  getNicotineObservationConfig,
  type QuestionnaireObservationConfig,
} from './fhirObservationConverter.js'
import { QuestionnaireResponseService } from './questionnaireResponseService.js'
import {
  type Document,
  type DatabaseService,
} from '../database/databaseService.js'
import type { MessageService } from '../message/messageService.js'

export interface NicotineScoreCalculator {
  calculate(smokingStatus: string): Score
}

export class DefaultNicotineScoreCalculator implements NicotineScoreCalculator {
  calculate(smokingStatus: string): Score {
    const overallScore = this.smokingStatusToScore(smokingStatus)

    return new Score({
      date: new Date(),
      overallScore: overallScore,
      domainScores: {
        statusScore: overallScore,
      },
    })
  }

  private smokingStatusToScore(smokingStatus: string): number {
    // Lookup table based on display values
    switch (smokingStatus) {
      case 'Never smoked/vaped':
        return 100
      case 'Quit >5 years ago':
        return 75
      case 'Quit 1- 5 years ago':
        return 50
      case 'Quit <1 year ago':
        return 25
      case 'Smoke/vape now':
        return 0
      default:
        logger.warn(`Unknown smoking status: ${smokingStatus}`)
        return 0
    }
  }
}

export class NicotineScoringQuestionnaireResponseService extends QuestionnaireResponseService {
  private readonly databaseService: DatabaseService
  private readonly messageService: MessageService
  private readonly scoreCalculator: NicotineScoreCalculator

  constructor(input: {
    databaseService: DatabaseService
    messageService: MessageService
    scoreCalculator: NicotineScoreCalculator
  }) {
    super()
    this.databaseService = input.databaseService
    this.messageService = input.messageService
    this.scoreCalculator = input.scoreCalculator
  }

  async handle(
    userId: string,
    response: Document<FHIRQuestionnaireResponse>,
    options: { isNew: boolean },
  ): Promise<boolean> {
    // Check if this service handles this questionnaire type
    const targetQuestionnaireUrls = [
      'https://myheartcounts.stanford.edu/fhir/survey/nicotineExposure',
    ]

    if (!targetQuestionnaireUrls.includes(response.content.questionnaire)) {
      return false
    }

    try {
      // Calculate score
      const score = this.calculateScore(response.content)
      if (score === null) return false

      // Get previous score for comparison (optional)
      const previousScore = await this.getLatestScore(userId)

      // Store FHIR observation
      await this.storeFHIRObservation(userId, response.id, score)

      // Implement business logic (e.g., decline detection)
      if (previousScore && this.isSignificantDecline(previousScore, score)) {
        await this.handleScoreDecline(userId, score, previousScore)
      }

      logger.info(
        `NicotineScoringService: Processed nicotine questionnaire response for user ${userId}, overall score: ${score.overallScore}`,
      )

      return true
    } catch (error) {
      logger.error(
        `NicotineScoringService: Error processing nicotine questionnaire response for user ${userId}: ${String(error)}`,
      )
      throw error
    }
  }

  private calculateScore(response: FHIRQuestionnaireResponse): Score | null {
    try {
      const smokingStatus = this.extractSmokingStatus(response)
      if (smokingStatus === null) {
        logger.warn(
          'No smoking status found in nicotine questionnaire response',
        )
        return null
      }
      return this.scoreCalculator.calculate(smokingStatus)
    } catch (error) {
      logger.error(`Failed to calculate nicotine score: ${String(error)}`)
      return null
    }
  }

  private extractSmokingStatus(
    response: FHIRQuestionnaireResponse,
  ): string | null {
    // Expected linkId for the nicotine/smoking question
    const linkId = 'a77ec6ab-8f37-4db4-8c5b-19a0d10964b9'

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

  private async getLatestScore(
    userId: string,
  ): Promise<Document<Score> | undefined> {
    const collectionName =
      'HealthObservations_MHCCustomSampleTypeNicotineExposure'
    const result = await this.databaseService.getQuery<FHIRObservation>(
      (collections) =>
        collections
          .userHealthObservations(userId, collectionName)
          .orderBy('effectiveDateTime', 'desc')
          .limit(1),
    )

    const latestObservation = result.at(0)
    if (!latestObservation) return undefined

    // Convert FHIR observation back to Score
    const score = this.observationToScore(latestObservation.content)
    return {
      id: latestObservation.id,
      content: score,
      path: latestObservation.path,
      lastUpdate: latestObservation.lastUpdate,
    }
  }

  private observationToScore(observation: FHIRObservation): Score {
    return new Score({
      overallScore: observation.valueQuantity?.value ?? 0,
      date: observation.effectiveDateTime ?? new Date(),
      domainScores: {},
    })
  }

  private isSignificantDecline(
    previousScore: Document<Score>,
    currentScore: Score,
  ): boolean {
    // Define business logic for significant nicotine score decline
    // With discrete scoring (0,25,50,75,100), a drop of 25+ points indicates significant decline
    const threshold = 25 // 25 point decline (e.g., 100→75, 75→50, etc.)
    return (
      previousScore.content.overallScore - currentScore.overallScore >=
      threshold
    )
  }

  private async handleScoreDecline(
    userId: string,
    currentScore: Score,
    previousScore: Document<Score>,
  ): Promise<void> {
    // Implement decline handling logic for nicotine scores
    logger.warn(
      `Significant nicotine score decline detected for user ${userId}: ${previousScore.content.overallScore} → ${currentScore.overallScore}`,
    )

    // Could send a message to the user or healthcare provider about smoking status changes
    // await this.messageService.addMessage(userId, AlertMessage.createNicotineScoreDecline(...))
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
    )

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
