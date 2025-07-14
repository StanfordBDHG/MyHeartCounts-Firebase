//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import fs from 'fs'
import { expect } from 'chai'
import { describe } from 'mocha'
import { type DebugDataService } from './debugDataService.js'
import { type MockFirestore } from '../../../tests/mocks/firestore.js'
import { cleanupMocks, setupMockFirebase } from '../../../tests/setup.js'
import { TestFlags } from '../../../tests/testFlags.js'
import { getServiceFactory } from '../../factory/getServiceFactory.js'

describe('DebugDataService', () => {
  const date = new Date('2024-06-05')
  let service: DebugDataService
  let mockFirestore: MockFirestore

  before(() => {
    mockFirestore = setupMockFirebase().firestore
    service = getServiceFactory().debugData()
  })

  after(() => {
    cleanupMocks()
  })

  async function generatesSameCollectionAsBefore(
    collectionName: string,
    action: () => Promise<void>,
  ) {
    const filename =
      'src/tests/resources/seeding/' +
      collectionName.split('/').join('_') +
      '.json'
    try {
      await action()
      const valuesMap =
        mockFirestore.collections.get(collectionName) ??
        new Map<string, unknown>()
      const valuesRecord: Record<string, unknown> = {}
      valuesMap.forEach((value, key) => (valuesRecord[key] = value))
      if (TestFlags.regenerateValues) {
        fs.writeFileSync(filename, JSON.stringify(valuesRecord, undefined, 2))
      } else {
        expect(fs.readFileSync(filename, 'utf8')).to.deep.equal(
          JSON.stringify(valuesRecord, undefined, 2),
        )
      }
    } catch (error) {
      expect.fail(String(error))
    }
  }

  it('can seed heart rate observations', async () => {
    // Skip regenerating collection for now
    await service.seedUserHeartRateObservations('0', date)
    const heartRateCol = mockFirestore.collections.get(
      'users/0/heartRateObservations',
    )
    expect(heartRateCol).to.exist
    expect(heartRateCol?.size).to.be.greaterThan(0)
  })

  it('can seed messages', async () => {
    // Skip regenerating collection for now
    await service.seedUserMessages('0', date)
    const messagesCol = mockFirestore.collections.get('users/0/messages')
    expect(messagesCol).to.exist
    expect(messagesCol?.size).to.be.greaterThan(0)
  })
})
