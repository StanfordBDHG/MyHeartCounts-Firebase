//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { type FHIRQuantity } from '../fhir/baseTypes/fhirQuantity.js'
import { type Observation } from '../types/observation.js'

export class QuantityUnit {
  // Static Properties

  static readonly mg = new QuantityUnit('mg', 'mg')
  static readonly lbs = new QuantityUnit('[lb_av]', 'lbs')
  static readonly kg = new QuantityUnit('kg', 'kg')
  static readonly bpm = new QuantityUnit('/min', 'beats/minute')
  static readonly mmHg = new QuantityUnit('mm[Hg]', 'mmHg')
  static readonly mg_dL = new QuantityUnit('mg/dL', 'mg/dL')
  static readonly mEq_L = new QuantityUnit('meq/L', 'mEq/L')
  static readonly mL_min_173m2 = new QuantityUnit(
    'mL/min/{1.73_m2}',
    'mL/min/1.73m2',
  )
  static readonly tablet = new QuantityUnit('{tbl}', 'tbl.')

  static readonly allValues = [
    QuantityUnit.mg,
    QuantityUnit.lbs,
    QuantityUnit.kg,
    QuantityUnit.bpm,
    QuantityUnit.mmHg,
    QuantityUnit.mg_dL,
    QuantityUnit.mEq_L,
    QuantityUnit.mL_min_173m2,
    QuantityUnit.tablet,
  ]

  // Properties

  readonly unit: string
  readonly code: string
  readonly system: string

  // Constructor

  constructor(
    code: string,
    unit: string,
    system = 'http://unitsofmeasure.org',
  ) {
    this.unit = unit
    this.code = code
    this.system = system
  }

  // Methods

  isUsedIn(other: FHIRQuantity): boolean {
    return (
      this.code === other.code &&
      this.system === other.system &&
      this.unit === other.unit
    )
  }

  equals(other: QuantityUnit): boolean {
    return (
      this.code === other.code &&
      this.system === other.system &&
      this.unit === other.unit
    )
  }

  convert(observation: Observation): Observation | undefined {
    const value = QuantityUnitConverter.allValues
      .find(
        (converter) =>
          converter.sourceUnit.equals(observation.unit) &&
          converter.targetUnit.equals(this),
      )
      .convert(observation.value)
    return value ? { ...observation, value, unit: this } : undefined
  }

  fhirQuantity(value: number): FHIRQuantity {
    return {
      system: this.system,
      code: this.code,
      value: value,
      unit: this.unit,
    }
  }

  valueOf(quantity: FHIRQuantity | undefined): number | undefined {
    if (!quantity.value) return undefined
    if (this.isUsedIn(quantity)) return quantity.value

    return QuantityUnitConverter.allValues
      .find(
        (converter) =>
          converter.sourceUnit.isUsedIn(quantity) &&
          converter.targetUnit.equals(this),
      )
      .convert(quantity.value)
  }
}

class QuantityUnitConverter {
  readonly sourceUnit: QuantityUnit
  readonly targetUnit: QuantityUnit
  readonly convert: (value: number) => number

  constructor(
    sourceUnit: QuantityUnit,
    targetUnit: QuantityUnit,
    convert: (value: number) => number,
  ) {
    this.sourceUnit = sourceUnit
    this.targetUnit = targetUnit
    this.convert = convert
  }

  static readonly allValues = [
    new QuantityUnitConverter(
      QuantityUnit.lbs,
      QuantityUnit.kg,
      (value) => value * 0.45359237,
    ),
    new QuantityUnitConverter(
      QuantityUnit.kg,
      QuantityUnit.lbs,
      (value) => value / 0.45359237,
    ),
  ]
}
