//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  type CachingStrategy,
  fhirQuestionnaireConverter,
  localizedTextConverter,
  organizationConverter,
  Video,
  VideoSection,
} from '@stanfordbdhg/engagehf-models'
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

  // Methods

  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  async updateOrganizations(strategy: CachingStrategy) {
    await this.databaseService.runTransaction(
      async (collections, transaction) => {
        await this.deleteCollection(collections.organizations, transaction)
        this.setCollection(
          collections.organizations,
          this.readJSONRecord(
            'organizations.json',
            organizationConverter.value.schema,
          ),
          transaction,
        )
      },
    )
  }

  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  async updateQuestionnaires(strategy: CachingStrategy) {
    await this.databaseService.runTransaction(
      async (collections, transaction) => {
        await this.deleteCollection(collections.questionnaires, transaction)
        this.setCollection(
          collections.questionnaires,
          this.readJSONArray(
            'questionnaires.json',
            fhirQuestionnaireConverter.value.schema,
          ),
          transaction,
        )
      },
    )
  }

  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  async updateVideoSections(strategy: CachingStrategy) {
    await this.databaseService.runTransaction(
      async (collections, transaction) => {
        await this.deleteCollection(collections.videoSections, transaction)
        const videoSections = this.readJSONArray(
          'videoSections.json',
          z.object({
            title: localizedTextConverter.schema,
            description: localizedTextConverter.schema,
            orderIndex: z.number(),
            videos: z
              .object({
                title: localizedTextConverter.schema,
                youtubeId: localizedTextConverter.schema,
                orderIndex: z.number(),
                description: localizedTextConverter.schema,
              })
              .array(),
          }),
        )

        let videoSectionIndex = 0
        for (const videoSection of videoSections) {
          const videoSectionId = videoSectionIndex.toString()
          transaction.set(
            collections.videoSections.doc(videoSectionId),
            new VideoSection(videoSection),
          )

          let videoIndex = 0
          for (const video of videoSection.videos) {
            const videoId = videoIndex.toString()
            transaction.set(
              collections.videos(videoSectionId).doc(videoId),
              new Video(video),
            )
            videoIndex++
          }
          videoSectionIndex++
        }
      },
    )
  }

}
