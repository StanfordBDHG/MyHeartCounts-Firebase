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
import { type FHIRCoding } from './baseTypes/fhirCoding.js'
import {
  FHIRResource,
  fhirResourceConverter,
  type FHIRResourceInput,
} from './baseTypes/fhirElement.js'
import { fhirPeriodConverter, type FHIRPeriod } from './baseTypes/fhirPeriod.js'
import {
  type FHIRQuantity,
  fhirQuantityConverter,
} from './baseTypes/fhirQuantity.js'
import { CodingSystem, LoincCode } from '../codes/codes.js'
import { QuantityUnit } from '../codes/quantityUnit.js'
import { dateConverter } from '../helpers/dateConverter.js'
import { Lazy } from '../helpers/lazy.js'
import { optionalish } from '../helpers/optionalish.js'
import { SchemaConverter } from '../helpers/schemaConverter.js'
import { type Observation } from '../types/observation.js'

export enum UserObservationCollection {
  bodyWeight = 'bodyWeightObservations',
  bloodPressure = 'bloodPressureObservations',
  creatinine = 'creatinineObservations',
  dryWeight = 'dryWeightObservations',
  eGfr = 'eGfrObservations',
  heartRate = 'heartRateObservations',
  potassium = 'potassiumObservations',
}

export enum FHIRObservationStatus {
  registered = 'registered',
  preliminary = 'preliminary',
  final = 'final',
  amended = 'amended',
  corrected = 'corrected',
  cancelled = 'cancelled',
  entered_in_error = 'entered-in-error',
  unknown = 'unknown',
}

export const fhirObservationComponentConverter = new Lazy(
  () =>
    new SchemaConverter({
      schema: z.object({
        code: z.lazy(() => fhirCodeableConceptConverter.value.schema),
        valueQuantity: optionalish(
          z.lazy(() => fhirQuantityConverter.value.schema),
        ),
      }),
      encode: (object) => ({
        code: fhirCodeableConceptConverter.value.encode(object.code),
        valueQuantity:
          object.valueQuantity ?
            fhirQuantityConverter.value.encode(object.valueQuantity)
          : null,
      }),
    }),
)

export type FHIRObservationComponent = z.output<
  typeof fhirObservationComponentConverter.value.schema
>

export const fhirObservationConverter = new Lazy(
  () =>
    new SchemaConverter({
      schema: fhirResourceConverter.value.schema
        .extend({
          status: z.nativeEnum(FHIRObservationStatus),
          code: z.lazy(() => fhirCodeableConceptConverter.value.schema),
          component: optionalish(
            z
              .lazy(() => fhirObservationComponentConverter.value.schema)
              .array(),
          ),
          valueQuantity: optionalish(
            z.lazy(() => fhirQuantityConverter.value.schema),
          ),
          effectivePeriod: optionalish(
            z.lazy(() => fhirPeriodConverter.value.schema),
          ),
          effectiveDateTime: optionalish(dateConverter.schema),
          effectiveInstant: optionalish(dateConverter.schema),
        })
        .transform((values) => new FHIRObservation(values)),
      encode: (object) => ({
        ...fhirResourceConverter.value.encode(object),
        status: object.status,
        code: fhirCodeableConceptConverter.value.encode(object.code),
        component:
          object.component?.map(
            fhirObservationComponentConverter.value.encode,
          ) ?? null,
        valueQuantity:
          object.valueQuantity ?
            fhirQuantityConverter.value.encode(object.valueQuantity)
          : null,
        effectivePeriod:
          object.effectivePeriod ?
            fhirPeriodConverter.value.encode(object.effectivePeriod)
          : null,
        effectiveDateTime:
          object.effectiveDateTime ?
            dateConverter.encode(object.effectiveDateTime)
          : null,
        effectiveInstant:
          object.effectiveInstant ?
            dateConverter.encode(object.effectiveInstant)
          : null,
      }),
    }),
)

export class FHIRObservation extends FHIRResource {
  // Static Functions

  private static readonly loincDisplay = new Map<LoincCode, string>([
    [
      LoincCode.bloodPressure,
      'Blood pressure panel with all children optional',
    ],
    [LoincCode.systolicBloodPressure, 'Systolic blood pressure'],
    [LoincCode.diastolicBloodPressure, 'Diastolic blood pressure'],
    [LoincCode.bodyWeight, 'Body weight'],
    [LoincCode.creatinine, 'Creatinine [Mass/volume] in Serum or Plasma'],
    [
      LoincCode.estimatedGlomerularFiltrationRate,
      'Glomerular filtration rate/1.73 sq M.predicted [Volume Rate/Area] in Serum, Plasma or Blood by Creatinine-based formula (CKD-EPI 2021)',
    ],
    [LoincCode.heartRate, 'Heart rate'],
    [LoincCode.potassium, 'Potassium [Moles/volume] in Blood'],
  ])

