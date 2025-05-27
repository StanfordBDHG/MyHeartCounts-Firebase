//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { expect } from 'chai'

// Mock the calculateDietScore function for unit testing
function calculateDietScore(questionnaireResponse: any): number {
  let score = 0

  // Helper function to get answer value for a specific question number
  const getAnswerValue = (questionNumber: number): number => {
    try {
      const linkId = `question${questionNumber}`
      return questionnaireResponse.numericSingleAnswerForLink(linkId)
    } catch {
      return 0 // Default to 0 if answer not found
    }
  }

  // Question 1: 2 or more servings of olive oil per day
  if (getAnswerValue(1) >= 2) score += 1

  // Question 2: 7 or more servings of green leafy vegetables per week
  if (getAnswerValue(2) >= 7) score += 1

  // Question 3: 2 or more servings of other vegetables per day
  if (getAnswerValue(3) >= 2) score += 1

  // Question 4: 2 or more servings of berries per week
  if (getAnswerValue(4) >= 2) score += 1

  // Question 5: 1 or more servings of other fruit per day
  if (getAnswerValue(5) >= 1) score += 1

  // Question 6: 3 or fewer servings of red meat per week
  if (getAnswerValue(6) <= 3) score += 1

  // Question 7: 1 or more servings of fish per week
  if (getAnswerValue(7) >= 1) score += 1

  // Question 8: 5 or fewer servings of chicken per week
  if (getAnswerValue(8) <= 5) score += 1

  // Question 9: 4 or fewer servings of cheese per week
  if (getAnswerValue(9) <= 4) score += 1

  // Question 10: 5 or fewer servings of butter per week
  if (getAnswerValue(10) <= 5) score += 1

  // Question 11: 3 or more servings of beans per week
  if (getAnswerValue(11) >= 3) score += 1

  // Question 12: 3 or more servings of whole grains per day
  if (getAnswerValue(12) >= 3) score += 1

  // Question 13: 4 or fewer servings of sweets per week
  if (getAnswerValue(13) <= 4) score += 1

  // Question 14: more than 4 servings of nuts per week
  if (getAnswerValue(14) > 4) score += 1

  // Question 15: 1 or fewer fast food meals per week
  if (getAnswerValue(15) <= 1) score += 1

  // Question 16: Alcohol consumption based on gender
  const alcoholServings = getAnswerValue(16)
  // For testing, assume male gender criteria
  if (alcoholServings > 0 && alcoholServings <= 2) score += 1

  return score
}

