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

export const medicationClassConverter = new Lazy(
  () =>
    new SchemaConverter({
      schema: z
        .object({
          name: localizedTextConverter.schema,
          videoPath: z.string(),
        })
        .transform((content) => new MedicationClass(content)),
      encode: (object) => ({
        name: localizedTextConverter.encode(object.name),
        videoPath: object.videoPath,
      }),
    }),
)

export class MedicationClass {
  // Properties

  readonly name: LocalizedText
  readonly videoPath: string

  // Constructor

  constructor(input: { name: LocalizedText; videoPath: string }) {
    this.name = input.name
    this.videoPath = input.videoPath
  }
}
