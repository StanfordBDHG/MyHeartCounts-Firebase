//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  advanceDateByDays,
  chunks,
  type CustomSeedingOptions,
  FHIRObservation,
  fhirQuestionnaireConverter,
  FHIRQuestionnaireResponse,
  LoincCode,
  QuantityUnit,
  QuestionnaireReference,
  UserMessage,
  type UserSeedingOptions,
  userSeedingOptionsSchema,
  UserObservationCollection,
} from '@stanfordbdhg/myheartcounts-models'
import { type Auth } from 'firebase-admin/auth'
import { type CollectionReference } from 'firebase-admin/firestore'
import { type Storage } from 'firebase-admin/storage'
import { logger } from 'firebase-functions'
import { type CollectionsService } from '../../database/collections.js'
import { type DatabaseService } from '../../database/databaseService.js'
import { SeedingService } from '../seedingService.js'

/* eslint-disable @typescript-eslint/no-explicit-any */

export class DebugDataService extends SeedingService {
  // Properties

  private readonly auth: Auth
  private readonly storage: Storage
  private readonly databaseService: DatabaseService

  // Constructor

  constructor(auth: Auth, databaseService: DatabaseService, storage: Storage) {
    super({ useIndicesAsKeys: true, path: './data/debug/' })
    this.auth = auth
    this.databaseService = databaseService
    this.storage = storage
  }

  // Methods

  async seedCustom(input: CustomSeedingOptions): Promise<string[]> {
    const userIds: string[] = []
    for (const user of input.users) {
      try {
        userIds.push(await this.createUser(user))
      } catch (error) {
        logger.error(error)
      }
    }
    await this.databaseService.runTransaction((collections, transaction) => {
      for (const collectionName in input.firestore) {
        this.setCollection(
          collections.firestore.collection(collectionName),
          input.firestore[collectionName],
          transaction,
        )
      }
    })
    return userIds
  }

  async seedUsers() {
    const users = this.readJSONArray('users.json', userSeedingOptionsSchema)
    const userIds = await Promise.all(
      users.map((user) => this.createUser(user)),
    )
    return userIds
  }

  async seedUserConsent(userId: string) {
    await this.storage.bucket().upload('data/public/consent.pdf', {
      destination: `users/${userId}/consent/consent.pdf`,
      contentType: 'application/pdf',
    })
  }

  async seedPublicFiles() {
    // Upload study definition
    await this.storage.bucket().upload('data/public/studyDefinition.json', {
      destination: 'public/studyDefinition.json',
      contentType: 'application/json',
      // Make it publicly accessible
      metadata: {
        cacheControl: 'public, max-age=300',
      },
    })

    // Upload consent PDF
    await this.storage.bucket().upload('data/public/consent.pdf', {
      destination: 'public/consent.pdf',
      contentType: 'application/pdf',
      // Make it publicly accessible
      metadata: {
        cacheControl: 'public, max-age=300',
      },
    })

    logger.info('Public files uploaded to Firebase Storage')

    return 'public/studyDefinition.json'
  }

  async seedUserMessages(userId: string, date: Date) {
    const values = [
      UserMessage.createInactive({
        creationDate: date,
      }),
      UserMessage.createPreAppointment({
        creationDate: date,
        reference: `users/${userId}/appointments/0`,
      }),
      UserMessage.createSymptomQuestionnaire({
        creationDate: date,
        questionnaireReference: QuestionnaireReference.enUS,
      }),
      UserMessage.createVitals({
        creationDate: date,
      }),
      UserMessage.createWeightGain({
        creationDate: date,
      }),
      UserMessage.createWelcome({
        creationDate: date,
      }),
    ]
    await this.replaceCollection(
      (collections) => collections.userMessages(userId),
      values,
    )
  }

