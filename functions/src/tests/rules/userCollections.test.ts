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
import { UserType } from '@stanfordbdhg/engagehf-models'
import type firebase from 'firebase/compat/app'
import { describe, it } from 'mocha'

describe('firestore.rules: users/{userId}/{collectionName}/{documentId}', () => {
  const organizationId = 'stanford'
  const otherOrganizationId = 'jhu'

  const adminId = 'mockAdmin'
  const ownerId = 'mockOwner'
  const clinicianId = 'mockClinician'
  const patientId = 'mockPatient'
  const userId = 'mockUser'

  let testEnvironment: RulesTestEnvironment
  let adminFirestore: firebase.firestore.Firestore
  let ownerFirestore: firebase.firestore.Firestore
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
      .authenticatedContext(adminId, { type: UserType.admin })
      .firestore()

    ownerFirestore = testEnvironment
      .authenticatedContext(ownerId, {
        type: UserType.owner,
        organization: organizationId,
      })
      .firestore()

    clinicianFirestore = testEnvironment
      .authenticatedContext(clinicianId, {
        organization: organizationId,
        type: UserType.clinician,
      })
      .firestore()

    patientFirestore = testEnvironment
      .authenticatedContext(patientId, {
        organization: organizationId,
        type: UserType.patient,
      })
      .firestore()

    userFirestore = testEnvironment.authenticatedContext(userId, {}).firestore()
  })

  beforeEach(async () => {
    await testEnvironment.clearFirestore()
    await testEnvironment.withSecurityRulesDisabled(async (environment) => {
      const firestore = environment.firestore()
      await firestore.doc(`organizations/${organizationId}`).set({})
      await firestore.doc(`organizations/${otherOrganizationId}`).set({})
      await firestore.doc(`users/${adminId}`).set({ type: UserType.admin })
      await firestore
        .doc(`users/${ownerId}`)
        .set({ organization: organizationId })
      await firestore
        .doc(`users/${clinicianId}`)
        .set({ type: UserType.clinician, organization: organizationId })
      await firestore
        .doc(`users/${patientId}`)
        .set({ type: UserType.patient, organization: organizationId })
      await firestore.doc(`users/${userId}`).set({})
    })
  })

  after(async () => {
    await testEnvironment.cleanup()
  })

  it('gets users/{userId}/allergyIntolerances', async () => {
    const adminPath = `users/${adminId}/allergyIntolerances`
    const ownerPath = `users/${ownerId}/allergyIntolerances`
    const clinicianPath = `users/${clinicianId}/allergyIntolerances`
    const patientPath = `users/${patientId}/allergyIntolerances`
    const userPath = `users/${userId}/allergyIntolerances`

    await assertSucceeds(adminFirestore.collection(adminPath).get())
    await assertSucceeds(adminFirestore.collection(ownerPath).get())
    await assertSucceeds(adminFirestore.collection(clinicianPath).get())
    await assertSucceeds(adminFirestore.collection(patientPath).get())
    await assertSucceeds(adminFirestore.collection(userPath).get())

    await assertFails(ownerFirestore.collection(adminPath).get())
    await assertSucceeds(ownerFirestore.collection(ownerPath).get())
    await assertSucceeds(ownerFirestore.collection(clinicianPath).get())
    await assertSucceeds(ownerFirestore.collection(patientPath).get())
    await assertFails(ownerFirestore.collection(userPath).get())

    await assertFails(clinicianFirestore.collection(adminPath).get())
    await assertSucceeds(clinicianFirestore.collection(ownerPath).get())
    await assertSucceeds(clinicianFirestore.collection(clinicianPath).get())
    await assertSucceeds(clinicianFirestore.collection(patientPath).get())
    await assertFails(clinicianFirestore.collection(userPath).get())

    await assertFails(patientFirestore.collection(adminPath).get())
    await assertFails(patientFirestore.collection(ownerPath).get())
    await assertFails(patientFirestore.collection(clinicianPath).get())
    await assertSucceeds(patientFirestore.collection(patientPath).get())
    await assertFails(patientFirestore.collection(userPath).get())

    await assertFails(userFirestore.collection(adminPath).get())
    await assertFails(userFirestore.collection(ownerPath).get())
    await assertFails(userFirestore.collection(clinicianPath).get())
    await assertFails(userFirestore.collection(patientPath).get())
    await assertSucceeds(userFirestore.collection(userPath).get())
  })
})
