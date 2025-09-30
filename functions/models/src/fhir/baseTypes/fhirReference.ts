//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { z } from 'zod'
import { Lazy } from '../../helpers/lazy.js'
import { optionalish } from '../../helpers/optionalish.js'
import { SchemaConverter } from '../../helpers/schemaConverter.js'

export const fhirReferenceConverter = new Lazy(
  () =>
    new SchemaConverter({
      schema: z.object({
        reference: z.string(),
        type: optionalish(z.string()),
        display: optionalish(z.string()),
        identifier: optionalish(z.string()),
      }),
      encode: (object) => {
        const result: Record<string, unknown> = {
          reference: object.reference,
        }

        if (object.type !== undefined) result.type = object.type
        if (object.display !== undefined) result.display = object.display
        if (object.identifier !== undefined)
          result.identifier = object.identifier

        return result
      },
    }),
)

export type FHIRReference = z.output<typeof fhirReferenceConverter.value.schema>
