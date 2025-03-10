//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { z } from 'zod'
import { SchemaConverter } from '../helpers/schemaConverter.js'

export const localizedTextConverter = new SchemaConverter({
  schema: z
    .string()
    .or(z.record(z.string()))
    .transform((content) => new LocalizedText(content)),
  encode: (object) => object.content,
})

export class LocalizedText {
  // Properties

  readonly content: string | Record<string, string>

  // Constructor

  constructor(input: string | Record<string, string>) {
    this.content = input
  }

  // Methods

  localize(...languages: string[]): string {
    if (typeof this.content === 'string') return this.content

    for (const language of [...languages, 'en-US']) {
      const exactMatch = this.content[language]
      if (exactMatch) return exactMatch

      const languagePrefix = language.split(/-|_/).at(0)
      if (languagePrefix) {
        const prefixMatch = this.content[languagePrefix]
        if (prefixMatch) return prefixMatch
      }
    }

    return Object.values(this.content).at(0) ?? ''
  }
}
