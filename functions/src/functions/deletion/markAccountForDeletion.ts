//
// This source file is part of the Stanford Biodesign Digital Health MyHeart Counts open-source project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2025 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { logger } from 'firebase-functions'
import { https, onCall } from 'firebase-functions/v2/https'
import { getServiceFactory } from '../../services/factory/getServiceFactory.js'

export const markAccountForDeletion = onCall(
  { invoker: 'public' },
  async (request) => {
    const userId = request.auth?.uid

    if (!userId) {
      logger.error('markAccountForDeletion: No authenticated user')
      throw new https.HttpsError(
        'unauthenticated',
        'User must be authenticated to mark account for deletion'
      )
    }

    try {
      const factory = getServiceFactory()
      const databaseService = factory.database()

      await databaseService.runTransaction((collections, transaction) => {
        transaction.update(collections.users.doc(userId), {
          toBeDeleted: true,
        })
      })

      logger.info(`User ${userId} marked their account for deletion`)
      
      return { success: true }
    } catch (error) {
      logger.error(`Failed to mark user ${userId} for deletion: ${String(error)}`)
      throw new https.HttpsError(
        'internal',
        'Failed to mark account for deletion'
      )
    }
  }
)