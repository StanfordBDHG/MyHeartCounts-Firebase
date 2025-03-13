//
// This source file is part of the MyHeartCounts project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { z } from 'zod'
import { logger } from 'firebase-functions'
import { validatedOnCall } from './helpers.js'
import { getServiceFactory } from '../services/factory/getServiceFactory.js'

const testCreateUserSchema = z.object({
  uid: z.string(),
})

export const testCreateUser = validatedOnCall(
  'testCreateUser',
  testCreateUserSchema,
  async (request) => {
    try {
      const factory = getServiceFactory()
      const userService = factory.user()
      
      logger.info(`Creating test user with uid: ${request.data.uid}`)
      
      // Use the enrollUserDirectly method to create a user document
      const userDoc = await userService.enrollUserDirectly(request.data.uid, {
        isSingleSignOn: false,
      })
      
      logger.info(`Successfully created user with id: ${userDoc.id}`)
      
      return { success: true, userId: userDoc.id }
    } catch (error) {
      logger.error(`Error creating test user: ${String(error)}`)
      throw error
    }
  },
)