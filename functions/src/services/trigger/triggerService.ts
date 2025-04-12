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
} from '@stanfordbdhg/engagehf-models'
import { logger } from 'firebase-functions'
import { _updateStaticData } from '../../functions/updateStaticData.js'
import { type Document } from '../database/databaseService.js'
import { type ServiceFactory } from '../factory/serviceFactory.js'

export interface TriggerService {
  // Event triggers
  userEnrolled(user: Document<User>): Promise<void>
  userCreated(userId: string): Promise<void>
  userUpdated(userId: string): Promise<void>
  updateSymptomScore(
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

  // Legacy methods (for backward compatibility)
  everyMorning(): Promise<void>

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
    // Read all patients whose latest blood pressure are more than 5 days old
    const userIds: string[] = []
    for (const userId of userIds) {
      try {
        // Vitals reminder functionality removed
        logger.debug(`Would have sent vitals reminder to user ${userId}`)
      } catch (error) {
        logger.error(
          `TriggerService.sendDailyReminders(): User ${userId}: ${String(error)}`,
        )
      }
    }
  }

  // Helper method for sendDailyReminders
  private async sendVitalsReminder(userId: string) {
    // Functionality removed as part of refactoring
    logger.debug(
      `sendVitalsReminder for user ${userId} - functionality removed`,
    )
  }

  async sendWeeklySymptomQuestionnaires() {
    // Read all users
    const userIds: string[] = []
    for (const userId of userIds) {
      try {
        await this.sendSymptomQuestionnaireReminderIfNeeded(userId)
      } catch (error) {
        logger.error(
          `TriggerService.sendWeeklySymptomQuestionnaires(): User ${userId}: ${String(error)}`,
        )
      }
    }
  }

  // Implementation of interface methods

  async userEnrolled(user: Document<User>): Promise<void> {
    logger.debug(`TriggerService.userEnrolled(${user.id})`)
    await this.userCreated(user.id)
  }

  async everyMorning(): Promise<void> {
    logger.debug('TriggerService.everyMorning - deprecated')
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
    try {
      await this.factory
        .message()
        .addMessage(userId, UserMessage.createWelcome({}), { notify: true })

      await this.factory.message().addMessage(
        userId,
        UserMessage.createSymptomQuestionnaire({
          questionnaireReference: QuestionnaireReference.enUS,
        }),
        { notify: true },
      )

      await this.factory
        .message()
        .addMessage(userId, UserMessage.createVitals({}), { notify: false })
    } catch (error) {
      logger.error(`TriggerService.userCreated(${userId}): ${String(error)}`)
    }
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
      await this.updateSymptomScore(userId, document)
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

  async updateSymptomScore(
    userId: string,
    document: Document<FHIRQuestionnaireResponse>,
  ) {
    // SymptomScore functionality removed
    // Patient service was removed as part of the refactoring
    logger.debug(
      `updateSymptomScore for user ${userId} called - functionality removed`,
    )
  }

  // Added for compatibility
  async questionnaireResponseWritten(
    userId: string,
    questionnaireResponseId: string,
    before?: Document<FHIRQuestionnaireResponse>,
    after?: Document<FHIRQuestionnaireResponse>,
  ): Promise<void> {
    // Empty implementation for compatibility
    return
  }

  private async sendSymptomQuestionnaireReminderIfNeeded(userId: string) {
    const needsQuestionnaire = await this.checkIfUserNeedsQuestionnaire(userId)
    if (needsQuestionnaire) {
      await this.factory.message().addMessage(
        userId,
        UserMessage.createSymptomQuestionnaire({
          questionnaireReference: QuestionnaireReference.enUS,
        }),
        { notify: true },
      )
    }
  }

  private async checkIfUserNeedsQuestionnaire(
    userId: string,
  ): Promise<boolean> {
    // Simplified implementation
    return true
  }
}
