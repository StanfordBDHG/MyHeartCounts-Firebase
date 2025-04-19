//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { promisify } from 'util'
import * as zlib from 'zlib'

/**
 * Create a compressed test file for HealthKit data
 *
 * @param healthKitIdentifier Identifier for the HealthKit data
 * @param data The test data to compress
 * @returns Buffer containing the compressed data
 */
export async function createCompressedHealthKitTestData(
  healthKitIdentifier: string,
  data: Record<string, any>,
): Promise<Buffer> {
  const jsonData = JSON.stringify(data)
  const buffer = Buffer.from(jsonData)
  const compressBuffer = promisify(zlib.deflate)
  return compressBuffer(buffer)
}

/**
 * Create a sample observation entry for testing
 *
 * @param id Observation ID
 * @returns A sample observation object
 */
export function createSampleObservation(id: string): Record<string, any> {
  return {
    identifier: [{ id }],
    resourceType: 'Observation',
    code: {
      coding: [
        {
          system: 'http://loinc.org',
          code: '8867-4',
          display: 'Heart rate',
        },
      ],
    },
    valueQuantity: {
      value: 75,
      unit: 'beats/min',
      system: 'http://unitsofmeasure.org',
      code: '/min',
    },
    effectiveDateTime: new Date().toISOString(),
    status: 'final',
  }
}

/**
 * Generate sample HealthKit test data
 *
 * @param count Number of observations to generate
 * @returns Object containing test data
 */
export function generateHealthKitTestData(count = 5): Record<string, any> {
  const result: Record<string, any> = {}

  for (let i = 0; i < count; i++) {
    const key = `observations/heart-rate-${i}.json`
    const id = `test-observation-${i}`
    result[key] = createSampleObservation(id)
  }

  return result
}