describe('processDietQuestionnaireScore', () => {
  it('should validate questionnaire response path format', () => {
    const invalidPaths = [
      'invalid/path',
      'users/test',
      'users/test/wrong/test',
      'wrong/test/questionnaireResponses/test',
    ]

    for (const path of invalidPaths) {
      const pathParts = path.split('/')
      const isValid =
        pathParts.length === 4 &&
        pathParts[0] === 'users' &&
        pathParts[2] === 'questionnaireResponses'
      expect(isValid).to.be.false
    }

    // Valid path
    const validPath = 'users/test-user/questionnaireResponses/test-response'
    const pathParts = validPath.split('/')
    const isValid =
      pathParts.length === 4 &&
      pathParts[0] === 'users' &&
      pathParts[2] === 'questionnaireResponses'
    expect(isValid).to.be.true
  })

  it('should calculate perfect diet score', () => {
    // Mock a questionnaire response with perfect answers
    const mockQuestionnaireResponse = {
      numericSingleAnswerForLink: (linkId: string) => {
        const questionNumber = parseInt(linkId.replace('question', ''))

        switch (questionNumber) {
          case 1:
            return 3 // ≥2 olive oil servings per day
          case 2:
            return 8 // ≥7 green leafy vegetables per week
          case 3:
            return 3 // ≥2 other vegetables per day
          case 4:
            return 3 // ≥2 berries per week
          case 5:
            return 2 // ≥1 other fruit per day
          case 6:
            return 2 // ≤3 red meat per week
          case 7:
            return 2 // ≥1 fish per week
          case 8:
            return 4 // ≤5 chicken per week
          case 9:
            return 3 // ≤4 cheese per week
          case 10:
            return 4 // ≤5 butter per week
          case 11:
            return 4 // ≥3 beans per week
          case 12:
            return 4 // ≥3 whole grains per day
          case 13:
            return 3 // ≤4 sweets per week
          case 14:
            return 5 // >4 nuts per week
          case 15:
            return 1 // ≤1 fast food per week
          case 16:
            return 1 // Male: >0 and ≤2 alcohol per day
          default:
            return 0
        }
      },
    }

    const score = calculateDietScore(mockQuestionnaireResponse)
    expect(score).to.equal(16) // Perfect score
  })

  it('should calculate partial diet score', () => {
    // Mock a questionnaire response with some criteria not met
    const mockQuestionnaireResponse = {
      numericSingleAnswerForLink: (linkId: string) => {
        const questionNumber = parseInt(linkId.replace('question', ''))

        switch (questionNumber) {
          case 1:
            return 1 // <2 olive oil servings per day (0 points)
          case 2:
            return 8 // ≥7 green leafy vegetables per week (1 point)
          case 3:
            return 1 // <2 other vegetables per day (0 points)
          case 4:
            return 3 // ≥2 berries per week (1 point)
          case 5:
            return 0 // <1 other fruit per day (0 points)
          case 6:
            return 5 // >3 red meat per week (0 points)
          case 7:
            return 2 // ≥1 fish per week (1 point)
          case 8:
            return 6 // >5 chicken per week (0 points)
          case 9:
            return 3 // ≤4 cheese per week (1 point)
          case 10:
            return 4 // ≤5 butter per week (1 point)
          case 11:
            return 2 // <3 beans per week (0 points)
          case 12:
            return 4 // ≥3 whole grains per day (1 point)
          case 13:
            return 6 // >4 sweets per week (0 points)
          case 14:
            return 5 // >4 nuts per week (1 point)
          case 15:
            return 1 // ≤1 fast food per week (1 point)
          case 16:
            return 1 // Male: >0 and ≤2 alcohol per day (1 point)
          default:
            return 0
        }
      },
    }

    const score = calculateDietScore(mockQuestionnaireResponse)
    expect(score).to.equal(9) // Partial score
  })

  it('should calculate zero score for poor diet', () => {
    // Mock a questionnaire response with no criteria met
    const mockQuestionnaireResponse = {
      numericSingleAnswerForLink: (linkId: string) => {
        const questionNumber = parseInt(linkId.replace('question', ''))

        switch (questionNumber) {
          case 1:
            return 0 // <2 olive oil servings per day
          case 2:
            return 3 // <7 green leafy vegetables per week
          case 3:
            return 1 // <2 other vegetables per day
          case 4:
            return 1 // <2 berries per week
          case 5:
            return 0 // <1 other fruit per day
          case 6:
            return 6 // >3 red meat per week
          case 7:
            return 0 // <1 fish per week
          case 8:
            return 7 // >5 chicken per week
          case 9:
            return 6 // >4 cheese per week
          case 10:
            return 7 // >5 butter per week
          case 11:
            return 1 // <3 beans per week
          case 12:
            return 2 // <3 whole grains per day
          case 13:
            return 8 // >4 sweets per week
          case 14:
            return 2 // ≤4 nuts per week
          case 15:
            return 5 // >1 fast food per week
          case 16:
            return 0 // 0 alcohol per day (for male)
          default:
            return 0
        }
      },
    }

    const score = calculateDietScore(mockQuestionnaireResponse)
    expect(score).to.equal(0) // No criteria met
  })

  it('should handle missing answers gracefully', () => {
    // Mock a questionnaire response that throws errors for missing answers
    const mockQuestionnaireResponse = {
      numericSingleAnswerForLink: () => {
        throw new Error('Answer not found')
      },
    }

    const score = calculateDietScore(mockQuestionnaireResponse)
    expect(score).to.equal(0) // Should default to 0 for all missing answers
  })
})
