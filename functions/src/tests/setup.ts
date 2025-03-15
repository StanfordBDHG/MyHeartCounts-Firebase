//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import admin from 'firebase-admin'
import { stub, restore } from 'sinon'
import { MockFirebase } from './mocks/firebase.js'

export function setupMockFirebase(): MockFirebase {
  const result = new MockFirebase()
  stub(admin, 'auth').get(() => () => result.auth)
  stub(admin, 'firestore').get(() => () => result.firestore)
  stub(admin, 'messaging').get(() => () => result.messaging)
  stub(admin, 'storage').get(() => () => result.storage)
  return result
}

export function cleanupMocks() {
  restore()
}
