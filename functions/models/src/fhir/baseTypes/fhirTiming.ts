//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { z } from 'zod'
import { fhirCodeableConceptConverter } from './fhirCodeableConcept.js'
import { Lazy } from '../../helpers/lazy.js'
import { optionalish } from '../../helpers/optionalish.js'
import { SchemaConverter } from '../../helpers/schemaConverter.js'

export const fhirTimingRepeatConverter = new Lazy(
  () =>
    new SchemaConverter({
      schema: z.object({
        frequency: optionalish(z.number()),
        period: optionalish(z.number()),
        periodUnit: optionalish(z.string()),
        timeOfDay: optionalish(z.string().array()),
      }),
      encode: (object) => ({
        frequency: object.frequency ?? null,
        period: object.period ?? null,
        periodUnit: object.periodUnit ?? null,
        timeOfDay: object.timeOfDay ?? null,
      }),
    }),
)

export const fhirTimingConverter = new Lazy(
  () =>
    new SchemaConverter({
      schema: z.object({
        repeat: optionalish(
          z.lazy(() => fhirTimingRepeatConverter.value.schema),
        ),
        code: optionalish(
          z.lazy(() => fhirCodeableConceptConverter.value.schema),
        ),
      }),
      encode: (object) => ({
        repeat:
          object.repeat ?
            fhirTimingRepeatConverter.value.encode(object.repeat)
          : null,
        code:
          object.code ?
            fhirCodeableConceptConverter.value.encode(object.code)
          : null,
      }),
    }),
)

export type FHIRTiming = z.output<typeof fhirTimingConverter.value.schema>
