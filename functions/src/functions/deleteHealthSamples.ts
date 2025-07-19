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
    .max(100, 'Too many samples (max 100)'),
  confirmation: z.literal(true, {
    errorMap: () => ({ message: 'Explicit confirmation required' }),
  }),
})

type DeleteHealthSamplesInput = z.infer<typeof deleteHealthSamplesInputSchema>

interface DeleteHealthSamplesOutput {
  deletedSamples: Array<{
    collection: UserObservationCollection
    documentId: string
    success: boolean
    error?: string
  }>
  summary: {
    totalRequested: number
    totalDeleted: number
    totalFailed: number
  }
}

export const deleteHealthSamples = validatedOnCall(
  'deleteHealthSamples',
  deleteHealthSamplesInputSchema,
  async (request): Promise<DeleteHealthSamplesOutput> => {
    const factory = getServiceFactory()
    const credential = factory.credential(request.auth)
    const { userId, samples } = request.data

    credential.check(UserRole.admin, UserRole.clinician, UserRole.user(userId))

    logger.info(
      `User '${credential.userId}' requested deletion of ${samples.length} health samples for user '${userId}'`,
      {
        requestingUserId: credential.userId,
        targetUserId: userId,
        samplesCount: samples.length,
        samples: samples.map((sample) => ({
          collection: sample.collection,
          documentId: sample.documentId,
        })),
      },
    )

    const collections = new CollectionsService(admin.firestore())
    const deletedSamples: DeleteHealthSamplesOutput['deletedSamples'] = []
    let totalDeleted = 0
    let totalFailed = 0

    for (const sample of samples) {
      try {
        const doc = await collections
          .userObservations(userId, sample.collection)
          .doc(sample.documentId)
          .get()

        if (!doc.exists) {
          totalFailed++
          logger.warn(
            `Health sample not found: '${sample.documentId}' in collection '${sample.collection}' for user '${userId}'`,
            {
              requestingUserId: credential.userId,
              targetUserId: userId,
              collection: sample.collection,
              documentId: sample.documentId,
            },
          )

          deletedSamples.push({
            ...sample,
            success: false,
            error: 'Sample not found',
          })
          continue
        }

        await doc.ref.delete()
        totalDeleted++

        logger.info(
          `Successfully deleted health sample '${sample.documentId}' from collection '${sample.collection}' for user '${userId}'`,
          {
            requestingUserId: credential.userId,
            targetUserId: userId,
            collection: sample.collection,
            documentId: sample.documentId,
          },
        )

        deletedSamples.push({
          ...sample,
          success: true,
        })
      } catch (error) {
        totalFailed++
        const errorMessage =
          error instanceof Error ? error.message : String(error)

        logger.error(
          `Failed to delete health sample '${sample.documentId}' from collection '${sample.collection}' for user '${userId}': ${errorMessage}`,
          {
            requestingUserId: credential.userId,
            targetUserId: userId,
            collection: sample.collection,
            documentId: sample.documentId,
            error: errorMessage,
          },
        )

        deletedSamples.push({
          ...sample,
          success: false,
          error: errorMessage,
        })
      }
    }

    logger.info(
      `Health sample deletion operation completed for user '${userId}': ${totalDeleted} succeeded, ${totalFailed} failed`,
      {
        requestingUserId: credential.userId,
        targetUserId: userId,
        totalRequested: samples.length,
        totalDeleted,
        totalFailed,
      },
    )

    return {
      deletedSamples,
      summary: {
        totalRequested: samples.length,
        totalDeleted,
        totalFailed,
      },
    }
  },
)
