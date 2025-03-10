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

export const videoSectionConverter = new Lazy(
  () =>
    new SchemaConverter({
      schema: z
        .object({
          title: localizedTextConverter.schema,
          description: localizedTextConverter.schema,
          orderIndex: z.number(),
        })
        .transform((values) => new VideoSection(values)),
      encode: (object) => ({
        title: localizedTextConverter.encode(object.title),
        description: localizedTextConverter.encode(object.description),
        orderIndex: object.orderIndex,
      }),
    }),
)

export class VideoSection {
  // Properties

  readonly title: LocalizedText
  readonly description: LocalizedText
  readonly orderIndex: number

  // Constructor

  constructor(input: {
    title: LocalizedText
    description: LocalizedText
    orderIndex: number
  }) {
    this.title = input.title
    this.description = input.description
    this.orderIndex = input.orderIndex
  }
}
