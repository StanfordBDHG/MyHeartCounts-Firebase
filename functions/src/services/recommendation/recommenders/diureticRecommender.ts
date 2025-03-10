//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  MedicationClassReference,
  UserMedicationRecommendationType,
} from '@stanfordbdhg/engagehf-models'
import { Recommender } from './recommender.js'
import {
  type RecommendationInput,
  type RecommendationOutput,
} from '../recommendationService.js'

export class DiureticRecommender extends Recommender {
  // Methods

  compute(input: RecommendationInput): RecommendationOutput[] {
    const currentRequests = this.findCurrentRequests(input.requests, [
      MedicationClassReference.diuretics,
    ])
    if (currentRequests.length === 0) return []
    return this.createRecommendation(
      currentRequests,
      undefined,
      UserMedicationRecommendationType.personalTargetDoseReached,
    )
  }
}
