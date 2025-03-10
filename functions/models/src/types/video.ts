//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { z } from 'zod'
import { localizedTextConverter, type LocalizedText } from './localizedText.js'
import { Lazy } from '../helpers/lazy.js'
import { SchemaConverter } from '../helpers/schemaConverter.js'

export const videoConverter = new Lazy(
  () =>
    new SchemaConverter({
      schema: z
        .object({
          title: localizedTextConverter.schema,
          youtubeId: localizedTextConverter.schema,
          orderIndex: z.number(),
          description: localizedTextConverter.schema,
        })
        .transform((content) => new Video(content)),
      encode: (object) => ({
        title: localizedTextConverter.encode(object.title),
        youtubeId: localizedTextConverter.encode(object.youtubeId),
        orderIndex: object.orderIndex,
        description: localizedTextConverter.encode(object.description),
      }),
    }),
)

export class Video {
  // Properties

  readonly title: LocalizedText
  readonly youtubeId: LocalizedText
  readonly orderIndex: number
  readonly description: LocalizedText

  // Constructor

  constructor(input: {
    title: LocalizedText
    youtubeId: LocalizedText
    orderIndex: number
    description: LocalizedText
  }) {
    this.title = input.title
    this.youtubeId = input.youtubeId
    this.orderIndex = input.orderIndex
    this.description = input.description
  }
}
