//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  type FHIRAllergyIntolerance,
  type MedicationClassReference,
  type MedicationReference,
} from '@stanfordbdhg/engagehf-models'

export enum ContraindicationCategory {
  none = 0,
  clinicianListed = 1,
  allergyIntolerance = 2,
  severeAllergyIntolerance = 3,
}

export interface ContraindicationService {
  // Methods

  checkMedication(
    contraindications: FHIRAllergyIntolerance[],
    medicationReference: MedicationReference,
  ): ContraindicationCategory

  checkMedicationClass(
    contraindications: FHIRAllergyIntolerance[],
    medicationClassReference: MedicationClassReference,
  ): ContraindicationCategory

  findEligibleMedication(
    contraindications: FHIRAllergyIntolerance[],
    medicationReferences: MedicationReference[],
  ): MedicationReference | undefined
}
