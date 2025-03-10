//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { type QuantityUnit } from '@stanfordbdhg/engagehf-models'
import { type HealthSummaryData } from '../../models/healthSummaryData.js'

export interface HealthSummaryService {
  getHealthSummaryData(
    userId: string,
    date: Date,
    weightUnit: QuantityUnit,
  ): Promise<HealthSummaryData>
}
