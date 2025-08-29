//
// This source file is part of the Stanford Biodesign Digital Health MyHeart Counts open-source project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2025 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { UserType } from '@stanfordbdhg/myheartcounts-models'
import { expect } from 'chai'
import { https } from 'firebase-functions/v2'
import { markAccountForDeletion } from './markAccountForDeletion.js'
import { describeWithEmulators } from '../tests/functions/testEnvironment.js'

describeWithEmulators('function: markAccountForDeletion', (env) => {
  it('successfully marks a user account for deletion', async () => {
    const userId = await env.createUser({
      type: UserType.patient,
    })

    const userService = env.factory.user()

    // Verify user exists and is not marked for deletion
    const originalUser = await userService.getUser(userId)
    expect(originalUser).to.exist
    expect(originalUser?.content.disabled).to.be.false
    expect((originalUser?.content as any).toBeDeleted).to.be.undefined

    // Call the function
    const result = await env.call(
      markAccountForDeletion,
      {},
      {
        uid: userId,
        token: {
          type: UserType.patient,
          disabled: false,
        },
      },
    )

    // Verify function response
    expect(result.success).to.be.true
    expect(result.markedAt).to.be.a('string')
    expect(new Date(result.markedAt)).to.be.instanceOf(Date)

    // Verify user document was updated
    const updatedUser = await userService.getUser(userId)
    expect(updatedUser).to.exist
    expect((updatedUser?.content as any).toBeDeleted).to.be.true
    expect((updatedUser?.content as any).deletionRequest).to.exist
    expect((updatedUser?.content as any).deletionRequest.requestedBy).to.equal(userId)
    expect((updatedUser?.content as any).deletionRequest.status).to.equal('pending')
  })

  it('prevents unauthenticated users from marking accounts', async () => {
    try {
      await env.call(markAccountForDeletion, {}, {} as any)
      expect.fail('Should have thrown an error')
    } catch (error) {
      expect(error).to.be.instanceOf(https.HttpsError)
      expect((error as https.HttpsError).code).to.equal('unauthenticated')
      expect((error as https.HttpsError).message).to.contain('User must be authenticated')
    }
  })

  it('prevents users from marking other users accounts', async () => {
    const userId1 = await env.createUser({
      type: UserType.patient,
    })

    await env.createUser({
      type: UserType.patient,
    })

    try {
      await env.call(
        markAccountForDeletion,
        {},
        {
          uid: userId1,
          token: {
            type: UserType.patient,
            disabled: false,
          },
        },
      )
      expect.fail('Should have thrown an error')
    } catch (error) {
      expect(error).to.be.instanceOf(https.HttpsError)
      expect((error as https.HttpsError).code).to.equal('permission-denied')
    }
  })

  it('prevents marking already deleted accounts', async () => {
    const userId = await env.createUser({
      type: UserType.patient,
    })

    // First call should succeed
    await env.call(
      markAccountForDeletion,
      {},
      {
        uid: userId,
        token: {
          type: UserType.patient,
          disabled: false,
        },
      },
    )

    // Second call should fail
    try {
      await env.call(
        markAccountForDeletion,
        {},
        {
          uid: userId,
          token: {
            type: UserType.patient,
            disabled: false,
          },
        },
      )
      expect.fail('Should have thrown an error')
    } catch (error) {
      expect(error).to.be.instanceOf(https.HttpsError)
      expect((error as https.HttpsError).code).to.equal('already-exists')
      expect((error as https.HttpsError).message).to.contain('already marked for deletion')
    }
  })

  it('prevents marking disabled accounts for deletion', async () => {
    const userId = await env.createUser({
      type: UserType.patient,
      disabled: true,
    })

    try {
      await env.call(
        markAccountForDeletion,
        {},
        {
          uid: userId,
          token: {
            type: UserType.patient,
            disabled: true,
          },
        },
      )
      expect.fail('Should have thrown an error')
    } catch (error) {
      expect(error).to.be.instanceOf(https.HttpsError)
      expect((error as https.HttpsError).code).to.equal('failed-precondition')
      expect((error as https.HttpsError).message).to.contain('Cannot mark disabled account')
    }
  })

  it('handles non-existent user accounts', async () => {
    const nonExistentUserId = 'non-existent-user-id'

    try {
      await env.call(
        markAccountForDeletion,
        {},
        {
          uid: nonExistentUserId,
          token: {
            type: UserType.patient,
            disabled: false,
          },
        },
      )
      expect.fail('Should have thrown an error')
    } catch (error) {
      expect(error).to.be.instanceOf(https.HttpsError)
      expect((error as https.HttpsError).code).to.equal('not-found')
      expect((error as https.HttpsError).message).to.contain('User account not found')
    }
  })

  it('stores rich metadata with the deletion request', async () => {
    const userId = await env.createUser({
      type: UserType.patient,
    })

    const beforeTime = new Date()

    await env.call(
      markAccountForDeletion,
      {},
      {
        uid: userId,
        token: {
          type: UserType.patient,
          disabled: false,
        },
      },
    )

    const afterTime = new Date()

    const userService = env.factory.user()
    const updatedUser = await userService.getUser(userId)
    
    expect(updatedUser).to.exist
    const deletionRequest = (updatedUser?.content as any).deletionRequest
    
    expect(deletionRequest).to.exist
    expect(deletionRequest.requestedBy).to.equal(userId)
    expect(deletionRequest.status).to.equal('pending')
    
    const requestedAt = new Date(deletionRequest.requestedAt.seconds * 1000)
    expect(requestedAt.getTime()).to.be.at.least(beforeTime.getTime())
    expect(requestedAt.getTime()).to.be.at.most(afterTime.getTime())
  })
})