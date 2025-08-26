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
import { HealthSampleDeletionService } from '../services/healthSamples/healthSampleDeletionService.js'

const markHealthSamplesEnteredInErrorInputSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  collection: z.string().min(1, 'Collection name is required'),
  documentIds: z
    .array(z.string().min(1, 'Document ID is required'))
    .min(1, 'At least one document ID is required')
    .max(50000, 'Too many document IDs (max 50,000)'),
})

interface MarkHealthSamplesEnteredInErrorOutput {
  status: 'accepted' | 'processing'
  jobId: string
  totalSamples: number
  estimatedDurationMinutes: number
  message: string
}

export const deleteHealthSamples = validatedOnCall(
  'deleteHealthSamples',
  markHealthSamplesEnteredInErrorInputSchema,
  async (request): Promise<MarkHealthSamplesEnteredInErrorOutput> => {
    const factory = getServiceFactory()
    const credential = factory.credential(request.auth)
    const { userId, collection, documentIds } = request.data

    credential.check(UserRole.admin, UserRole.clinician, UserRole.user(userId))

    const jobId = `del_${Date.now()}_${Math.random().toString(36).substring(2)}`
    const estimatedDurationMinutes = Math.ceil(documentIds.length / 1000) // ~1000 samples per minute

    logger.info(
      `User '${credential.userId}' initiated async entered-in-error marking job '${jobId}' for ${documentIds.length} health samples in collection '${collection}' for user '${userId}'`,
      {
        jobId,
        requestingUserId: credential.userId,
        targetUserId: userId,
        collection,
        samplesCount: documentIds.length,
        estimatedDurationMinutes,
      },
    )

    // Start async processing - don't await this ...
    const deletionService = new HealthSampleDeletionService()
    deletionService
      .processHealthSamplesEnteredInError(
        jobId,
        credential.userId,
        userId,
        collection,
        documentIds,
      )
      .catch((error: unknown) => {
        logger.error(
          `Async entered-in-error marking job '${jobId}' failed with error: ${String(error)}`,
          {
            jobId,
            requestingUserId: credential.userId,
            targetUserId: userId,
            collection,
            error: String(error),
          },
        )
      })

    return {
      status: 'accepted',
      jobId,
      totalSamples: documentIds.length,
      estimatedDurationMinutes,
      message: `Marking job started. Processing ${documentIds.length} samples as entered-in-error asynchronously.`,
    }
  },
)
