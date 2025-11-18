//
// This source file is part of the MyHeartCounts-Firebase project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  FHIRQuestionnaireResponse,
  Score,
} from '@stanfordbdhg/myheartcounts-models'
import { expect } from 'chai'
import { describe, it } from 'mocha'
import { HeartRiskNicotineScoringQuestionnaireResponseService } from '../../../services/questionnaireResponse/heartRiskNicotineScoringService.js'

describe('HeartRiskNicotineScoringQuestionnaireResponseService', () => {
  describe('handle method', () => {
    it('should return false for non-matching questionnaire IDs', async () => {
      const mockDatabaseService = {} as any
      const mockMessageService = {} as any

      const service = new HeartRiskNicotineScoringQuestionnaireResponseService({
        databaseService: mockDatabaseService,
      })

      const mockResponse = {
        id: 'test-response-id',
        path: 'users/test-user/questionnaireResponses/test-response-id',
        lastUpdate: new Date(),
        content: new FHIRQuestionnaireResponse({
          id: 'test-response',
          authored: new Date(),
          questionnaire: 'non-matching-questionnaire-id',
          item: [],
        }),
      }

      const result = await service.handle('test-user', mockResponse, {
        isNew: true,
      })

      expect(result).to.be.false
    })

    it('should return true for matching Heart Risk questionnaire and process smoking status', async () => {
      const mockDatabaseService = {
        runTransaction: () => Promise.resolve(),
      } as any
      const mockMessageService = {} as any

      const service = new HeartRiskNicotineScoringQuestionnaireResponseService({
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
              linkId: '1a18f004-e6ab-4ee8-d5b2-284389d15e14',
              answer: [
                {
                  valueCoding: {
                    code: 'never-smoked/vaped',
                    display: 'Never smoked/vaped',
                    system: 'urn:uuid:dd27d607-7d9c-4fa2-e28b-d90a40d628bf',
                  },
                },
              ],
            },
          ],
        }),
      }

      const result = await service.handle('test-user', mockResponse, {
        isNew: true,
      })

      expect(result).to.be.true
    })

    it('should return false when no smoking status is found', async () => {
      const mockDatabaseService = {} as any
      const mockMessageService = {} as any

      const service = new HeartRiskNicotineScoringQuestionnaireResponseService({
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
              linkId: '1a18f004-e6ab-4ee8-d5b2-284389d15e14',
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

    it('should return false when smoking question is missing', async () => {
      const mockDatabaseService = {} as any
      const mockMessageService = {} as any

      const service = new HeartRiskNicotineScoringQuestionnaireResponseService({
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
              answer: [
                {
                  valueCoding: {
                    code: 'some-value',
                    display: 'Some Value',
                  },
                },
              ],
            },
          ],
        }),
      }

      const result = await service.handle('test-user', mockResponse, {
        isNew: true,
      })

      expect(result).to.be.false
    })

    it('should handle errors gracefully', async () => {
      const mockDatabaseService = {
        runTransaction: () => Promise.reject(new Error('Database error')),
      } as any
      const mockMessageService = {} as any

      const service = new HeartRiskNicotineScoringQuestionnaireResponseService({
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
              linkId: '1a18f004-e6ab-4ee8-d5b2-284389d15e14',
              answer: [
                {
                  valueCoding: {
                    code: 'never-smoked/vaped',
                    display: 'Never smoked/vaped',
                    system: 'urn:uuid:dd27d607-7d9c-4fa2-e28b-d90a40d628bf',
                  },
                },
              ],
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

    it('should process different smoking statuses correctly', async () => {
      const mockDatabaseService = {
        runTransaction: () => Promise.resolve(),
      } as any
      const mockMessageService = {} as any

      const service = new HeartRiskNicotineScoringQuestionnaireResponseService({
        databaseService: mockDatabaseService,
      })

      const smokingStatuses = [
        'Never smoked/vaped',
        'Quit >5 years ago',
        'Quit 1-5 years ago',
        'Quit <1 year ago',
        'Light smoker/vaper (<10/day)',
        'Moderate smoker/vaper (10 to 19/day)',
        'Heavy smoker/vaper (>20/day)',
      ]

      for (const status of smokingStatuses) {
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
                linkId: '1a18f004-e6ab-4ee8-d5b2-284389d15e14',
                answer: [
                  {
                    valueCoding: {
                      display: status,
                    },
                  },
                ],
              },
            ],
          }),
        }

        const result = await service.handle('test-user', mockResponse, {
          isNew: true,
        })

        expect(result).to.be.true
      }
    })
  })
})
