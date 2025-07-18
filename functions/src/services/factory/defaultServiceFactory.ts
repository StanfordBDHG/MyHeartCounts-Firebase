//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { Lazy } from '@stanfordbdhg/myheartcounts-models'
import admin from 'firebase-admin'
import { type AuthData } from 'firebase-functions/v2/tasks'
import { type ServiceFactoryOptions } from './getServiceFactory.js'
import { type ServiceFactory } from './serviceFactory.js'
import { Credential } from '../credential/credential.js'
import { FirestoreService } from '../database/firestoreService.js'
import { DatabaseHistoryService } from '../history/databaseHistoryService.js'
import { type HistoryService } from '../history/historyService.js'
import { DefaultMessageService } from '../message/defaultMessageService.js'
import { type MessageService } from '../message/messageService.js'
import {
  DietScoreCalculator,
  DietScoringQuestionnaireResponseService,
} from '../questionnaireResponse/dietScoringService.js'
import { MultiQuestionnaireResponseService } from '../questionnaireResponse/multiQuestionnaireResponseService.js'
import {
  DefaultNicotineScoreCalculator,
  NicotineScoringQuestionnaireResponseService,
} from '../questionnaireResponse/nicotineScoringService.js'
import { type QuestionnaireResponseService } from '../questionnaireResponse/questionnaireResponseService.js'
import { DebugDataService } from '../seeding/debugData/debugDataService.js'
import { StaticDataService } from '../seeding/staticData/staticDataService.js'
import {
  TriggerServiceImpl,
  type TriggerService,
} from '../trigger/triggerService.js'
import { DatabaseUserService } from '../user/databaseUserService.js'
import { type UserService } from '../user/userService.js'

export class DefaultServiceFactory implements ServiceFactory {
  // Properties - Options

  private readonly options: ServiceFactoryOptions

  // Properties - Firebase

  private readonly auth = new Lazy(() => admin.auth())
  private readonly firestore = new Lazy(() => admin.firestore())
  private readonly messaging = new Lazy(() => admin.messaging())
  private readonly storage = new Lazy(() => admin.storage())

  // Properties - Database Layer

  private readonly databaseService = new Lazy(
    () => new FirestoreService(this.firestore.value),
  )

  // Properties - Services

  private readonly debugDataService = new Lazy(
    () =>
      new DebugDataService(
        this.auth.value,
        this.databaseService.value,
        this.storage.value,
      ),
  )

  private readonly historyService = new Lazy(
    () => new DatabaseHistoryService(this.databaseService.value),
  )

  private readonly messageService = new Lazy(
    () =>
      new DefaultMessageService(
        this.messaging.value,
        this.databaseService.value,
        this.userService.value,
      ),
  )

  private readonly questionnaireResponseService = new Lazy(
    () =>
      new MultiQuestionnaireResponseService([
        new DietScoringQuestionnaireResponseService({
          databaseService: this.databaseService.value,
          messageService: this.messageService.value,
          scoreCalculator: new DietScoreCalculator(),
        }),
        new NicotineScoringQuestionnaireResponseService({
          databaseService: this.databaseService.value,
          messageService: this.messageService.value,
          scoreCalculator: new DefaultNicotineScoreCalculator(),
        }),
        // Add more specific questionnaire response services here
      ]),
  )

  private readonly staticDataService = new Lazy(
    () => new StaticDataService(this.databaseService.value),
  )

  private readonly triggerService = new Lazy(() => new TriggerServiceImpl(this))

  private readonly userService = new Lazy(
    () => new DatabaseUserService(this.auth.value, this.databaseService.value),
  )

  // Constructor

  constructor(options: ServiceFactoryOptions) {
    this.options = options
  }

  // Methods - User

  credential(authData: AuthData | undefined): Credential {
    return new Credential(authData)
  }

  user(): UserService {
    return this.userService.value
  }

  // Methods - Data

  debugData(): DebugDataService {
    return this.debugDataService.value
  }

  staticData(): StaticDataService {
    return this.staticDataService.value
  }

  history(): HistoryService {
    return this.historyService.value
  }

  // Methods - Questionnaires

  questionnaireResponse(): QuestionnaireResponseService {
    return this.questionnaireResponseService.value
  }

  // Methods - Trigger

  message(): MessageService {
    return this.messageService.value
  }

  trigger(): TriggerService {
    return this.triggerService.value
  }
}
