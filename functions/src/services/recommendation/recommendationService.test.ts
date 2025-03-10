//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  CachingStrategy,
  DrugReference,
  FHIRAllergyIntolerance,
  FHIRAllergyIntoleranceCriticality,
  FHIRAllergyIntoleranceType,
  FHIRMedicationRequest,
  MedicationReference,
  UserMedicationRecommendationType,
} from '@stanfordbdhg/engagehf-models'
import { expect } from 'chai'
import { describe, it } from 'mocha'
import { type RecommendationService } from './recommendationService.js'
import { readCsv } from '../../tests/helpers/csv.js'
import { mockRecommendationVitals } from '../../tests/mocks/recommendationVitals.js'
import { setupMockFirebase } from '../../tests/setup.js'
import { getServiceFactory } from '../factory/getServiceFactory.js'
import { type MedicationService } from '../medication/medicationService.js'

describe('RecommendationService', () => {
  let medicationService: MedicationService
  let recommendationService: RecommendationService

  before(async () => {
    setupMockFirebase()
    const factory = getServiceFactory()
    const staticDataService = factory.staticData()
    await staticDataService.updateMedicationClasses(CachingStrategy.expectCache)
    await staticDataService.updateMedications(CachingStrategy.expectCache)
    medicationService = factory.medication()
    recommendationService = factory.recommendation()
  })

  describe('should return the right value', () => {
    readCsv('src/tests/resources/medtitrationtest.csv', 76, (values, index) => {
      if (index === 0) return
      it(`line ${index + 1}: ${values.join(',')}`, async () => {
        expect(values).to.have.length(24)

        const medicationRequests = values
          .slice(0, 4)
          .map(getMedicationRequest)
          .flatMap((x) => (x ? [x] : []))

        const vitals = mockRecommendationVitals({
          countBloodPressureBelow85: parseInt(values[4]),
          medianSystolicBloodPressure:
            values[5] !== 'NA' ? parseInt(values[5]) : null,
          medianHeartRate: values[6] !== 'NA' ? parseInt(values[6]) : null,
          potassium: parseFloat(values[7]),
          creatinine: parseFloat(values[8]),
          eGfr: parseFloat(values[9]),
        })
        const dizziness = parseInt(values[10])

        const contraindications = values.slice(11, 20).flatMap((value, index) =>
          value.split(',').flatMap((field) =>
            getContraindications(
              field,
              [0, 1, 2, 3].includes(index) ? FHIRAllergyIntoleranceType.allergy
              : [4, 5, 6, 7].includes(index) ?
                FHIRAllergyIntoleranceType.intolerance
              : FHIRAllergyIntoleranceType.financial,
            ),
          ),
        )

        const expectedRecommendations = [
          getExpectedRecommendation(values[20]),
          getExpectedRecommendation(values[21]),
          getExpectedRecommendation(values[22]),
          getExpectedRecommendation(values[23]),
        ].flatMap((x) => (x ? [x] : []))

        const requestContexts = await Promise.all(
          medicationRequests.map(async (medicationRequest, index) =>
            medicationService.getContext({
              id: index.toString(),
              path: `users/0/medicationRequests/${index}`,
              lastUpdate: new Date(),
              content: medicationRequest,
            }),
          ),
        )

        const result = await recommendationService.compute({
          requests: requestContexts,
          contraindications,
          vitals,
          latestDizzinessScore: dizziness,
        })

        const actualRecommendations = result.map(
          (x): ExpectedRecommendation => ({
            type: x.displayInformation.type,
            recommendedMedication: x.recommendedMedication?.reference as
              | MedicationReference
              | undefined,
          }),
        )

        expect(actualRecommendations).to.have.length(
          expectedRecommendations.length,
        )

        for (let i = 0; i < actualRecommendations.length; i++) {
          const actual = actualRecommendations[i]
          const expected = expectedRecommendations[i]
          expect(actual.type).to.equal(expected.type)
          if (
            expected.type ===
            UserMedicationRecommendationType.improvementAvailable
          ) {
            expect(expected.recommendedMedication).to.exist
            expect(result[i].currentMedication).to.have.length.greaterThan(0)
            result[i].currentMedication.every((medication) =>
              medication.reference.startsWith(
                (expected.recommendedMedication ?? '') + '/drugs/',
              ),
            )
          } else if (expected.recommendedMedication) {
            expect(actual.recommendedMedication).to.exist
            expect(actual.recommendedMedication).to.equal(
              expected.recommendedMedication,
            )
          }
        }
      })
    })
  })
})

