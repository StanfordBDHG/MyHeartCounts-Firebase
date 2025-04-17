//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { customSeedingOptionsSchema } from '@stanfordbdhg/engagehf-models'
import { logger } from 'firebase-functions'
import { validatedOnRequest } from './helpers.js'
import { getServiceFactory } from '../services/factory/getServiceFactory.js'

export const customSeed = validatedOnRequest(
  'customSeed',
  customSeedingOptionsSchema,
  async (_, data, response) => {
    const factory = getServiceFactory()

    if (process.env.FUNCTIONS_EMULATOR !== 'true') {
      throw factory.credential(undefined).permissionDeniedError()
    }

    const debugDataService = factory.debugData()
    const userIds = await debugDataService.seedCustom(data)

    // Create bulkHealthKitUploads folder for each user
    for (const userId of userIds) {
      try {
        await debugDataService.seedBulkHealthKitUploadsFolder(userId)
      } catch (error) {
        // Log error but continue with other users
        logger.error(
          `Failed to create bulkHealthKitUploads folder for ${userId}: ${String(error)}`,
        )
      }
    }
    response.write('Success', 'utf8')
    response.end()
  },
)
