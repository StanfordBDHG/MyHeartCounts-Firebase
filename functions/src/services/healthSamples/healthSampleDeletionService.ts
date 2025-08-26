//
// This source file is part of the Stanford Biodesign Digital Health MyHeart Counts open-source project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2025 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { FHIRObservationStatus } from '@stanfordbdhg/myheartcounts-models'
import admin from 'firebase-admin'
import { logger } from 'firebase-functions/v2'
import { CollectionsService } from '../database/collections.js'

export interface HealthSampleDeletionResult {
  totalMarked: number
  totalFailed: number
  successRate: string
}

export class HealthSampleDeletionService {
  private readonly collections: CollectionsService
  private readonly BATCH_SIZE = 500

  constructor(firestore?: admin.firestore.Firestore) {
    this.collections = new CollectionsService(firestore ?? admin.firestore())
  }

  async processHealthSamplesEnteredInError(
    jobId: string,
    requestingUserId: string,
    targetUserId: string,
    collection: string,
    documentIds: string[],
  ): Promise<HealthSampleDeletionResult> {
    let totalMarked = 0
    let totalFailed = 0

    logger.info(
      `Starting async entered-in-error marking job '${jobId}': processing ${documentIds.length} samples in collection '${collection}' in batches of ${this.BATCH_SIZE}`,
      {
        jobId,
        requestingUserId,
        targetUserId,
        collection,
        totalSamples: documentIds.length,
        batchSize: this.BATCH_SIZE,
      },
    )

    // Process samples in batches
    for (let i = 0; i < documentIds.length; i += this.BATCH_SIZE) {
      const batch = documentIds.slice(i, i + this.BATCH_SIZE)
      const batchNumber = Math.floor(i / this.BATCH_SIZE) + 1
      const totalBatches = Math.ceil(documentIds.length / this.BATCH_SIZE)

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

      const batchResults = await this.processBatch(
        targetUserId,
        collection,
        batch,
        jobId,
        requestingUserId,
      )

      totalMarked += batchResults.marked
      totalFailed += batchResults.failed

      // Small delay between batches to avoid overwhelming the system
      if (i + this.BATCH_SIZE < documentIds.length) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }

    const successRate =
      ((totalMarked / documentIds.length) * 100).toFixed(2) + '%'

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
        successRate,
      },
    )

    return {
      totalMarked,
      totalFailed,
      successRate,
    }
  }

  private async processBatch(
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
        const doc = await this.collections.firestore
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
}