  static createBloodPressure(input: {
    id: string
    date: Date
    systolic: number
    diastolic: number
  }): FHIRObservation {
    return new FHIRObservation({
      id: input.id,
      status: FHIRObservationStatus.final,
      code: {
        text: this.loincDisplay.get(LoincCode.bloodPressure),
        coding: [
          {
            system: CodingSystem.loinc,
            code: LoincCode.bloodPressure,
            display: this.loincDisplay.get(LoincCode.bloodPressure),
          },
        ],
      },
      component: [
        {
          code: {
            text: this.loincDisplay.get(LoincCode.systolicBloodPressure),
            coding: [
              {
                system: CodingSystem.loinc,
                code: LoincCode.systolicBloodPressure,
                display: this.loincDisplay.get(LoincCode.systolicBloodPressure),
              },
            ],
          },
          valueQuantity: {
            value: input.systolic,
            unit: QuantityUnit.mmHg.unit,
            system: QuantityUnit.mmHg.system,
            code: QuantityUnit.mmHg.code,
          },
        },
        {
          code: {
            text: this.loincDisplay.get(LoincCode.diastolicBloodPressure),
            coding: [
              {
                system: CodingSystem.loinc,
                code: LoincCode.diastolicBloodPressure,
                display: this.loincDisplay.get(
                  LoincCode.diastolicBloodPressure,
                ),
              },
            ],
          },
          valueQuantity: {
            value: input.diastolic,
            unit: QuantityUnit.mmHg.unit,
            system: QuantityUnit.mmHg.system,
            code: QuantityUnit.mmHg.code,
          },
        },
      ],
      effectiveDateTime: input.date,
    })
  }

  static createSimple(input: {
    id: string
    date: Date
    value: number
    unit: QuantityUnit
    code: LoincCode
  }): FHIRObservation {
    return new FHIRObservation({
      id: input.id,
      status: FHIRObservationStatus.final,
      code: {
        text: this.loincDisplay.get(input.code) ?? undefined,
        coding: [
          {
            system: CodingSystem.loinc,
            code: input.code,
            display: this.loincDisplay.get(input.code) ?? undefined,
          },
        ],
      },
      valueQuantity: {
        value: input.value,
        unit: input.unit.unit,
        system: input.unit.system,
        code: input.unit.code,
      },
      effectiveDateTime: input.date,
    })
  }

  // Stored Properties

  readonly resourceType: string = 'Observation'
  readonly status: FHIRObservationStatus
  readonly code: FHIRCodeableConcept
  readonly component?: FHIRObservationComponent[]
  readonly valueQuantity?: FHIRQuantity
  readonly effectivePeriod?: FHIRPeriod
  readonly effectiveDateTime?: Date
  readonly effectiveInstant?: Date

  // Computed Properties

  get systolicBloodPressure(): Observation | undefined {
    return this.observations({
      code: LoincCode.bloodPressure,
      system: CodingSystem.loinc,
      unit: QuantityUnit.mmHg,
      component: {
        code: LoincCode.systolicBloodPressure,
        system: CodingSystem.loinc,
      },
    }).at(0)
  }

  get diastolicBloodPressure(): Observation | undefined {
    return this.observations({
      code: LoincCode.bloodPressure,
      system: CodingSystem.loinc,
      unit: QuantityUnit.mmHg,
      component: {
        code: LoincCode.diastolicBloodPressure,
        system: CodingSystem.loinc,
      },
    }).at(0)
  }

  bodyWeight(unit: QuantityUnit): Observation | undefined {
    return this.observations({
      code: LoincCode.bodyWeight,
      system: CodingSystem.loinc,
      unit: unit,
    }).at(0)
  }

  get creatinine(): Observation | undefined {
    return this.observations({
      code: LoincCode.creatinine,
      system: CodingSystem.loinc,
      unit: QuantityUnit.mg_dL,
    }).at(0)
  }

  get estimatedGlomerularFiltrationRate(): Observation | undefined {
    return this.observations({
      code: LoincCode.estimatedGlomerularFiltrationRate,
      system: CodingSystem.loinc,
      unit: QuantityUnit.mL_min_173m2,
    }).at(0)
  }

  get heartRate(): Observation | undefined {
    return this.observations({
      code: LoincCode.heartRate,
      system: CodingSystem.loinc,
      unit: QuantityUnit.bpm,
    }).at(0)
  }

  get potassium(): Observation | undefined {
    return this.observations({
      code: LoincCode.potassium,
      system: CodingSystem.loinc,
      unit: QuantityUnit.mEq_L,
    }).at(0)
  }

  // Constructor

  constructor(
    input: FHIRResourceInput & {
      status: FHIRObservationStatus
      code: FHIRCodeableConcept
      component?: FHIRObservationComponent[]
      valueQuantity?: FHIRQuantity
      effectivePeriod?: FHIRPeriod
      effectiveDateTime?: Date
      effectiveInstant?: Date
    },
  ) {
    super(input)
    this.status = input.status
    this.code = input.code
    this.component = input.component
    this.valueQuantity = input.valueQuantity
    this.effectivePeriod = input.effectivePeriod
    this.effectiveDateTime = input.effectiveDateTime
    this.effectiveInstant = input.effectiveInstant
  }

  // Methods

  private observations(
    options: {
      unit: QuantityUnit
      component?: FHIRCoding
    } & FHIRCoding,
  ): Observation[] {
    const result: Observation[] = []
    if (!this.containsCoding(this.code, [options])) return result
    const date =
      this.effectiveDateTime ??
      this.effectiveInstant ??
      this.effectivePeriod?.start ??
      this.effectivePeriod?.end
    if (!date) return result

    if (options.component) {
      for (const component of this.component ?? []) {
        if (!this.containsCoding(component.code, [options.component])) continue
        const value = options.unit.valueOf(component.valueQuantity)
        if (!value) continue
        result.push({
          date: date,
          value: value,
          unit: options.unit,
        })
      }
    } else {
      const value = options.unit.valueOf(this.valueQuantity)
      if (!value) return result
      result.push({ date: date, value: value, unit: options.unit })
    }
    return result
  }
}
