//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { z } from 'zod'
import {
  fhirCodeableConceptConverter,
  type FHIRCodeableConcept,
} from './fhirCodeableConcept.js'
import { type FHIRCoding } from './fhirCoding.js'
import { type FHIRMeta, fhirMetaConverter } from './fhirMeta.js'
import { fhirQuantityConverter } from './fhirQuantity.js'
import { fhirReferenceConverter } from './fhirReference.js'
import { optionalish } from '../../helpers/optionalish.js'
import { SchemaConverter } from '../../helpers/schemaConverter.js'

const fhirExtensionBaseConverter = new SchemaConverter({
  schema: z.object({
    url: z.string(),
    valueQuantities: optionalish(
      z.lazy(() => fhirQuantityConverter.value.schema).array(),
    ),
    valueReference: optionalish(
      z.lazy(() => fhirReferenceConverter.value.schema),
    ),
    valueString: optionalish(z.string()),
  }),
  encode: (object) => ({
    url: object.url,
    valueQuantities:
      object.valueQuantities?.map(fhirQuantityConverter.value.encode) ?? null,
    valueReference:
      object.valueReference ?
        fhirReferenceConverter.value.encode(object.valueReference)
      : null,
    valueString: object.valueString ?? null,
  }),
})

export interface FHIRExtensionInput
  extends z.input<typeof fhirExtensionBaseConverter.value.schema> {
  valueCodeableConcept?:
    | z.input<typeof fhirCodeableConceptConverter.value.schema>
    | null
    | undefined
}

export interface FHIRExtension
  extends z.output<typeof fhirExtensionBaseConverter.value.schema> {
  valueCodeableConcept?: FHIRCodeableConcept
}

export const fhirExtensionConverter = (() => {
  const fhirExtensionSchema: z.ZodType<
    FHIRExtension,
    z.ZodTypeDef,
    FHIRExtensionInput
  > = fhirExtensionBaseConverter.value.schema.extend({
    valueCodeableConcept: optionalish(
      z.lazy(() => fhirCodeableConceptConverter.value.schema),
    ),
  })

  function fhirExtensionEncode(
    object: z.output<typeof fhirExtensionSchema>,
  ): z.input<typeof fhirExtensionSchema> {
    return {
      ...fhirExtensionBaseConverter.value.encode(object),
      valueCodeableConcept:
        object.valueCodeableConcept ?
          fhirCodeableConceptConverter.value.encode(object.valueCodeableConcept)
        : null,
    }
  }

  return new SchemaConverter({
    schema: fhirExtensionSchema,
    encode: fhirExtensionEncode,
  })
})()

export const fhirElementConverter = new SchemaConverter({
  schema: z.object({
    id: optionalish(z.string()),
    extension: optionalish(
      z.lazy(() => fhirExtensionConverter.value.schema).array(),
    ),
  }),
  encode: (object) => ({
    id: object.id ?? null,
    extension:
      object.extension?.map(fhirExtensionConverter.value.encode) ?? null,
  }),
})

export abstract class FHIRElement {
  // Properties

  readonly id?: string
  readonly extension?: FHIRExtension[]

  // Constructor

  constructor(input: { id?: string; extension?: FHIRExtension[] }) {
    this.id = input.id
    this.extension = input.extension
  }
}

export const fhirResourceConverter = new SchemaConverter({
  schema: fhirElementConverter.value.schema.extend({
    resourceType: z.string(),
    meta: optionalish(fhirMetaConverter.schema),
  }),
  encode: (object) => ({
    ...fhirElementConverter.value.encode(object),
    resourceType: object.resourceType,
    meta: object.meta ? fhirMetaConverter.encode(object.meta) : null,
  }),
})

export type FHIRResourceInput = z.output<typeof fhirElementConverter.schema> & {
  meta?: FHIRMeta
}

export abstract class FHIRResource extends FHIRElement {
  // Properties

  abstract get resourceType(): string
  readonly meta?: FHIRMeta

  // Constructor

  constructor(input: FHIRResourceInput) {
    super(input)
    this.meta = input.meta
  }

  // Methods

  codes(
    concept: FHIRCodeableConcept | undefined,
    filter: FHIRCoding,
  ): string[] {
    return (
      concept?.coding?.flatMap((coding) => {
        if (filter.system && coding.system !== filter.system) return []
        if (filter.version && coding.version !== filter.version) return []
        return coding.code ? [coding.code] : []
      }) ?? []
    )
  }

  containsCoding(
    concept: FHIRCodeableConcept | undefined,
    filter: FHIRCoding[],
  ): boolean {
    return filter.some(
      (filterCoding) =>
        concept?.coding?.some((coding) => {
          if (filterCoding.code && coding.code !== filterCoding.code)
            return false
          if (filterCoding.system && coding.system !== filterCoding.system)
            return false
          if (filterCoding.version && coding.version !== filterCoding.version)
            return false
          return true
        }) ?? false,
    )
  }
}
