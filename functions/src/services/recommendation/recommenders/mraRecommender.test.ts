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
  FHIRMedicationRequest,
  type MedicationClassReference,
  MedicationReference,
  QuantityUnit,
  UserMedicationRecommendationType,
} from '@stanfordbdhg/engagehf-models'
import { expect } from 'chai'
import { describe, it } from 'mocha'
import { MraRecommender } from './mraRecommender.js'
import { type Recommender } from './recommender.js'
import { type MedicationRequestContext } from '../../../models/medicationRequestContext.js'
import { MockContraindicationService } from '../../../tests/mocks/contraindicationService.js'
import { mockRecommendationVitals } from '../../../tests/mocks/recommendationVitals.js'
import { cleanupMocks, setupMockFirebase } from '../../../tests/setup.js'
import { ContraindicationCategory } from '../../contraindication/contraindicationService.js'
import { getServiceFactory } from '../../factory/getServiceFactory.js'
import { type MedicationService } from '../../medication/medicationService.js'
import { type RecommendationVitals } from '../recommendationService.js'

describe('MraRecommender', () => {
  let medicationContraindication: (
    reference: MedicationReference,
  ) => ContraindicationCategory
  let medicationClassContraindication: (
    reference: MedicationClassReference,
  ) => ContraindicationCategory

  const recommender: Recommender = new MraRecommender(
    new MockContraindicationService(
      (_, reference) => medicationContraindication(reference),
      (_, reference) => medicationClassContraindication(reference),
      (_, medicationReferences) => medicationReferences.at(0),
    ),
  )
  let vitals: RecommendationVitals
  let medicationService: MedicationService

  before(async () => {
    setupMockFirebase()
    const factory = getServiceFactory()
    const staticDataService = factory.staticData()
    await staticDataService.updateMedicationClasses(CachingStrategy.expectCache)
    await staticDataService.updateMedications(CachingStrategy.expectCache)
    medicationService = factory.medication()
  })

  beforeEach(() => {
    vitals = mockRecommendationVitals({
      countBloodPressureBelow85: 0,
      medianSystolicBloodPressure: 110,
      medianHeartRate: 70,
      potassium: 4,
      creatinine: 1,
      eGfr: 60,
    })
    medicationContraindication = (_) => ContraindicationCategory.none
    medicationClassContraindication = (_) => ContraindicationCategory.none
  })

  after(() => {
    cleanupMocks()
  })

  describe('No treatment', () => {
    it("doesn't recommend MRA if allergy exists", () => {
      medicationContraindication = (_) =>
        ContraindicationCategory.severeAllergyIntolerance
      medicationClassContraindication = (_) =>
        ContraindicationCategory.severeAllergyIntolerance

      const result = recommender.compute({
        requests: [],
        contraindications: [],
        vitals: vitals,
      })
      expect(result).to.have.length(0)
    })

    it('shows spironolactone when physician-listed contraindication exists', () => {
      medicationContraindication = (_) =>
        ContraindicationCategory.clinicianListed
      medicationClassContraindication = (_) =>
        ContraindicationCategory.clinicianListed

      const result = recommender.compute({
        requests: [],
        contraindications: [],
        vitals: vitals,
      })
      expect(result).to.have.length(1)
      expect(result.at(0)).to.deep.equal({
        currentMedication: [],
        recommendedMedication: MedicationReference.spironolactone,
        type: UserMedicationRecommendationType.noActionRequired,
      })
    })

    it('shows spironolactone when creatinine value is too bad', () => {
      vitals.creatinine = {
        date: new Date(),
        value: 3,
        unit: QuantityUnit.mg_dL,
      }
      const result = recommender.compute({
        requests: [],
        contraindications: [],
        vitals: vitals,
      })
      expect(result).to.have.length(1)
      expect(result.at(0)).to.deep.equal({
        currentMedication: [],
        recommendedMedication: MedicationReference.spironolactone,
        type: UserMedicationRecommendationType.noActionRequired,
      })
    })

    it('shows spironolactone if potassium value is too bad', () => {
      vitals.potassium = {
        date: new Date(),
        value: 6,
        unit: QuantityUnit.mEq_L,
      }
      const result = recommender.compute({
        requests: [],
        contraindications: [],
        vitals: vitals,
      })
      expect(result).to.have.length(1)
      expect(result.at(0)).to.deep.equal({
        currentMedication: [],
        recommendedMedication: MedicationReference.spironolactone,
        type: UserMedicationRecommendationType.noActionRequired,
      })
    })

    it('recommends spironolactone correctly', () => {
      const result = recommender.compute({
        requests: [],
        contraindications: [],
        vitals: vitals,
      })
      expect(result).to.have.length(1)
      expect(result.at(0)).to.deep.equal({
        currentMedication: [],
        recommendedMedication: MedicationReference.spironolactone,
        type: UserMedicationRecommendationType.notStarted,
      })
    })
  })

  describe('Existing treatment: Eplerenone', () => {
    let contextBelowTarget: MedicationRequestContext
    before(async () => {
      const request = FHIRMedicationRequest.create({
        drugReference: DrugReference.eplerenone25,
        frequencyPerDay: 1,
        quantity: 1,
      })
      contextBelowTarget = await medicationService.getContext({
        id: 'someMedicationRequest',
        path: 'users/mockUser/medicationRequests/someMedicationRequest',
        lastUpdate: new Date(),
        content: request,
      })
    })

    it('states that target dose is reached', async () => {
      const request = FHIRMedicationRequest.create({
        drugReference: DrugReference.eplerenone25,
        frequencyPerDay: 2,
        quantity: 1,
      })
      const contextAtTarget = await medicationService.getContext({
        id: 'someMedicationRequest',
        path: 'users/mockUser/medicationRequests/someMedicationRequest',
        lastUpdate: new Date(),
        content: request,
      })
      const result = recommender.compute({
        requests: [contextAtTarget],
        contraindications: [],
        vitals: vitals,
      })
      expect(result).to.have.length(1)
      expect(result.at(0)).to.deep.equal({
        currentMedication: [contextAtTarget],
        recommendedMedication: undefined,
        type: UserMedicationRecommendationType.targetDoseReached,
      })
    })

    it('requests newer lab values when date is too old for potassium', () => {
      vitals.potassium = {
        unit: QuantityUnit.mEq_L,
        value: 4,
        date: new Date('2021-01-01'),
      }
      const result = recommender.compute({
        requests: [contextBelowTarget],
        contraindications: [],
        vitals: vitals,
      })
      expect(result).to.have.length(1)
      expect(result.at(0)).to.deep.equal({
        currentMedication: [contextBelowTarget],
        recommendedMedication: undefined,
        type: UserMedicationRecommendationType.moreLabObservationsRequired,
      })
    })

    it('requests newer lab values when date is too old for creatinine', () => {
      vitals.creatinine = {
        unit: QuantityUnit.mg_dL,
        value: 2,
        date: new Date('2021-01-01'),
      }
      const result = recommender.compute({
        requests: [contextBelowTarget],
        contraindications: [],
        vitals: vitals,
      })
      expect(result).to.have.length(1)
      expect(result.at(0)).to.deep.equal({
        currentMedication: [contextBelowTarget],
        recommendedMedication: undefined,
        type: UserMedicationRecommendationType.moreLabObservationsRequired,
      })
    })

    it('detects personal target when creatinine is too high', () => {
      vitals.creatinine = {
        unit: QuantityUnit.mg_dL,
        value: 3,
        date: new Date(),
      }
      const result = recommender.compute({
        requests: [contextBelowTarget],
        contraindications: [],
        vitals: vitals,
      })
      expect(result).to.have.length(1)
      expect(result.at(0)).to.deep.equal({
        currentMedication: [contextBelowTarget],
        recommendedMedication: undefined,
        type: UserMedicationRecommendationType.personalTargetDoseReached,
      })
    })

    it('detects personal target when potassium is too high', () => {
      vitals.potassium = {
        unit: QuantityUnit.mEq_L,
        value: 6,
        date: new Date(),
      }
      const result = recommender.compute({
        requests: [contextBelowTarget],
        contraindications: [],
        vitals: vitals,
      })
      expect(result).to.have.length(1)
      expect(result.at(0)).to.deep.equal({
        currentMedication: [contextBelowTarget],
        recommendedMedication: undefined,
        type: UserMedicationRecommendationType.personalTargetDoseReached,
      })
    })

    it('recommends increase', () => {
      const result = recommender.compute({
        requests: [contextBelowTarget],
        contraindications: [],
        vitals: vitals,
      })
      expect(result).to.have.length(1)
      expect(result.at(0)).to.deep.equal({
        currentMedication: [contextBelowTarget],
        recommendedMedication: undefined,
        type: UserMedicationRecommendationType.improvementAvailable,
      })
    })
  })
})
