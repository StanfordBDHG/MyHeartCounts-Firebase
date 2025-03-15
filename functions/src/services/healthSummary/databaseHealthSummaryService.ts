//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  advanceDateByDays,
  type QuantityUnit,
} from '@stanfordbdhg/engagehf-models'
import { type HealthSummaryService } from './healthSummaryService.js'
import {
  HealthSummaryData,
  type HealthSummaryVitals,
} from '../../models/healthSummaryData.js'
import { type PatientService } from '../patient/patientService.js'
import { type UserService } from '../user/userService.js'

export class DefaultHealthSummaryService implements HealthSummaryService {
  // Properties

  private readonly patientService: PatientService
  private readonly userService: UserService

  // Constructor

  constructor(patientService: PatientService, userService: UserService) {
    this.patientService = patientService
    this.userService = userService
  }

  // Methods

  async getHealthSummaryData(
    userId: string,
    date: Date,
    weightUnit: QuantityUnit,
  ): Promise<HealthSummaryData> {
    const [auth, patient, nextAppointment, symptomScores, vitals] =
      await Promise.all([
        this.userService.getAuth(userId),
        this.userService.getUser(userId),
        this.patientService.getNextAppointment(userId),
        this.patientService.getSymptomScores(userId, { limit: 5 }),
        this.getVitals(userId, advanceDateByDays(date, -14), weightUnit),
      ])

    const providerName =
      patient?.content.providerName ??
      (patient?.content.clinician ?
        (await this.userService.getAuth(patient.content.clinician)).displayName
      : undefined)

    return new HealthSummaryData({
      name: auth.displayName,
      dateOfBirth: patient?.content.dateOfBirth,
      providerName: providerName,
      nextAppointment: nextAppointment?.content,
      vitals: vitals,
      symptomScores: symptomScores.map((doc) => doc.content),
      now: date,
    })
  }

  // Helpers

  private async getVitals(
    userId: string,
    cutoffDate: Date,
    weightUnit: QuantityUnit,
  ): Promise<HealthSummaryVitals> {
    const [
      [systolicBloodPressure, diastolicBloodPressure],
      heartRate,
      bodyWeight,
      dryWeight,
    ] = await Promise.all([
      this.patientService.getBloodPressureObservations(userId, cutoffDate),
      this.patientService.getHeartRateObservations(userId, cutoffDate),
      this.patientService.getBodyWeightObservations(
        userId,
        weightUnit,
        cutoffDate,
      ),
      this.patientService.getMostRecentDryWeightObservation(userId, weightUnit),
    ])
    return {
      systolicBloodPressure: systolicBloodPressure,
      diastolicBloodPressure: diastolicBloodPressure,
      heartRate: heartRate,
      bodyWeight: bodyWeight,
      dryWeight: dryWeight,
    }
  }
}
