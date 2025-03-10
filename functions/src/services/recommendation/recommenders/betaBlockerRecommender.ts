//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
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

export class BetaBlockerRecommender extends Recommender {
  // Methods

  compute(input: RecommendationInput): RecommendationOutput[] {
    const currentRequests = this.findCurrentRequests(input.requests, [
      MedicationClassReference.betaBlockers,
    ])
    if (currentRequests.length === 0) return this.computeNew(input)

    if (this.isTargetDailyDoseReached(currentRequests))
      return this.createRecommendation(
        currentRequests,
        undefined,
        UserMedicationRecommendationType.targetDoseReached,
      )

    const medianSystolic = this.medianValue(input.vitals.systolicBloodPressure)
    const medianHeartRate = this.medianValue(input.vitals.heartRate)

    if (medianSystolic === undefined || medianHeartRate === undefined)
      return this.createRecommendation(
        currentRequests,
        undefined,
        UserMedicationRecommendationType.morePatientObservationsRequired,
      )

    if (medianSystolic < 100 || medianHeartRate < 60)
      return this.createRecommendation(
        currentRequests,
        undefined,
        UserMedicationRecommendationType.personalTargetDoseReached,
      )

    if (
      input.latestDizzinessScore !== undefined &&
      input.latestDizzinessScore >= 3
    )
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
    const contraindicationCategory =
      this.contraindicationService.checkMedicationClass(
        input.contraindications,
        MedicationClassReference.betaBlockers,
      )

    const eligibleMedication =
      this.contraindicationService.findEligibleMedication(
        input.contraindications,
        [
          MedicationReference.carvedilol,
          MedicationReference.metoprololSuccinate,
          MedicationReference.bisoprolol,
        ],
      )

    switch (contraindicationCategory) {
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

    const medianSystolic = this.medianValue(input.vitals.systolicBloodPressure)
    const medianHeartRate = this.medianValue(input.vitals.heartRate)

    if (medianSystolic === undefined || medianHeartRate === undefined)
      return this.createRecommendation(
        [],
        eligibleMedication,
        UserMedicationRecommendationType.morePatientObservationsRequired,
      )

    if (medianSystolic < 100 || medianHeartRate < 60)
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
