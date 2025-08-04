//
// This source file is part of the Stanford Biodesign Digital Health MyHeart Counts open-source project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2025 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  UserType,
  UserObservationCollection,
} from '@stanfordbdhg/myheartcounts-models'
import { expect } from 'chai'
import type { https } from 'firebase-functions/v2'
import { deleteHealthSamples } from './deleteHealthSamples.js'
import { describeWithEmulators } from '../tests/functions/testEnvironment.js'
import { expectError } from '../tests/helpers.js'

describeWithEmulators(
  'function: deleteHealthSamples (FHIR compliant)',
  (env) => {
    it('should require confirmation', async () => {
      const userId = await env.createUser({
        type: UserType.patient,
      })

      await expectError(
        () =>
          env.call(
            deleteHealthSamples,
            {
              userId,
              samples: [
                {
                  collection: UserObservationCollection.heartRate,
                  documentId: 'test-id',
                },
              ],
              confirmation: false,
            },
            { uid: userId },
          ),
        (error) => {
          const httpsError = error as https.HttpsError
          expect(httpsError.code).to.equal('invalid-argument')
        },
      )
    })

    it('should validate empty samples array', async () => {
      const userId = await env.createUser({
        type: UserType.patient,
      })

      await expectError(
        () =>
          env.call(
            deleteHealthSamples,
            {
              userId,
              samples: [],
              confirmation: true,
            },
            { uid: userId },
          ),
        (error) => {
          const httpsError = error as https.HttpsError
          expect(httpsError.code).to.equal('invalid-argument')
        },
      )
    })

    it('should validate too many samples', async () => {
      const userId = await env.createUser({
        type: UserType.patient,
      })

      const tooManySamples = Array.from({ length: 50001 }, (_, i) => ({
        collection: UserObservationCollection.heartRate,
        documentId: `test-id-${i}`,
      }))

      await expectError(
        () =>
          env.call(
            deleteHealthSamples,
            {
              userId,
              samples: tooManySamples,
              confirmation: true,
            },
            { uid: userId },
          ),
        (error) => {
          const httpsError = error as https.HttpsError
          expect(httpsError.code).to.equal('invalid-argument')
        },
      )
    })

    it('should return async job response for entered-in-error marking', async () => {
      const userId = await env.createUser({
        type: UserType.patient,
      })

      const result = await env.call(
        deleteHealthSamples,
        {
          userId,
          samples: [
            {
              collection: UserObservationCollection.heartRate,
              documentId: 'non-existent',
            },
          ],
          confirmation: true,
        },
        { uid: userId },
      )

      expect(result.status).to.equal('accepted')
      expect(result.jobId).to.be.a('string')
      expect(result.totalSamples).to.equal(1)
      expect(result.estimatedDurationMinutes).to.be.a('number')
      expect(result.message).to.include(
        'Processing 1 samples as entered-in-error asynchronously',
      )
    })

    it('should deny access to other users samples', async () => {
      const userId1 = await env.createUser({
        type: UserType.patient,
      })
      const userId2 = await env.createUser({
        type: UserType.patient,
      })

      await expectError(
        () =>
          env.call(
            deleteHealthSamples,
            {
              userId: userId2,
              samples: [
                {
                  collection: UserObservationCollection.heartRate,
                  documentId: 'test-id',
                },
              ],
              confirmation: true,
            },
            { uid: userId1 },
          ),
        (error) => {
          const httpsError = error as https.HttpsError
          expect(httpsError.code).to.equal('permission-denied')
        },
      )
    })

    it('should allow admin to delete any users samples', async () => {
      const adminId = await env.createUser({
        type: UserType.admin,
      })
      const userId = await env.createUser({
        type: UserType.patient,
      })

      const result = await env.call(
        deleteHealthSamples,
        {
          userId,
          samples: [
            {
              collection: UserObservationCollection.heartRate,
              documentId: 'admin-test-sample',
            },
          ],
          confirmation: true,
        },
        {
          uid: adminId,
          token: {
            type: UserType.admin,
            disabled: false,
          },
        },
      )

      expect(result.status).to.equal('accepted')
      expect(result.jobId).to.be.a('string')
      expect(result.totalSamples).to.equal(1)
      expect(result.estimatedDurationMinutes).to.be.a('number')
      expect(result.message).to.include(
        'Processing 1 samples as entered-in-error asynchronously',
      )
    })

    it('should handle large batch marking requests', async () => {
      const userId = await env.createUser({
        type: UserType.patient,
      })

      // Create a large batch of 1000 samples
      const largeBatch = Array.from({ length: 1000 }, (_, i) => ({
        collection: UserObservationCollection.heartRate,
        documentId: `large-batch-sample-${i}`,
      }))

      const result = await env.call(
        deleteHealthSamples,
        {
          userId,
          samples: largeBatch,
          confirmation: true,
        },
        { uid: userId },
      )

      expect(result.status).to.equal('accepted')
      expect(result.jobId).to.be.a('string')
      expect(result.totalSamples).to.equal(1000)
      expect(result.estimatedDurationMinutes).to.equal(1) // 1000 samples = 1 minute
      expect(result.message).to.include(
        'Processing 1000 samples as entered-in-error asynchronously',
      )
    })
  },
)
