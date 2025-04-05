//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { UserType } from '@stanfordbdhg/engagehf-models'
import { expect } from 'chai'
import admin from 'firebase-admin'
import { describe } from 'mocha'
import { type UserService } from './userService.js'
import { type MockFirestore } from '../../tests/mocks/firestore.js'
import { cleanupMocks, setupMockFirebase } from '../../tests/setup.js'
import { CollectionsService } from '../database/collections.js'
import { getServiceFactory } from '../factory/getServiceFactory.js'

describe('DatabaseUserService', () => {
  let mockFirestore: MockFirestore
  let userService: UserService
  let collectionsService: CollectionsService

  beforeEach(() => {
    mockFirestore = setupMockFirebase().firestore
    collectionsService = new CollectionsService(admin.firestore())
    userService = getServiceFactory().user()
  })

  afterEach(() => {
    cleanupMocks()
  })

  describe('enrollUserDirectly', () => {
    it('enrolls a patient directly', async () => {
      const userId = 'mockPatientUserId'

      await userService.enrollUserDirectly(userId, {
        isSingleSignOn: false,
      })

      const userSnapshot = await collectionsService.users.doc(userId).get()
      expect(userSnapshot.exists).to.be.true
      const userData = userSnapshot.data()
      expect(userData).to.exist
      expect(userData?.dateOfEnrollment).to.exist
      expect(userData?.claims).to.deep.equal({
        type: UserType.patient,
        disabled: false,
      })
    })
  })
})
