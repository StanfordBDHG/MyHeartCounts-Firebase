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
      encode: (object) => ({
        reference: object.reference,
        type: object.type ?? null,
        display: object.display ?? null,
        identifier: object.identifier ?? null,
      }),
    }),
)

export type FHIRReference = z.output<typeof fhirReferenceConverter.value.schema>
