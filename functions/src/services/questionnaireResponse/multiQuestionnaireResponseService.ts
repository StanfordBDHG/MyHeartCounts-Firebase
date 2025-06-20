//
// This source file is part of the MyHeartCounts-Firebase project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import type { FHIRQuestionnaireResponse } from '@stanfordbdhg/myheartcounts-models'
import type { Document } from '../database/databaseService.js'
import { QuestionnaireResponseService } from './questionnaireResponseService.js'

export class MultiQuestionnaireResponseService extends QuestionnaireResponseService {
  private readonly components: QuestionnaireResponseService[]

  constructor(components: QuestionnaireResponseService[]) {
    super()
    this.components = components
  }

  async handle(
    userId: string,
    response: Document<FHIRQuestionnaireResponse>,
    options: { isNew: boolean },
  ): Promise<boolean> {
    for (const component of this.components) {
      const handled = await component.handle(userId, response, options)
      if (handled) return true
    }
    return false
  }
}