function getMedicationRequest(
  value: string,
): FHIRMedicationRequest | undefined {
  switch (value.trim().toLowerCase()) {
    case 'none':
      return undefined
    case 'bisoprolol 2.5mg daily':
      return FHIRMedicationRequest.create({
        drugReference: DrugReference.bisoprolol5,
        frequencyPerDay: 1,
        quantity: 0.5,
      })
    case 'bisoprolol 10mg daily':
      return FHIRMedicationRequest.create({
        drugReference: DrugReference.bisoprolol5,
        frequencyPerDay: 2,
        quantity: 1,
      })
    case 'carvedilol 6.25 daily (3.125 bid)':
      return FHIRMedicationRequest.create({
        drugReference: DrugReference.carvedilol3_125,
        frequencyPerDay: 2,
        quantity: 1,
      })
    case 'carvedilol 50mg daily (25mg twice daily)':
      return FHIRMedicationRequest.create({
        drugReference: DrugReference.carvedilol25,
        frequencyPerDay: 2,
        quantity: 1,
      })
    case 'carvedilol 50mg   daily':
    case 'carvedilol 50mg  daily':
      return FHIRMedicationRequest.create({
        drugReference: DrugReference.carvedilol25,
        frequencyPerDay: 1,
        quantity: 2,
      })
    case 'dapagliflozin 5mg daily':
      return FHIRMedicationRequest.create({
        drugReference: DrugReference.dapagliflozin5,
        frequencyPerDay: 1,
        quantity: 1,
      })
    case 'dapagliflozin 10mg daily':
      return FHIRMedicationRequest.create({
        drugReference: DrugReference.dapagliflozin5,
        frequencyPerDay: 1,
        quantity: 2,
      })
    case 'empagliflozin 5mg daily':
      return FHIRMedicationRequest.create({
        drugReference: DrugReference.empagliflozin10,
        frequencyPerDay: 1,
        quantity: 0.5,
      })
    case 'empagliflozin 10mg daily':
      return FHIRMedicationRequest.create({
        drugReference: DrugReference.empagliflozin10,
        frequencyPerDay: 1,
        quantity: 1,
      })
    case 'eplerenone 25mg daily':
      return FHIRMedicationRequest.create({
        drugReference: DrugReference.eplerenone25,
        frequencyPerDay: 1,
        quantity: 1,
      })
    case 'eplerenone 50mg daily':
      return FHIRMedicationRequest.create({
        drugReference: DrugReference.eplerenone25,
        frequencyPerDay: 1,
        quantity: 2,
      })
    case 'lisinopril 5mg daily':
      return FHIRMedicationRequest.create({
        drugReference: DrugReference.lisinopril5,
        frequencyPerDay: 1,
        quantity: 1,
      })
    case 'lisinopril 40mg daily':
      return FHIRMedicationRequest.create({
        drugReference: DrugReference.lisinopril5,
        frequencyPerDay: 4,
        quantity: 2,
      })
    case 'losartan 25mg daily':
      return FHIRMedicationRequest.create({
        drugReference: DrugReference.losartan25,
        frequencyPerDay: 1,
        quantity: 1,
      })
    case 'losartan 150mg daily':
      return FHIRMedicationRequest.create({
        drugReference: DrugReference.losartan100,
        frequencyPerDay: 1,
        quantity: 1.5,
      })
    case 'metoprolol 12.5mg daily':
      return FHIRMedicationRequest.create({
        drugReference: DrugReference.metoprololSuccinate25Tablet,
        frequencyPerDay: 1,
        quantity: 0.5,
      })
    case 'metoprolol 200mg daily':
      return FHIRMedicationRequest.create({
        drugReference: DrugReference.metoprololSuccinate25Tablet,
        frequencyPerDay: 2,
        quantity: 4,
      })
    case 'spironolactone 12.5 daily':
      return FHIRMedicationRequest.create({
        drugReference: DrugReference.spironolactone25,
        frequencyPerDay: 1,
        quantity: 0.5,
      })
    case 'spironolactone 25mg daily':
      return FHIRMedicationRequest.create({
        drugReference: DrugReference.spironolactone25,
        frequencyPerDay: 1,
        quantity: 1,
      })
    case 'sacubitril-valsartan 100mg daily (24-26mg twice daily)':
      return FHIRMedicationRequest.create({
        drugReference: DrugReference.sacubitrilValsartan24_26,
        frequencyPerDay: 2,
        quantity: 1,
      })
    case 'sacubitril-valsartan 200mg daily (49-51mg twice daily)':
      return FHIRMedicationRequest.create({
        drugReference: DrugReference.sacubitrilValsartan49_51,
        frequencyPerDay: 2,
        quantity: 1,
      })
    case 'sacubitril-valsartan 400mg daily (97-103mg twice daily)':
      return FHIRMedicationRequest.create({
        drugReference: DrugReference.sacubitrilValsartan97_103,
        frequencyPerDay: 1,
        quantity: 2,
      })
    case 'valsartan 40mg':
      return FHIRMedicationRequest.create({
        drugReference: DrugReference.valsartan40,
        frequencyPerDay: 1,
        quantity: 1,
      })
    default:
      expect.fail('Unhandled case for medication request:', value)
  }
}

