//
// This source file is part of the Stanford Biodesign Digital Health MyHeart Counts open-source project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2025 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { https, logger } from 'firebase-functions'
import {
  beforeUserCreated,
  beforeUserSignedIn,
} from 'firebase-functions/v2/identity'
import { getServiceFactory } from '../services/factory/getServiceFactory.js'

export const beforeUserCreatedFunction = beforeUserCreated(async (event) => {
  // Ensure event.data exists
  if (!event.data) {
    logger.error('User data not available in event')
    throw new https.HttpsError('invalid-argument', 'User data is required.')
  }

  const userId = event.data.uid
  logger.info(`${userId}: Start.`)

  const factory = getServiceFactory()
  const userService = factory.user()

  // Check for email
  if (event.data.email === undefined) {
    logger.error('Email address not set.')
    throw new https.HttpsError(
      'invalid-argument',
      'Email address is required for user.',
    )
  }

  logger.info(`${userId}: Creating user document for ${event.data.email}`)

  try {
    // For MyHeartCounts, we'll use direct enrollment without invitations
    const userDoc = await userService.enrollUserDirectly(userId, {
      isSingleSignOn: event.credential !== undefined,
    })

    logger.info(`${userId}: Finishing user enrollment.`)

    // Trigger any post-enrollment actions
    await factory.trigger().userEnrolled(userDoc)

    logger.info(`${userId}: Successfully enrolled user.`)

    // Return empty claims - they'll be updated by userEnrolled trigger
    return { customClaims: {} }
  } catch (error) {
    logger.error(`${userId}: Failed to create user document: ${String(error)}`)
    // We don't throw here because we still want to allow sign-up even if
    // document creation fails (it can be created later)
    return { customClaims: {} }
  }
})

export const beforeUserSignedInFunction = beforeUserSignedIn(async (event) => {
  try {
    // Ensure event.data exists
    if (!event.data) {
      logger.error('User data not available in event')
      return { customClaims: {} }
    }

    const userService = getServiceFactory().user()
    const user = await userService.getUser(event.data.uid)
    if (user !== undefined) {
      logger.info('beforeUserSignedIn finished successfully.')
      return {
        customClaims: user.content.claims,
        sessionClaims: user.content.claims,
      }
    }
    logger.info('beforeUserSignedIn finished without user.')
    return { customClaims: {} }
  } catch (error) {
    logger.error(`beforeUserSignedIn finished with error: ${String(error)}`)
    return { customClaims: {} }
  }
})
