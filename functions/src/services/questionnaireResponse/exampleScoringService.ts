//
// This source file is part of the MyHeartCounts-Firebase project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { Score, type FHIRQuestionnaireResponse } from '@stanfordbdhg/myheartcounts-models'
import type { Document } from '../database/databaseService.js'
import { logger } from 'firebase-functions'
import type { DatabaseService } from '../database/databaseService.js'
import type { MessageService } from '../message/messageService.js'
import { QuestionnaireResponseService } from './questionnaireResponseService.js'

export interface ScoreCalculator {
  calculate(answers: Record<string, number>): Score
}

export class ExampleScoreCalculator implements ScoreCalculator {
  calculate(answers: Record<string, number>): Score {
    const answerValues = Object.values(answers).filter((x) => x !== null)
    
    // Transform answers from 1-5 scale to 0-100 scale
    const transformedAnswers = answerValues.map((x) => (100 * (x - 1)) / 4)
    
    // Calculate overall score as average
    const overallScore = this.average(transformedAnswers)
    
    // Example domain scores (could be more sophisticated)
    const domainScores = {
      physical: this.average(transformedAnswers.slice(0, Math.ceil(transformedAnswers.length / 2))),
      mental: this.average(transformedAnswers.slice(Math.ceil(transformedAnswers.length / 2))),
    }
    
    return new Score({
      date: new Date(),
      overallScore: overallScore,
      domainScores: domainScores,
    })
  }

  private average(values: number[]): number {
    return values.length > 0 ? 
      values.reduce((sum, val) => sum + val, 0) / values.length : 0
  }
}

export class ExampleScoringQuestionnaireResponseService extends QuestionnaireResponseService {
  private readonly databaseService: DatabaseService
  private readonly messageService: MessageService
  private readonly scoreCalculator: ScoreCalculator

  constructor(input: {
    databaseService: DatabaseService
    messageService: MessageService
    scoreCalculator: ScoreCalculator
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
    const targetQuestionnaireUrls = ['example-questionnaire-id']
    if (!targetQuestionnaireUrls.includes(response.content.questionnaire)) {
      return false
    }

    try {
      // Calculate score
      const score = this.calculateScore(response.content)
      if (score === null) return false

      // Get previous score for comparison (optional)
      const previousScore = await this.getLatestScore(userId)

      // Store new score
      await this.updateScore(userId, response.id, score)

      // Implement business logic (e.g., decline detection)
      if (previousScore && this.isSignificantDecline(previousScore, score)) {
        await this.handleScoreDecline(userId, score, previousScore)
      }

      logger.info(
        `ExampleScoringService: Processed questionnaire response for user ${userId}, overall score: ${score.overallScore}`,
      )

      return true
    } catch (error) {
      logger.error(
        `ExampleScoringService: Error processing questionnaire response for user ${userId}: ${String(error)}`,
      )
      throw error
    }
  }

  private calculateScore(response: FHIRQuestionnaireResponse): Score | null {
    try {
      const answers = this.extractAnswers(response)
      return this.scoreCalculator.calculate(answers)
    } catch (error) {
      logger.error(`Failed to calculate score: ${String(error)}`)
      return null
    }
  }

  private extractAnswers(response: FHIRQuestionnaireResponse): Record<string, number> {
    const answers: Record<string, number> = {}
    
    // Example: Extract answers by linkId
    const questionLinkIds = ['question-1', 'question-2', 'question-3'] // Define your question IDs
    
    for (const linkId of questionLinkIds) {
      try {
        const answer = this.extractCodingAnswer(linkId, response)
        answers[linkId] = answer
      } catch (error) {
        logger.warn(`Failed to extract answer for ${linkId}: ${String(error)}`)
      }
    }
    
    return answers
  }

  private extractCodingAnswer(
    linkId: string,
    response: FHIRQuestionnaireResponse,
  ): number {
    const answers = response.leafResponseItem(linkId)?.answer ?? []
    if (answers.length !== 1) {
      throw new Error(
        `Expected exactly one answer for leaf response item with linkId '${linkId}', but found ${answers.length}.`,
      )
    }
    const code = answers[0].valueCoding?.code
    if (code === undefined) {
      throw new Error(
        `Expected a code for leaf response item with linkId '${linkId}', but found none.`,
      )
    }
    return parseInt(code, 10)
  }

  private async getLatestScore(userId: string): Promise<Document<Score> | undefined> {
    const result = await this.databaseService.getQuery<Score>(
      (collections) =>
        collections.userScores(userId).orderBy('date', 'desc').limit(1),
    )
    return result.at(0)
  }

  private async updateScore(
    userId: string,
    scoreId: string,
    score: Score,
  ): Promise<void> {
    return this.databaseService.runTransaction((collections, transaction) => {
      const ref = collections.userScores(userId).doc(scoreId)
      transaction.set(ref, score)
    })
  }

  private isSignificantDecline(
    previousScore: Document<Score>, 
    currentScore: Score,
  ): boolean {
    // Define your business logic for significant decline
    const threshold = 20 // 20 point decline
    return (previousScore.content.overallScore - currentScore.overallScore) > threshold
  }

  private async handleScoreDecline(
    userId: string,
    currentScore: Score,
    previousScore: Document<Score>,
  ): Promise<void> {
    // Implement decline handling logic (e.g., send alert, create message)
    logger.warn(
      `Significant score decline detected for user ${userId}: ${previousScore.content.overallScore} -> ${currentScore.overallScore}`,
    )
    
    // Example: Could send a message to the user or healthcare provider
    // await this.messageService.addMessage(userId, AlertMessage.createScoreDecline(...))
  }
}