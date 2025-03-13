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
  type Invitation,
  User,
  type UserAuth,
  UserType,
} from '@stanfordbdhg/engagehf-models'
import { type Auth } from 'firebase-admin/auth'
import { type UserRecord } from 'firebase-functions/v1/auth'
import { https, logger } from 'firebase-functions/v2'
import { type UserService } from './userService.js'
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

  // Invitations

  async createInvitation(content: Invitation): Promise<{ id: string }> {
    const id = await this.databaseService.runTransaction(
      async (collections, transaction) => {
        const invitations = await transaction.get(
          collections.invitations.where('code', '==', content.code).limit(1),
        )
        if (!invitations.empty) {
          logger.error(
            `Invitation code '${content.code}' already exists in invitations with ids [${invitations.docs.map((doc) => `'${doc.id}'`).join(', ')}].`,
          )
          throw new https.HttpsError(
            'invalid-argument',
            'Invitation code is not unique.',
          )
        }
        const invitationDoc = collections.invitations.doc()
        transaction.create(invitationDoc, content)
        logger.info(
          `Created invitation with code '${content.code}' using id '${invitationDoc.id}'.`,
        )
        return invitationDoc.id
      },
    )
    return { id }
  }

  async getInvitationByCode(
    invitationCode: string,
  ): Promise<Document<Invitation> | undefined> {
    const result = await this.databaseService.getQuery<Invitation>(
      (collections) =>
        collections.invitations.where('code', '==', invitationCode).limit(1),
    )
    return result.at(0)
  }

  async enrollUser(
    invitation: Document<Invitation>,
    userId: string,
    options: { isSingleSignOn: boolean },
  ): Promise<Document<User>> {
    logger.info(
      `About to enroll user ${userId} using invitation at '${invitation.id}' with code '${invitation.content.code}'.`,
    )

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

        if (!options.isSingleSignOn) {
          await this.auth.updateUser(userId, {
            displayName: invitation.content.auth?.displayName ?? undefined,
            phoneNumber: invitation.content.auth?.phoneNumber ?? undefined,
            photoURL: invitation.content.auth?.photoURL ?? undefined,
          })

          logger.info(
            `Updated auth information for user with id '${userId}' using invitation auth content.`,
          )
        }

        const userRef = collections.users.doc(userId)
        const userData = new User({
          ...invitation.content.user,
          lastActiveDate: new Date(),
          invitationCode: invitation.content.code,
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
      `DatabaseUserService.enrollUser(${userId}): Created user object using invitation content.`,
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

    const invitation = await this.getInvitationByCode(
      user.content.invitationCode,
    )

    if (invitation?.content === undefined) {
      logger.error(
        `DatabaseUserService.finishUserEnrollment(${user.id}): Invitation not found for user.`,
      )
      throw new https.HttpsError('not-found', 'Invitation not found for user.')
    }

    const invitationCollections = await this.databaseService.listCollections(
      (collections) => collections.invitations.doc(invitation.id),
    )

    logger.info(
      `DatabaseUserService.finishUserEnrollment(${user.id}): Will copy invitation collections: [${invitationCollections.map((collection) => `'${collection.id}'`).join(', ')}].`,
    )

    await Promise.all(
      invitationCollections.map(async (invitationCollection) =>
        this.databaseService.runTransaction(
          async (collections, transaction) => {
            const userRef = collections.users.doc(user.id)
            const collectionId = invitationCollection.id
            const items = await transaction.get(invitationCollection)
            for (const item of items.docs) {
              transaction.create(
                userRef.collection(collectionId).doc(item.id),
                item.data(),
              )
              transaction.delete(item.ref)
            }

            logger.info(
              `DatabaseUserService.finishUserEnrollment(${user.id}): Copied invitation collection '${collectionId}' with ${items.size} items.`,
            )
          },
        ),
      ),
    )

    await this.deleteInvitation(invitation)
  }

  async deleteInvitation(invitation: Document<Invitation>): Promise<void> {
    await this.databaseService.bulkWrite(async (collections, writer) => {
      const ref = collections.invitations.doc(invitation.id)
      await collections.firestore.recursiveDelete(ref, writer)
    })

    logger.info(`Deleted invitation with id '${invitation.id}' recursively.`)
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
