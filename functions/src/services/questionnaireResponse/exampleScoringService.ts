//
// This source file is part of the MyHeartCounts-Firebase project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  Score,
  type FHIRQuestionnaireResponse,
} from '@stanfordbdhg/myheartcounts-models'
import { logger } from 'firebase-functions'
import { QuestionnaireResponseService } from './questionnaireResponseService.js'
import {
  type Document,
  type DatabaseService,
} from '../database/databaseService.js'
import type { MessageService } from '../message/messageService.js'

export interface ScoreCalculator {
  calculate(answers: Record<string, boolean>): Score
}

export class DietScoreCalculator implements ScoreCalculator {
  calculate(answers: Record<string, boolean>): Score {
    const categoryScores = {
      fruitsVegetables: this.calculateFruitsVegetablesScore(answers),
      fat: this.calculateFatScore(answers),
      starchyFoods: this.calculateStarchyFoodsScore(answers),
      sugar: this.calculateSugarScore(answers),
      fermentedFoods: this.calculateFermentedFoodsScore(answers),
      salt: this.calculateSaltScore(answers),
      alcohol: this.calculateAlcoholScore(answers),
    }

    const overallScore = this.calculateOverallScore(categoryScores)

    return new Score({
      date: new Date(),
      overallScore: overallScore,
      domainScores: categoryScores,
    })
  }

  private calculateFruitsVegetablesScore(
    answers: Record<string, boolean>,
  ): number {
    const questions = [
      '92a6518b-61dd-442c-8082-09c3457daada', // Do you eat fruit and/or vegetables every day?
      'bbf31b7d-ea50-45bf-88a9-5c5c21466ce8', // Do you eat multiple varieties of fruit each week?
      '6616bfe1-d22f-488f-8ba6-0695cf19f634', // Do you eat multiple varieties of vegetables each week?
    ]
    return this.calculateCategoryScore(questions, answers, true)
  }

  private calculateFatScore(answers: Record<string, boolean>): number {
    const questions = [
      'fee4378b-c67a-4bf3-d99f-e94092207ee2', // Do you choose baked, steamed or grilled options when available, rather than fried foods?
      'ff78ee6d-a8ad-4d7b-80e1-2894dca64065', // Do you opt for lean cuts of meat or remove visible fat (e.g. skin on chicken, rind on bacon)?
      '50a6fdb1-d90c-416a-86a8-bf07602b701c', // Did you eat any oily fish last week (e.g. salmon, mackerel, sardines)?
      'ba4c8cee-f422-4a8a-8abc-e4418d8a87d1', // Do you include some unsalted nuts and seeds in your diet?
    ]
    return this.calculateCategoryScore(questions, answers, true)
  }

  private calculateStarchyFoodsScore(answers: Record<string, boolean>): number {
    const questions = [
      '055647aa-77aa-4877-81ae-40a2f08b8c5e', // Do you base your main meals around starchy foods (e.g., potatoes, pasta, rice, bread)?
      '784f7a2c-6ec8-414b-caa4-b59f1e8a6a1c', // Do you regularly include beans and/or lentils in your diet?
    ]
    return this.calculateCategoryScore(questions, answers, true)
  }

  private calculateSugarScore(answers: Record<string, boolean>): number {
    const questions = [
      '016e5729-7381-455d-b888-38e9e4365fa8', // Do you regularly eat sugar-coated breakfast cereals or add sugar to your breakfast cereals?
      '99e55082-b818-44c7-878b-8da477b300cc', // Do you add sugar to your drinks? (sweet tea, sugar in coffee/tea, etc)
      'a39e0c58-32a5-4ace-9980-e42363ae898d', // Do you regularly drink sugar sweetened soda? (pepsi, sprite, etc)
      'df1d2dcd-5087-4120-86b1-ca811498c655', // Do you regularly eat cakes, sweets, chocolate or biscuits?
    ]
    return this.calculateCategoryScore(questions, answers, false)
  }

  private calculateFermentedFoodsScore(
    answers: Record<string, boolean>,
  ): number {
    const questions = [
      '7d376d7b-4167-49b3-8600-683af1534e77', // Do you regularly eat greek or 'live' yogurt?
      'e5208b21-21d1-4f88-8c22-0580d4457172', // Do you regularly eat fermented foods (e.g. Kimchi, Sauerkraut)?
      '96ee1662-9b70-4f72-8f48-08ee91252d49', // Do you regularly have fermented drinks (e.g Kombucha, Kefir)?
    ]
    return this.calculateCategoryScore(questions, answers, true)
  }

  private calculateSaltScore(answers: Record<string, boolean>): number {
    const questions = [
      'a713aac6-c812-46e7-896c-ab9209d197fc', // Do you regularly add salt to food during cooking?
      'ed1856e6-5ba3-4ca2-85d3-1ff744ff492e', // Do you regularly eat savory snacks at work (e.g. chips, salted nuts)?
      '7e2609d6-2b29-4d70-8cbb-69f60d985876', // Do you regularly eat pre-prepared meals (e.g. sandwiches, ready meals, canned soups)?
      'a7ea3c2f-2f87-4fe3-811e-fe3c85a7c1b1', // Do you regularly eat processed meats (e.g. ham, bacon, salami)?
    ]
    return this.calculateCategoryScore(questions, answers, false)
  }

  private calculateAlcoholScore(answers: Record<string, boolean>): number {
    const questions = [
      '1ce40499-9d9c-4f91-e7c5-da0986503406', // Do you drink less than 1 unit of alcohol/day (women) or less than 2 units/day (men)?
    ]
    return this.calculateCategoryScore(questions, answers, true)
  }

