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
import {
  DefaultNicotineScoreCalculator,
  NicotineScoringQuestionnaireResponseService,
} from '../../../services/questionnaireResponse/nicotineScoringService.js'

describe('NicotineScoringQuestionnaireResponseService', () => {
  describe('DefaultNicotineScoreCalculator', () => {
    it('should calculate score 0 for Never smoked/vaped', () => {
      const calculator = new DefaultNicotineScoreCalculator()
      const score = calculator.calculate('Never smoked/vaped')

      expect(score).to.be.instanceOf(Score)
      expect(score.overallScore).to.equal(0)
      expect(score.domainScores.statusScore).to.equal(0)
    })

    it('should calculate score 1 for Quit >5 years ago', () => {
      const calculator = new DefaultNicotineScoreCalculator()
      const score = calculator.calculate('Quit >5 years ago')

      expect(score).to.be.instanceOf(Score)
      expect(score.overallScore).to.equal(1)
      expect(score.domainScores.statusScore).to.equal(1)
    })

    it('should calculate score 2 for Quit 1-5 years ago', () => {
      const calculator = new DefaultNicotineScoreCalculator()
      const score = calculator.calculate('Quit 1-5 years ago')

      expect(score).to.be.instanceOf(Score)
      expect(score.overallScore).to.equal(2)
      expect(score.domainScores.statusScore).to.equal(2)
    })

    it('should calculate score 3 for Quit <1 year ago', () => {
      const calculator = new DefaultNicotineScoreCalculator()
      const score = calculator.calculate('Quit <1 year ago')

      expect(score).to.be.instanceOf(Score)
      expect(score.overallScore).to.equal(3)
      expect(score.domainScores.statusScore).to.equal(3)
    })

    it('should calculate score 4 for Light smoker/vaper (<10/day)', () => {
      const calculator = new DefaultNicotineScoreCalculator()
      const score = calculator.calculate('Light smoker/vaper (<10/day)')

      expect(score).to.be.instanceOf(Score)
      expect(score.overallScore).to.equal(4)
      expect(score.domainScores.statusScore).to.equal(4)
    })

    it('should calculate score 4 for unknown smoking status', () => {
      const calculator = new DefaultNicotineScoreCalculator()
      const score = calculator.calculate('Unknown status')

      expect(score).to.be.instanceOf(Score)
      expect(score.overallScore).to.equal(4)
      expect(score.domainScores.statusScore).to.equal(4)
    })

    it('should calculate score 4 for Moderate smoker/vaper (10 to 19/day)', () => {
      const calculator = new DefaultNicotineScoreCalculator()
      const score = calculator.calculate('Moderate smoker/vaper (10 to 19/day)')

      expect(score).to.be.instanceOf(Score)
      expect(score.overallScore).to.equal(4)
      expect(score.domainScores.statusScore).to.equal(4)
    })

    it('should calculate score 4 for Heavy smoker/vaper (>20/day)', () => {
      const calculator = new DefaultNicotineScoreCalculator()
      const score = calculator.calculate('Heavy smoker/vaper (>20/day)')

      expect(score).to.be.instanceOf(Score)
      expect(score.overallScore).to.equal(4)
      expect(score.domainScores.statusScore).to.equal(4)
    })
  })

  describe('handle method', () => {
    it('should return false for non-matching questionnaire IDs', async () => {
      const mockDatabaseService = {} as any
      const mockMessageService = {} as any
      const mockCalculator = new DefaultNicotineScoreCalculator()

      const service = new NicotineScoringQuestionnaireResponseService({
        databaseService: mockDatabaseService,
        messageService: mockMessageService,
        scoreCalculator: mockCalculator,
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

    it('should return true for matching questionnaire IDs', async () => {
      const mockDatabaseService = {
        getQuery: () => Promise.resolve([]),
        runTransaction: () => Promise.resolve(),
      } as any
      const mockMessageService = {} as any
      const mockCalculator = new DefaultNicotineScoreCalculator()

      const service = new NicotineScoringQuestionnaireResponseService({
        databaseService: mockDatabaseService,
        messageService: mockMessageService,
        scoreCalculator: mockCalculator,
      })

      // Create a mock response with the expected structure
      const mockResponse = {
        id: 'test-response-id',
        path: 'users/test-user/questionnaireResponses/test-response-id',
        lastUpdate: new Date(),
        content: new FHIRQuestionnaireResponse({
          id: 'test-response',
          authored: new Date(),
          questionnaire:
            'https://myheartcounts.stanford.edu/fhir/survey/nicotineExposure',
          item: [
            {
              linkId: 'dcb2277e-fe96-4f45-844a-ef58a9516380',
              answer: [
                {
                  valueCoding: {
                    code: '0',
                    display: 'Never smoked/vaped',
                    system: 'urn:uuid:c1f5127d-6e24-49eb-87c8-5fda81e18494',
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

    it('should handle missing smoking status gracefully', async () => {
      const mockDatabaseService = {
        getQuery: () => Promise.resolve([]),
        runTransaction: () => Promise.resolve(),
      } as any
      const mockMessageService = {} as any
      const mockCalculator = new DefaultNicotineScoreCalculator()

      const service = new NicotineScoringQuestionnaireResponseService({
        databaseService: mockDatabaseService,
        messageService: mockMessageService,
        scoreCalculator: mockCalculator,
      })

      const mockResponse = {
        id: 'test-response-id',
        path: 'users/test-user/questionnaireResponses/test-response-id',
        lastUpdate: new Date(),
        content: new FHIRQuestionnaireResponse({
          id: 'test-response',
          authored: new Date(),
          questionnaire:
            'https://myheartcounts.stanford.edu/fhir/survey/nicotineExposure',
          item: [
            {
              linkId: 'dcb2277e-fe96-4f45-844a-ef58a9516380',
              answer: [], // No answer - should return false
            },
          ],
        }),
      }

      const result = await service.handle('test-user', mockResponse, {
        isNew: true,
      })

      expect(result).to.be.false
    })

    it('should handle database transaction errors gracefully', async () => {
      const mockDatabaseService = {
        getQuery: () => Promise.resolve([]),
        runTransaction: () => Promise.reject(new Error('Transaction failed')),
      } as any
      const mockMessageService = {} as any
      const mockCalculator = new DefaultNicotineScoreCalculator()

      const service = new NicotineScoringQuestionnaireResponseService({
        databaseService: mockDatabaseService,
        messageService: mockMessageService,
        scoreCalculator: mockCalculator,
      })

      const mockResponse = {
        id: 'test-response-id',
        path: 'users/test-user/questionnaireResponses/test-response-id',
        lastUpdate: new Date(),
        content: new FHIRQuestionnaireResponse({
          id: 'test-response',
          authored: new Date(),
          questionnaire:
            'https://myheartcounts.stanford.edu/fhir/survey/nicotineExposure',
          item: [
            {
              linkId: 'dcb2277e-fe96-4f45-844a-ef58a9516380',
              answer: [
                {
                  valueCoding: {
                    code: '0',
                    display: 'Never smoked/vaped',
                    system: 'urn:uuid:c1f5127d-6e24-49eb-87c8-5fda81e18494',
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
        expect((error as Error).message).to.equal('Transaction failed')
      }
    })
  })
})
