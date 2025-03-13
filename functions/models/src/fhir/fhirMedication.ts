//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { z } from 'zod'
import {
  type FHIRCodeableConcept,
  fhirCodeableConceptConverter,
} from './baseTypes/fhirCodeableConcept.js'
import {
  FHIRResource,
  fhirResourceConverter,
  type FHIRResourceInput,
  type FHIRMedicationRequest,
} from './baseTypes/fhirElement.js'
import { fhirRatioConverter } from './baseTypes/fhirRatio.js'
import { type FHIRReference } from './baseTypes/fhirReference.js'
import { CodingSystem, FHIRExtensionUrl } from '../codes/codes.js'
import { QuantityUnit } from '../codes/quantityUnit.js'
import { Lazy } from '../helpers/lazy.js'
import { optionalish } from '../helpers/optionalish.js'
import { SchemaConverter } from '../helpers/schemaConverter.js'

export const fhirMedicationIngredientConverter = new Lazy(
  () =>
    new SchemaConverter({
      schema: z.object({
        strength: optionalish(z.lazy(() => fhirRatioConverter.value.schema)),
        itemCodeableConcept: optionalish(
          z.lazy(() => fhirCodeableConceptConverter.value.schema),
        ),
      }),
      encode: (object) => ({
        strength:
          object.strength ?
            fhirRatioConverter.value.encode(object.strength)
          : null,
        itemCodeableConcept:
          object.itemCodeableConcept ?
            fhirCodeableConceptConverter.value.encode(
              object.itemCodeableConcept,
            )
          : null,
      }),
    }),
)

export type FHIRMedicationIngredient = z.output<
  typeof fhirMedicationIngredientConverter.value.schema
>

export const fhirMedicationConverter = new Lazy(
  () =>
    new SchemaConverter({
      schema: fhirResourceConverter.value.schema
        .extend({
          code: optionalish(
            z.lazy(() => fhirCodeableConceptConverter.value.schema),
          ),
          form: optionalish(
            z.lazy(() => fhirCodeableConceptConverter.value.schema),
          ),
          ingredient: optionalish(
            z
              .lazy(() => fhirMedicationIngredientConverter.value.schema)
              .array(),
          ),
        })
        .transform((values) => new FHIRMedication(values)),
      encode: (object) => ({
        ...fhirResourceConverter.value.encode(object),
        code:
          object.code ?
            fhirCodeableConceptConverter.value.encode(object.code)
          : null,
        form:
          object.form ?
            fhirCodeableConceptConverter.value.encode(object.form)
          : null,
        ingredient:
          object.ingredient.map(
            fhirMedicationIngredientConverter.value.encode,
          ) ?? null,
      }),
    }),
)

export class FHIRMedication extends FHIRResource {
  // Stored Properties

  readonly resourceType: string = 'Medication'
  readonly code?: FHIRCodeableConcept
  readonly form?: FHIRCodeableConcept
  readonly ingredient?: FHIRMedicationIngredient[]

  // Computed Properties

  get displayName(): string | undefined {
    return (
      this.code.text ??
      this.code.coding?.find((coding) => coding.system === CodingSystem.rxNorm)
        ?.display
    )
  }

  get brandNames(): string[] {
    return this.extensionsWithUrl(FHIRExtensionUrl.brandName).flatMap(
      (extension) => (extension.valueString ? [extension.valueString] : []),
    )
  }

  get medicationClassReference(): FHIRReference | undefined {
    return this.extensionsWithUrl(FHIRExtensionUrl.medicationClass).at(0)
      .valueReference
  }

  get minimumDailyDoseRequest(): FHIRMedicationRequest | undefined {
    return this.extensionsWithUrl(FHIRExtensionUrl.minimumDailyDose).at(0)
      .valueMedicationRequest
  }

  get minimumDailyDose(): number[] | undefined {
    const request = this.minimumDailyDoseRequest
    if (!request) return undefined
    return this.extensionsWithUrl(FHIRExtensionUrl.totalDailyDose)
      .at(0)
      .valueQuantities?.flatMap((quantity) => {
        const value = QuantityUnit.mg.valueOf(quantity)
        return value ? [value] : []
      })
  }

  get targetDailyDoseRequest(): FHIRMedicationRequest | undefined {
    return this.extensionsWithUrl(FHIRExtensionUrl.targetDailyDose).at(0)
      .valueMedicationRequest
  }

  get targetDailyDose(): number[] | undefined {
    const request = this.targetDailyDoseRequest
    if (!request) return undefined
    const result = request
      .extensionsWithUrl(FHIRExtensionUrl.totalDailyDose)
      .at(0)
      .valueQuantities?.flatMap((quantity) => {
        const value = QuantityUnit.mg.valueOf(quantity)
        return value ? [value] : []
      })
    return result
  }

  // Constructor

  constructor(
    input: FHIRResourceInput & {
      readonly code?: FHIRCodeableConcept
      readonly form?: FHIRCodeableConcept
      readonly ingredient?: FHIRMedicationIngredient[]
    },
  ) {
    super(input)
    this.code = input.code
    this.ingredient = input.ingredient
    this.form = input.form
  }
}
