//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  type FHIRAllergyIntolerance,
  type FHIRMedication,
  type FHIRMedicationRequest,
  LocalizedText,
  type MedicationReference,
  type Observation,
  type UserMedicationRecommendation,
  type UserMedicationRecommendationDoseSchedule,
  UserMedicationRecommendationType,
} from '@stanfordbdhg/engagehf-models'
import { BetaBlockerRecommender } from './recommenders/betaBlockerRecommender.js'
import { DiureticRecommender } from './recommenders/diureticRecommender.js'
import { MraRecommender } from './recommenders/mraRecommender.js'
import { RasiRecommender } from './recommenders/rasiRecommender.js'
import { type Recommender } from './recommenders/recommender.js'
import { Sglt2iRecommender } from './recommenders/sglt2iRecommender.js'
import { type MedicationRequestContext } from '../../models/medicationRequestContext.js'
import { type ContraindicationService } from '../contraindication/contraindicationService.js'
import { type MedicationService } from '../medication/medicationService.js'

export interface RecommendationInput {
  requests: MedicationRequestContext[]
  contraindications: FHIRAllergyIntolerance[]
  vitals: RecommendationVitals
  latestDizzinessScore?: number
}

export interface RecommendationVitals {
  systolicBloodPressure: Observation[]
  heartRate: Observation[]
  creatinine?: Observation
  estimatedGlomerularFiltrationRate?: Observation
  potassium?: Observation
}

export interface RecommendationOutput {
  currentMedication: MedicationRequestContext[]
  recommendedMedication?: MedicationReference
  type: UserMedicationRecommendationType
}

export class RecommendationService {
  // Properties

  private readonly medicationService: MedicationService
  private readonly recommenders: Recommender[]

  // Constructor

  constructor(
    contraindicationService: ContraindicationService,
    medicationService: MedicationService,
  ) {
    this.medicationService = medicationService
    this.recommenders = [
      new BetaBlockerRecommender(contraindicationService),
      new RasiRecommender(contraindicationService),
      new MraRecommender(contraindicationService),
      new Sglt2iRecommender(contraindicationService),
      new DiureticRecommender(contraindicationService),
    ]
  }

  // Methods

  async compute(
    input: RecommendationInput,
  ): Promise<UserMedicationRecommendation[]> {
    const result: UserMedicationRecommendation[] = []
    for (const recommender of this.recommenders) {
      const outputs = recommender.compute(input)
      for (const output of outputs) {
        result.push(await this.createRecommendation(output))
      }
    }
    return result
  }

  // Helpers

