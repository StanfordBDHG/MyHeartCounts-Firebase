//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { z } from 'zod'
import { fhirQuantityConverter } from './fhirQuantity.js'
import { Lazy } from '../../helpers/lazy.js'
import { optionalish } from '../../helpers/optionalish.js'
import { SchemaConverter } from '../../helpers/schemaConverter.js'

export const fhirRatioConverter = new Lazy(
  () =>
    new SchemaConverter({
      schema: z.object({
        numerator: optionalish(
          z.lazy(() => fhirQuantityConverter.value.schema),
        ),
        denominator: optionalish(
          z.lazy(() => fhirQuantityConverter.value.schema),
        ),
      }),
      encode: (object) => ({
        numerator:
          object.numerator ?
            fhirQuantityConverter.value.encode(object.numerator)
          : null,
        denominator:
          object.denominator ?
            fhirQuantityConverter.value.encode(object.denominator)
          : null,
      }),
    }),
)

export type FHIRRatio = z.output<typeof fhirRatioConverter.value.schema>
