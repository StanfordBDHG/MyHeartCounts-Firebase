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
import { type MedicationService } from './medicationService.js'
import { type MedicationRequestContext } from '../../models/medicationRequestContext.js'
import {
  type Document,
  type DatabaseService,
} from '../database/databaseService.js'

export class DatabaseMedicationService implements MedicationService {
  // Properties

  private readonly databaseService: DatabaseService

  // Constructor

  constructor(databaseService: DatabaseService) {
    this.databaseService = databaseService
  }

  // Methods - Medication Request Context

  async getContext(
    request: Document<FHIRMedicationRequest>,
  ): Promise<MedicationRequestContext> {
    const drugReference = request.content.medicationReference
    if (drugReference === undefined) throw new Error('Drug reference not found')
    const drug = (await this.getReference(drugReference))?.content
    if (drug === undefined)
      throw new Error(`Drug not found at ${drugReference.reference}`)
    const medicationReference: FHIRReference = {
      reference: drugReference.reference.split('/').slice(0, 2).join('/'),
    }
    const medication = (await this.getReference(medicationReference))?.content
    medicationReference.display = medication?.displayName
    if (medication === undefined)
      throw new Error(
        `Medication not found at ${medicationReference.reference}`,
      )
    const medicationClassReference = medication.medicationClassReference
    if (medicationClassReference === undefined)
      throw new Error('Medication class reference not found')
    const medicationClass = (
      await this.getClassReference(medicationClassReference)
    )?.content
    if (medicationClass === undefined)
      throw new Error(
        `Medication class not found at ${medicationClassReference.reference}`,
      )
    return {
      lastUpdate: request.lastUpdate,
      requestReference: { reference: request.path },
      request: request.content,
      drugReference,
      drug,
      medicationReference,
      medication,
      medicationClassReference,
      medicationClass,
    }
  }

  // Methods - Medication Classes

  async getMedicationClasses(): Promise<Array<Document<MedicationClass>>> {
    return this.databaseService.getQuery(
      (collections) => collections.medicationClasses,
    )
  }

  async getMedicationClass(
    medicationClassId: string,
  ): Promise<Document<MedicationClass> | undefined> {
    return this.databaseService.getDocument((collections) =>
      collections.medicationClasses.doc(medicationClassId),
    )
  }

  // Methods - Medications

  async getMedications(): Promise<Array<Document<FHIRMedication>>> {
    return this.databaseService.getQuery(
      (collections) => collections.medications,
    )
  }

  async getMedication(
    medicationId: string,
  ): Promise<Document<FHIRMedication> | undefined> {
    return this.databaseService.getDocument((collections) =>
      collections.medications.doc(medicationId),
    )
  }

  // Methods - Drugs

  async getDrugs(
    medicationId: string,
  ): Promise<Array<Document<FHIRMedication>>> {
    return this.databaseService.getQuery((collections) =>
      collections.drugs(medicationId),
    )
  }

  async getDrug(
    medicationId: string,
    drugId: string,
  ): Promise<Document<FHIRMedication> | undefined> {
    return this.databaseService.getDocument((collections) =>
      collections.drugs(medicationId).doc(drugId),
    )
  }

  // References

  async getClassReference(
    reference: FHIRReference | undefined,
  ): Promise<Document<MedicationClass> | undefined> {
    if (!reference?.reference) return undefined
    return this.databaseService.getDocument<MedicationClass>((collections) =>
      collections.medicationClassReference(reference.reference),
    )
  }

  async getReference(
    reference: FHIRReference | undefined,
  ): Promise<Document<FHIRMedication> | undefined> {
    if (!reference?.reference) return undefined
    return this.databaseService.getDocument<FHIRMedication>((collections) =>
      collections.medicationReference(reference.reference),
    )
  }
}
