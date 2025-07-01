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
  DietScoreCalculator,
  DietScoringQuestionnaireResponseService,
} from '../../../services/questionnaireResponse/dietScoringService.js'

describe('DietScoringQuestionnaireResponseService', () => {
  describe('DietScoreCalculator', () => {
    it('should calculate correct scores from answers', () => {
      const calculator = new DietScoreCalculator()
      const answers = {
        '92a6518b-61dd-442c-8082-09c3457daada': true, // Fruits and vegetables daily
        'bbf31b7d-ea50-45bf-88a9-5c5c21466ce8': false, // Multiple fruit varieties
        '6616bfe1-d22f-488f-8ba6-0695cf19f634': true, // Multiple vegetable varieties
      }

      const score = calculator.calculate(answers)

      expect(score).to.be.instanceOf(Score)
      expect(score.overallScore).to.be.greaterThan(0)
      expect(score.domainScores).to.have.property('fruitsVegetables')
      expect(score.domainScores).to.have.property('fat')
      expect(score.domainScores).to.have.property('starchyFoods')
      expect(score.domainScores).to.have.property('sugar')
      expect(score.domainScores).to.have.property('fermentedFoods')
      expect(score.domainScores).to.have.property('salt')
      expect(score.domainScores).to.have.property('alcohol')
    })

    it('should handle empty answers', () => {
      const calculator = new DietScoreCalculator()
      const answers = {}

      const score = calculator.calculate(answers)

      expect(score.overallScore).to.equal(0)
    })
  })

  describe('handle method', () => {
    it('should return false for non-matching questionnaire IDs', async () => {
      const mockDatabaseService = {} as any
      const mockMessageService = {} as any
      const mockCalculator = new DietScoreCalculator()

      const service = new DietScoringQuestionnaireResponseService({
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
      const mockCalculator = new DietScoreCalculator()

      const service = new DietScoringQuestionnaireResponseService({
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
          questionnaire: 'Diet',
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