function getContraindications(
  field: string,
  type: FHIRAllergyIntoleranceType,
): FHIRAllergyIntolerance[] {
  switch (field.trim().toLowerCase().split(' ').join('')) {
    case 'none':
      return []
    case 'bisoprolol':
      return [
        FHIRAllergyIntolerance.create({
          reference: MedicationReference.bisoprolol,
          type,
          criticality: FHIRAllergyIntoleranceCriticality.low,
        }),
      ]
    case 'carvedilol':
      return [
        FHIRAllergyIntolerance.create({
          reference: MedicationReference.carvedilol,
          type,
          criticality: FHIRAllergyIntoleranceCriticality.low,
        }),
      ]
    case 'dapagliflozin':
      return [
        FHIRAllergyIntolerance.create({
          reference: MedicationReference.dapagliflozin,
          type,
          criticality: FHIRAllergyIntoleranceCriticality.low,
        }),
      ]
    case 'empagliflozin':
      return [
        FHIRAllergyIntolerance.create({
          reference: MedicationReference.empagliflozin,
          type,
          criticality: FHIRAllergyIntoleranceCriticality.low,
        }),
      ]
    case 'eplerenone':
      return [
        FHIRAllergyIntolerance.create({
          reference: MedicationReference.eplerenone,
          type,
          criticality: FHIRAllergyIntoleranceCriticality.low,
        }),
      ]
    case 'lisinopril':
      return [
        FHIRAllergyIntolerance.create({
          reference: MedicationReference.lisinopril,
          type,
          criticality: FHIRAllergyIntoleranceCriticality.low,
        }),
      ]
    case 'lisinopril-anaphylaxis':
      return [
        FHIRAllergyIntolerance.create({
          reference: MedicationReference.lisinopril,
          type,
          criticality: FHIRAllergyIntoleranceCriticality.high,
        }),
      ]
    case 'losartan':
      return [
        FHIRAllergyIntolerance.create({
          reference: MedicationReference.losartan,
          type,
          criticality: FHIRAllergyIntoleranceCriticality.low,
        }),
      ]
    case 'metoprolol':
      return [
        FHIRAllergyIntolerance.create({
          reference: MedicationReference.metoprololSuccinate,
          type,
          criticality: FHIRAllergyIntoleranceCriticality.high,
        }),
      ]
    case 'sacubitril-valsartan':
      return [
        FHIRAllergyIntolerance.create({
          reference: MedicationReference.sacubitrilValsartan,
          type,
          criticality: FHIRAllergyIntoleranceCriticality.low,
        }),
      ]
    case 'sotagliflozin':
      return [
        FHIRAllergyIntolerance.create({
          reference: MedicationReference.sotagliflozin,
          type,
          criticality: FHIRAllergyIntoleranceCriticality.low,
        }),
      ]
    case 'spironolactone':
      return [
        FHIRAllergyIntolerance.create({
          reference: MedicationReference.spironolactone,
          type,
          criticality: FHIRAllergyIntoleranceCriticality.low,
        }),
      ]
    case 'valsartan':
      return [
        FHIRAllergyIntolerance.create({
          reference: MedicationReference.valsartan,
          type,
          criticality: FHIRAllergyIntoleranceCriticality.low,
        }),
      ]
    default:
      expect.fail('Unhandled case for contraindication:', field)
  }
}

interface ExpectedRecommendation {
  type: UserMedicationRecommendationType
  recommendedMedication?: MedicationReference
}

