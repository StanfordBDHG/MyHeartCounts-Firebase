//
// This source file is part of the Stanford Biodesign Digital Health MyHeart Counts open-source project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2025 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { UserObservationCollection } from '@stanfordbdhg/myheartcounts-models'
import admin from 'firebase-admin'
import { https, logger } from 'firebase-functions/v2'
import { z } from 'zod'
import { validatedOnCall } from './helpers.js'
import { UserRole } from '../services/credential/credential.js'
import { CollectionsService } from '../services/database/collections.js'
import { getServiceFactory } from '../services/factory/getServiceFactory.js'

const deleteHealthSamplesInputSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  samples: z
    .array(
      z.object({
        collection: z.nativeEnum(UserObservationCollection),
        documentId: z.string().min(1, 'Document ID is required'),
      }),
    )
    .min(1, 'At least one sample is required')
    .max(50000, 'Too many samples (max 50,000)'),
  confirmation: z.literal(true, {
    errorMap: () => ({ message: 'Explicit confirmation required' }),
  }),
})

type DeleteHealthSamplesInput = z.infer<typeof deleteHealthSamplesInputSchema>

interface DeleteHealthSamplesOutput {
  status: 'accepted' | 'processing'
  jobId: string
  totalSamples: number
  estimatedDurationMinutes: number
  message: string
}

export const deleteHealthSamples = validatedOnCall(
  'deleteHealthSamples',
  deleteHealthSamplesInputSchema,
  async (request): Promise<DeleteHealthSamplesOutput> => {
    const factory = getServiceFactory()
    const credential = factory.credential(request.auth)
    const { userId, samples } = request.data

    credential.check(UserRole.admin, UserRole.clinician, UserRole.user(userId))

    const jobId = `del_${Date.now()}_${Math.random().toString(36).substring(2)}`
    const estimatedDurationMinutes = Math.ceil(samples.length / 1000) // ~1000 samples per minute

    logger.info(
      `User '${credential.userId}' initiated async deletion job '${jobId}' for ${samples.length} health samples for user '${userId}'`,
      {
        jobId,
        requestingUserId: credential.userId,
        targetUserId: userId,
        samplesCount: samples.length,
        estimatedDurationMinutes,
      },
    )

    // Start async processing - don't await this
    processHealthSamplesDeletion(
      jobId,
      credential.userId,
      userId,
      samples,
    ).catch((error: unknown) => {
      logger.error(
        `Async deletion job '${jobId}' failed with error: ${String(error)}`,
        {
          jobId,
          requestingUserId: credential.userId,
          targetUserId: userId,
          error: String(error),
        },
      )
    })

    return {
      status: 'accepted',
      jobId,
      totalSamples: samples.length,
      estimatedDurationMinutes,
      message: `Deletion job started. Processing ${samples.length} samples asynchronously.`,
    }
  },
)

async function processHealthSamplesDeletion(
  jobId: string,
  requestingUserId: string,
  targetUserId: string,
  samples: DeleteHealthSamplesInput['samples'],
): Promise<void> {
  const collections = new CollectionsService(admin.firestore())
  const BATCH_SIZE = 500 // Process in batches to avoid timeout
  let totalDeleted = 0
  let totalFailed = 0

  logger.info(
    `Starting async deletion job '${jobId}': processing ${samples.length} samples in batches of ${BATCH_SIZE}`,
    {
      jobId,
      requestingUserId,
      targetUserId,
      totalSamples: samples.length,
      batchSize: BATCH_SIZE,
    },
  )

  // Process samples in batches
  for (let i = 0; i < samples.length; i += BATCH_SIZE) {
    const batch = samples.slice(i, i + BATCH_SIZE)
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(samples.length / BATCH_SIZE)

    logger.info(
      `Processing batch ${batchNumber}/${totalBatches} for job '${jobId}' (${batch.length} samples)`,
      {
        jobId,
        requestingUserId,
        targetUserId,
        batchNumber,
        totalBatches,
        batchSize: batch.length,
      },
    )

    const batchResults = await processBatch(
      collections,
      targetUserId,
      batch,
      jobId,
      requestingUserId,
    )

    totalDeleted += batchResults.deleted
    totalFailed += batchResults.failed

    // Small delay between batches to avoid overwhelming the system
    if (i + BATCH_SIZE < samples.length) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  logger.info(
    `Async deletion job '${jobId}' completed: ${totalDeleted} deleted, ${totalFailed} failed out of ${samples.length} total`,
    {
      jobId,
      requestingUserId,
      targetUserId,
      totalSamples: samples.length,
      totalDeleted,
      totalFailed,
      successRate: ((totalDeleted / samples.length) * 100).toFixed(2) + '%',
    },
  )
}

async function processBatch(
  collections: CollectionsService,
  userId: string,
  batch: DeleteHealthSamplesInput['samples'],
  jobId: string,
  requestingUserId: string,
): Promise<{ deleted: number; failed: number }> {
  let deleted = 0
  let failed = 0

  // Use Promise.allSettled for concurrent processing within batch
  const promises = batch.map(async (sample) => {
    try {
      const doc = await collections
        .userObservations(userId, sample.collection)
        .doc(sample.documentId)
        .get()

      if (!doc.exists) {
        logger.debug(
          `Sample not found during job '${jobId}': '${sample.documentId}' in collection '${sample.collection}'`,
          {
            jobId,
            requestingUserId,
            targetUserId: userId,
            collection: sample.collection,
            documentId: sample.documentId,
          },
        )
        return { success: false, sample }
      }

      await doc.ref.delete()

      logger.debug(
        `Deleted sample in job '${jobId}': '${sample.documentId}' from collection '${sample.collection}'`,
        {
          jobId,
          requestingUserId,
          targetUserId: userId,
          collection: sample.collection,
          documentId: sample.documentId,
        },
      )

      return { success: true, sample }
    } catch (error) {
      logger.warn(
        `Failed to delete sample in job '${jobId}': '${sample.documentId}' from collection '${sample.collection}': ${String(error)}`,
        {
          jobId,
          requestingUserId,
          targetUserId: userId,
          collection: sample.collection,
          documentId: sample.documentId,
          error: String(error),
        },
      )
      return { success: false, sample }
    }
  })

  const results = await Promise.allSettled(promises)

  for (const result of results) {
    if (result.status === 'fulfilled') {
      if (result.value.success) {
        deleted++
      } else {
        failed++
      }
    } else {
      failed++
      logger.error(
        `Promise failed in batch processing for job '${jobId}': ${String(result.reason)}`,
        {
          jobId,
          requestingUserId,
          targetUserId: userId,
          error: String(result.reason),
        },
      )
    }
  }

  return { deleted, failed }
}
