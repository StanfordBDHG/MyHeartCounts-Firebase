//
// This source file is part of the Stanford Biodesign Digital Health MyHeart Counts open-source project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2025 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { https, logger } from 'firebase-functions/v2'
import { z } from 'zod'
import { validatedOnCall } from './helpers.js'
import { UserRole } from '../services/credential/credential.js'
import { getServiceFactory } from '../services/factory/getServiceFactory.js'

const markAccountForDeletionInputSchema = z.object({})

interface MarkAccountForDeletionOutput {
  success: boolean
  markedAt: string
}

export const markAccountForDeletion = validatedOnCall(
  'markAccountForDeletion',
  markAccountForDeletionInputSchema,
  async (request): Promise<MarkAccountForDeletionOutput> => {
    const factory = getServiceFactory()
    const credential = factory.credential(request.auth)
    const userService = factory.user()
    
    // Only allow users to mark their own account
    const userId = request.auth?.uid
    if (!userId) {
      throw new https.HttpsError(
        'unauthenticated',
        'User must be authenticated to request account deletion'
      )
    }

    credential.check(UserRole.user(userId))

    // Check if user exists and get current state
    const user = await userService.getUser(userId)
    if (!user) {
      throw new https.HttpsError(
        'not-found',
        'User account not found'
      )
    }

    // Check if account is already marked for deletion
    if ((user.content as any).toBeDeleted) {
      logger.info(`User ${userId} attempted to mark already-deleted account`)
      throw new https.HttpsError(
        'already-exists',
        'Account is already marked for deletion'
      )
    }

    // Check if user is disabled
    if (user.content.disabled) {
      throw new https.HttpsError(
        'failed-precondition',
        'Cannot mark disabled account for deletion'
      )
    }

    const markedAt = new Date()
    await userService.markAccountForDeletion(userId, markedAt)
    
    logger.info(`User ${userId} successfully marked their account for deletion`)
    
    return { 
      success: true,
      markedAt: markedAt.toISOString()
    }
  },
  {
    invoker: 'public'
  }
)