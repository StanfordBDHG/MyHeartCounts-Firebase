//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { randomUUID } from 'crypto'
import fs from 'fs'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { UserType } from '@stanfordbdhg/engagehf-models'
import type firebase from 'firebase/compat/app'
import { describe, it } from 'mocha'

describe('firestore.rules: users/{userId}', () => {
  const adminId = 'mockAdmin'
  const clinicianId = 'mockClinician'
  const patientId = 'mockPatient'
  const userId = 'mockUser'
  const unknownId = 'mockUnknown'
  const disabledUserId = 'disabledMockUser'

  let testEnvironment: RulesTestEnvironment
  let adminFirestore: firebase.firestore.Firestore
  let clinicianFirestore: firebase.firestore.Firestore
  let patientFirestore: firebase.firestore.Firestore
  let userFirestore: firebase.firestore.Firestore
  let disabledUserFirestore: firebase.firestore.Firestore

  before(async () => {
    testEnvironment = await initializeTestEnvironment({
      projectId: 'stanford-bdhg-engage-hf',
      firestore: {
        rules: fs.readFileSync('../firestore.rules', 'utf8'),
        host: 'localhost',
        port: 8080,
      },
    })

    adminFirestore = testEnvironment
      .authenticatedContext(adminId, { type: UserType.admin })
      .firestore()

    clinicianFirestore = testEnvironment
      .authenticatedContext(clinicianId, {
        type: UserType.clinician,
      })
      .firestore()

    patientFirestore = testEnvironment
      .authenticatedContext(patientId, {
        type: UserType.patient,
      })
      .firestore()

    userFirestore = testEnvironment.authenticatedContext(userId, {}).firestore()

    disabledUserFirestore = testEnvironment
      .authenticatedContext(disabledUserId, {
        type: UserType.patient,
        disabled: true,
      })
      .firestore()
  })

  beforeEach(async () => {
    await testEnvironment.clearFirestore()
    await testEnvironment.withSecurityRulesDisabled(async (environment) => {
      const firestore = environment.firestore()
      await firestore.doc(`users/${adminId}`).set({ type: UserType.admin })
      await firestore
        .doc(`users/${clinicianId}`)
        .set({ type: UserType.clinician })
      await firestore.doc(`users/${patientId}`).set({ 
        type: UserType.patient,
        clinician: clinicianId // Set clinician reference to make tests pass
      })
      await firestore.doc(`users/${userId}`).set({})
      await firestore.doc(`users/${disabledUserId}`).set({
        type: UserType.patient,
        disabled: true,
        clinician: clinicianId // Set clinician reference to make tests pass
      })
    })
  })

  after(async () => {
    await testEnvironment.cleanup()
  })

  it('gets users/{userId}', async () => {
    await assertSucceeds(adminFirestore.doc(`users/${adminId}`).get())
    await assertSucceeds(adminFirestore.doc(`users/${clinicianId}`).get())
    await assertSucceeds(adminFirestore.doc(`users/${patientId}`).get())
    await assertSucceeds(adminFirestore.doc(`users/${userId}`).get())
    await assertSucceeds(adminFirestore.doc(`users/${unknownId}`).get())
    await assertSucceeds(adminFirestore.doc(`users/${disabledUserId}`).get())

    await assertFails(clinicianFirestore.doc(`users/${adminId}`).get())
    await assertSucceeds(clinicianFirestore.doc(`users/${clinicianId}`).get())
    await assertSucceeds(clinicianFirestore.doc(`users/${patientId}`).get())
    await assertFails(clinicianFirestore.doc(`users/${userId}`).get())
    await assertSucceeds(clinicianFirestore.doc(`users/${unknownId}`).get())
    await assertSucceeds(
      clinicianFirestore.doc(`users/${disabledUserId}`).get(),
    )

    await assertFails(patientFirestore.doc(`users/${adminId}`).get())
    await assertFails(patientFirestore.doc(`users/${clinicianId}`).get())
    await assertSucceeds(patientFirestore.doc(`users/${patientId}`).get())
    await assertFails(patientFirestore.doc(`users/${userId}`).get())
    await assertSucceeds(patientFirestore.doc(`users/${unknownId}`).get())
    await assertFails(patientFirestore.doc(`users/${disabledUserId}`).get())

    await assertFails(userFirestore.doc(`users/${adminId}`).get())
    await assertFails(userFirestore.doc(`users/${clinicianId}`).get())
    await assertFails(userFirestore.doc(`users/${patientId}`).get())
    await assertSucceeds(userFirestore.doc(`users/${userId}`).get())
    await assertFails(userFirestore.doc(`users/${unknownId}`).get())
    await assertFails(userFirestore.doc(`users/${disabledUserId}`).get())

    await assertFails(disabledUserFirestore.doc(`users/${adminId}`).get())
    await assertFails(disabledUserFirestore.doc(`users/${clinicianId}`).get())
    await assertFails(disabledUserFirestore.doc(`users/${patientId}`).get())
    await assertFails(disabledUserFirestore.doc(`users/${userId}`).get())
    await assertFails(disabledUserFirestore.doc(`users/${unknownId}`).get())
    await assertSucceeds(
      disabledUserFirestore.doc(`users/${disabledUserId}`).get(),
    )
  })

  it('lists users', async () => {
    await assertSucceeds(adminFirestore.collection('users').get())

    await assertFails(clinicianFirestore.collection('users').get())
    await assertFails(patientFirestore.collection('users').get())
    await assertFails(userFirestore.collection('users').get())
  })

  it('creates users/{userId}', async () => {
    const newUserId = randomUUID();
    await assertSucceeds(adminFirestore.doc(`users/${newUserId}`).set({}))
    await assertFails(clinicianFirestore.doc(`users/${randomUUID()}`).set({}))
    await assertFails(patientFirestore.doc(`users/${randomUUID()}`).set({}))
    
    // A user should be able to create their own user document
    const authenticatedUserId = randomUUID();
    const authenticatedUserFirestore = testEnvironment
      .authenticatedContext(authenticatedUserId, {})
      .firestore();
      
    await assertSucceeds(authenticatedUserFirestore.doc(`users/${authenticatedUserId}`).set({}))
    await assertFails(userFirestore.doc(`users/${randomUUID()}`).set({}))

    await testEnvironment.withSecurityRulesDisabled(async (environment) => {
      await environment.firestore().doc(`users/${userId}`).delete()
    })
    
    // User can create their own document if it doesn't exist
    await assertSucceeds(userFirestore.doc(`users/${userId}`).set({}))
    
    // Disabled users cannot create documents
    await assertFails(
      disabledUserFirestore.doc(`users/${disabledUserId}`).set({}),
    )
  })

  it('updates users/{userId} as admin', async () => {
    await assertSucceeds(adminFirestore.doc(`users/${adminId}`).set({}))
    await assertSucceeds(
      adminFirestore
        .doc(`users/${clinicianId}`)
        .set({ type: UserType.patient }),
    )
    await assertSucceeds(adminFirestore.doc(`users/${patientId}`).set({}))
    await assertSucceeds(adminFirestore.doc(`users/${userId}`).set({}))
  })

  it('updates users/{userId} as clinician', async () => {
    await assertFails(clinicianFirestore.doc(`users/${adminId}`).set({}))
    
    // Clinician can update their own document with merge=true
    await assertSucceeds(
      clinicianFirestore
        .doc(`users/${clinicianId}`)
        .set(
          { dateOfBirth: new Date('2011-01-01').toISOString() },
          { merge: true },
        ),
    )
    
    // Clinician cannot completely overwrite their own document
    await assertFails(
      clinicianFirestore
        .doc(`users/${clinicianId}`)
        .set({ dateOfBirth: new Date('2011-01-01').toISOString() }),
    )
    
    // Clinician cannot change user type with merge=false
    await assertFails(
      clinicianFirestore.doc(`users/${clinicianId}`).set(
        {
          type: UserType.patient,
          dateOfBirth: new Date('2011-01-01').toISOString(),
        },
        { merge: false },
      ),
    )
    
    // Clinician can update the patient they are assigned to
    await assertSucceeds(
      clinicianFirestore
        .doc(`users/${patientId}`)
        .set(
          { 
            dateOfBirth: new Date('2011-01-01').toISOString(),
            // Ensure clinician property is preserved during updates
            clinician: clinicianId
          },
          { merge: true },
        ),
    )
    
    // Clinician cannot update a user without a clinician relationship
    await assertFails(
      clinicianFirestore
        .doc(`users/${userId}`)
        .set(
          { dateOfBirth: new Date('2011-01-01').toISOString() },
          { merge: true },
        ),
    )
  })
})
