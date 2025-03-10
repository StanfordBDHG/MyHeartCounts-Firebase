//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { LocalizedText, MedicationClass } from '@stanfordbdhg/engagehf-models'
import { expect } from 'chai'
import { describe, it } from 'mocha'
import {
  type MedicationClassSpecification,
  RxNormService,
} from './rxNormService.js'

describe('RxNormService', () => {
  const service = new RxNormService()

  it('builds collections', async () => {
    const medicationClasses = new Map<string, MedicationClass>()
    medicationClasses.set(
      '0',
      new MedicationClass({
        name: new LocalizedText('Beta blockers'),
        videoPath: 'videoSections/1/videos/1',
      }),
    )
    const specification: MedicationClassSpecification = {
      key: '0',
      medications: [
        {
          code: '20352',
          brandNames: ['Coreg'],
          minimumDailyDose: {
            drug: '200031',
            frequency: 1,
            quantity: 1,
          },
          targetDailyDose: {
            drug: '200033',
            frequency: 1,
            quantity: 1,
          },
          drugs: ['200031', '200033'],
        },
      ],
    }

    const result = await service.buildFHIRCollections(medicationClasses, [
      specification,
    ])
    const carvedilol = result.medications['20352']
    expect(carvedilol).to.exist
    expect(carvedilol.brandNames).to.have.length(1)
    expect(carvedilol.brandNames.at(0)).to.equal('Coreg')

    const carvedilol6_25 = result.drugs['20352']['200031']
    expect(carvedilol6_25).to.exist
    expect(
      carvedilol6_25.code?.coding?.find((coding) => coding.code === '200031'),
    ).to.exist
    expect(
      carvedilol6_25.ingredient?.find((ingredient) =>
        ingredient.itemCodeableConcept?.coding?.some(
          (coding) => coding.code === '20352',
        ),
      ),
    )

    const carvedilol25 = result.drugs['20352']['200033']
    expect(carvedilol25).to.exist
    expect(
      carvedilol25.code?.coding?.find((coding) => coding.code === '200033'),
    ).to.exist
    expect(
      carvedilol25.ingredient?.find((ingredient) =>
        ingredient.itemCodeableConcept?.coding?.some(
          (coding) => coding.code === '20352',
        ),
      ),
    )
  })
})
