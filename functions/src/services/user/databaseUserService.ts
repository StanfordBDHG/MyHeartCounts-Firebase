//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { setTimeout } from 'timers/promises'
import {
  advanceDateByDays,
  dateConverter,
  User,
  type UserAuth,
  UserType,
} from '@stanfordbdhg/myheartcounts-models'
import { type Auth } from 'firebase-admin/auth'
import { Timestamp } from 'firebase-admin/firestore'
import { type UserRecord } from 'firebase-functions/v1/auth'
import { https, logger } from 'firebase-functions/v2'
import { type EnrollUserOptions, type UserService } from './userService.js'
import {
  type Document,
  type DatabaseService,
} from '../database/databaseService.js'

export class DatabaseUserService implements UserService {
  // Properties

  private readonly auth: Auth
  private readonly databaseService: DatabaseService

  // Constructor

  constructor(auth: Auth, databaseService: DatabaseService) {
    this.auth = auth
    this.databaseService = databaseService
  }

  // Auth

  async getAuth(userId: string): Promise<UserAuth> {
    const authUser = await this.auth.getUser(userId)
    return {
      displayName: authUser.displayName,
      email: authUser.email,
      phoneNumber: authUser.phoneNumber,
      photoURL: authUser.photoURL,
    }
  }

  async updateAuth(userId: string, auth: UserAuth): Promise<void> {
    await this.auth.updateUser(userId, {
      displayName: auth.displayName ?? undefined,
      phoneNumber: auth.phoneNumber ?? undefined,
      photoURL: auth.photoURL ?? undefined,
    })
  }

  async updateClaims(userId: string): Promise<void> {
    const user = await this.getUser(userId)
    if (user === undefined) {
      logger.error(
        `DatabaseUserService.updateClaims(${userId}): User not found.`,
      )
      throw new https.HttpsError('not-found', 'User not found.')
    }
    const claims = user.content.claims
    logger.info(
      `DatabaseUserService.updateClaims(${userId}): Will set claims to ${JSON.stringify(claims)}.`,
    )
    await this.auth.setCustomUserClaims(userId, claims)
    logger.info(
      `DatabaseUserService.updateClaims(${userId}): User claims updated.`,
    )
  }

  // Invitation-related methods have been removed

  async enrollUserDirectly(
    userId: string,
    options: EnrollUserOptions,
  ): Promise<Document<User>> {
    logger.info(`About to enroll user ${userId} directly.`)

    const user = await this.databaseService.runTransaction(
      async (collections, transaction) => {
        const user = await transaction.get(collections.users.doc(userId))

        if (user.exists) {
          logger.error(`User with id ${userId} already exists.`)
          throw new https.HttpsError(
            'already-exists',
            'User is already enrolled in the study.',
          )
        }

        const userRef = collections.users.doc(userId)
        const userData = new User({
          type: UserType.patient,
          disabled: false,
          receivesInactivityReminders: true,
          receivesQuestionnaireReminders: true,
          receivesRecommendationUpdates: true,
          participantGroup: Math.random() < 0.5 ? 1 : 2,
          lastActiveDate: new Date(),
          dateOfEnrollment: new Date(),
        })
        transaction.set(userRef, userData)

        if (!options.isSingleSignOn) {
          await this.auth.setCustomUserClaims(userId, userData.claims)
        }

        return {
          id: userId,
          path: userRef.path,
          lastUpdate: new Date(),
          content: userData,
        }
      },
    )

    logger.info(
      `DatabaseUserService.enrollUserDirectly(${userId}): Created user object for public enrollment.`,
    )

    return user
  }

  async finishUserEnrollment(user: Document<User>): Promise<void> {
    let authUser: UserRecord | undefined
    let count = 0
    do {
      try {
        authUser = await this.auth.getUser(user.id)
      } catch {}
      count = await setTimeout(1_000, count + 1)
      // beforeUserCreated has a timeout of 7 seconds
    } while (authUser === undefined && count < 7)

    if (authUser === undefined) {
      logger.error(
        `DatabaseUserService.finishUserEnrollment(${user.id}): Auth user not found in auth after 7 seconds.`,
      )
      throw new https.HttpsError(
        'not-found',
        'User not found in authentication service.',
      )
    }

    logger.info(
      `DatabaseUserService.finishUserEnrollment(${user.id}): Auth user found.`,
    )

    // Skip copying invitation data since we're not using invitations
  }

  // Users

  async disableUser(userId: string): Promise<void> {
    await this.databaseService.runTransaction((collections, transaction) => {
      transaction.update(collections.users.doc(userId), {
        disabled: true,
      })
    })

    await this.updateClaims(userId)
  }

  async enableUser(userId: string): Promise<void> {
    await this.databaseService.runTransaction((collections, transaction) => {
      transaction.update(collections.users.doc(userId), {
        disabled: false,
      })
    })

    await this.updateClaims(userId)
  }

  async getAllPatients(): Promise<Array<Document<User>>> {
    return this.databaseService.getQuery<User>((collections) =>
      collections.users.where('type', '==', UserType.patient),
    )
  }

  async getUser(userId: string): Promise<Document<User> | undefined> {
    return this.databaseService.getDocument<User>((collections) =>
      collections.users.doc(userId),
    )
  }

  async updateLastActiveDate(userId: string): Promise<void> {
    return this.databaseService.runTransaction((collections, transaction) => {
      transaction.update(collections.users.doc(userId), {
        lastActiveDate: dateConverter.encode(new Date()),
      })
    })
  }

  async markAccountForDeletion(userId: string, markedAt: Date): Promise<void> {
    await this.databaseService.runTransaction(
      async (collections, transaction) => {
        // Get raw document without converter to check toBeDeleted field
        const rawUserRef = collections.firestore.collection('users').doc(userId)
        const userDoc = await transaction.get(rawUserRef)
        const userData = userDoc.data()

        if (userData && (userData as any).toBeDeleted) {
          throw new https.HttpsError(
            'already-exists',
            'Account is already marked for deletion',
          )
        }

        transaction.update(rawUserRef, {
          toBeDeleted: true,
          deletionRequest: {
            requestedAt: dateConverter.encode(markedAt),
            requestedBy: userId,
            status: 'pending',
          },
        })
      },
    )
    logger.info(
      `User ${userId} marked their account for deletion at ${markedAt.toISOString()}`,
    )
  }

  async deleteUser(userId: string): Promise<void> {
    await this.databaseService.bulkWrite(async (collections, writer) => {
      await collections.firestore.recursiveDelete(
        collections.users.doc(userId),
        writer,
      )
      logger.info(`Deleted user with id '${userId}' recursively.`)
      await this.auth.deleteUser(userId)
      logger.info(`Deleted user auth with id '${userId}'.`)
    })
  }

  async deleteExpiredAccounts(): Promise<void> {
    const oneDayAgo = advanceDateByDays(new Date(), -1)
    const promises: Array<Promise<void>> = []
    let pageToken: string | undefined = undefined
    do {
      const usersResult = await this.auth.listUsers(1_000, pageToken)
      pageToken = usersResult.pageToken
      for (const user of usersResult.users) {
        if (
          Object.keys(user.customClaims ?? {}).length === 0 &&
          new Date(user.metadata.lastSignInTime) < oneDayAgo
        ) {
          logger.info(`Deleting expired account ${user.uid}`)
          promises.push(
            this.auth
              .deleteUser(user.uid)
              .catch((error: unknown) =>
                console.error(
                  `Failed to delete expired account ${user.uid}: ${String(error)}`,
                ),
              ),
          )
        }
      }
    } while (pageToken !== undefined)

    await Promise.all(promises)
  }
}
