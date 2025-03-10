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
import { type MedicationRequestContext } from '../../../models/medicationRequestContext.js'
import { ContraindicationCategory } from '../../contraindication/contraindicationService.js'
import {
  type RecommendationInput,
  type RecommendationOutput,
} from '../recommendationService.js'

export class RasiRecommender extends Recommender {
  // Methods

  compute(input: RecommendationInput): RecommendationOutput[] {
    const arni = this.findCurrentRequests(input.requests, [
      MedicationClassReference.angiotensinReceptorNeprilysinInhibitors,
    ])
    if (arni.length > 0) return this.computeArni(arni, input)

    const aceiAndArb = this.findCurrentRequests(input.requests, [
      MedicationClassReference.angiotensinConvertingEnzymeInhibitors,
      MedicationClassReference.angiotensinReceptorBlockers,
    ])
    if (aceiAndArb.length > 0) return this.computeAceiAndArb(aceiAndArb, input)

    return this.computeNew(input)
  }

  // Helpers

  private computeAceiAndArb(
    requests: MedicationRequestContext[],
    input: RecommendationInput,
  ): RecommendationOutput[] {
    const contraindicationToArni =
      this.contraindicationService.checkMedicationClass(
        input.contraindications,
        MedicationClassReference.angiotensinReceptorNeprilysinInhibitors,
      )

    switch (contraindicationToArni) {
      case ContraindicationCategory.severeAllergyIntolerance:
      case ContraindicationCategory.allergyIntolerance:
      case ContraindicationCategory.clinicianListed:
        if (this.isTargetDailyDoseReached(requests))
          return this.createRecommendation(
            requests,
            undefined,
            UserMedicationRecommendationType.targetDoseReached,
          )

        const medianSystolic = this.medianValue(
          input.vitals.systolicBloodPressure,
        )
        if (medianSystolic === undefined)
          return this.createRecommendation(
            requests,
            undefined,
            UserMedicationRecommendationType.morePatientObservationsRequired,
          )

        const lowCount = input.vitals.systolicBloodPressure.filter(
          (observation) => observation.value < 85,
        ).length

        if (medianSystolic < 100 || lowCount >= 2)
          return this.createRecommendation(
            requests,
            undefined,
            UserMedicationRecommendationType.personalTargetDoseReached,
          )

        const creatinine = input.vitals.creatinine
        const potassium = input.vitals.potassium
        if (
          creatinine !== undefined &&
          potassium !== undefined &&
          (creatinine.value >= 2.5 || potassium.value >= 5)
        )
          return this.createRecommendation(
            requests,
            undefined,
            UserMedicationRecommendationType.personalTargetDoseReached,
          )

        if (
          input.latestDizzinessScore !== undefined &&
          input.latestDizzinessScore >= 3
        )
          return this.createRecommendation(
            requests,
            undefined,
            UserMedicationRecommendationType.personalTargetDoseReached,
          )

        return this.createRecommendation(
          requests,
          undefined,
          UserMedicationRecommendationType.improvementAvailable,
        )
      case ContraindicationCategory.none:
        break
    }

    const medianSystolic = this.medianValue(input.vitals.systolicBloodPressure)

    if (medianSystolic === undefined)
      return this.createRecommendation(
        requests,
        undefined,
        UserMedicationRecommendationType.morePatientObservationsRequired,
      )

    const lowCount = input.vitals.systolicBloodPressure.filter(
      (observation) => observation.value < 85,
    ).length

    if (medianSystolic < 100 || lowCount >= 2)
      return this.createRecommendation(
        requests,
        undefined,
        UserMedicationRecommendationType.personalTargetDoseReached,
      )

    const creatinine = input.vitals.creatinine
    const potassium = input.vitals.potassium
    if (
      creatinine !== undefined &&
      potassium !== undefined &&
      (creatinine.value >= 2.5 || potassium.value >= 5)
    )
      return this.createRecommendation(
        requests,
        undefined,
        UserMedicationRecommendationType.personalTargetDoseReached,
      )

    if (
      input.latestDizzinessScore !== undefined &&
      input.latestDizzinessScore >= 3
    )
      return this.createRecommendation(
        requests,
        undefined,
        UserMedicationRecommendationType.personalTargetDoseReached,
      )

    return this.createRecommendation(
      requests,
      MedicationReference.sacubitrilValsartan,
      UserMedicationRecommendationType.improvementAvailable,
    )
  }

