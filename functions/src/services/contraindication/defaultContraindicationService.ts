//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  type FHIRAllergyIntolerance,
  FHIRAllergyIntoleranceCriticality,
  FHIRAllergyIntoleranceType,
  MedicationClassReference,
  MedicationReference,
} from '@stanfordbdhg/engagehf-models'
import { logger } from 'firebase-functions'
import {
  ContraindicationCategory,
  type ContraindicationService,
} from './contraindicationService.js'

interface ContraindicationRecord {
  category: ContraindicationCategory
  medications: Set<MedicationReference>
  medicationClasses: Set<MedicationClassReference>
}

export class DefaultContraindicationService implements ContraindicationService {
  // Properties

  readonly aceiArbMedicationClasses = [
    MedicationClassReference.angiotensinConvertingEnzymeInhibitors,
    MedicationClassReference.angiotensinReceptorBlockers,
  ]

  readonly arbArniMedicationClasses = [
    MedicationClassReference.angiotensinReceptorBlockers,
    MedicationClassReference.angiotensinReceptorNeprilysinInhibitors,
  ]

  readonly rasiMedicationClasses = [
    MedicationClassReference.angiotensinConvertingEnzymeInhibitors,
    MedicationClassReference.angiotensinReceptorBlockers,
    MedicationClassReference.angiotensinReceptorNeprilysinInhibitors,
  ]

  // Methods

  checkMedication(
    contraindications: FHIRAllergyIntolerance[],
    medicationReference: MedicationReference,
  ): ContraindicationCategory {
    const medicationClassReference =
      this.medicationClassReference(medicationReference)
    return this.checkAll(
      contraindications,
      (record) =>
        record.medications.has(medicationReference) ||
        record.medicationClasses.has(medicationClassReference),
    )
  }

  checkMedicationClass(
    contraindications: FHIRAllergyIntolerance[],
    medicationClassReference: MedicationClassReference,
  ): ContraindicationCategory {
    return this.checkAll(contraindications, (record) =>
      record.medicationClasses.has(medicationClassReference),
    )
  }

  findEligibleMedication(
    contraindications: FHIRAllergyIntolerance[],
    medicationReferences: MedicationReference[],
  ): MedicationReference | undefined {
    let availableMedications = medicationReferences

    this.checkAll(contraindications, (record) => {
      availableMedications = availableMedications.filter(
        (medication) =>
          !record.medications.has(medication) &&
          !record.medicationClasses.has(
            this.medicationClassReference(medication),
          ),
      )
      return false
    })

    return availableMedications.at(0)
  }

  // Helpers

  private checkAll(
    contraindications: FHIRAllergyIntolerance[],
    isRelevant: (record: ContraindicationRecord) => boolean,
  ): ContraindicationCategory {
    let category = ContraindicationCategory.none
    for (const contraindication of contraindications) {
      const medicationReferences = contraindication.rxNormCodes.flatMap(
        (code) => {
          const reference = Object.values(MedicationReference).find(
            (value) => value.toString() === 'medications/' + code,
          )
          if (reference === undefined)
            logger.error(`Unknown RxNorm code in contraindication: ${code}`)
          return reference !== undefined ? [reference] : []
        },
      )

      for (const medicationReference of medicationReferences) {
        const record = this.record({
          medicationReference: medicationReference,
          type: contraindication.type,
          criticality: contraindication.criticality,
        })
        if (isRelevant(record)) category = Math.max(category, record.category)
      }
    }
    return category
  }

