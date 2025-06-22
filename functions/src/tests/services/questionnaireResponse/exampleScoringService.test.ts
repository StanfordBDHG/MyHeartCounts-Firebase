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
  ExampleScoreCalculator,
  ExampleScoringQuestionnaireResponseService,
} from '../../../services/questionnaireResponse/exampleScoringService.js'

describe('ExampleScoringQuestionnaireResponseService', () => {
  describe('ExampleScoreCalculator', () => {
    it('should calculate correct scores from answers', () => {
      const calculator = new ExampleScoreCalculator()
      const answers = {
        'question-1': 5, // Max score
        'question-2': 3, // Mid score
        'question-3': 1, // Min score
      }

      const score = calculator.calculate(answers)

      expect(score).to.be.instanceOf(Score)
      expect(score.overallScore).to.be.approximately(50, 1) // Average of 100, 50, 0
      expect(score.domainScores).to.have.property('physical')
      expect(score.domainScores).to.have.property('mental')
    })

    it('should handle empty answers', () => {
      const calculator = new ExampleScoreCalculator()
      const answers = {}

      const score = calculator.calculate(answers)

      expect(score.overallScore).to.equal(0)
    })
  })

  describe('handle method', () => {
    it('should return false for non-matching questionnaire IDs', async () => {
      const mockDatabaseService = {} as any
      const mockMessageService = {} as any
      const mockCalculator = new ExampleScoreCalculator()

      const service = new ExampleScoringQuestionnaireResponseService({
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
      const mockCalculator = new ExampleScoreCalculator()

      const service = new ExampleScoringQuestionnaireResponseService({
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
          questionnaire: 'example-questionnaire-id',
          item: [],
        }),
      }

      const result = await service.handle('test-user', mockResponse, {
        isNew: true,
      })

      expect(result).to.be.true
    })
  })
})
