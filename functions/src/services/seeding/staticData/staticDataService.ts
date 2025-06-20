//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { type CachingStrategy } from '@stanfordbdhg/myheartcounts-models'
import { z } from 'zod'
import { type DatabaseService } from '../../database/databaseService.js'
import { SeedingService } from '../seedingService.js'

export class StaticDataService extends SeedingService {
  // Properties

  private databaseService: DatabaseService

  // Constructor

  constructor(databaseService: DatabaseService) {
    super({ useIndicesAsKeys: true, path: './data/' })
    this.databaseService = databaseService
  }

  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  async updateOrganizations(strategy: CachingStrategy) {
    // No-op implementation for compatibility
    return
  }

  // Methods

  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  async updateQuestionnaires(strategy: CachingStrategy) {
    // No-op implementation - questionnaires are no longer used
    return
  }
}