  private record(input: {
    medicationReference: MedicationReference
    type: FHIRAllergyIntoleranceType
    criticality?: FHIRAllergyIntoleranceCriticality
  }): ContraindicationRecord {
    const medicationClass = this.medicationClassReference(
      input.medicationReference,
    )
    const medicationReferences = this.medicationReferenceIncludingDerivatives(
      input.medicationReference,
    )
    switch (input.type) {
      case FHIRAllergyIntoleranceType.allergy:
        if (input.criticality === FHIRAllergyIntoleranceCriticality.high) {
          return {
            category: ContraindicationCategory.severeAllergyIntolerance,
            medications: medicationReferences,
            medicationClasses: new Set(
              this.rasiMedicationClasses.includes(medicationClass) ?
                this.rasiMedicationClasses
              : [medicationClass],
            ),
          }
        } else {
          return {
            category: ContraindicationCategory.allergyIntolerance,
            medications: medicationReferences,
            medicationClasses: new Set(
              this.arbArniMedicationClasses.includes(medicationClass) ?
                this.arbArniMedicationClasses
              : [medicationClass],
            ),
          }
        }
      case FHIRAllergyIntoleranceType.intolerance:
        switch (medicationClass) {
          case MedicationClassReference.angiotensinConvertingEnzymeInhibitors:
          case MedicationClassReference.angiotensinReceptorNeprilysinInhibitors:
            return {
              category: ContraindicationCategory.clinicianListed,
              medications: medicationReferences,
              medicationClasses: new Set([medicationClass]),
            }
          case MedicationClassReference.angiotensinReceptorBlockers:
            return {
              category: ContraindicationCategory.clinicianListed,
              medications: medicationReferences,
              medicationClasses: new Set(this.arbArniMedicationClasses),
            }
          default:
            return {
              category: ContraindicationCategory.clinicianListed,
              medications: medicationReferences,
              medicationClasses: new Set(),
            }
        }
      case FHIRAllergyIntoleranceType.financial:
      case FHIRAllergyIntoleranceType.preference:
        return {
          category: ContraindicationCategory.clinicianListed,
          medications: medicationReferences,
          medicationClasses: new Set(
            this.aceiArbMedicationClasses.includes(medicationClass) ?
              this.rasiMedicationClasses
            : [medicationClass],
          ),
        }
    }
  }

  private medicationReferenceIncludingDerivatives(
    reference: MedicationReference,
  ): Set<MedicationReference> {
    switch (reference) {
      case MedicationReference.carvedilol:
      case MedicationReference.carvedilolPhosphate:
        return new Set([
          MedicationReference.carvedilol,
          MedicationReference.carvedilolPhosphate,
        ])
      default:
        return new Set([reference])
    }
  }

  private medicationClassReference(
    medicationReference: MedicationReference,
  ): MedicationClassReference {
    switch (medicationReference) {
      case MedicationReference.metoprololSuccinate:
      case MedicationReference.carvedilol:
      case MedicationReference.carvedilolPhosphate:
      case MedicationReference.bisoprolol:
        return MedicationClassReference.betaBlockers

      case MedicationReference.dapagliflozin:
      case MedicationReference.empagliflozin:
      case MedicationReference.sotagliflozin:
      case MedicationReference.bexagliflozin:
      case MedicationReference.canagliflozin:
      case MedicationReference.ertugliflozin:
        return MedicationClassReference.sglt2inhibitors

      case MedicationReference.spironolactone:
      case MedicationReference.eplerenone:
        return MedicationClassReference.mineralocorticoidReceptorAntagonists

      case MedicationReference.quinapril:
      case MedicationReference.perindopril:
      case MedicationReference.ramipril:
      case MedicationReference.benazepril:
      case MedicationReference.captopril:
      case MedicationReference.enalapril:
      case MedicationReference.lisinopril:
      case MedicationReference.fosinopril:
      case MedicationReference.trandolapril:
      case MedicationReference.moexepril:
        return MedicationClassReference.angiotensinConvertingEnzymeInhibitors

      case MedicationReference.losartan:
      case MedicationReference.valsartan:
      case MedicationReference.candesartan:
      case MedicationReference.irbesartan:
      case MedicationReference.telmisartan:
      case MedicationReference.olmesartan:
      case MedicationReference.azilsartan:
      case MedicationReference.eprosartan:
        return MedicationClassReference.angiotensinReceptorBlockers

      case MedicationReference.sacubitrilValsartan:
        return MedicationClassReference.angiotensinReceptorNeprilysinInhibitors

      case MedicationReference.furosemide:
      case MedicationReference.bumetanide:
      case MedicationReference.torsemide:
      case MedicationReference.ethacrynicAcid:
        return MedicationClassReference.diuretics
    }
  }
}
