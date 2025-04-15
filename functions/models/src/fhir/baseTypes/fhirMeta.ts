//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { z } from 'zod'
import { fhirCodingConverter } from './fhirCoding.js'
import { dateConverter } from '../../helpers/dateConverter.js'
import { optionalish } from '../../helpers/optionalish.js'
import { SchemaConverter } from '../../helpers/schemaConverter.js'

export const fhirMetaConverter = new SchemaConverter({
  schema: z.object({
    versionId: optionalish(z.string()),
    lastUpdated: optionalish(dateConverter.schema),
    profile: optionalish(z.string().array()),
    security: optionalish(
      z.lazy(() => fhirCodingConverter.value.schema).array(),
    ),
    tag: optionalish(z.lazy(() => fhirCodingConverter.value.schema).array()),
  }),
  encode: (object) => ({
    versionId: object.versionId ?? null,
    lastUpdated:
      object.lastUpdated ? dateConverter.encode(object.lastUpdated) : null,
    profile: object.profile ?? null,
    security: object.security?.map(fhirCodingConverter.value.encode) ?? null,
    tag: object.tag?.map(fhirCodingConverter.value.encode) ?? null,
  }),
})

export type FHIRMeta = z.output<typeof fhirMetaConverter.schema>
