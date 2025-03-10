//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  advanceDateByDays,
  MedicationClassReference,
  MedicationReference,
  UserMedicationRecommendationType,
} from '@stanfordbdhg/engagehf-models'
import { Recommender } from './recommender.js'
import { ContraindicationCategory } from '../../contraindication/contraindicationService.js'
import {
  type RecommendationInput,
  type RecommendationOutput,
} from '../recommendationService.js'

export class MraRecommender extends Recommender {
  // Methods

  compute(input: RecommendationInput): RecommendationOutput[] {
    const currentRequests = this.findCurrentRequests(input.requests, [
      MedicationClassReference.mineralocorticoidReceptorAntagonists,
    ])
    if (currentRequests.length === 0) return this.computeNew(input)

    if (this.isTargetDailyDoseReached(currentRequests))
      return this.createRecommendation(
        currentRequests,
        undefined,
        UserMedicationRecommendationType.targetDoseReached,
      )

    const lastMonth = advanceDateByDays(new Date(), -30)
    const creatinine = input.vitals.creatinine
    const potassium = input.vitals.potassium

    if (
      creatinine === undefined ||
      potassium === undefined ||
      creatinine.date < lastMonth ||
      potassium.date < lastMonth
    )
      return this.createRecommendation(
        currentRequests,
        undefined,
        UserMedicationRecommendationType.moreLabObservationsRequired,
      )

    if (creatinine.value >= 2.5 || potassium.value >= 5)
      return this.createRecommendation(
        currentRequests,
        undefined,
        UserMedicationRecommendationType.personalTargetDoseReached,
      )

    return this.createRecommendation(
      currentRequests,
      undefined,
      UserMedicationRecommendationType.improvementAvailable,
    )
  }

  // Helpers

  private computeNew(input: RecommendationInput): RecommendationOutput[] {
    const contraindication = this.contraindicationService.checkMedicationClass(
      input.contraindications,
      MedicationClassReference.mineralocorticoidReceptorAntagonists,
    )

    const eligibleMedication =
      this.contraindicationService.findEligibleMedication(
        input.contraindications,
        [MedicationReference.spironolactone, MedicationReference.eplerenone],
      )

    switch (contraindication) {
      case ContraindicationCategory.severeAllergyIntolerance:
      case ContraindicationCategory.allergyIntolerance:
        return []
      case ContraindicationCategory.clinicianListed:
        return eligibleMedication !== undefined ?
            this.createRecommendation(
              [],
              eligibleMedication,
              UserMedicationRecommendationType.noActionRequired,
            )
          : []
      case ContraindicationCategory.none:
        break
    }

    if (eligibleMedication === undefined) return []

    const creatinine = input.vitals.creatinine?.value
    if (creatinine !== undefined && creatinine >= 2.5)
      return this.createRecommendation(
        [],
        eligibleMedication,
        UserMedicationRecommendationType.noActionRequired,
      )

    const potassium = input.vitals.potassium?.value
    if (potassium !== undefined && potassium >= 5)
      return this.createRecommendation(
        [],
        eligibleMedication,
        UserMedicationRecommendationType.noActionRequired,
      )

    return this.createRecommendation(
      [],
      eligibleMedication,
      UserMedicationRecommendationType.notStarted,
    )
  }
}
