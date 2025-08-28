//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  fhirObservationConverter,
  fhirQuestionnaireConverter,
  fhirQuestionnaireResponseConverter,
  scoreConverter,
  userConverter,
  userDeviceConverter,
  userMessageConverter,
} from '@stanfordbdhg/myheartcounts-models'
import { type Firestore } from 'firebase-admin/firestore'
import { DatabaseConverter } from './databaseConverter.js'
import { historyChangeItemConverter } from '../history/historyService.js'

export class CollectionsService {
  // Properties

  readonly firestore: Firestore

  // Constructor

  constructor(firestore: Firestore) {
    this.firestore = firestore
  }

  // Methods

  get devices() {
    return this.firestore
      .collectionGroup('devices')
      .withConverter(new DatabaseConverter(userDeviceConverter.value))
  }

  get history() {
    return this.firestore
      .collection('history')
      .withConverter(new DatabaseConverter(historyChangeItemConverter))
  }

  get questionnaires() {
    return this.firestore
      .collection('questionnaires')
      .withConverter(new DatabaseConverter(fhirQuestionnaireConverter.value))
  }

  get users() {
    return this.firestore
      .collection('users')
      .withConverter(new DatabaseConverter(userConverter.value))
  }

  userDevices(userId: string) {
    return this.firestore
      .collection('users')
      .doc(userId)
      .collection('devices')
      .withConverter(new DatabaseConverter(userDeviceConverter.value))
  }

  userMessages(userId: string) {
    return this.firestore
      .collection('users')
      .doc(userId)
      .collection('messages')
      .withConverter(new DatabaseConverter(userMessageConverter.value))
  }

  userQuestionnaireResponses(userId: string) {
    return this.firestore
      .collection('users')
      .doc(userId)
      .collection('questionnaireResponses')
      .withConverter(
        new DatabaseConverter(fhirQuestionnaireResponseConverter.value),
      )
  }

  userScores(userId: string) {
    return this.firestore
      .collection('users')
      .doc(userId)
      .collection('scores')
      .withConverter(new DatabaseConverter(scoreConverter))
  }

  userHealthObservations(userId: string, collectionName: string) {
    return this.firestore
      .collection('users')
      .doc(userId)
      .collection(collectionName)
      .withConverter(new DatabaseConverter(fhirObservationConverter.value))
  }
}