  async seedClinicianMessages(
    userId: string,
    patients: Array<{
      id: string
      name: string | undefined
    }>,
  ) {
    const values = patients.flatMap((patient) => [
      UserMessage.createInactiveForClinician({
        userId: patient.id,
        userName: patient.name,
        reference: '',
      }),
      UserMessage.createPreAppointmentForClinician({
        userId: patient.id,
        userName: patient.name,
        reference: '',
      }),
      UserMessage.createWeightGainForClinician({
        userId: patient.id,
        userName: patient.name,
        reference: '',
      }),
    ])
    await this.replaceCollection(
      (collections) => collections.userMessages(userId),
      values,
    )
  }

  async seedUserHeartRateObservations(userId: string, date: Date) {
    // This is just a list of pseudo-random numbers that is used to generate
    // the different user collections
    const randomNumbers = [
      88, 42, 11, 71, 4, 0, 86, 15, 41, 1, 98, 85, 90, 47, 84, 3, 61, 6, 77, 76,
      79, 63, 46, 53, 55, 78, 14, 34, 60, 92, 52, 43, 74, 87, 40, 10, 8, 69, 24,
      37, 97, 57, 83, 49, 22, 95, 17, 18, 44, 5, 80, 50, 29, 58, 39, 2, 70, 16,
      64, 56, 59, 19, 33, 99, 13, 23, 81, 27, 38, 65, 26, 45, 7, 72, 30, 28, 12,
      73, 31, 89, 25, 36, 96, 91, 35, 48, 21, 62, 51, 9, 68, 82, 93, 94, 54, 32,
      66, 20, 75, 67, 88, 42, 11, 71, 4, 0, 86, 15, 41, 1, 98, 85, 90, 47, 84,
      3, 61, 6, 77, 76, 79, 63, 46, 53, 55, 78, 14, 34, 60, 92, 52, 43, 74, 87,
      40, 10, 8, 69, 24, 37, 97, 57, 83, 49, 22, 95, 17, 18, 44, 5, 80, 50, 29,
      58, 39, 2, 70, 16, 64, 56, 59, 19, 33, 99, 13, 23, 81, 27, 38, 65, 26, 45,
      7, 72, 30, 28, 12, 73, 31, 89, 25, 36, 96, 91, 35, 48, 21, 62, 51, 9, 68,
      82, 93, 94, 54, 32, 66, 20, 75, 67,
    ].map((n) => n / 100)

    const values = randomNumbers.map((number, index) =>
      FHIRObservation.createSimple({
        id: index.toString(),
        date: advanceDateByDays(date, -index - 2),
        value: 60 + number * 40,
        unit: QuantityUnit.bpm,
        code: LoincCode.heartRate,
      }),
    )

    await this.replaceCollection(
      (collections) =>
        collections.userObservations(
          userId,
          UserObservationCollection.heartRate,
        ),
      values,
    )
  }

