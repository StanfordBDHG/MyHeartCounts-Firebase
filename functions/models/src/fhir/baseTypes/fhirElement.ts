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
import { type FHIRDosage, fhirDosageConverter } from './fhirDosage.js'
import { type FHIRMeta, fhirMetaConverter } from './fhirMeta.js'
import { fhirQuantityConverter } from './fhirQuantity.js'
import { type FHIRReference, fhirReferenceConverter } from './fhirReference.js'
import { type FHIRExtensionUrl } from '../../codes/codes.js'
import { QuantityUnit } from '../../codes/quantityUnit.js'
import { type DrugReference } from '../../codes/references.js'
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
  valueMedicationRequest?:
    | z.input<typeof fhirMedicationRequestConverter.value.schema>
    | null
    | undefined
}

export interface FHIRExtension
  extends z.output<typeof fhirExtensionBaseConverter.value.schema> {
  valueCodeableConcept?: FHIRCodeableConcept
  valueMedicationRequest?: FHIRMedicationRequest
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
    valueMedicationRequest: optionalish(
      z.lazy(() => fhirMedicationRequestConverter.value.schema),
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
      valueMedicationRequest:
        object.valueMedicationRequest ?
          fhirMedicationRequestConverter.value.encode(
            object.valueMedicationRequest,
          )
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

  // Methods

  extensionsWithUrl(url: FHIRExtensionUrl): FHIRExtension[] {
    return (
      this.extension?.filter((extension) => extension.url === url.toString()) ??
      []
    )
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

export const fhirMedicationRequestConverter = new SchemaConverter({
  schema: fhirResourceConverter.value.schema
    .extend({
      medicationReference: optionalish(
        z.lazy(() => fhirReferenceConverter.value.schema),
      ),
      dosageInstruction: optionalish(
        z.lazy(() => fhirDosageConverter.value.schema).array(),
      ),
    })
    .transform((values) => new FHIRMedicationRequest(values)),
  encode: (object) => ({
    ...fhirResourceConverter.value.encode(object),
    medicationReference:
      object.medicationReference ?
        fhirReferenceConverter.value.encode(object.medicationReference)
      : null,
    dosageInstruction:
      object.dosageInstruction ?
        object.dosageInstruction.map(fhirDosageConverter.value.encode)
      : null,
  }),
})

export class FHIRMedicationRequest extends FHIRResource {
  // Static Functions

  static create(input: {
    drugReference: DrugReference
    frequencyPerDay: number
    quantity: number
  }): FHIRMedicationRequest {
    return new FHIRMedicationRequest({
      medicationReference: {
        reference: input.drugReference,
      },
      dosageInstruction: [
        {
          timing: {
            repeat: {
              frequency: input.frequencyPerDay,
              period: 1,
              periodUnit: 'd',
            },
          },
          doseAndRate: [
            {
              doseQuantity: {
                ...QuantityUnit.tablet,
                value: input.quantity,
              },
            },
          ],
        },
      ],
    })
  }

  // Properties

  readonly resourceType: string = 'MedicationRequest'
  readonly medicationReference?: FHIRReference
  readonly dosageInstruction?: FHIRDosage[]

  // Constructor

  constructor(
    input: FHIRResourceInput & {
      medicationReference?: FHIRReference
      dosageInstruction?: FHIRDosage[]
    },
  ) {
    super(input)
    this.medicationReference = input.medicationReference
    this.dosageInstruction = input.dosageInstruction
  }
}
