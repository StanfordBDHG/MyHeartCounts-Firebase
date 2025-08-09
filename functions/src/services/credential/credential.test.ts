//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { expect } from 'chai'
import { type DecodedIdToken } from 'firebase-admin/auth'
import { https } from 'firebase-functions/v2'
import { type AuthData } from 'firebase-functions/v2/tasks'
import { describe } from 'mocha'
import { Credential, UserRole, UserRoleType } from './credential.js'

describe('Credential', () => {
  function createAuthData(
    userId: string,
    admin = false,
    disabled = false,
  ): AuthData {
    return {
      uid: userId,
      token: {
        admin,
        disabled,
      } as unknown as DecodedIdToken,
    } as AuthData
  }

  const adminAuth = createAuthData('mockAdmin', true)
  const regularUserAuth = createAuthData('mockUser', false)
  const disabledUserAuth = createAuthData('mockDisabled', false, true)

  it('correctly understands whether a user is an admin', async () => {
    const credential = new Credential(adminAuth)

    await expectToNotThrow(() => credential.check(UserRole.admin))

    await expectToNotThrow(() => credential.check(UserRole.user(adminAuth.uid)))

    await expectToThrow(
      () => credential.check(UserRole.user(regularUserAuth.uid)),
      credential.permissionDeniedError(),
    )
  })

  it('correctly understands whether a user is a regular user', async () => {
    const credential = new Credential(regularUserAuth)

    await expectToThrow(
      () => credential.check(UserRole.admin),
      credential.permissionDeniedError(),
    )

    await expectToNotThrow(() =>
      credential.check(UserRole.user(regularUserAuth.uid)),
    )

    await expectToThrow(
      () => credential.check(UserRole.user(adminAuth.uid)),
      credential.permissionDeniedError(),
    )
  })

  it('correctly handles user access to their own data', async () => {
    const credential = new Credential(regularUserAuth)

    await expectToThrow(
      () => credential.check(UserRole.admin),
      credential.permissionDeniedError(),
    )

    await expectToNotThrow(() =>
      credential.check(UserRole.user(regularUserAuth.uid)),
    )

    await expectToThrow(
      () => credential.check(UserRole.user(adminAuth.uid)),
      credential.permissionDeniedError(),
    )
  })

  it('handles disabled users correctly', async () => {
    const credential = new Credential(disabledUserAuth)

    // Attempt a check which should throw because user is disabled
    await expectToThrow(
      () => credential.check(UserRole.user(disabledUserAuth.uid)),
      credential.disabledError(),
    )
  })

  it('handles unauthenticated scenarios', async () => {
    await expectToThrow(
      () => new Credential(undefined),
      new https.HttpsError('unauthenticated', 'User is not authenticated.'),
    )
  })

  it('correctly handles different user roles', async () => {
    const credential = new Credential(regularUserAuth)

    // Should be able to authenticate as same user
    await expectToNotThrow(() =>
      credential.check(UserRole.user(regularUserAuth.uid)),
    )

    // Should reject if trying to authenticate as a different user
    await expectToThrow(
      () => credential.check(UserRole.user('different-user')),
      credential.permissionDeniedError(),
    )
  })

  it('handles regular user credentials correctly', async () => {
    const credential = new Credential(regularUserAuth)

    // A regular user can access their own profile
    await expectToNotThrow(() =>
      credential.check(UserRole.user(regularUserAuth.uid)),
    )

    // Get user ID and check it's not null
    expect(credential.userId).to.equal(regularUserAuth.uid)

    // Test admin status
    expect(credential.isAdmin).to.be.false
    expect(credential.isDisabled).to.be.false
  })

  it('handles admin role correctly', async () => {
    const credential = new Credential(adminAuth)

    // An admin should pass all admin checks
    await expectToNotThrow(() => credential.check(UserRole.admin))

    // An admin should be able to access their own user record
    await expectToNotThrow(() => credential.check(UserRole.user(adminAuth.uid)))

    // Test admin status
    expect(credential.isAdmin).to.be.true
    expect(credential.isDisabled).to.be.false
  })

  it('handles auth objects with incomplete data', async () => {
    // Missing token data
    const incompleteAuth: AuthData = {
      uid: 'incomplete-user',
      token: {} as DecodedIdToken,
    } as AuthData

    const credential = new Credential(incompleteAuth)

    // With no admin claim, should not pass admin role check
    await expectToThrow(
      () => credential.check(UserRole.admin),
      credential.permissionDeniedError(),
    )

    // But should be able to access own user data
    await expectToNotThrow(() =>
      credential.check(UserRole.user(incompleteAuth.uid)),
    )

    // Admin status should default to false if not specified
    expect(credential.isAdmin).to.be.false
    expect(credential.isDisabled).to.be.false
  })

  it('correctly handles check with multiple roles', async () => {
    const credential = new Credential(regularUserAuth)

    // Multiple role check should return the first matching role
    const result = credential.check(
      UserRole.admin,
      UserRole.user(regularUserAuth.uid),
      UserRole.user('someone-else'),
    )

    // Should match the user role
    expect(result.type).to.equal(UserRoleType.user)
  })

  it('rejects users with disabled flag', async () => {
    // Create a credential for a disabled user
    const credential = new Credential(disabledUserAuth)

    // Any role check should throw a disabled error
    await expectToThrow(
      () => credential.check(UserRole.user(disabledUserAuth.uid)),
      credential.disabledError(),
    )

    // Even admin role check should throw disabled error for disabled admin
    const disabledAdminAuth = createAuthData('disabledAdmin', true, true)
    const disabledAdminCredential = new Credential(disabledAdminAuth)
    await expectToThrow(
      () => disabledAdminCredential.check(UserRole.admin),
      credential.disabledError(),
    )
  })

  it('handles checkAsync method correctly', async () => {
    const credential = new Credential(regularUserAuth)

    // Test the checkAsync method with simple promise
    const asyncResult = await credential.checkAsync(async () => [
      UserRole.user(regularUserAuth.uid),
    ])

    // Should match the user role
    expect(asyncResult.type).to.equal(UserRoleType.user)

    // Test with multiple role providers
    const multiResult = await credential.checkAsync(
      async () => [UserRole.admin], // This will not match
      async () => [UserRole.user(regularUserAuth.uid)], // This will match
    )

    // Should match the user role from the second provider
    expect(multiResult.type).to.equal(UserRoleType.user)

    // Test with no matching roles - should throw
    await expectToThrow(
      () =>
        credential.checkAsync(
          async () => [UserRole.admin],
          async () => [UserRole.user('different-user')],
        ),
      credential.permissionDeniedError(),
    )
  })
})

async function expectToThrow<T>(
  promise: () => Promise<T> | T,
  error?: unknown,
  message?: string,
): Promise<void> {
  try {
    await promise()
    expect.fail('Expected promise to throw')
  } catch (e) {
    if (error !== undefined) expect(e).to.deep.equal(error, message)
  }
}

async function expectToNotThrow<T>(
  promise: () => Promise<T> | T,
  message?: string,
): Promise<T> {
  try {
    return await promise()
  } catch (e) {
    expect.fail('Expected promise to not throw', message)
  }
}
