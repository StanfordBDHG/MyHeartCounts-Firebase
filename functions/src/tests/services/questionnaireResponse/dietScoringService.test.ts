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
        'bbf31b7d-ea50-45bf-88a9-5c5c21466ce8': true, // Multiple fruit varieties
        '6616bfe1-d22f-488f-8ba6-0695cf19f634': true, // Multiple vegetable varieties
        'fee4378b-c67a-4bf3-d99f-e94092207ee2': true, // Baked/grilled options
        'ff78ee6d-a8ad-4d7b-80e1-2894dca64065': true, // Lean cuts of meat
        '50a6fdb1-d90c-416a-86a8-bf07602b701c': true, // Oily fish (6 points total = 25 score)
      }

      const score = calculator.calculate(answers)

      expect(score).to.be.instanceOf(Score)
      expect(score.overallScore).to.equal(6) // 6 points should give score 6
      expect(score.domainScores).to.have.property('fruitsVegetables')
      expect(score.domainScores).to.have.property('fat')
      expect(score.domainScores).to.have.property('starchyFoods')
      expect(score.domainScores).to.have.property('sugar')
      expect(score.domainScores).to.have.property('fermentedFoods')
      expect(score.domainScores).to.have.property('salt')
      expect(score.domainScores).to.have.property('alcohol')
      expect(score.domainScores).to.have.property('totalPoints')
      expect(score.domainScores.totalPoints).to.equal(6)
    })

    it('should return raw points for scoring (18 points = 18)', () => {
      const calculator = new DietScoreCalculator()

      // Create answers for 18 questions (should give score 18)
      const allTrueAnswers: Record<string, boolean> = {}
      const questionIds = [
        '92a6518b-61dd-442c-8082-09c3457daada',
        'bbf31b7d-ea50-45bf-88a9-5c5c21466ce8',
        '6616bfe1-d22f-488f-8ba6-0695cf19f634',
        'fee4378b-c67a-4bf3-d99f-e94092207ee2',
        'ff78ee6d-a8ad-4d7b-80e1-2894dca64065',
        '50a6fdb1-d90c-416a-86a8-bf07602b701c',
        'ba4c8cee-f422-4a8a-8abc-e4418d8a87d1',
        '055647aa-77aa-4877-81ae-40a2f08b8c5e',
        '784f7a2c-6ec8-414b-caa4-b59f1e8a6a1c',
        '016e5729-7381-455d-b888-38e9e4365fa8',
        '99e55082-b818-44c7-878b-8da477b300cc',
        'a39e0c58-32a5-4ace-9980-e42363ae898d',
        'df1d2dcd-5087-4120-86b1-ca811498c655',
        '7d376d7b-4167-49b3-8600-683af1534e77',
        'e5208b21-21d1-4f88-8c22-0580d4457172',
        '96ee1662-9b70-4f72-8f48-08ee91252d49',
        'a713aac6-c812-46e7-896c-ab9209d197fc',
        'ed1856e6-5ba3-4ca2-85d3-1ff744ff492e',
        '7e2609d6-2b29-4d70-8cbb-69f60d985876',
        'a7ea3c2f-2f87-4fe3-811e-fe3c85a7c1b1',
        '1ce40499-9d9c-4f91-e7c5-da0986503406',
      ]

      // Answer first 18 questions as true (18 points should give score 18)
      for (let i = 0; i < 18; i++) {
        allTrueAnswers[questionIds[i]] = true
      }

      const score = calculator.calculate(allTrueAnswers)
      expect(score.overallScore).to.equal(18)
      expect(score.domainScores.totalPoints).to.equal(18)
    })

    it('should return raw points for scoring (15 points = 15)', () => {
      const calculator = new DietScoreCalculator()

      const answers: Record<string, boolean> = {}
      const questionIds = [
        '92a6518b-61dd-442c-8082-09c3457daada',
        'bbf31b7d-ea50-45bf-88a9-5c5c21466ce8',
        '6616bfe1-d22f-488f-8ba6-0695cf19f634',
        'fee4378b-c67a-4bf3-d99f-e94092207ee2',
        'ff78ee6d-a8ad-4d7b-80e1-2894dca64065',
        '50a6fdb1-d90c-416a-86a8-bf07602b701c',
        'ba4c8cee-f422-4a8a-8abc-e4418d8a87d1',
        '055647aa-77aa-4877-81ae-40a2f08b8c5e',
        '784f7a2c-6ec8-414b-caa4-b59f1e8a6a1c',
        '016e5729-7381-455d-b888-38e9e4365fa8',
        '99e55082-b818-44c7-878b-8da477b300cc',
        'a39e0c58-32a5-4ace-9980-e42363ae898d',
        'df1d2dcd-5087-4120-86b1-ca811498c655',
        '7d376d7b-4167-49b3-8600-683af1534e77',
        'e5208b21-21d1-4f88-8c22-0580d4457172',
      ]

      // Answer 15 questions as true (15 points should give score 15)
      for (let i = 0; i < 15; i++) {
        answers[questionIds[i]] = true
      }

      const score = calculator.calculate(answers)
      expect(score.overallScore).to.equal(15)
      expect(score.domainScores.totalPoints).to.equal(15)
    })

    it('should return raw points for scoring (6 points = 6)', () => {
      const calculator = new DietScoreCalculator()

      const answers: Record<string, boolean> = {
        '92a6518b-61dd-442c-8082-09c3457daada': true,
        'bbf31b7d-ea50-45bf-88a9-5c5c21466ce8': true,
        '6616bfe1-d22f-488f-8ba6-0695cf19f634': true,
        'fee4378b-c67a-4bf3-d99f-e94092207ee2': true,
        'ff78ee6d-a8ad-4d7b-80e1-2894dca64065': true,
        '50a6fdb1-d90c-416a-86a8-bf07602b701c': true, // 6 points should give score 6
      }

      const score = calculator.calculate(answers)
      expect(score.overallScore).to.equal(6)
      expect(score.domainScores.totalPoints).to.equal(6)
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
          questionnaire:
            'https://myheartcounts.stanford.edu/fhir/survey/dietScore',
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
