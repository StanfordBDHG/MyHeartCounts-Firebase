//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  type FHIRQuestionnaireResponse,
  QuestionnaireReference,
  UserMessage,
  type User,
  type CachingStrategy,
  StaticDataComponent,
  type UserRegistration,
} from '@stanfordbdhg/myheartcounts-models'
import { logger } from 'firebase-functions'
import { _updateStaticData } from '../../functions/updateStaticData.js'
import { type Document } from '../database/databaseService.js'
import { type ServiceFactory } from '../factory/serviceFactory.js'

export interface TriggerService {
  // Event triggers
  userEnrolled(user: Document<User>): Promise<void>
  userCreated(userId: string): Promise<void>
  userUpdated(userId: string): Promise<void>
  processQuestionnaireResponse(
    userId: string,
    questionnaireResponse: Document<FHIRQuestionnaireResponse>,
  ): Promise<void>
  userObservationWritten(
    userId: string,
    observationType: string,
    documentId: string,
    document: Document<any>,
  ): Promise<void>

  // Added for compatibility
  questionnaireResponseWritten(
    userId: string,
    questionnaireResponseId: string,
    before?: Document<FHIRQuestionnaireResponse>,
    after?: Document<FHIRQuestionnaireResponse>,
  ): Promise<void>

  // Testing-only methods - exposed for coverage
  sendDailyReminders(): Promise<void>
  sendWeeklySymptomQuestionnaires(): Promise<void>
  updateStaticData(cachingStrategy: CachingStrategy): Promise<void>
  userRegistrationWritten(
    userId: string,
    document: Document<UserRegistration>,
  ): Promise<void>
}

export class TriggerServiceImpl implements TriggerService {
  // Properties

  private readonly factory: ServiceFactory

  // Constructor

  constructor(factory: ServiceFactory) {
    this.factory = factory
  }

  // Methods - Schedule

  async sendDailyReminders() {
    logger.debug(
      'TriggerService.sendDailyReminders(): No daily reminders configured',
    )
  }

  async sendWeeklySymptomQuestionnaires() {
    logger.debug(
      'TriggerService.sendWeeklySymptomQuestionnaires(): No users configured for weekly questionnaires',
    )
  }

  // Implementation of interface methods

  async userEnrolled(user: Document<User>): Promise<void> {
    logger.debug(`TriggerService.userEnrolled(${user.id})`)
    await this.userCreated(user.id)
  }

  async userObservationWritten(
    userId: string,
    observationType: string,
    documentId: string,
    document: Document<any>,
  ): Promise<void> {
    logger.debug(
      `TriggerService.userObservationWritten(${userId}, ${observationType}, ${documentId})`,
    )
  }

  // Methods - Events

  async userCreated(userId: string) {
    // Message service functionality removed
    logger.info(`TriggerService.userCreated(${userId}): User created`)
  }

  async userUpdated(userId: string) {
    logger.debug(`TriggerService.userUpdated(${userId})`)
  }

  async userRegistrationWritten(
    userId: string,
    document: Document<UserRegistration>,
  ) {
    logger.debug(`TriggerService.userRegistrationWritten(${userId})`)
  }

  async userQuestionnaireResponseWritten(
    userId: string,
    questionnaireResponseId: string,
    document: Document<FHIRQuestionnaireResponse>,
  ) {
    try {
      await this.processQuestionnaireResponse(userId, document)
    } catch (error) {
      logger.error(
        `TriggerService.userQuestionnaireResponseWritten(${userId}, ${questionnaireResponseId}): ${String(error)}`,
      )
    }
  }

  // Methods - Actions

  async updateStaticData(cachingStrategy: CachingStrategy) {
    await _updateStaticData(this.factory, {
      cachingStrategy,
      only: Object.values(StaticDataComponent),
    })
  }

  // Helpers - Implements TriggerService interface

  async processQuestionnaireResponse(
    userId: string,
    document: Document<FHIRQuestionnaireResponse>,
  ) {
    logger.debug(`processQuestionnaireResponse for user ${userId}`)
    const questionnaireResponseService = this.factory.questionnaireResponse()
    await questionnaireResponseService.handle(
      userId,
      document,
      { isNew: true }, // Default to new, can be refined based on context
    )
  }

  // Added for compatibility
  async questionnaireResponseWritten(
    userId: string,
    questionnaireResponseId: string,
    before?: Document<FHIRQuestionnaireResponse>,
    after?: Document<FHIRQuestionnaireResponse>,
  ): Promise<void> {
    logger.debug(
      `TriggerService.questionnaireResponseWritten(${userId}, ${questionnaireResponseId}): beforeData: ${before !== undefined ? 'exists' : 'undefined'}, afterData: ${after !== undefined ? 'exists' : 'undefined'}`,
    )

    try {
      if (after !== undefined) {
        const questionnaireResponseService =
          this.factory.questionnaireResponse()
        const handled = await questionnaireResponseService.handle(
          userId,
          {
            id: questionnaireResponseId,
            path: `users/${userId}/questionnaireResponses/${questionnaireResponseId}`,
            lastUpdate: new Date(),
            content: after.content,
          },
          { isNew: before === undefined },
        )

        logger.debug(
          `TriggerService.questionnaireResponseWritten(${userId}, ${questionnaireResponseId}): Handled questionnaire response: ${handled}`,
        )
      }
    } catch (error) {
      logger.error(
        `TriggerService.questionnaireResponseWritten(${userId}, ${questionnaireResponseId}): Error handling questionnaire response: ${String(error)}`,
      )
    }
  }

  private async sendSymptomQuestionnaireReminderIfNeeded(userId: string) {
    // Message service functionality removed
    logger.info(`TriggerService.sendSymptomQuestionnaireReminderIfNeeded(${userId}): Reminder skipped`)
  }
}
