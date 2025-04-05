//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  type Observation,
  type QuantityUnit,
  type FHIRAllergyIntolerance,
  type FHIRAppointment,
  type FHIRQuestionnaireResponse,
  type SymptomScore,
} from '@stanfordbdhg/engagehf-models'
import { type Document } from '../database/databaseService.js'

export interface PatientService {
  // Appointments

  getEveryAppoinment(
    fromDate: Date,
    toDate: Date,
  ): Promise<Array<Document<FHIRAppointment>>>

  getAppointments(userId: string): Promise<Array<Document<FHIRAppointment>>>
  getNextAppointment(
    userId: string,
  ): Promise<Document<FHIRAppointment> | undefined>

  // Contraindications

  getContraindications(
    userId: string,
  ): Promise<Array<Document<FHIRAllergyIntolerance>>>

  // Observations

  // Only heart rate observations are implemented
  getHeartRateObservations(
    userId: string,
    cutoffDate: Date,
  ): Promise<Observation[]>

  // Questionnaire Responses

  getQuestionnaireResponses(
    userId: string,
  ): Promise<Array<Document<FHIRQuestionnaireResponse>>>
  getSymptomScores(
    userId: string,
    options?: { limit?: number },
  ): Promise<Array<Document<SymptomScore>>>
  getLatestSymptomScore(
    userId: string,
  ): Promise<Document<SymptomScore> | undefined>

  updateSymptomScore(
    userId: string,
    symptomScoreId: string,
    symptomScore: SymptomScore | undefined,
  ): Promise<void>
}
