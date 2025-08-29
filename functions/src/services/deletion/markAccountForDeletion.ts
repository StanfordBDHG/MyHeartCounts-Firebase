//
// This source file is part of the Stanford Biodesign Digital Health MyHeart Counts open-source project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2025 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { https, logger } from 'firebase-functions/v2'
import { onCall } from 'firebase-functions/v2/https'
import { getServiceFactory } from '../factory/getServiceFactory.js'

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
      const userService = factory.user()

      await userService.markAccountForDeletion(userId)
      
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