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

  it('recreates the same appointments', async () => {
    await generatesSameCollectionAsBefore('users/0/appointments', () =>
      service.seedUserAppointments('0', date),
    )
  })

  it('recreates the same blood pressure observations', async () => {
    await generatesSameCollectionAsBefore(
      'users/0/bloodPressureObservations',
      () => service.seedUserBloodPressureObservations('0', date),
    )
  })

  it('recreates the same body weight observations', async () => {
    await generatesSameCollectionAsBefore(
      'users/0/bodyWeightObservations',
      () => service.seedUserBodyWeightObservations('0', date),
    )
  })

  it('recreates the same creatinine observations', async () => {
    await generatesSameCollectionAsBefore(
      'users/0/creatinineObservations',
      () => service.seedUserCreatinineObservations('0', date),
    )
  })

  it('recreates the same dry weight observations', async () => {
    await generatesSameCollectionAsBefore('users/0/dryWeightObservations', () =>
      service.seedUserDryWeightObservations('0', date),
    )
  })

  it('recreates the same eGfr observations', async () => {
    await generatesSameCollectionAsBefore('users/0/eGfrObservations', () =>
      service.seedUserEgfrObservations('0', date),
    )
  })

  it('recreates the same heart rate observations', async () => {
    await generatesSameCollectionAsBefore('users/0/heartRateObservations', () =>
      service.seedUserHeartRateObservations('0', date),
    )
  })

  it('recreates the same potassium observations', async () => {
    await generatesSameCollectionAsBefore('users/0/potassiumObservations', () =>
      service.seedUserPotassiumObservations('0', date),
    )
  })

  it('recreates the same messages', async () => {
    await generatesSameCollectionAsBefore('users/0/messages', () =>
      service.seedUserMessages('0', date),
    )
  })
})
