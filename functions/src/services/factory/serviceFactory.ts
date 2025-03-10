//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { type AuthData } from 'firebase-functions/v2/tasks'
import { type Credential } from '../credential/credential.js'
import { type HealthSummaryService } from '../healthSummary/healthSummaryService.js'
import { type HistoryService } from '../history/historyService.js'
import { type MedicationService } from '../medication/medicationService.js'
import { type MessageService } from '../message/messageService.js'
import { type PatientService } from '../patient/patientService.js'
import { type RecommendationService } from '../recommendation/recommendationService.js'
import { type DebugDataService } from '../seeding/debugData/debugDataService.js'
import { type StaticDataService } from '../seeding/staticData/staticDataService.js'
import { type SymptomScoreCalculator } from '../symptomScore/symptomScoreCalculator.js'
import { type TriggerService } from '../trigger/triggerService.js'
import { type UserService } from '../user/userService.js'

export interface ServiceFactory {
  // Users

  credential(authData: AuthData | undefined): Credential
  user(): UserService

  // Data

  medication(): MedicationService
  debugData(): DebugDataService
  staticData(): StaticDataService
  history(): HistoryService

  // Patients

  healthSummary(): HealthSummaryService
  patient(): PatientService
  recommendation(): RecommendationService
  symptomScore(): SymptomScoreCalculator

  // Trigger

  message(): MessageService
  trigger(): TriggerService
}
