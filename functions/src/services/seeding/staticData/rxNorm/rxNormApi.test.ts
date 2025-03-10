//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { expect } from 'chai'
import { describe } from 'mocha'
import { RxNormApi } from './rxNormApi.js'

describe('RxNormApi', () => {
  const api = new RxNormApi()

  it('getAllRxTermInfo: Medication', async () => {
    const termInfo = await api.getAllRxTermInfo('20352')
    expect(termInfo).to.be.undefined
  })

  it('getAllRxTermInfo: Drug', async () => {
    const termInfo = await api.getAllRxTermInfo('200031')
    expect(termInfo).to.exist
    expect(termInfo?.displayName).to.equal('Carvedilol (Oral Pill)')
    expect(termInfo?.fullName).to.equal('carvedilol 6.25 MG Oral Tablet')
    expect(termInfo?.rxnormDoseForm).to.equal('Oral Tablet')
    expect(termInfo?.strength).to.equal('6.25 mg')
  })

  it('getRelated: constitutes', async () => {
    const related = await api.getRelated('315577', 'constitutes')
    expect(
      related.relatedGroup?.conceptGroup
        .find((group) => group.tty === 'SCD')
        ?.conceptProperties.find((props) => props.rxcui === '200031'),
    ).to.exist
  })

  it('getRelated: ingredient_of', async () => {
    const related = await api.getRelated('20352', 'ingredient_of')
    expect(
      related.relatedGroup?.conceptGroup
        .find((group) => group.tty === 'SCDC')
        ?.conceptProperties.find((props) => props.rxcui === '315577'),
    ).to.exist
  })

  it('getRxNormName', async () => {
    const name = await api.getRxNormName('20352')
    expect(name).to.equal('carvedilol')
  })
})
