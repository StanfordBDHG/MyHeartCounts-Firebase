//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { UserType } from '@stanfordbdhg/engagehf-models'
import { expect } from 'chai'
import { type DecodedIdToken } from 'firebase-admin/auth'
import { https } from 'firebase-functions/v2'
import { type AuthData } from 'firebase-functions/v2/tasks'
import { describe } from 'mocha'
import { Credential, UserRole } from './credential.js'

describe('Credential', () => {
  function createAuthData(userId: string, type: UserType, disabled = false): AuthData {
    return {
      uid: userId,
      token: {
        type: type,
        disabled,
      } as unknown as DecodedIdToken,
    } as AuthData
  }

  const adminAuth = createAuthData('mockAdmin', UserType.admin)
  const clinicianAuth = createAuthData('mockClinician', UserType.clinician)
  const patientAuth = createAuthData('mockPatient', UserType.patient)
  const disabledAuth = createAuthData('mockDisabled', UserType.patient, true)

  it('correctly understands whether a user is an admin', async () => {
    const credential = new Credential(adminAuth)

    await expectToNotThrow(() => credential.check(UserRole.admin))

    await expectToThrow(
      () => credential.check(UserRole.clinician),
      credential.permissionDeniedError(),
    )

    await expectToThrow(
      () => credential.check(UserRole.patient),
      credential.permissionDeniedError(),
    )

    await expectToNotThrow(() => credential.check(UserRole.user(adminAuth.uid)))

    await expectToThrow(
      () => credential.check(UserRole.user(patientAuth.uid)),
      credential.permissionDeniedError(),
    )
  })

  it('correctly understands whether a user is a clinician', async () => {
    const credential = new Credential(clinicianAuth)

    await expectToThrow(
      () => credential.check(UserRole.admin),
      credential.permissionDeniedError(),
    )

    await expectToNotThrow(() => credential.check(UserRole.clinician))

    await expectToThrow(
      () => credential.check(UserRole.patient),
      credential.permissionDeniedError(),
    )

    await expectToNotThrow(() =>
      credential.check(UserRole.user(clinicianAuth.uid)),
    )

    await expectToThrow(
      () => credential.check(UserRole.user(patientAuth.uid)),
      credential.permissionDeniedError(),
    )
  })

  it('correctly understands whether a user is a patient', async () => {
    const credential = new Credential(patientAuth)

    await expectToThrow(
      () => credential.check(UserRole.admin),
      credential.permissionDeniedError(),
    )

    await expectToThrow(
      () => credential.check(UserRole.clinician),
      credential.permissionDeniedError(),
    )

    await expectToNotThrow(() => credential.check(UserRole.patient))

    await expectToNotThrow(() =>
      credential.check(UserRole.user(patientAuth.uid)),
    )

    await expectToThrow(
      () => credential.check(UserRole.user(adminAuth.uid)),
      credential.permissionDeniedError(),
    )
  })
  
  it('handles disabled users correctly', async () => {
    const credential = new Credential(disabledAuth)
    
    // Attempt a check which should throw because user is disabled
    await expectToThrow(
      () => credential.check(UserRole.patient),
      credential.disabledError(),
    )
  })

  it('handles unauthenticated scenarios', async () => {
    await expectToThrow(
      () => new Credential(undefined),
      new https.HttpsError('unauthenticated', 'User is not authenticated.')
    )
  })
  
  it('correctly handles different user roles', async () => {
    const credential = new Credential(patientAuth)
    
    // Should be able to authenticate as same user
    await expectToNotThrow(() => 
      credential.check(UserRole.user(patientAuth.uid))
    )
    
    // Should reject if trying to authenticate as a different user
    await expectToThrow(
      () => credential.check(UserRole.user('different-user')),
      credential.permissionDeniedError(),
    )
  })
  
  it('handles clinician role correctly', async () => {
    const credential = new Credential(clinicianAuth)
    
    // A clinician can access their own profile
    await expectToNotThrow(() => 
      credential.check(UserRole.clinician)
    )
    
    // Get user ID and check it's not null
    expect(credential.userId).to.equal(clinicianAuth.uid)
    
    // Get user type and check it matches
    expect(credential.userType).to.equal(UserType.clinician)
    
    // Test userHasType helper method
    expect(credential.userHasType(UserType.clinician)).to.be.true
    expect(credential.userHasType(UserType.admin)).to.be.false
    expect(credential.userHasType(UserType.patient)).to.be.false
  })
  
  it('handles admin role correctly', async () => {
    const credential = new Credential(adminAuth)
    
    // An admin should pass all admin checks
    await expectToNotThrow(() => credential.check(UserRole.admin))
    
    // An admin should be able to access their own user record
    await expectToNotThrow(() => credential.check(UserRole.user(adminAuth.uid)))
    
    // Get user type and check it matches
    expect(credential.userType).to.equal(UserType.admin)
    
    // Test userHasType helper method
    expect(credential.userHasType(UserType.admin)).to.be.true
    expect(credential.userHasType(UserType.clinician)).to.be.false
    expect(credential.userHasType(UserType.patient)).to.be.false
  })
  
  it('handles auth objects with incomplete data', async () => {
    // Missing token data
    const incompleteAuth: AuthData = {
      uid: 'incomplete-user',
      token: {} as DecodedIdToken
    } as AuthData
    
    const credential = new Credential(incompleteAuth)
    
    // With no type, should not pass any role check
    await expectToThrow(
      () => credential.check(UserRole.admin),
      credential.permissionDeniedError()
    )
    
    await expectToThrow(
      () => credential.check(UserRole.clinician),
      credential.permissionDeniedError()
    )
    
    await expectToThrow(
      () => credential.check(UserRole.patient),
      credential.permissionDeniedError()
    )
    
    // But should be able to access own user data
    await expectToNotThrow(() => 
      credential.check(UserRole.user(incompleteAuth.uid))
    )
    
    // User type should default to patient if not specified
    expect(credential.userType).to.equal(UserType.patient)
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
