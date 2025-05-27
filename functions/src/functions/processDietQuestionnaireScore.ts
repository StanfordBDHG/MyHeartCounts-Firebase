//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  FHIRObservation,
  FHIRObservationStatus,
  fhirQuestionnaireResponseConverter,
  QuantityUnit,
  LoincCode,
  fhirObservationConverter,
} from '@stanfordbdhg/myheartcounts-models'
import admin from 'firebase-admin'
import { https } from 'firebase-functions/v2'
import { z } from 'zod'
import { validatedOnCall } from './helpers.js'
import { DatabaseConverter } from '../services/database/databaseConverter.js'

const processDietQuestionnaireScoreInputSchema = z.object({
  questionnaireResponsePath: z.string().min(1),
})

type ProcessDietQuestionnaireScoreInput = z.infer<
  typeof processDietQuestionnaireScoreInputSchema
>

interface ProcessDietQuestionnaireScoreOutput {
  success: boolean
  score?: number
  error?: string
}

export const processDietQuestionnaireScore = validatedOnCall(
  'processDietQuestionnaireScore',
  processDietQuestionnaireScoreInputSchema,
  async (request): Promise<ProcessDietQuestionnaireScoreOutput> => {
    try {
      const firestore = admin.firestore()

      // Parse the path to extract userId and questionnaireResponseId
      const pathParts = request.data.questionnaireResponsePath.split('/')
      if (
        pathParts.length !== 4 ||
        pathParts[0] !== 'users' ||
        pathParts[2] !== 'questionnaireResponses'
      ) {
        throw new https.HttpsError(
          'invalid-argument',
          'Invalid questionnaire response path format. Expected: users/{userId}/questionnaireResponses/{responseId}',
        )
      }

      const userId = pathParts[1]
      const questionnaireResponseId = pathParts[3]

      // Get the questionnaire response document
      const questionnaireResponseDoc = await firestore
        .collection('users')
        .doc(userId)
        .collection('questionnaireResponses')
        .doc(questionnaireResponseId)
        .withConverter(
          new DatabaseConverter(fhirQuestionnaireResponseConverter.value),
        )
        .get()

      if (!questionnaireResponseDoc.exists) {
        throw new https.HttpsError(
          'not-found',
          'Questionnaire response not found',
        )
      }

      const questionnaireResponse = questionnaireResponseDoc.data()
      if (!questionnaireResponse) {
        throw new https.HttpsError(
          'internal',
          'Failed to parse questionnaire response data',
        )
      }

      // Calculate diet score based on the 16 criteria
      const score = calculateDietScore(questionnaireResponse)

      // Create the observation for diet questionnaire score
      const observation = FHIRObservation.createSimple({
        id: `diet-score-${questionnaireResponseId}`,
        date: questionnaireResponse.authored,
        value: score,
        unit: QuantityUnit.count, // Score is a count/point value
        code: LoincCode.dietQuestionnaireScore,
      })

      // Store in the HealthKitObservations_HKQuantityTypeIdentifierDietQuestionnaire collection
      if (observation.id) {
        await firestore
          .collection('users')
          .doc(userId)
          .collection(
            'HealthKitObservations_HKQuantityTypeIdentifierDietQuestionnaire',
          )
          .doc(observation.id)
          .withConverter(new DatabaseConverter(fhirObservationConverter.value))
          .set(observation)
      }

      return {
        success: true,
        score: score,
      }
    } catch (error) {
      if (error instanceof https.HttpsError) {
        throw error
      }

      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  },
)

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

  // Helper function to get user's gender for alcohol criteria
  const getUserGender = (): string => {
    // This would need to be implemented based on how gender is stored
    // For now, defaulting to 'male' - this should be retrieved from user profile
    return 'male'
  }

  // Question 1: 2 or more servings of olive oil per day
  if (getAnswerValue(1) >= 2) {
    score += 1
  }

  // Question 2: 7 or more servings of green leafy vegetables per week
  if (getAnswerValue(2) >= 7) {
    score += 1
  }

  // Question 3: 2 or more servings of other vegetables per day
  if (getAnswerValue(3) >= 2) {
    score += 1
  }

  // Question 4: 2 or more servings of berries per week
  if (getAnswerValue(4) >= 2) {
    score += 1
  }

  // Question 5: 1 or more servings of other fruit per day
  if (getAnswerValue(5) >= 1) {
    score += 1
  }

  // Question 6: 3 or fewer servings of red meat, hamburger, bacon, or sausage per week
  if (getAnswerValue(6) <= 3) {
    score += 1
  }

  // Question 7: 1 or more servings of fish or seafood per week
  if (getAnswerValue(7) >= 1) {
    score += 1
  }

  // Question 8: 5 or fewer servings of chicken per week
  if (getAnswerValue(8) <= 5) {
    score += 1
  }

  // Question 9: 4 or fewer servings of full fat or regular cheese or cream cheese per week
  if (getAnswerValue(9) <= 4) {
    score += 1
  }

  // Question 10: 5 or fewer servings of butter or cream per week
  if (getAnswerValue(10) <= 5) {
    score += 1
  }

  // Question 11: 3 or more servings of beans per week
  if (getAnswerValue(11) >= 3) {
    score += 1
  }

  // Question 12: 3 or more servings of whole grains per day
  if (getAnswerValue(12) >= 3) {
    score += 1
  }

  // Question 13: 4 or fewer servings of commercial sweets, candy bars, pastries, cookies, or cakes per week
  if (getAnswerValue(13) <= 4) {
    score += 1
  }

  // Question 14: more than 4 servings of nuts per week
  if (getAnswerValue(14) > 4) {
    score += 1
  }

  // Question 15: 1 or fewer meals from fast food restaurants per week
  if (getAnswerValue(15) <= 1) {
    score += 1
  }

  // Question 16: Alcohol consumption based on gender
  const alcoholServings = getAnswerValue(16)
  const gender = getUserGender()

  if (gender === 'male') {
    // Men: more than 0 and 2 or fewer servings per day
    if (alcoholServings > 0 && alcoholServings <= 2) {
      score += 1
    }
  } else {
    // Women: more than 0 and less than 1 serving per day
    if (alcoholServings > 0 && alcoholServings < 1) {
      score += 1
    }
  }

  return score
}
