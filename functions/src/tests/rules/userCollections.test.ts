//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import fs from 'fs'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import type firebase from 'firebase/compat/app'
import { describe, it } from 'mocha'

describe('firestore.rules: users/{userId}/{collectionName}/{documentId}', () => {
  const adminId = 'mockAdmin'
  const clinicianId = 'mockClinician'
  const patientId = 'mockPatient'
  const userId = 'mockUser'

  let testEnvironment: RulesTestEnvironment
  let adminFirestore: firebase.firestore.Firestore
  let clinicianFirestore: firebase.firestore.Firestore
  let patientFirestore: firebase.firestore.Firestore
  let userFirestore: firebase.firestore.Firestore

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
      .authenticatedContext(adminId, { admin: true })
      .firestore()

    clinicianFirestore = testEnvironment
      .authenticatedContext(clinicianId, {
        admin: false,
      })
      .firestore()

    patientFirestore = testEnvironment
      .authenticatedContext(patientId, {
        admin: false,
      })
      .firestore()

    userFirestore = testEnvironment.authenticatedContext(userId, {}).firestore()
  })

  beforeEach(async () => {
    await testEnvironment.clearFirestore()
    await testEnvironment.withSecurityRulesDisabled(async (environment) => {
      const firestore = environment.firestore()
      await firestore.doc(`users/${adminId}`).set({ admin: true })
      await firestore.doc(`users/${clinicianId}`).set({ admin: false })
      await firestore.doc(`users/${patientId}`).set({
        admin: false,
      })
      await firestore.doc(`users/${userId}`).set({})
    })
  })

  after(async () => {
    await testEnvironment.cleanup()
  })

  it('gets users/{userId}/heartRateObservations', async () => {
    const adminPath = `users/${adminId}/heartRateObservations`
    const clinicianPath = `users/${clinicianId}/heartRateObservations`
    const patientPath = `users/${patientId}/heartRateObservations`
    const userPath = `users/${userId}/heartRateObservations`

    await assertSucceeds(adminFirestore.collection(adminPath).get())
    await assertSucceeds(adminFirestore.collection(clinicianPath).get())
    await assertSucceeds(adminFirestore.collection(patientPath).get())
    await assertSucceeds(adminFirestore.collection(userPath).get())

    await assertFails(clinicianFirestore.collection(adminPath).get())
    await assertSucceeds(clinicianFirestore.collection(clinicianPath).get())
    await assertSucceeds(clinicianFirestore.collection(patientPath).get())
    await assertFails(clinicianFirestore.collection(userPath).get())

    await assertFails(patientFirestore.collection(adminPath).get())
    await assertFails(patientFirestore.collection(clinicianPath).get())
    await assertSucceeds(patientFirestore.collection(patientPath).get())
    await assertFails(patientFirestore.collection(userPath).get())

    await assertFails(userFirestore.collection(adminPath).get())
    await assertFails(userFirestore.collection(clinicianPath).get())
    await assertFails(userFirestore.collection(patientPath).get())
    await assertSucceeds(userFirestore.collection(userPath).get())
  })
})
