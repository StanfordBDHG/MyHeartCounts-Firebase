//
// This source file is part of the Stanford Biodesign Digital Health MyHeart Counts open-source project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2025 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { FHIRObservationStatus } from '@stanfordbdhg/myheartcounts-models'
import admin from 'firebase-admin'
import { https, logger } from 'firebase-functions/v2'
import { z } from 'zod'
import { validatedOnCall } from './helpers.js'
import { UserRole } from '../services/credential/credential.js'
import { CollectionsService } from '../services/database/collections.js'
import { getServiceFactory } from '../services/factory/getServiceFactory.js'

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
    processHealthSamplesEnteredInError(
      jobId,
      credential.userId,
      userId,
      collection,
      documentIds,
    ).catch((error: unknown) => {
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

async function processHealthSamplesEnteredInError(
  jobId: string,
  requestingUserId: string,
  targetUserId: string,
  collection: string,
  documentIds: string[],
): Promise<void> {
  const collections = new CollectionsService(admin.firestore())
  const BATCH_SIZE = 500 // Process in batches to avoid timeout
  let totalMarked = 0
  let totalFailed = 0

  logger.info(
    `Starting async entered-in-error marking job '${jobId}': processing ${documentIds.length} samples in collection '${collection}' in batches of ${BATCH_SIZE}`,
    {
      jobId,
      requestingUserId,
      targetUserId,
      collection,
      totalSamples: documentIds.length,
      batchSize: BATCH_SIZE,
    },
  )

  // Process samples in batches
  for (let i = 0; i < documentIds.length; i += BATCH_SIZE) {
    const batch = documentIds.slice(i, i + BATCH_SIZE)
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(documentIds.length / BATCH_SIZE)

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
      collection,
      batch,
      jobId,
      requestingUserId,
    )

    totalMarked += batchResults.marked
    totalFailed += batchResults.failed

    // Small delay between batches to avoid overwhelming the system
    if (i + BATCH_SIZE < documentIds.length) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  logger.info(
    `Async entered-in-error marking job '${jobId}' completed: ${totalMarked} marked, ${totalFailed} failed out of ${documentIds.length} total`,
    {
      jobId,
      requestingUserId,
      targetUserId,
      collection,
      totalSamples: documentIds.length,
      totalMarked,
      totalFailed,
      successRate: ((totalMarked / documentIds.length) * 100).toFixed(2) + '%',
    },
  )
}

async function processBatch(
  collections: CollectionsService,
  userId: string,
  collection: string,
  batch: string[],
  jobId: string,
  requestingUserId: string,
): Promise<{ marked: number; failed: number }> {
  let marked = 0
  let failed = 0

  // Use Promise.allSettled for concurrent processing within batch
  const promises = batch.map(async (documentId) => {
    try {
      const doc = await collections.firestore
        .collection('users')
        .doc(userId)
        .collection(collection)
        .doc(documentId)
        .get()

      if (!doc.exists) {
        logger.debug(
          `Sample not found during job '${jobId}': '${documentId}' in collection '${collection}'`,
          {
            jobId,
            requestingUserId,
            targetUserId: userId,
            collection,
            documentId,
          },
        )
        return { success: false, documentId }
      }

      // Mark as entered-in-error instead of deleting (FHIR compliant)
      await doc.ref.update({
        status: FHIRObservationStatus.entered_in_error,
      })

      logger.debug(
        `Marked sample as entered-in-error in job '${jobId}': '${documentId}' from collection '${collection}'`,
        {
          jobId,
          requestingUserId,
          targetUserId: userId,
          collection,
          documentId,
        },
      )

      return { success: true, documentId }
    } catch (error) {
      logger.warn(
        `Failed to mark sample as entered-in-error in job '${jobId}': '${documentId}' from collection '${collection}': ${String(error)}`,
        {
          jobId,
          requestingUserId,
          targetUserId: userId,
          collection,
          documentId,
          error: String(error),
        },
      )
      return { success: false, documentId }
    }
  })

  const results = await Promise.allSettled(promises)

  for (const result of results) {
    if (result.status === 'fulfilled') {
      if (result.value.success) {
        marked++
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

  return { marked, failed }
}
