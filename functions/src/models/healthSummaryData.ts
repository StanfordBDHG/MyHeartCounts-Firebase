//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  advanceDateByDays,
  average,
  type FHIRAppointment,
  type Observation,
  type SymptomScore,
} from '@stanfordbdhg/engagehf-models'
import {
  HealthSummaryDizzinessCategory,
  type HealthSummaryMedicationRecommendationsCategory,
  HealthSummarySymptomScoreCategory,
  HealthSummaryWeightCategory,
} from '../healthSummary/keyPointsMessage.js'

export interface HealthSummaryVitals {
  systolicBloodPressure: Observation[]
  diastolicBloodPressure: Observation[]
  heartRate: Observation[]
  bodyWeight: Observation[]

  dryWeight?: Observation
}

export class HealthSummaryData {
  // Stored Properties

  name?: string
  dateOfBirth?: Date
  providerName?: string
  nextAppointment?: FHIRAppointment
  vitals: HealthSummaryVitals
  symptomScores: SymptomScore[]
  now: Date

  // Computed Properties - Body Weight

  get latestBodyWeight(): number | null {
    return this.vitals.bodyWeight.at(0)?.value ?? null
  }

  get lastSevenDayAverageBodyWeight(): number | null {
    const bodyWeightValues = this.vitals.bodyWeight
      .filter(
        (observation) => observation.date >= advanceDateByDays(this.now, -7),
      )
      .map((observation) => observation.value)
    return average(bodyWeightValues) ?? null
  }

  get medianBodyWeight(): number | null {
    return (
      average(this.vitals.bodyWeight.map((observation) => observation.value)) ??
      null
    )
  }

  get bodyWeightRange(): number | null {
    const bodyWeightValues = this.vitals.bodyWeight.map(
      (observation) => observation.value,
    )
    const minWeight = Math.min(...bodyWeightValues)
    const maxWeight = Math.max(...bodyWeightValues)
    return isFinite(minWeight) && isFinite(maxWeight) ?
        maxWeight - minWeight
      : null
  }

  // Computed Properties - Symptom Scores

  get latestSymptomScore(): SymptomScore | null {
    return this.symptomScores.at(0) ?? null
  }

  get secondLatestSymptomScore(): SymptomScore | null {
    return this.symptomScores.at(1) ?? null
  }

  // Computed Properties - KeyPoints

  get dizzinessCategory(): HealthSummaryDizzinessCategory | null {
    const latestScore = this.latestSymptomScore?.dizzinessScore ?? null
    const secondLatestScore =
      this.secondLatestSymptomScore?.dizzinessScore ?? null

    if (latestScore === null || secondLatestScore === null) return null

    return latestScore - secondLatestScore < 0 ?
        HealthSummaryDizzinessCategory.WORSENING
      : HealthSummaryDizzinessCategory.STABLE_OR_IMPROVING
  }

  get recommendationsCategory(): HealthSummaryMedicationRecommendationsCategory | null {
    return null
  }

  get symptomScoreCategory(): HealthSummarySymptomScoreCategory | null {
    const latestScore = this.latestSymptomScore
    const secondLatestScore = this.secondLatestSymptomScore

    if (latestScore === null || secondLatestScore === null) return null

    if (latestScore.overallScore - secondLatestScore.overallScore <= -10) {
      return HealthSummarySymptomScoreCategory.WORSENING
    }

    if (latestScore.overallScore < 90) {
      return HealthSummarySymptomScoreCategory.LOW_STABLE_OR_IMPROVING
    }

    return HealthSummarySymptomScoreCategory.HIGH_STABLE_OR_IMPROVING
  }

  get weightCategory(): HealthSummaryWeightCategory {
    const medianWeight = this.medianBodyWeight
    const latestWeight = this.latestBodyWeight
    if (medianWeight === null || latestWeight === null) {
      return HealthSummaryWeightCategory.MISSING
    }

    return latestWeight - medianWeight >= 3 ?
        HealthSummaryWeightCategory.INCREASING
      : HealthSummaryWeightCategory.STABLE_OR_DECREASING
  }

  // Initialization

  constructor(input: {
    name?: string
    dateOfBirth?: Date
    providerName?: string
    nextAppointment?: FHIRAppointment
    recommendations?: any[]
    vitals: HealthSummaryVitals
    symptomScores: SymptomScore[]
    now: Date
  }) {
    this.name = input.name
    this.dateOfBirth = input.dateOfBirth
    this.providerName = input.providerName
    this.nextAppointment = input.nextAppointment
    this.vitals = input.vitals
    this.symptomScores = input.symptomScores
    this.now = input.now
  }
}