  private calculateCategoryScore(
    questions: string[],
    answers: Record<string, boolean>,
    positiveScoring: boolean,
  ): number {
    let score = 0
    let totalQuestions = questions.length

    for (const questionId of questions) {
      const answer = answers[questionId]
      if (answer !== undefined) {
        if (positiveScoring) {
          score += answer ? 1 : 0
        } else {
          score += answer ? 0 : 1
        }
      } else {
        totalQuestions -= 1
      }
    }

    return totalQuestions > 0 ? (score / totalQuestions) * 100 : 0
  }

  private calculateOverallScore(
    categoryScores: Record<string, number>,
  ): number {
    const weights = {
      fruitsVegetables: 0.2, // 20% - High importance for heart health
      fat: 0.18, // 18% - Important for cardiovascular health
      starchyFoods: 0.12, // 12% - Moderate importance
      sugar: 0.18, // 18% - High negative impact on heart health
      fermentedFoods: 0.1, // 10% - Emerging importance for gut health
      salt: 0.17, // 17% - High importance for blood pressure
      alcohol: 0.05, // 5% - Lower weight but still important
    }

    let weightedSum = 0
    let totalWeight = 0

    for (const [category, score] of Object.entries(categoryScores)) {
      const weight = weights[category as keyof typeof weights]
      if (weight !== undefined) {
        weightedSum += score * weight
        totalWeight += weight
      }
    }

    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0
  }
}

export class DietScoringQuestionnaireResponseService extends QuestionnaireResponseService {
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
    const targetQuestionnaireUrls = ['Diet']
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
        `DietScoringService: Processed diet questionnaire response for user ${userId}, overall score: ${score.overallScore}`,
      )

      return true
    } catch (error) {
      logger.error(
        `DietScoringService: Error processing diet questionnaire response for user ${userId}: ${String(error)}`,
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

  private extractAnswers(
    response: FHIRQuestionnaireResponse,
  ): Record<string, boolean> {
    const answers: Record<string, boolean> = {}

    // All boolean question linkIds from the Diet questionnaire
    const questionLinkIds = [
      // Fruits and Vegetables
      '92a6518b-61dd-442c-8082-09c3457daada',
      'bbf31b7d-ea50-45bf-88a9-5c5c21466ce8',
      '6616bfe1-d22f-488f-8ba6-0695cf19f634',
      // Fat
      'fee4378b-c67a-4bf3-d99f-e94092207ee2',
      'ff78ee6d-a8ad-4d7b-80e1-2894dca64065',
      '50a6fdb1-d90c-416a-86a8-bf07602b701c',
      'ba4c8cee-f422-4a8a-8abc-e4418d8a87d1',
      // Starchy Foods
      '055647aa-77aa-4877-81ae-40a2f08b8c5e',
      '784f7a2c-6ec8-414b-caa4-b59f1e8a6a1c',
      // Sugar
      '016e5729-7381-455d-b888-38e9e4365fa8',
      '99e55082-b818-44c7-878b-8da477b300cc',
      'a39e0c58-32a5-4ace-9980-e42363ae898d',
      'df1d2dcd-5087-4120-86b1-ca811498c655',
      // Fermented Foods
      '7d376d7b-4167-49b3-8600-683af1534e77',
      'e5208b21-21d1-4f88-8c22-0580d4457172',
      '96ee1662-9b70-4f72-8f48-08ee91252d49',
      // Salt
      'a713aac6-c812-46e7-896c-ab9209d197fc',
      'ed1856e6-5ba3-4ca2-85d3-1ff744ff492e',
      '7e2609d6-2b29-4d70-8cbb-69f60d985876',
      'a7ea3c2f-2f87-4fe3-811e-fe3c85a7c1b1',
      // Alcohol
      '1ce40499-9d9c-4f91-e7c5-da0986503406',
    ]

    for (const linkId of questionLinkIds) {
      try {
        const answer = this.extractBooleanAnswer(linkId, response)
        if (answer !== null) {
          answers[linkId] = answer
        }
      } catch (error) {
        logger.warn(`Failed to extract answer for ${linkId}: ${String(error)}`)
      }
    }

    return answers
  }

  private extractBooleanAnswer(
    linkId: string,
    response: FHIRQuestionnaireResponse,
  ): boolean | null {
    const responseItem = response.leafResponseItem(linkId)
    if (!responseItem?.answer || responseItem.answer.length === 0) {
      return null
    }

    const answer = responseItem.answer[0]
    if (answer.valueBoolean !== undefined) {
      return answer.valueBoolean
    }

    logger.warn(`No boolean value found for linkId '${linkId}'`)
    return null
  }

  private async getLatestScore(
    userId: string,
  ): Promise<Document<Score> | undefined> {
    const result = await this.databaseService.getQuery<Score>((collections) =>
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
    // Define business logic for significant diet score decline
    const threshold = 15 // 15 point decline in diet score
    return (
      previousScore.content.overallScore - currentScore.overallScore > threshold
    )
  }

  private async handleScoreDecline(
    userId: string,
    currentScore: Score,
    previousScore: Document<Score>,
  ): Promise<void> {
    // Implement decline handling logic for diet scores
    logger.warn(
      `Significant diet score decline detected for user ${userId}: ${previousScore.content.overallScore} -> ${currentScore.overallScore}`,
    )

    // Could send a message to the user or healthcare provider about diet changes
    // await this.messageService.addMessage(userId, AlertMessage.createDietScoreDecline(...))
  }
}
