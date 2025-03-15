//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { CachingStrategy } from '@stanfordbdhg/engagehf-models'
import { expect } from 'chai'
import admin from 'firebase-admin'
import { type Firestore } from 'firebase-admin/firestore'
import { type StaticDataService } from './staticDataService.js'
import { cleanupMocks, setupMockFirebase } from '../../../tests/setup.js'
import { TestFlags } from '../../../tests/testFlags.js'
import { getServiceFactory } from '../../factory/getServiceFactory.js'

describe('StaticDataService', () => {
  let firestore: Firestore
  let staticDataService: StaticDataService

  before(() => {
    setupMockFirebase()
    firestore = admin.firestore()
    staticDataService = getServiceFactory().staticData()
  })

  after(() => {
    cleanupMocks()
  })

  it('actually creates organizations', async () => {
    const organizations = await firestore.collection('organizations').get()
    expect(organizations.size).to.equal(0)

    await staticDataService.updateOrganizations(CachingStrategy.expectCache)

    const updatedOrganizations = await firestore
      .collection('organizations')
      .get()
    expect(updatedOrganizations.size).to.be.greaterThan(0)
  })

  it('actually creates questionnaires', async () => {
    const questionnaires = await firestore.collection('questionnaires').get()
    expect(questionnaires.size).to.equal(0)

    await staticDataService.updateQuestionnaires(CachingStrategy.expectCache)

    const updatedQuestionnaires = await firestore
      .collection('questionnaires')
      .get()
    expect(updatedQuestionnaires.size).to.be.greaterThan(0)
  })

  it('actually creates videoSections', async () => {
    const videoSections = await firestore.collection('videoSections').get()
    expect(videoSections.size).to.equal(0)

    await staticDataService.updateVideoSections(CachingStrategy.expectCache)

    const updatedVideoSections = await firestore
      .collection('videoSections')
      .get()
    expect(updatedVideoSections.size).to.be.greaterThan(0)
  })
})