  private computeArni(
    requests: MedicationRequestContext[],
    input: RecommendationInput,
  ): RecommendationOutput[] {
    if (this.isTargetDailyDoseReached(requests))
      return this.createRecommendation(
        requests,
        undefined,
        UserMedicationRecommendationType.targetDoseReached,
      )

    const medianSystolic = this.medianValue(input.vitals.systolicBloodPressure)

    const lowCount = input.vitals.systolicBloodPressure.filter(
      (observation) => observation.value < 85,
    ).length

    if (medianSystolic === undefined)
      return this.createRecommendation(
        requests,
        undefined,
        UserMedicationRecommendationType.morePatientObservationsRequired,
      )

    if (medianSystolic < 100 || lowCount >= 2)
      return this.createRecommendation(
        requests,
        undefined,
        UserMedicationRecommendationType.personalTargetDoseReached,
      )

    const creatinine = input.vitals.creatinine
    const potassium = input.vitals.potassium
    if (
      creatinine !== undefined &&
      potassium !== undefined &&
      (creatinine.value >= 2.5 || potassium.value >= 5)
    )
      return this.createRecommendation(
        requests,
        undefined,
        UserMedicationRecommendationType.personalTargetDoseReached,
      )

    if (
      input.latestDizzinessScore !== undefined &&
      input.latestDizzinessScore >= 3
    )
      return this.createRecommendation(
        requests,
        undefined,
        UserMedicationRecommendationType.personalTargetDoseReached,
      )

    return this.createRecommendation(
      requests,
      undefined,
      UserMedicationRecommendationType.improvementAvailable,
    )
  }

  private computeNew(input: RecommendationInput): RecommendationOutput[] {
    const contraindicationToArb =
      this.contraindicationService.checkMedicationClass(
        input.contraindications,
        MedicationClassReference.angiotensinReceptorBlockers,
      )

    switch (contraindicationToArb) {
      case ContraindicationCategory.severeAllergyIntolerance:
      case ContraindicationCategory.allergyIntolerance:
        return []
      case ContraindicationCategory.clinicianListed:
      case ContraindicationCategory.none:
        break
    }

    const contraindicationToAcei =
      this.contraindicationService.checkMedicationClass(
        input.contraindications,
        MedicationClassReference.angiotensinConvertingEnzymeInhibitors,
      )

    switch (contraindicationToAcei) {
      case ContraindicationCategory.severeAllergyIntolerance:
        return []
      case ContraindicationCategory.allergyIntolerance:
      case ContraindicationCategory.clinicianListed:
      case ContraindicationCategory.none:
        break
    }

    const eligibleMedication =
      this.contraindicationService.findEligibleMedication(
        input.contraindications,
        [
          MedicationReference.sacubitrilValsartan,
          MedicationReference.losartan,
          MedicationReference.lisinopril,
        ],
      )

    if (eligibleMedication === undefined) return []

    if (contraindicationToArb !== ContraindicationCategory.none)
      return this.createRecommendation(
        [],
        eligibleMedication,
        UserMedicationRecommendationType.noActionRequired,
      )

    const medianSystolic = this.medianValue(input.vitals.systolicBloodPressure)

    if (medianSystolic === undefined)
      return this.createRecommendation(
        [],
        eligibleMedication,
        UserMedicationRecommendationType.morePatientObservationsRequired,
      )

    const lowCount = input.vitals.systolicBloodPressure.filter(
      (observation) => observation.value < 85,
    ).length

    if (medianSystolic < 100 || lowCount >= 2)
      return this.createRecommendation(
        [],
        eligibleMedication,
        UserMedicationRecommendationType.noActionRequired,
      )

    const creatinine = input.vitals.creatinine
    const potassium = input.vitals.potassium
    if (
      creatinine !== undefined &&
      potassium !== undefined &&
      (creatinine.value >= 2.5 || potassium.value >= 5)
    )
      return this.createRecommendation(
        [],
        eligibleMedication,
        UserMedicationRecommendationType.noActionRequired,
      )

    const contraindicationToArni =
      this.contraindicationService.checkMedicationClass(
        input.contraindications,
        MedicationClassReference.angiotensinReceptorNeprilysinInhibitors,
      )

    switch (contraindicationToArni) {
      case ContraindicationCategory.severeAllergyIntolerance:
      case ContraindicationCategory.allergyIntolerance:
      case ContraindicationCategory.clinicianListed:
        return this.createRecommendation(
          [],
          this.contraindicationService.findEligibleMedication(
            input.contraindications,
            [MedicationReference.losartan, MedicationReference.lisinopril],
          ) ?? eligibleMedication,
          UserMedicationRecommendationType.notStarted,
        )
      case ContraindicationCategory.none:
        return this.createRecommendation(
          [],
          MedicationReference.sacubitrilValsartan,
          UserMedicationRecommendationType.notStarted,
        )
    }
  }
}
