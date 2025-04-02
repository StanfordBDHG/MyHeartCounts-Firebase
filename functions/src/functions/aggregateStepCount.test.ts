//
// This source file is part of the MyHeartCounts project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { assert } from 'chai'
import { describeWithEmulators } from '../tests/functions/testEnvironment.js'
import { aggregateStepCount } from './aggregateStepCount.js'
import { getServiceFactory } from '../services/factory/getServiceFactory.js'
import { Flags, TestFlags } from '../testFlags.js'
import { v4 as uuidv4 } from 'uuid'

// This test requires emulators to be running
describeWithEmulators('aggregateStepCount', () => {
  before(async function () {
    if (!Flags.isEmulator) {
      this.skip()
    }
    
    // Set testing flags
    TestFlags.useMockedData = true
    
    // Skip initial seeding - we'll create test data directly in the test
    const factory = getServiceFactory()
  })

  it('aggregates step counts for a specific date', async () => {
    // Get factory and services
    const factory = getServiceFactory()
    const userService = factory.user()
    const firestore = factory.databaseService.firestore
    
    // Get all patients
    const patients = await userService.getAllPatients()
    assert.isAtLeast(patients.length, 1, 'At least one patient should exist')
    
    // Create test step count data for today
    const todayDate = new Date()
    const formattedToday = todayDate.toISOString()
    
    // Add test observations to the first patient
    const patientId = patients[0].id
    
    // Create observation 1
    const observationId1 = uuidv4()
    await firestore.collection('users').doc(patientId)
      .collection('HealthKitObservations').doc(observationId1)
      .set({
        id: observationId1,
        resourceType: 'Observation',
        status: 'final',
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: '41950-7',
              display: 'Number of steps in unspecified time Pedometer'
            },
            {
              system: 'http://developer.apple.com/documentation/healthkit',
              code: 'HKQuantityTypeIdentifierStepCount',
              display: 'Step Count'
            }
          ]
        },
        valueQuantity: {
          value: 5000,
          system: 'http://unitsofmeasure.org',
          code: 'steps',
          unit: 'steps'
        },
        effectivePeriod: {
          start: formattedToday,
          end: formattedToday
        },
        identifier: [
          {
            id: observationId1
          }
        ],
        issued: formattedToday
      })
    
    // Create observation 2
    const observationId2 = uuidv4()
    await firestore.collection('users').doc(patientId)
      .collection('HealthKitObservations').doc(observationId2)
      .set({
        id: observationId2,
        resourceType: 'Observation',
        status: 'final',
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: '41950-7',
              display: 'Number of steps in unspecified time Pedometer'
            },
            {
              system: 'http://developer.apple.com/documentation/healthkit',
              code: 'HKQuantityTypeIdentifierStepCount',
              display: 'Step Count'
            }
          ]
        },
        valueQuantity: {
          value: 7500,
          system: 'http://unitsofmeasure.org',
          code: 'steps',
          unit: 'steps'
        },
        effectivePeriod: {
          start: formattedToday,
          end: formattedToday
        },
        identifier: [
          {
            id: observationId2
          }
        ],
        issued: formattedToday
      })
    
    // Call the aggregateStepCount function
    const totalSteps = await aggregateStepCount({
      auth: null,
      data: {}
    })
    
    // Check that the result includes at least our added steps
    assert.isNumber(totalSteps)
    assert.isAtLeast(totalSteps, 12500, 'The total steps should include at least our added test steps (5000 + 7500)')
  })
})