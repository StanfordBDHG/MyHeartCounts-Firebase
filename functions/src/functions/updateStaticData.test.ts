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
} from '@stanfordbdhg/engagehf-models'
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

    const medicationClasses = await env.collections.medicationClasses.get()
    expect(medicationClasses.docs).to.have.length(7)
    const medicationClassesJson = JSON.parse(
      fs.readFileSync('data/medicationClasses.json', 'utf8'),
    )
    for (const medicationClass of medicationClasses.docs) {
      expect(simplify(medicationClass.data())).to.deep.equal(
        medicationClassesJson[medicationClass.id],
      )
    }

    const medications = await env.collections.medications.get()
    expect(medications.docs).to.have.length(35)
    const medicationsJson = JSON.parse(
      fs.readFileSync('data/medications.json', 'utf8'),
    )
    for (const medication of medications.docs) {
      expect(simplify(medication.data())).to.deep.equal(
        medicationsJson[medication.id],
      )
    }

    const videoSections = await env.collections.videoSections.get()
    expect(videoSections.docs).to.have.length(4)
    const videoSectionsJson = JSON.parse(
      fs.readFileSync('data/videoSections.json', 'utf8'),
    )
    for (const videoSection of videoSections.docs) {
      const jsonVideoSection = videoSectionsJson[videoSection.id]
      const jsonVideos = jsonVideoSection.videos
      delete jsonVideoSection.videos
      expect(simplify(videoSection.data())).to.deep.equal(jsonVideoSection)

      const videos = await env.collections.videos(videoSection.id).get()
      for (const video of videos.docs) {
        expect(simplify(video.data())).to.deep.equal(jsonVideos[video.id])
      }
    }

    const organizations = await env.collections.organizations.get()
    expect(organizations.docs).to.have.length(4)
    const organizationsJson = JSON.parse(
      fs.readFileSync('data/organizations.json', 'utf8'),
    )
    for (const organization of organizations.docs) {
      expect(simplify(organization.data())).to.deep.equal(
        organizationsJson[organization.id],
      )
    }

    const questionnaires = await env.collections.questionnaires.get()
    expect(questionnaires.docs).to.have.length(1)
    const questionnairesJson = JSON.parse(
      fs.readFileSync('data/questionnaires.json', 'utf8'),
    )
    for (const questionnaire of questionnaires.docs) {
      expect(simplify(questionnaire.data())).to.deep.equal(
        questionnairesJson[questionnaire.id],
      )
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