function getExpectedRecommendation(
  value: string,
): ExpectedRecommendation | undefined {
  switch (value.trim().toLowerCase()) {
    case 'no message listed':
    case 'no med listed':
      return undefined
    case 'no message, carvedilol listed':
      return {
        type: UserMedicationRecommendationType.noActionRequired,
        recommendedMedication: MedicationReference.carvedilol,
      }
    case 'no message, empagliflozin listed':
      return {
        type: UserMedicationRecommendationType.noActionRequired,
        recommendedMedication: MedicationReference.empagliflozin,
      }
    case 'no message, sacubitril-valsartan listed':
      return {
        type: UserMedicationRecommendationType.noActionRequired,
        recommendedMedication: MedicationReference.sacubitrilValsartan,
      }
    case 'no message, spironolactone listed':
      return {
        type: UserMedicationRecommendationType.noActionRequired,
        recommendedMedication: MedicationReference.spironolactone,
      }
    case 'discuss increasing bisoprolol':
      return {
        type: UserMedicationRecommendationType.improvementAvailable,
        recommendedMedication: MedicationReference.bisoprolol,
      }
    case 'discuss increasing carvedilol':
      return {
        type: UserMedicationRecommendationType.improvementAvailable,
        recommendedMedication: MedicationReference.carvedilol,
      }
    case 'discuss increasing dapagliflozin':
      return {
        type: UserMedicationRecommendationType.improvementAvailable,
        recommendedMedication: MedicationReference.dapagliflozin,
      }
    case 'discuss increasing empagliflozin':
      return {
        type: UserMedicationRecommendationType.improvementAvailable,
        recommendedMedication: MedicationReference.empagliflozin,
      }
    case 'discuss increasing eplerenone':
      return {
        type: UserMedicationRecommendationType.improvementAvailable,
        recommendedMedication: MedicationReference.eplerenone,
      }
    case 'discuss increasing lisinopril':
      return {
        type: UserMedicationRecommendationType.improvementAvailable,
        recommendedMedication: MedicationReference.lisinopril,
      }
    case 'discuss increasing losartan':
      return {
        type: UserMedicationRecommendationType.improvementAvailable,
        recommendedMedication: MedicationReference.losartan,
      }
    case 'discuss increasing metoprolol':
      return {
        type: UserMedicationRecommendationType.improvementAvailable,
        recommendedMedication: MedicationReference.metoprololSuccinate,
      }
    case 'discuss increasing sacubitril-valsartan':
      return {
        type: UserMedicationRecommendationType.improvementAvailable,
        recommendedMedication: MedicationReference.sacubitrilValsartan,
      }
    case 'discuss increasing spironolactone':
      return {
        type: UserMedicationRecommendationType.improvementAvailable,
        recommendedMedication: MedicationReference.spironolactone,
      }
    case 'discuss increasing valsartan':
      return {
        type: UserMedicationRecommendationType.improvementAvailable,
        recommendedMedication: MedicationReference.valsartan,
      }
    case 'discuss starting bisoprolol':
      return {
        type: UserMedicationRecommendationType.notStarted,
        recommendedMedication: MedicationReference.bisoprolol,
      }
    case 'discuss starting carvedilol':
      return {
        type: UserMedicationRecommendationType.notStarted,
        recommendedMedication: MedicationReference.carvedilol,
      }
    case 'discuss starting dapagliflozin':
      return {
        type: UserMedicationRecommendationType.notStarted,
        recommendedMedication: MedicationReference.dapagliflozin,
      }
    case 'discuss starting empagliflozin':
      return {
        type: UserMedicationRecommendationType.notStarted,
        recommendedMedication: MedicationReference.empagliflozin,
      }
    case 'discuss starting eplerenone':
      return {
        type: UserMedicationRecommendationType.notStarted,
        recommendedMedication: MedicationReference.eplerenone,
      }
    case 'discuss starting losartan':
      return {
        type: UserMedicationRecommendationType.notStarted,
        recommendedMedication: MedicationReference.losartan,
      }
    case 'discuss starting metoprolol':
      return {
        type: UserMedicationRecommendationType.notStarted,
        recommendedMedication: MedicationReference.metoprololSuccinate,
      }
    case 'discuss starting sacubitril-valsartan':
      return {
        type: UserMedicationRecommendationType.notStarted,
        recommendedMedication: MedicationReference.sacubitrilValsartan,
      }
    case 'discuss starting sacubitril-valsartan (more effective med)':
      return {
        type: UserMedicationRecommendationType.improvementAvailable,
        recommendedMedication: MedicationReference.sacubitrilValsartan,
      }
    case 'discuss starting sotagliflozin':
      return {
        type: UserMedicationRecommendationType.notStarted,
        recommendedMedication: MedicationReference.sotagliflozin,
      }
    case 'discuss starting spironolactone':
      return {
        type: UserMedicationRecommendationType.notStarted,
        recommendedMedication: MedicationReference.spironolactone,
      }
    case 'goal dose reached':
      return {
        type: UserMedicationRecommendationType.targetDoseReached,
      }
    case 'measure bp':
    case 'measure bb/hr':
      return {
        type: UserMedicationRecommendationType.morePatientObservationsRequired,
      }
    case 'possible personal target reached':
      return {
        type: UserMedicationRecommendationType.personalTargetDoseReached,
      }
    default:
      expect.fail('Unhandled case for expected recommendation:', value)
  }
}
