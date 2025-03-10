//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  type FHIRMedication,
  type FHIRMedicationRequest,
  type FHIRReference,
  type MedicationClass,
} from '@stanfordbdhg/engagehf-models'

export interface MedicationRequestContext {
  lastUpdate: Date
  request: FHIRMedicationRequest
  requestReference: FHIRReference
  drug: FHIRMedication
  drugReference: FHIRReference
  medication: FHIRMedication
  medicationReference: FHIRReference
  medicationClass: MedicationClass
  medicationClassReference: FHIRReference
}
