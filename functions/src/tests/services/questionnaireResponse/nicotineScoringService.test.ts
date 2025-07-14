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
    it('should calculate score 100 for Never smoked/vaped', () => {
      const calculator = new DefaultNicotineScoreCalculator()
      const score = calculator.calculate('Never smoked/vaped')

      expect(score).to.be.instanceOf(Score)
      expect(score.overallScore).to.equal(100)
      expect(score.domainScores.statusScore).to.equal(100)
    })

    it('should calculate score 75 for Quit >5 years ago', () => {
      const calculator = new DefaultNicotineScoreCalculator()
      const score = calculator.calculate('Quit >5 years ago')

      expect(score).to.be.instanceOf(Score)
      expect(score.overallScore).to.equal(75)
      expect(score.domainScores.statusScore).to.equal(75)
    })

    it('should calculate score 50 for Quit 1- 5 years ago', () => {
      const calculator = new DefaultNicotineScoreCalculator()
      const score = calculator.calculate('Quit 1- 5 years ago')

      expect(score).to.be.instanceOf(Score)
      expect(score.overallScore).to.equal(50)
      expect(score.domainScores.statusScore).to.equal(50)
    })

    it('should calculate score 25 for Quit <1 year ago', () => {
      const calculator = new DefaultNicotineScoreCalculator()
      const score = calculator.calculate('Quit <1 year ago')

      expect(score).to.be.instanceOf(Score)
      expect(score.overallScore).to.equal(25)
      expect(score.domainScores.statusScore).to.equal(25)
    })

    it('should calculate score 0 for Smoke/vape now', () => {
      const calculator = new DefaultNicotineScoreCalculator()
      const score = calculator.calculate('Smoke/vape now')

      expect(score).to.be.instanceOf(Score)
      expect(score.overallScore).to.equal(0)
      expect(score.domainScores.statusScore).to.equal(0)
    })

    it('should calculate score 0 for unknown smoking status', () => {
      const calculator = new DefaultNicotineScoreCalculator()
      const score = calculator.calculate('Unknown status')

      expect(score).to.be.instanceOf(Score)
      expect(score.overallScore).to.equal(0)
      expect(score.domainScores.statusScore).to.equal(0)
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
          questionnaire: '91EB378F-B851-46AC-865A-E0013CA95886',
          item: [
            {
              linkId: 'a77ec6ab-8f37-4db4-8c5b-19a0d10964b9',
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
          questionnaire: '91EB378F-B851-46AC-865A-E0013CA95886',
          item: [], // No items - should return false
        }),
      }

      const result = await service.handle('test-user', mockResponse, {
        isNew: true,
      })

      expect(result).to.be.false
    })
  })
})
