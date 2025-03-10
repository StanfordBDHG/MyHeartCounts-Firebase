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

describe('firestore.rules: organizations/{organizationId}', () => {
  const organizationId = 'stanford'
  const otherOrganizationId = 'jhu'
  const nonExistingOrganizationId = 'ucb'

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
        type: UserType.clinician,
        organization: organizationId,
      })
      .firestore()

    patientFirestore = testEnvironment
      .authenticatedContext(patientId, {
        type: UserType.patient,
        organization: organizationId,
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
        .set({ type: UserType.owner, organization: organizationId })
      await firestore
        .doc(`users/${clinicianId}`)
        .set({ type: UserType.clinician, organization: organizationId })
      await firestore
        .doc(`users/${patientId}`)
        .set({ type: UserType.patient, organization: organizationId })
    })
  })

  after(async () => {
    await testEnvironment.cleanup()
  })

  it('gets organizations/{organizationId}', async () => {
    await assertSucceeds(
      adminFirestore.doc(`organizations/${organizationId}`).get(),
    )
    await assertSucceeds(
      adminFirestore.doc(`organizations/${otherOrganizationId}`).get(),
    )

    await assertSucceeds(
      ownerFirestore.doc(`organizations/${organizationId}`).get(),
    )
    await assertFails(
      ownerFirestore.doc(`organizations/${otherOrganizationId}`).get(),
    )

    await assertSucceeds(
      clinicianFirestore.doc(`organizations/${organizationId}`).get(),
    )
    await assertFails(
      clinicianFirestore.doc(`organizations/${otherOrganizationId}`).get(),
    )

    await assertSucceeds(
      patientFirestore.doc(`organizations/${organizationId}`).get(),
    )
    await assertFails(
      patientFirestore.doc(`organizations/${otherOrganizationId}`).get(),
    )

    await assertFails(
      userFirestore.doc(`organizations/${organizationId}`).get(),
    )
    await assertFails(
      userFirestore.doc(`organizations/${otherOrganizationId}`).get(),
    )
  })

  it('lists organizations', async () => {
    await assertSucceeds(adminFirestore.collection('organizations').get())
    await assertFails(ownerFirestore.collection('organizations').get())
    await assertFails(clinicianFirestore.collection('organizations').get())
    await assertFails(patientFirestore.collection('organizations').get())
    await assertFails(userFirestore.collection('organizations').get())
  })

  it('creates organizations/{organizationsId}', async () => {
    await assertSucceeds(
      adminFirestore.doc(`organizations/${nonExistingOrganizationId}`).set({}),
    )
    await assertSucceeds(
      adminFirestore.doc(`organizations/${nonExistingOrganizationId}`).delete(),
    )

    await assertFails(
      ownerFirestore.doc(`organizations/${nonExistingOrganizationId}`).set({}),
    )
    await assertFails(
      clinicianFirestore
        .doc(`organizations/${nonExistingOrganizationId}`)
        .set({}),
    )
    await assertFails(
      patientFirestore
        .doc(`organizations/${nonExistingOrganizationId}`)
        .set({}),
    )
    await assertFails(
      userFirestore.doc(`organizations/${nonExistingOrganizationId}`).set({}),
    )
  })

  it('updates organizations/{organizationsId}', async () => {
    await assertSucceeds(
      adminFirestore
        .doc(`organizations/${organizationId}`)
        .set({ name: 'Stanford' }),
    )
    await assertSucceeds(
      adminFirestore
        .doc(`organizations/${otherOrganizationId}`)
        .set({ name: 'Stanford' }),
    )
    await assertSucceeds(
      ownerFirestore
        .doc(`organizations/${organizationId}`)
        .set({ name: 'Stanford' }),
    )
    await assertFails(
      ownerFirestore
        .doc(`organizations/${otherOrganizationId}`)
        .set({ name: 'Stanford' }),
    )
    await assertFails(
      clinicianFirestore
        .doc(`organizations/${organizationId}`)
        .set({ name: 'Stanford' }),
    )
    await assertFails(
      clinicianFirestore
        .doc(`organizations/${otherOrganizationId}`)
        .set({ name: 'Stanford' }),
    )
    await assertFails(
      patientFirestore
        .doc(`organizations/${organizationId}`)
        .set({ name: 'Stanford' }),
    )
    await assertFails(
      patientFirestore
        .doc(`organizations/${otherOrganizationId}`)
        .set({ name: 'Stanford' }),
    )
    await assertFails(
      userFirestore
        .doc(`organizations/${organizationId}`)
        .set({ name: 'Stanford' }),
    )
    await assertFails(
      userFirestore
        .doc(`organizations/${otherOrganizationId}`)
        .set({ name: 'Stanford' }),
    )
  })
})
