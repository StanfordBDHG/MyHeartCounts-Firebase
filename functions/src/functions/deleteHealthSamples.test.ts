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

describeWithEmulators('function: deleteHealthSamples', (env) => {
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

    const tooManySamples = Array.from({ length: 101 }, (_, i) => ({
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

  it('should handle non-existent samples gracefully', async () => {
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

    expect(result.summary.totalRequested).to.equal(1)
    expect(result.summary.totalDeleted).to.equal(0)
    expect(result.summary.totalFailed).to.equal(1)
    expect(result.deletedSamples[0].success).to.be.false
    expect(result.deletedSamples[0].error).to.equal('Sample not found')
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
            documentId: 'non-existent',
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

    expect(result.summary.totalRequested).to.equal(1)
    expect(result.summary.totalDeleted).to.equal(0)
    expect(result.summary.totalFailed).to.equal(1)
    expect(result.deletedSamples[0].success).to.be.false
    expect(result.deletedSamples[0].error).to.equal('Sample not found')
  })
})
