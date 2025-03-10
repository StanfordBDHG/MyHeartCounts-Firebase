//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { type Observation, QuantityUnit } from '@stanfordbdhg/engagehf-models'
import { type RecommendationVitals } from '../../services/recommendation/recommendationService.js'

export function mockRecommendationVitals(options: {
  countBloodPressureBelow85: number
  medianSystolicBloodPressure: number | null
  medianHeartRate: number | null
  potassium: number
  creatinine: number
  eGfr: number
}): RecommendationVitals {
  const regularBloodPressureCount =
    options.medianSystolicBloodPressure ?
      Math.min(options.countBloodPressureBelow85 + 5, 10)
    : 0
  return {
    systolicBloodPressure: [
      ...Array.from(
        { length: options.countBloodPressureBelow85 },
        (_): Observation => ({
          date: new Date(),
          value: 84,
          unit: QuantityUnit.mmHg,
        }),
      ),
      ...Array.from({ length: regularBloodPressureCount }, (_) => ({
        date: new Date(),
        value: options.medianSystolicBloodPressure ?? 110,
        unit: QuantityUnit.mmHg,
      })),
    ],
    heartRate: Array.from(
      { length: options.medianHeartRate !== null ? 10 : 0 },
      (_) => ({
        date: new Date(),
        value: options.medianHeartRate ?? 0,
        unit: QuantityUnit.bpm,
      }),
    ),
    creatinine: {
      date: new Date(),
      value: options.creatinine,
      unit: QuantityUnit.mg_dL,
    },
    estimatedGlomerularFiltrationRate: {
      date: new Date(),
      value: options.eGfr,
      unit: QuantityUnit.mL_min_173m2,
    },
    potassium: {
      date: new Date(),
      value: options.potassium,
      unit: QuantityUnit.mEq_L,
    },
  }
}
