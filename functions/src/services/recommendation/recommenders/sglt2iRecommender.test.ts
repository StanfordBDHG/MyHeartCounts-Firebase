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
  type SymptomScore,
  UserMedicationRecommendationType,
} from '@stanfordbdhg/engagehf-models'
import { expect } from 'chai'
import { describe, it } from 'mocha'
import { type Recommender } from './recommender.js'
import { Sglt2iRecommender } from './sglt2iRecommender.js'
import { type MedicationRequestContext } from '../../../models/medicationRequestContext.js'
import { MockContraindicationService } from '../../../tests/mocks/contraindicationService.js'
import { mockHealthSummaryData } from '../../../tests/mocks/healthSummaryData.js'
import { mockRecommendationVitals } from '../../../tests/mocks/recommendationVitals.js'
import { cleanupMocks, setupMockFirebase } from '../../../tests/setup.js'
import { ContraindicationCategory } from '../../contraindication/contraindicationService.js'
import { getServiceFactory } from '../../factory/getServiceFactory.js'
import { type MedicationService } from '../../medication/medicationService.js'
import { type RecommendationVitals } from '../recommendationService.js'

describe('Sglt2iRecommender', () => {
  let medicationContraindication: (
    reference: MedicationReference,
  ) => ContraindicationCategory
  let medicationClassContraindication: (
    reference: MedicationClassReference,
  ) => ContraindicationCategory

  const recommender: Recommender = new Sglt2iRecommender(
    new MockContraindicationService(
      (_, reference) => medicationContraindication(reference),
      (_, reference) => medicationClassContraindication(reference),
      (_, medicationReferences) => medicationReferences.at(0),
    ),
  )
  let vitals: RecommendationVitals
  let symptomScore: SymptomScore | undefined
  let medicationService: MedicationService

  before(async () => {
    setupMockFirebase()
    const factory = getServiceFactory()
    const staticDataService = factory.staticData()
    await staticDataService.updateMedicationClasses(CachingStrategy.expectCache)
    await staticDataService.updateMedications(CachingStrategy.expectCache)
    medicationService = factory.medication()
  })

  beforeEach(async () => {
    symptomScore = (
      await mockHealthSummaryData('', new Date())
    ).symptomScores.at(-1)
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
    it('recommends no treatment when allergies exist', () => {
      medicationContraindication = (_) =>
        ContraindicationCategory.allergyIntolerance
      medicationClassContraindication = (_) =>
        ContraindicationCategory.allergyIntolerance
      const result = recommender.compute({
        requests: [],
        contraindications: [],
        latestDizzinessScore: symptomScore?.dizzinessScore,
        vitals: vitals,
      })
      expect(result).to.have.length(0)
    })

    it('recommends no treatment when eGFR is too low', () => {
      vitals.estimatedGlomerularFiltrationRate = {
        date: new Date(),
        unit: QuantityUnit.mL_min_173m2,
        value: 19,
      }
      const result = recommender.compute({
        requests: [],
        contraindications: [],
        latestDizzinessScore: symptomScore?.dizzinessScore,
        vitals: vitals,
      })
      expect(result).to.have.length(0)
    })

    it('shows empagliflozin when clinician-listed contraindications exist', () => {
      medicationContraindication = (_) =>
        ContraindicationCategory.clinicianListed
      medicationClassContraindication = (_) =>
        ContraindicationCategory.clinicianListed

      const result = recommender.compute({
        requests: [],
        contraindications: [],
        latestDizzinessScore: symptomScore?.dizzinessScore,
        vitals: vitals,
      })
      expect(result).to.have.length(1)
      expect(result.at(0)).to.deep.equal({
        currentMedication: [],
        recommendedMedication: MedicationReference.empagliflozin,
        type: UserMedicationRecommendationType.noActionRequired,
      })
    })

    it('requests more blood pressure observations', () => {
      vitals.systolicBloodPressure = vitals.systolicBloodPressure.slice(0, 2)
      const result = recommender.compute({
        requests: [],
        contraindications: [],
        latestDizzinessScore: symptomScore?.dizzinessScore,
        vitals: vitals,
      })
      expect(result).to.have.length(1)
      expect(result.at(0)).to.deep.equal({
        currentMedication: [],
        recommendedMedication: MedicationReference.empagliflozin,
        type: UserMedicationRecommendationType.morePatientObservationsRequired,
      })
    })

    it('shows empagliflozin when median systolic is too low', () => {
      vitals.systolicBloodPressure.forEach((observation) => {
        observation.value = 99
      })
      const result = recommender.compute({
        requests: [],
        contraindications: [],
        latestDizzinessScore: symptomScore?.dizzinessScore,
        vitals: vitals,
      })
      expect(result).to.have.length(1)
      expect(result.at(0)).to.deep.equal({
        currentMedication: [],
        recommendedMedication: MedicationReference.empagliflozin,
        type: UserMedicationRecommendationType.noActionRequired,
      })
    })

    it('recommends empagliflozin', () => {
      const result = recommender.compute({
        requests: [],
        contraindications: [],
        latestDizzinessScore: symptomScore?.dizzinessScore,
        vitals: vitals,
      })
      expect(result).to.have.length(1)
      expect(result.at(0)).to.deep.equal({
        currentMedication: [],
        recommendedMedication: MedicationReference.empagliflozin,
        type: UserMedicationRecommendationType.notStarted,
      })
    })
  })

  describe('On Sotagliflozin', () => {
    let contextBelowTarget: MedicationRequestContext
    before(async () => {
      const request = FHIRMedicationRequest.create({
        drugReference: DrugReference.sotagliflozin200,
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

    it('detects target dose', async () => {
      const request = FHIRMedicationRequest.create({
        drugReference: DrugReference.sotagliflozin200,
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
        latestDizzinessScore: symptomScore?.dizzinessScore,
        vitals: vitals,
      })
      expect(result).to.have.length(1)
      expect(result.at(0)).to.deep.equal({
        currentMedication: [contextAtTarget],
        recommendedMedication: undefined,
        type: UserMedicationRecommendationType.targetDoseReached,
      })
    })

    it('requests more blood pressure observations', () => {
      vitals.systolicBloodPressure = vitals.systolicBloodPressure.slice(0, 2)
      const result = recommender.compute({
        requests: [contextBelowTarget],
        contraindications: [],
        latestDizzinessScore: symptomScore?.dizzinessScore,
        vitals: vitals,
      })
      expect(result).to.have.length(1)
      expect(result.at(0)).to.deep.equal({
        currentMedication: [contextBelowTarget],
        recommendedMedication: undefined,
        type: UserMedicationRecommendationType.morePatientObservationsRequired,
      })
    })

    it('detects personal target reached', () => {
      vitals.systolicBloodPressure.forEach((observation) => {
        observation.value = 99
      })
      const result = recommender.compute({
        requests: [contextBelowTarget],
        contraindications: [],
        latestDizzinessScore: symptomScore?.dizzinessScore,
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
        latestDizzinessScore: symptomScore?.dizzinessScore,
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
