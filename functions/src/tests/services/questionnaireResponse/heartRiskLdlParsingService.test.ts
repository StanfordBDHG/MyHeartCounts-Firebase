//
// This source file is part of the MyHeartCounts-Firebase project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { FHIRQuestionnaireResponse } from '@stanfordbdhg/myheartcounts-models'
import { expect } from 'chai'
import { describe, it } from 'mocha'
import { HeartRiskLdlParsingQuestionnaireResponseService } from '../../../services/questionnaireResponse/heartRiskLdlParsingService.js'

describe('HeartRiskLdlParsingQuestionnaireResponseService', () => {
  describe('handle method', () => {
    it('should return false for non-matching questionnaire URLs', async () => {
      const mockDatabaseService = {} as any

      const service = new HeartRiskLdlParsingQuestionnaireResponseService({
        databaseService: mockDatabaseService,
      })

      const mockResponse = {
        id: 'test-response-id',
        path: 'users/test-user/questionnaireResponses/test-response-id',
        lastUpdate: new Date(),
        content: new FHIRQuestionnaireResponse({
          id: 'test-response',
          authored: new Date(),
          questionnaire: 'non-matching-questionnaire-url',
          item: [],
        }),
      }

      const result = await service.handle('test-user', mockResponse, {
        isNew: true,
      })

      expect(result).to.be.false
    })

    it('should return false when no LDL value is found', async () => {
      const mockDatabaseService = {} as any

      const service = new HeartRiskLdlParsingQuestionnaireResponseService({
        databaseService: mockDatabaseService,
      })

      const mockResponse = {
        id: 'test-response-id',
        path: 'users/test-user/questionnaireResponses/test-response-id',
        lastUpdate: new Date(),
        content: new FHIRQuestionnaireResponse({
          id: 'test-response',
          authored: new Date(),
          questionnaire:
            'https://myheartcounts.stanford.edu/fhir/survey/heartRisk',
          item: [
            {
              linkId: 'different-question-id',
              answer: [{ valueString: 'some value' }],
            },
          ],
        }),
      }

      const result = await service.handle('test-user', mockResponse, {
        isNew: true,
      })

      expect(result).to.be.false
    })

    it('should return false when LDL question has no answer', async () => {
      const mockDatabaseService = {} as any

      const service = new HeartRiskLdlParsingQuestionnaireResponseService({
        databaseService: mockDatabaseService,
      })

      const mockResponse = {
        id: 'test-response-id',
        path: 'users/test-user/questionnaireResponses/test-response-id',
        lastUpdate: new Date(),
        content: new FHIRQuestionnaireResponse({
          id: 'test-response',
          authored: new Date(),
          questionnaire:
            'https://myheartcounts.stanford.edu/fhir/survey/heartRisk',
          item: [
            {
              linkId: '1574e238-8804-4a17-fa5e-a764f094bd2b',
              answer: [],
            },
          ],
        }),
      }

      const result = await service.handle('test-user', mockResponse, {
        isNew: true,
      })

      expect(result).to.be.false
    })

    it('should return true and store observation for valueInteger', async () => {
      const mockDatabaseService = {
        runTransaction: () => Promise.resolve(),
      } as any

      const service = new HeartRiskLdlParsingQuestionnaireResponseService({
        databaseService: mockDatabaseService,
      })

      const mockResponse = {
        id: 'test-response-id',
        path: 'users/test-user/questionnaireResponses/test-response-id',
        lastUpdate: new Date(),
        content: new FHIRQuestionnaireResponse({
          id: 'test-response',
          authored: new Date(),
          questionnaire:
            'https://myheartcounts.stanford.edu/fhir/survey/heartRisk',
          item: [
            {
              linkId: '1574e238-8804-4a17-fa5e-a764f094bd2b',
              answer: [{ valueInteger: 120 }],
            },
          ],
        }),
      }

      const result = await service.handle('test-user', mockResponse, {
        isNew: true,
      })

      expect(result).to.be.true
    })

    it('should return true and store observation for valueDecimal', async () => {
      const mockDatabaseService = {
        runTransaction: () => Promise.resolve(),
      } as any

      const service = new HeartRiskLdlParsingQuestionnaireResponseService({
        databaseService: mockDatabaseService,
      })

      const mockResponse = {
        id: 'test-response-id',
        path: 'users/test-user/questionnaireResponses/test-response-id',
        lastUpdate: new Date(),
        content: new FHIRQuestionnaireResponse({
          id: 'test-response',
          authored: new Date(),
          questionnaire:
            'https://myheartcounts.stanford.edu/fhir/survey/heartRisk',
          item: [
            {
              linkId: '1574e238-8804-4a17-fa5e-a764f094bd2b',
              answer: [{ valueDecimal: 125.5 }],
            },
          ],
        }),
      }

      const result = await service.handle('test-user', mockResponse, {
        isNew: true,
      })

      expect(result).to.be.true
    })

    it('should return true and store observation for valid valueString', async () => {
      const mockDatabaseService = {
        runTransaction: () => Promise.resolve(),
      } as any

      const service = new HeartRiskLdlParsingQuestionnaireResponseService({
        databaseService: mockDatabaseService,
      })

      const mockResponse = {
        id: 'test-response-id',
        path: 'users/test-user/questionnaireResponses/test-response-id',
        lastUpdate: new Date(),
        content: new FHIRQuestionnaireResponse({
          id: 'test-response',
          authored: new Date(),
          questionnaire:
            'https://myheartcounts.stanford.edu/fhir/survey/heartRisk',
          item: [
            {
              linkId: '1574e238-8804-4a17-fa5e-a764f094bd2b',
              answer: [{ valueString: '130.75' }],
            },
          ],
        }),
      }

      const result = await service.handle('test-user', mockResponse, {
        isNew: true,
      })

      expect(result).to.be.true
    })

    it('should return false for non-numeric valueString', async () => {
      const mockDatabaseService = {} as any

      const service = new HeartRiskLdlParsingQuestionnaireResponseService({
        databaseService: mockDatabaseService,
      })

      const mockResponse = {
        id: 'test-response-id',
        path: 'users/test-user/questionnaireResponses/test-response-id',
        lastUpdate: new Date(),
        content: new FHIRQuestionnaireResponse({
          id: 'test-response',
          authored: new Date(),
          questionnaire:
            'https://myheartcounts.stanford.edu/fhir/survey/heartRisk',
          item: [
            {
              linkId: '1574e238-8804-4a17-fa5e-a764f094bd2b',
              answer: [{ valueString: 'not a number' }],
            },
          ],
        }),
      }

      const result = await service.handle('test-user', mockResponse, {
        isNew: true,
      })

      expect(result).to.be.false
    })

    it('should return false when answer has no numeric value type', async () => {
      const mockDatabaseService = {} as any

      const service = new HeartRiskLdlParsingQuestionnaireResponseService({
        databaseService: mockDatabaseService,
      })

      const mockResponse = {
        id: 'test-response-id',
        path: 'users/test-user/questionnaireResponses/test-response-id',
        lastUpdate: new Date(),
        content: new FHIRQuestionnaireResponse({
          id: 'test-response',
          authored: new Date(),
          questionnaire:
            'https://myheartcounts.stanford.edu/fhir/survey/heartRisk',
          item: [
            {
              linkId: '1574e238-8804-4a17-fa5e-a764f094bd2b',
              answer: [{ valueBoolean: true }],
            },
          ],
        }),
      }

      const result = await service.handle('test-user', mockResponse, {
        isNew: true,
      })

      expect(result).to.be.false
    })

    it('should handle errors gracefully and rethrow', async () => {
      const mockDatabaseService = {
        runTransaction: () => Promise.reject(new Error('Database error')),
      } as any

      const service = new HeartRiskLdlParsingQuestionnaireResponseService({
        databaseService: mockDatabaseService,
      })

      const mockResponse = {
        id: 'test-response-id',
        path: 'users/test-user/questionnaireResponses/test-response-id',
        lastUpdate: new Date(),
        content: new FHIRQuestionnaireResponse({
          id: 'test-response',
          authored: new Date(),
          questionnaire:
            'https://myheartcounts.stanford.edu/fhir/survey/heartRisk',
          item: [
            {
              linkId: '1574e238-8804-4a17-fa5e-a764f094bd2b',
              answer: [{ valueInteger: 120 }],
            },
          ],
        }),
      }

      try {
        await service.handle('test-user', mockResponse, { isNew: true })
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).to.be.instanceOf(Error)
        expect((error as Error).message).to.equal('Database error')
      }
    })

    it('should handle extraction errors and return false', async () => {
      const mockDatabaseService = {} as any

      const service = new HeartRiskLdlParsingQuestionnaireResponseService({
        databaseService: mockDatabaseService,
      })

      // Create a response with a malformed content that will cause an error during extraction
      const mockResponse = {
        id: 'test-response-id',
        path: 'users/test-user/questionnaireResponses/test-response-id',
        lastUpdate: new Date(),
        content: {
          questionnaire:
            'https://myheartcounts.stanford.edu/fhir/survey/heartRisk',
          leafResponseItem: () => {
            throw new Error('Extraction error')
          },
        } as any,
      }

      const result = await service.handle('test-user', mockResponse, {
        isNew: true,
      })

      expect(result).to.be.false
    })
  })
})
