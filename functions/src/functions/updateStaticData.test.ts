//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import fs from 'fs'
import {
  CachingStrategy,
  LocalizedText,
  StaticDataComponent,
} from '@stanfordbdhg/myheartcounts-models'
import { expect } from 'chai'
import { it } from 'mocha'
import { _updateStaticData } from './updateStaticData.js'
import { describeWithEmulators } from '../tests/functions/testEnvironment.js'

describeWithEmulators('function: updateStaticData', (env) => {
  it('updates static data successfully', async () => {
    await _updateStaticData(env.factory, {
      only: Object.values(StaticDataComponent),
      cachingStrategy: CachingStrategy.expectCache,
    })

    const questionnaires = await env.collections.questionnaires.get()
    expect(questionnaires.docs).to.have.length(1)

    // Verify questionnaires are created with basic structure
    for (const questionnaire of questionnaires.docs) {
      const data = questionnaire.data()
      expect(data).to.have.property('resourceType', 'Questionnaire')
      expect(data).to.have.property('title').that.is.a('string')
      expect(data).to.have.property('status').that.is.a('string')
    }
  })
})

function simplify(data: unknown): unknown {
  return JSON.parse(
    JSON.stringify(data, (key, value): unknown => {
      if (value instanceof LocalizedText) {
        return value.content
      }
      return value
    }),
  )
}