  async seedUserQuestionnaireResponses(userId: string, date: Date) {
    const questionnaire = this.readJSONArray(
      '../questionnaires.json',
      fhirQuestionnaireConverter.value.schema,
    ).at(0)

    // This is just a list of pseudo-random numbers that is used to generate
    // the different user collections
    const randomNumbers = [
      97, 89, 38, 46, 75, 58, 24, 57, 55, 39, 16, 11, 72, 81, 96, 83, 92, 99,
      20, 93, 1, 12, 8, 87, 15, 18, 48, 37, 63, 74, 61, 68, 7, 73, 78, 71, 56,
      84, 9, 60, 10, 47, 80, 51, 13, 27, 35, 36, 43, 34, 95, 76, 23, 26, 0, 82,
      21, 4, 28, 41, 22, 62, 85, 17, 2, 42, 44, 70, 50, 3, 49, 6, 45, 52, 69,
      66, 31, 67, 19, 5, 64, 30, 77, 91, 90, 40, 29, 86, 32, 25, 14, 53, 98, 65,
      88, 33, 59, 79, 94, 54, 77, 51, 71, 44, 27, 88, 15, 70, 48, 50, 22, 38,
      29, 65, 64, 45, 42, 52, 90, 20, 1, 16, 47, 5, 33, 7, 91, 67, 28, 76, 66,
      82, 36, 58, 41, 87, 26, 24, 97, 8, 81, 32, 61, 37, 34, 84, 25, 83, 79, 57,
      12, 74, 94, 89, 46, 86, 55, 59, 98, 40, 69, 93, 95, 78, 17, 23, 2, 73, 96,
      68, 60, 39, 49, 85, 19, 80, 35, 0, 75, 14, 10, 31, 4, 13, 30, 62, 56, 18,
      21, 72, 3, 63, 92, 6, 99, 11, 54, 43, 53, 9, 97, 89, 38, 46, 75, 58, 24,
      57, 55, 39, 16, 11, 72, 81, 96, 83, 92, 99, 20, 93, 1, 12, 8, 87, 15, 18,
      48, 37, 63, 74, 61, 68, 7, 73, 78, 71, 56, 84, 9, 60, 10, 47, 80, 51, 13,
      27, 35, 36, 43, 34, 95, 76, 23, 26, 0, 82, 21, 4, 28, 41, 22, 62, 85, 17,
      2, 42, 44, 70, 50, 3, 49, 6, 45, 52, 69, 66, 31, 67, 19, 5, 64, 30, 77,
      91, 90, 40, 29, 86, 32, 25, 14, 53, 98, 65, 88, 33, 59, 79, 94, 54, 77,
      51, 71, 44, 27, 88, 15, 70, 48, 50, 22, 38, 29, 65, 64, 45, 42, 52, 90,
      20, 1, 16, 47, 5, 33, 7, 91, 67, 28, 76, 66, 82, 36, 58, 41, 87, 26, 24,
      97, 8, 81, 32, 61, 37, 34, 84, 25, 83, 79, 57, 12, 74, 94, 89, 46, 86, 55,
      59, 98, 40, 69, 93, 95, 78, 17, 23, 2, 73, 96, 68, 60, 39, 49, 85, 19, 80,
      35, 0, 75, 14, 10, 31, 4, 13, 30, 62, 56, 18, 21, 72, 3, 63, 92, 6, 99,
      97, 89, 38, 46, 75, 58, 24, 57, 55, 39, 16, 11, 72, 81, 96, 83, 92, 99,
      20, 93, 1, 12, 8, 87, 15, 18, 48, 37, 63, 74, 61, 68, 7, 73, 78, 71, 56,
      84, 9, 60, 10, 47, 80, 51, 13, 27, 35, 36, 43, 34, 95, 76, 23, 26, 0, 82,
      21, 4, 28, 41, 22, 62, 85, 17, 2, 42, 44, 70, 50, 3, 49, 6, 45, 52, 69,
      66, 31, 67, 19, 5, 64, 30, 77, 91, 90, 40, 29, 86, 32, 25, 14, 53, 98, 65,
      88, 33, 59, 79, 94, 54, 77, 51, 71, 44, 27, 88, 15, 70, 48, 50, 22, 38,
      29, 65, 64, 45, 42, 52, 90, 20, 1, 16, 47, 5, 33, 7, 91, 67, 28, 76, 66,
      82, 36, 58, 41, 87, 26, 24, 97, 8, 81, 32, 61, 37, 34, 84, 25, 83, 79, 57,
      12, 74, 94, 89, 46, 86, 55, 59, 98, 40, 69, 93, 95, 78, 17, 23, 2, 73, 96,
      68, 60, 39, 49, 85, 19, 80, 35, 0, 75, 14, 10, 31, 4, 13, 30, 62, 56, 18,
      21, 72, 3, 63, 92, 6, 99, 11, 54, 43, 53, 9, 97, 89, 38, 46, 75, 58, 24,
      57, 55, 39, 16, 11, 72, 81, 96, 83, 92, 99, 20, 93, 1, 12, 8, 87, 15, 18,
      48, 37, 63, 74, 61, 68, 7, 73, 78, 71, 56, 84, 9, 60, 10, 47, 80, 51, 13,
      27, 35, 36, 43, 34, 95, 76, 23, 26, 0, 82, 21, 4, 28, 41, 22, 62, 85, 17,
      2, 42, 44, 70, 50, 3, 49, 6, 45, 52, 69, 66, 31, 67, 19, 5, 64, 30, 77,
      91, 90, 40, 29, 86, 32, 25, 14, 53, 98, 65, 88, 33, 59, 79, 94, 54, 77,
      51, 71, 44, 27, 88, 15, 70, 48, 50, 22, 38, 29, 65, 64, 45, 42, 52, 90,
      20, 1, 16, 47, 5, 33, 7, 91, 67, 28, 76, 66, 82, 36, 58, 41, 87, 26, 24,
      97, 8, 81, 32, 61, 37, 34, 84, 25, 83, 79, 57, 12, 74, 94, 89, 46, 86, 55,
      59, 98, 40, 69, 93, 95, 78, 17, 23, 2, 73, 96, 68, 60, 39, 49, 85, 19, 80,
      35, 0, 75, 14, 10, 31, 4, 13, 30, 62, 56, 18, 21, 72, 3, 63, 92, 6, 99,
      56, 42, 12,
    ].map((n) => n / 100)

    const values = chunks(randomNumbers, 13).map((chunk, index) =>
      FHIRQuestionnaireResponse.create({
        questionnaire: questionnaire?.url ?? '',
        questionnaireResponse: index.toString(),
        date: advanceDateByDays(date, -(index * 14) - 2),
        answer1a: Math.floor(1 + chunk[0] * 6),
        answer1b: Math.floor(1 + chunk[1] * 6),
        answer1c: Math.floor(1 + chunk[2] * 6),
        answer2: Math.floor(1 + chunk[3] * 5),
        answer3: Math.floor(1 + chunk[4] * 7),
        answer4: Math.floor(1 + chunk[5] * 7),
        answer5: Math.floor(1 + chunk[6] * 5),
        answer6: Math.floor(1 + chunk[7] * 5),
        answer7: Math.floor(1 + chunk[8] * 5),
        answer8a: Math.floor(1 + chunk[9] * 6),
        answer8b: Math.floor(1 + chunk[10] * 6),
        answer8c: Math.floor(1 + chunk[11] * 6),
        answer9: Math.floor(chunk[12] * 6),
      }),
    )
    await this.replaceCollection(
      (collections) => collections.userQuestionnaireResponses(userId),
      values,
    )
  }

  // Helpers

  private async createUser(user: UserSeedingOptions): Promise<string> {
    const authUser = await this.auth.createUser(user.auth)

    // Filter out undefined values from user.user to avoid Firestore errors
    const cleanUserData = user.user ? JSON.parse(JSON.stringify(user.user)) : {}

    // Create a clean user object with no undefined values
    await this.databaseService.runTransaction((collections, transaction) => {
      transaction.set(
        collections.users.doc(authUser.uid),
        cleanUserData,
        { merge: true }, // Use merge to prevent replacing existing fields
      )

      for (const collectionName in user.collections ?? {}) {
        this.setCollection(
          collections.firestore.collection(collectionName),
          user.collections?.[collectionName] ?? [],
          transaction,
        )
      }
    })
    return authUser.uid
  }

  private async replaceCollection<T>(
    collection: (collections: CollectionsService) => CollectionReference<T>,
    data: T[] | Record<string, T>,
  ) {
    await this.databaseService.runTransaction(
      async (collections, transaction) => {
        await this.deleteCollection(collection(collections), transaction)
        this.setCollection(collection(collections), data, transaction)
      },
    )
  }
}
