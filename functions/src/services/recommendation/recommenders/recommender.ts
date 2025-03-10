//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  median,
  type MedicationClassReference,
  type MedicationReference,
  type Observation,
  QuantityUnit,
  type UserMedicationRecommendationType,
} from '@stanfordbdhg/engagehf-models'
import { type MedicationRequestContext } from '../../../models/medicationRequestContext.js'
import { type ContraindicationService } from '../../contraindication/contraindicationService.js'
import {
  type RecommendationInput,
  type RecommendationOutput,
} from '../recommendationService.js'

export abstract class Recommender {
  // Properties

  protected readonly contraindicationService: ContraindicationService

  // Constructor

  constructor(contraindicationService: ContraindicationService) {
    this.contraindicationService = contraindicationService
  }

  // Methods

  abstract compute(input: RecommendationInput): RecommendationOutput[]

  // Helpers

  protected createRecommendation(
    currentMedication: MedicationRequestContext[],
    recommendedMedication: MedicationReference | undefined,
    type: UserMedicationRecommendationType,
  ): RecommendationOutput[] {
    return [
      {
        currentMedication: currentMedication,
        recommendedMedication: recommendedMedication,
        type: type,
      },
    ]
  }

  protected isTargetDailyDoseReached(
    currentMedication: MedicationRequestContext[],
  ): boolean {
    const medication = currentMedication.at(0)?.medication
    if (!medication) throw new Error('Medication is missing')

    const targetDailyDose = medication.targetDailyDose?.reduce(
      (acc, dose) => acc + dose,
      0,
    )
    if (!targetDailyDose) throw new Error('Target daily dose is missing')

    const currentDailyDose = this.currentDailyDose(currentMedication).reduce(
      (acc, dose) => acc + dose,
      0,
    )

    return currentDailyDose >= targetDailyDose
  }

  protected findCurrentRequests(
    requests: MedicationRequestContext[],
    references: MedicationClassReference[],
  ): MedicationRequestContext[] {
    const validContexts = requests.filter((request) =>
      references.some(
        (reference) =>
          request.medicationClassReference.reference === reference.toString(),
      ),
    )
    const latestContext =
      validContexts.length > 0 ?
        validContexts.reduce(
          (acc, context) =>
            acc.lastUpdate < context.lastUpdate ? context : acc,
          validContexts[0],
        )
      : undefined
    return validContexts.filter(
      (context) =>
        context.medicationReference === latestContext?.medicationReference,
    )
  }

  protected medianValue(observations: Observation[]): number | undefined {
    if (observations.length < 3) return undefined
    return median(observations.map((observation) => observation.value)) ?? 0
  }

  private currentDailyDose(contexts: MedicationRequestContext[]): number[] {
    const dailyDoses: number[] = []
    for (const context of contexts) {
      let numberOfTabletsPerDay = 0
      for (const instruction of context.request.dosageInstruction ?? []) {
        const intakesPerDay = instruction.timing?.repeat?.frequency ?? 0
        for (const dose of instruction.doseAndRate ?? []) {
          const numberOfPills = dose.doseQuantity?.value
          if (!numberOfPills)
            throw new Error('Invalid dose quantity encountered.')
          numberOfTabletsPerDay += numberOfPills * intakesPerDay
        }
      }

      const ingredients = context.drug.ingredient ?? []

      while (dailyDoses.length < ingredients.length) {
        dailyDoses.push(0)
      }

      ingredients.forEach((ingredient, index) => {
        const strength =
          QuantityUnit.mg.valueOf(ingredient.strength?.numerator) ?? 0
        dailyDoses[index] += numberOfTabletsPerDay * strength
      })
    }
    return dailyDoses
  }
}
