//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//
import { type HealthSummaryData } from '../../models/healthSummaryData.js'
import { MockHealthSummaryService } from '../../services/healthSummary/healthSummaryService.mock.js'

export function mockHealthSummaryData(
  userId: string,
  startDate: Date = new Date(2024, 2, 2, 12, 30),
): Promise<HealthSummaryData> {
  const service = new MockHealthSummaryService()
  return service.getHealthSummaryData(userId, startDate)
}
