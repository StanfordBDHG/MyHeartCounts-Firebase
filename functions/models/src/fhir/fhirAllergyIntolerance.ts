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
} from './baseTypes/fhirCodeableConcept.js'
import {
  FHIRResource,
  fhirResourceConverter,
  type FHIRResourceInput,
} from './baseTypes/fhirElement.js'
import { CodingSystem } from '../codes/codes.js'
import { type MedicationReference } from '../codes/references.js'
import { Lazy } from '../helpers/lazy.js'
import { optionalish } from '../helpers/optionalish.js'
import { SchemaConverter } from '../helpers/schemaConverter.js'

export enum FHIRAllergyIntoleranceType {
  allergy = 'allergy',
  intolerance = 'intolerance',
  financial = 'financial',
  preference = 'preference',
}

export enum FHIRAllergyIntoleranceCriticality {
  low = 'low',
  high = 'high',
  unableToAssess = 'unable-to-assess',
}

export const fhirAllergyIntoleranceConverter = new Lazy(
  () =>
    new SchemaConverter({
      schema: fhirResourceConverter.value.schema
        .extend({
          type: z.nativeEnum(FHIRAllergyIntoleranceType),
          criticality: optionalish(
            z.nativeEnum(FHIRAllergyIntoleranceCriticality),
          ),
          code: optionalish(
            z.lazy(() => fhirCodeableConceptConverter.value.schema),
          ),
        })
        .transform((values) => new FHIRAllergyIntolerance(values)),
      encode: (object) => ({
        ...fhirResourceConverter.value.encode(object),
        type: object.type,
        criticality: object.criticality ?? null,
        code:
          object.code ?
            fhirCodeableConceptConverter.value.encode(object.code)
          : null,
      }),
    }),
)

export class FHIRAllergyIntolerance extends FHIRResource {
  // Static Functions

  static create(input: {
    type: FHIRAllergyIntoleranceType
    criticality?: FHIRAllergyIntoleranceCriticality
    reference: MedicationReference
  }): FHIRAllergyIntolerance {
    return new FHIRAllergyIntolerance({
      type: input.type,
      criticality: input.criticality,
      code: {
        coding: [
          {
            system: CodingSystem.rxNorm,
            code: input.reference.split('/')[1],
          },
        ],
      },
    })
  }

  // Stored Properties

  readonly resourceType: string = 'AllergyIntolerance'
  readonly type: FHIRAllergyIntoleranceType
  readonly criticality?: FHIRAllergyIntoleranceCriticality
  readonly code?: FHIRCodeableConcept

  // Computed Properties

  get rxNormCodes(): string[] {
    return this.codes(this.code, { system: CodingSystem.rxNorm })
  }

  // Constructor

  constructor(
    input: FHIRResourceInput & {
      type: FHIRAllergyIntoleranceType
      criticality?: FHIRAllergyIntoleranceCriticality
      code?: FHIRCodeableConcept
    },
  ) {
    super(input)
    this.type = input.type
    this.criticality = input.criticality
    this.code = input.code
  }
}
