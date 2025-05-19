//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  FHIRQuestionnaireResponse,
  type SymptomQuestionnaireResponse,
} from '@stanfordbdhg/myheartcounts-models'
import { expect } from 'chai'
import { describe } from 'mocha'

describe('FHIRQuestionnaireResponse', () => {
  it('decodes an encoded questionnaire response', () => {
    const questionnaireResponse: SymptomQuestionnaireResponse = {
      questionnaire:
        'http://spezi.health/fhir/questionnaire/9528ccc2-d1be-4c4c-9c3c-19f78e51ec19',
      questionnaireResponse: 'questionnaireResponse',
      date: new Date(),
      answer1a: 1,
      answer1b: 2,
      answer1c: 4,
      answer2: 2,
      answer3: 1,
      answer4: 2,
      answer5: 3,
      answer6: 4,
      answer7: 2,
      answer8a: 1,
      answer8b: 2,
      answer8c: 1,
      answer9: 3,
    }

    const encoded = FHIRQuestionnaireResponse.create(questionnaireResponse)
    expect(encoded.symptomQuestionnaireResponse).to.deep.equal(
      questionnaireResponse,
    )
  })
})
