//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  advanceDateByDays,
  type FHIRAllergyIntolerance,
  FHIRAppointment,
  FHIRAppointmentStatus,
  type FHIRQuestionnaireResponse,
  type Observation,
  QuantityUnit,
  SymptomScore,
} from '@stanfordbdhg/engagehf-models'
import { type PatientService } from './patientService.js'
import { mockQuestionnaireResponse } from '../../tests/mocks/questionnaireResponse.js'
import { type Document } from '../database/databaseService.js'

/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unused-vars */

export class MockPatientService implements PatientService {
  // Properties

  private readonly startDate: Date

  // Constructor

  constructor(startDate: Date = new Date(2024, 2, 2, 12, 30)) {
    this.startDate = startDate
  }

  // Methods - Appointments

  async getEveryAppoinment(
    fromDate: Date,
    toDate: Date,
  ): Promise<Array<Document<FHIRAppointment>>> {
    return []
  }
  async getAppointments(
    userId: string,
  ): Promise<Array<Document<FHIRAppointment>>> {
    return []
  }
  async getNextAppointment(
    userId: string,
  ): Promise<Document<FHIRAppointment> | undefined> {
    return {
      id: '123',
      lastUpdate: new Date(),
      path: `users/${userId}/appointments/123`,
      content: FHIRAppointment.create({
        userId,
        status: FHIRAppointmentStatus.booked,
        created: advanceDateByDays(this.startDate, -10),
        start: advanceDateByDays(this.startDate, 1),
        durationInMinutes: 60,
      }),
    }
  }

  // Methods - Contraindications

  async getContraindications(
    userId: string,
  ): Promise<Array<Document<FHIRAllergyIntolerance>>> {
    return []
  }

  // Methods - Observations

  async getHeartRateObservations(
    userId: string,
    cutoffDate: Date,
  ): Promise<Observation[]> {
    return [
      this.heartRateObservation(79, new Date(2024, 1, 30, 12, 30)),
      this.heartRateObservation(62, new Date(2024, 1, 29, 12, 30)),
      this.heartRateObservation(77, new Date(2024, 1, 28, 12, 30)),
      this.heartRateObservation(63, new Date(2024, 1, 27, 12, 30)),
      this.heartRateObservation(61, new Date(2024, 1, 26, 12, 30)),
      this.heartRateObservation(70, new Date(2024, 1, 25, 12, 30)),
      this.heartRateObservation(67, new Date(2024, 1, 24, 12, 30)),
      this.heartRateObservation(80, new Date(2024, 1, 23, 12, 30)),
      this.heartRateObservation(65, new Date(2024, 1, 22, 12, 30)),
    ].filter((obs) => obs.date > cutoffDate)
  }

  private heartRateObservation(value: number, date: Date): Observation {
    return {
      date: date,
      value: value,
      unit: QuantityUnit.bpm,
    }
  }

  // Methods - Questionnaire Responses

  async getQuestionnaireResponses(
    userId: string,
  ): Promise<Array<Document<FHIRQuestionnaireResponse>>> {
    return [mockQuestionnaireResponse()].map((value, index) => ({
      id: index.toString(),
      lastUpdate: new Date(),
      path: `users/${userId}/questionnaireResponses/${index}`,
      content: value,
    }))
  }

  async getSymptomScores(
    userId: string,
    options?: { limit?: number },
  ): Promise<Array<Document<SymptomScore>>> {
    const values: SymptomScore[] = [
      new SymptomScore({
        questionnaireResponseId: '4',
        overallScore: 40,
        physicalLimitsScore: 50,
        socialLimitsScore: 38,
        qualityOfLifeScore: 20,
        symptomFrequencyScore: 60,
        dizzinessScore: 3,
        date: new Date(2024, 1, 22, 12, 30),
      }),
      new SymptomScore({
        questionnaireResponseId: '3',
        overallScore: 60,
        physicalLimitsScore: 58,
        socialLimitsScore: 75,
        qualityOfLifeScore: 37,
        symptomFrequencyScore: 72,
        dizzinessScore: 2,
        date: new Date(2024, 1, 13, 12, 30),
      }),
      new SymptomScore({
        questionnaireResponseId: '2',
        overallScore: 44,
        physicalLimitsScore: 50,
        socialLimitsScore: 41,
        qualityOfLifeScore: 25,
        symptomFrequencyScore: 60,
        dizzinessScore: 1,
        date: new Date(2023, 12, 28, 12, 30),
      }),
      new SymptomScore({
        questionnaireResponseId: '1',
        overallScore: 75,
        physicalLimitsScore: 58,
        socialLimitsScore: 75,
        qualityOfLifeScore: 60,
        symptomFrequencyScore: 80,
        dizzinessScore: 1,
        date: new Date(2023, 12, 13, 12, 30),
      }),
    ]
    return values.map((value, index) => ({
      id: index.toString(),
      lastUpdate: new Date(),
      path: `users/${userId}/symptomScores/${index}`,
      content: value,
    }))
  }

  async getLatestSymptomScore(
    userId: string,
  ): Promise<Document<SymptomScore> | undefined> {
    return (await this.getSymptomScores(userId, { limit: 1 })).at(0)
  }

  async updateSymptomScore(
    userId: string,
    symptomScoreId: string,
    symptomScore: SymptomScore | undefined,
  ): Promise<void> {
    return
  }
}