  private async createRecommendation(
    output: RecommendationOutput,
  ): Promise<UserMedicationRecommendation> {
    const recommendedMedication =
      output.recommendedMedication ?
        await this.medicationService.getReference({
          reference: output.recommendedMedication,
        })
      : null

    const medication =
      output.currentMedication.at(0)?.medication ??
      recommendedMedication?.content
    let title = medication?.displayName ?? ''

    const brandNames = medication?.brandNames ?? []
    if (brandNames.length > 0) title += ` (${brandNames.join(', ')})`

    const currentMedicationClass =
      output.currentMedication.at(0)?.medicationClass
    const currentMedicationClassReference =
      output.currentMedication.at(0)?.medicationClassReference

    const recommendedMedicationClass = await (async () => {
      const recommendedMedicationContent = recommendedMedication?.content
      const reference =
        recommendedMedicationContent ?
          recommendedMedicationContent.medicationClassReference
        : null
      if (
        currentMedicationClass &&
        currentMedicationClassReference &&
        reference &&
        currentMedicationClassReference.reference === reference.reference
      ) {
        return currentMedicationClass
      }
      return reference ?
          (await this.medicationService.getClassReference(reference))?.content
        : null
    })()

    const minimumDailyDoseRequest = medication?.minimumDailyDoseRequest
    const minimumDailyDoseDrugReference =
      minimumDailyDoseRequest?.medicationReference ?
        (
          await this.medicationService.getReference(
            minimumDailyDoseRequest.medicationReference,
          )
        )?.content
      : null
    const minimumDailyDoseSchedule =
      minimumDailyDoseRequest && minimumDailyDoseDrugReference ?
        this.doseSchedule(
          minimumDailyDoseRequest,
          minimumDailyDoseDrugReference,
        )
      : []

    const currentDailyDoseSchedule = output.currentMedication.flatMap(
      (context) => this.doseSchedule(context.request, context.drug),
    )

    const targetDailyDoseRequest = medication?.targetDailyDoseRequest
    const targetDailyDoseDrugReference =
      targetDailyDoseRequest?.medicationReference ?
        (
          await this.medicationService.getReference(
            targetDailyDoseRequest.medicationReference,
          )
        )?.content
      : undefined
    const targetDailyDoseSchedule =
      targetDailyDoseRequest && targetDailyDoseDrugReference ?
        this.doseSchedule(targetDailyDoseRequest, targetDailyDoseDrugReference)
      : []

    return {
      currentMedication: output.currentMedication.map(
        (context) => context.requestReference,
      ),
      recommendedMedication:
        output.recommendedMedication ?
          {
            reference: output.recommendedMedication,
            display: recommendedMedication?.content.displayName,
          }
        : undefined,
      displayInformation: {
        title: new LocalizedText(title),
        subtitle:
          currentMedicationClass?.name ??
          recommendedMedicationClass?.name ??
          new LocalizedText(''),
        description: this.recommendationDescription(
          output,
          recommendedMedication?.content ?? undefined,
        ),
        type: output.type,
        videoPath:
          recommendedMedicationClass?.videoPath ??
          currentMedicationClass?.videoPath,
        dosageInformation: {
          minimumSchedule: minimumDailyDoseSchedule,
          currentSchedule: currentDailyDoseSchedule,
          targetSchedule: targetDailyDoseSchedule,
          unit: 'mg',
        },
      },
    }
  }

  private doseSchedule(
    request: FHIRMedicationRequest,
    drug: FHIRMedication,
  ): UserMedicationRecommendationDoseSchedule[] {
    const ingredients = (drug.ingredient ?? []).map(
      (ingredient) => ingredient.strength?.numerator?.value ?? 0,
    )
    return (request.dosageInstruction ?? []).map((instruction) => {
      const frequency = instruction.timing?.repeat?.frequency ?? 1
      const count = (instruction.doseAndRate ?? []).reduce(
        (previous, current) => previous + (current.doseQuantity?.value ?? 0),
        0,
      )
      return {
        frequency: frequency,
        quantity: ingredients.map((ingredient) => ingredient * count),
      }
    })
  }

  private recommendationDescription(
    output: RecommendationOutput,
    recommendedMedication: FHIRMedication | undefined,
  ): LocalizedText {
    switch (output.type) {
      case UserMedicationRecommendationType.improvementAvailable: {
        if (recommendedMedication !== undefined) {
          const displayName = recommendedMedication.displayName
          return new LocalizedText(
            `Discuss starting ${displayName} (more effective med) with your care team to help your heart.`,
          )
        } else {
          return new LocalizedText(
            'Discuss increasing the dose with your care team to get closer to target.',
          )
        }
      }
      case UserMedicationRecommendationType.moreLabObservationsRequired: {
        return new LocalizedText(
          'Discuss lab check with your care team before med change.',
        )
      }
      case UserMedicationRecommendationType.morePatientObservationsRequired: {
        return new LocalizedText(
          'Need more blood pressure / heart rate checks to suggest a change.',
        )
      }
      case UserMedicationRecommendationType.noActionRequired: {
        return new LocalizedText('')
      }
      case UserMedicationRecommendationType.notStarted: {
        return new LocalizedText(
          'Discuss starting this med with your care team to help your heart.',
        )
      }
      case UserMedicationRecommendationType.personalTargetDoseReached: {
        return new LocalizedText(
          'Your current target dose was reached. Congrats!',
        )
      }
      case UserMedicationRecommendationType.targetDoseReached: {
        return new LocalizedText(`You're on the target dose. Congrats!`)
      }
    }
  }
}
