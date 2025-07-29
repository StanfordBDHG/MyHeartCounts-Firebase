//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { expect } from 'chai'
import { describe, it } from 'mocha'

function getCollectionNameFromFileName(fileName: string): string | null {
  const hkIdentifierPattern = /[A-Za-z]*Identifier[A-Za-z]*/
  const match = fileName.match(hkIdentifierPattern)

  if (match) {
    const healthKitIdentifier = match[0]
    return `HealthObservations_${healthKitIdentifier}`
  }

  return null
}

describe('processLiveHealthSamples', () => {
  describe('getCollectionNameFromFileName', () => {
    it('should extract HKQuantityTypeIdentifier from filename', () => {
      const fileName = 'HKQuantityTypeIdentifierHeartRate_ABC123.json.zlib'
      const result = getCollectionNameFromFileName(fileName)
      expect(result).to.equal('HealthObservations_HKQuantityTypeIdentifierHeartRate')
    })

    it('should extract HKCorrelationTypeIdentifier from filename', () => {
      const fileName = 'HKCorrelationTypeIdentifierBloodPressure_456.json.zlib'
      const result = getCollectionNameFromFileName(fileName)
      expect(result).to.equal('HealthObservations_HKCorrelationTypeIdentifierBloodPressure')
    })

    it('should extract HKCategoryTypeIdentifier from filename', () => {
      const fileName = 'HKCategoryTypeIdentifierSleepAnalysis_789.json.zlib'
      const result = getCollectionNameFromFileName(fileName)
      expect(result).to.equal('HealthObservations_HKCategoryTypeIdentifierSleepAnalysis')
    })

    it('should return null for filename without HealthKit identifier', () => {
      const fileName = 'someRandomFile_123.json.zlib'
      const result = getCollectionNameFromFileName(fileName)
      expect(result).to.be.null
    })

    it('should return null for empty filename', () => {
      const fileName = ''
      const result = getCollectionNameFromFileName(fileName)
      expect(result).to.be.null
    })

    it('should handle custom identifiers containing "Identifier"', () => {
      const fileName = 'CustomHealthIdentifierExample_999.json.zlib'
      const result = getCollectionNameFromFileName(fileName)
      expect(result).to.equal('HealthObservations_CustomHealthIdentifierExample')
    })
  })

  describe('File path validation logic', () => {
    function isValidHealthSamplesPath(filePath: string): boolean {
      if (!filePath.includes('/liveHealthSamples/')) {
        return false
      }

      const pathParts = filePath.split('/')
      const userIdIndex = pathParts.findIndex((part) => part === 'users')

      if (userIdIndex === -1 || userIdIndex + 1 >= pathParts.length) {
        return false
      }

      const userId = pathParts[userIdIndex + 1]
      const fileName = pathParts[pathParts.length - 1]

      return !!(userId && fileName)
    }

    it('should validate correct liveHealthSamples path', () => {
      const filePath = 'users/test-user-123/liveHealthSamples/HKQuantityTypeIdentifierHeartRate_ABC123.json.zlib'
      expect(isValidHealthSamplesPath(filePath)).to.be.true
    })

    it('should reject files not in liveHealthSamples folder', () => {
      const filePath = 'users/test-user-123/otherFolder/file.zlib'
      expect(isValidHealthSamplesPath(filePath)).to.be.false
    })

    it('should reject invalid file path structure', () => {
      const filePath = 'invalid/path/structure.zlib'
      expect(isValidHealthSamplesPath(filePath)).to.be.false
    })

    it('should reject missing userId in path', () => {
      const filePath = 'users//liveHealthSamples/file.zlib'
      expect(isValidHealthSamplesPath(filePath)).to.be.false
    })

    it('should reject missing fileName in path', () => {
      const filePath = 'users/test-user/liveHealthSamples/'
      expect(isValidHealthSamplesPath(filePath)).to.be.false
    })
  })

  describe('Data format validation', () => {
    function isValidObservationsData(data: unknown): data is unknown[] {
      return Array.isArray(data) && data.length > 0
    }

    function extractObservationsFromData(data: unknown, userId: string): unknown[] | null {
      if (Array.isArray(data)) {
        return data
      } 
      
      if (data && typeof data === 'object' && 'data' in data) {
        const wrappedData = data as { data: unknown; userId?: string }
        if (Array.isArray(wrappedData.data)) {
          // Validate userId if present in legacy format
          if (wrappedData.userId && wrappedData.userId !== userId) {
            return null
          }
          return wrappedData.data
        }
      }
      
      return null
    }

    it('should accept array format observations', () => {
      const data = [{ id: 'obs-1' }, { id: 'obs-2' }]
      expect(isValidObservationsData(data)).to.be.true
    })

    it('should reject empty array', () => {
      const data: unknown[] = []
      expect(isValidObservationsData(data)).to.be.false
    })

    it('should reject non-array data', () => {
      const data = { invalid: 'structure' }
      expect(isValidObservationsData(data)).to.be.false
    })

    it('should extract array format observations', () => {
      const data = [{ id: 'obs-1' }, { id: 'obs-2' }]
      const result = extractObservationsFromData(data, 'test-user')
      expect(result).to.deep.equal(data)
    })

    it('should extract legacy wrapper format', () => {
      const data = { 
        userId: 'test-user', 
        collection: 'heartRateObservations',
        data: [{ id: 'obs-1' }, { id: 'obs-2' }]
      }
      const result = extractObservationsFromData(data, 'test-user')
      expect(result).to.deep.equal(data.data)
    })

    it('should reject userId mismatch in legacy format', () => {
      const data = { 
        userId: 'different-user', 
        collection: 'heartRateObservations',
        data: [{ id: 'obs-1' }]
      }
      const result = extractObservationsFromData(data, 'test-user')
      expect(result).to.be.null
    })
  })

  describe('Observation processing', () => {
    function getValidObservationsWithIds(observations: unknown[]): Array<{ observation: unknown; id: string }> {
      const validObservations: Array<{ observation: unknown; id: string }> = []
      
      for (const observation of observations) {
        const observationData = observation as any
        const documentId = observationData?.id
        
        if (documentId) {
          validObservations.push({ observation, id: documentId })
        }
      }
      
      return validObservations
    }

    it('should extract observations with valid IDs', () => {
      const observations = [
        { id: 'obs-1', data: 'valid' },
        { id: 'obs-2', data: 'valid' }
      ]
      const result = getValidObservationsWithIds(observations)
      expect(result).to.have.length(2)
      expect(result[0].id).to.equal('obs-1')
      expect(result[1].id).to.equal('obs-2')
    })

    it('should skip observations without ID', () => {
      const observations = [
        { id: 'obs-1', data: 'valid' },
        { data: 'no-id' }, // Missing ID
        { id: 'obs-3', data: 'valid' }
      ]
      const result = getValidObservationsWithIds(observations)
      expect(result).to.have.length(2)
      expect(result[0].id).to.equal('obs-1')
      expect(result[1].id).to.equal('obs-3')
    })

    it('should handle empty observations array', () => {
      const observations: unknown[] = []
      const result = getValidObservationsWithIds(observations)
      expect(result).to.have.length(0)
    })
  })
})