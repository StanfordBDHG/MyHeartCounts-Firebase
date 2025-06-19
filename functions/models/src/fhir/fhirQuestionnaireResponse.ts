//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { z } from 'zod'
import { fhirCodingConverter } from './baseTypes/fhirCoding.js'
import {
  FHIRResource,
  fhirResourceConverter,
  type FHIRResourceInput,
} from './baseTypes/fhirElement.js'
import { dateConverter } from '../helpers/dateConverter.js'
import { Lazy } from '../helpers/lazy.js'
import { optionalish } from '../helpers/optionalish.js'
import { SchemaConverter } from '../helpers/schemaConverter.js'

const fhirQuestionnaireResponseItemBaseConverter = new SchemaConverter({
  schema: z.object({
    answer: optionalish(
      z
        .object({
          valueCoding: optionalish(
            z.lazy(() => fhirCodingConverter.value.schema),
          ),
        })
        .array(),
    ),
    linkId: optionalish(z.string()),
  }),
  encode: (object) => ({
    answer:
      object.answer?.flatMap((value) => ({
        valueCoding:
          value.valueCoding ?
            fhirCodingConverter.value.encode(value.valueCoding)
          : null,
      })) ?? null,
    linkId: object.linkId ?? null,
  }),
})

export interface FHIRQuestionnaireResponseItemValue
  extends z.input<
    typeof fhirQuestionnaireResponseItemBaseConverter.value.schema
  > {
  item?:
    | Array<z.input<typeof fhirQuestionnaireResponseItemConverter.value.schema>>
    | null
    | undefined
}

export const fhirQuestionnaireResponseItemConverter = (() => {
  const fhirQuestionnaireResponseItemSchema: z.ZodType<
    FHIRQuestionnaireResponseItem,
    z.ZodTypeDef,
    FHIRQuestionnaireResponseItemValue
  > = fhirQuestionnaireResponseItemBaseConverter.value.schema.extend({
    item: optionalish(
      z.array(z.lazy(() => fhirQuestionnaireResponseItemSchema)),
    ),
  })

  function fhirQuestionnaireResponseItemEncode(
    object: z.output<typeof fhirQuestionnaireResponseItemSchema>,
  ): z.input<typeof fhirQuestionnaireResponseItemSchema> {
    return {
      ...fhirQuestionnaireResponseItemBaseConverter.value.encode(object),
      item:
        object.item ?
          object.item.map(fhirQuestionnaireResponseItemConverter.value.encode)
        : null,
    }
  }

  return new SchemaConverter({
    schema: fhirQuestionnaireResponseItemSchema,
    encode: fhirQuestionnaireResponseItemEncode,
  })
})()

export interface FHIRQuestionnaireResponseItem
  extends z.output<
    typeof fhirQuestionnaireResponseItemBaseConverter.value.schema
  > {
  item?: FHIRQuestionnaireResponseItem[]
}

export const fhirQuestionnaireResponseConverter = new Lazy(
  () =>
    new SchemaConverter({
      schema: fhirResourceConverter.value.schema
        .extend({
          authored: dateConverter.schema,
          item: optionalish(
            z
              .lazy(() => fhirQuestionnaireResponseItemConverter.value.schema)
              .array(),
          ),
          questionnaire: z.string(),
        })
        .transform((values) => new FHIRQuestionnaireResponse(values)),
      encode: (object) => ({
        ...fhirResourceConverter.value.encode(object),
        authored: dateConverter.encode(object.authored),
        item:
          object.item?.map(
            fhirQuestionnaireResponseItemConverter.value.encode,
          ) ?? null,
        questionnaire: object.questionnaire,
      }),
    }),
)

export class FHIRQuestionnaireResponse extends FHIRResource {
  // Stored Properties

  readonly resourceType: string = 'QuestionnaireResponse'
  readonly authored: Date
  readonly item?: FHIRQuestionnaireResponseItem[]
  readonly questionnaire: string

  // Constructor

  constructor(
    input: FHIRResourceInput & {
      authored: Date
      item?: FHIRQuestionnaireResponseItem[]
      questionnaire: string
    },
  ) {
    super(input)
    this.authored = input.authored
    this.item = input.item
    this.questionnaire = input.questionnaire
  }

  // Methods

  numericSingleAnswerForLink(linkId: string): number {
    for (const item of this.item ?? []) {
      const answer = this.numericSingleAnswerForNestedItem(linkId, item)
      if (answer !== undefined) return answer
    }
    throw new Error(`No answer found in response for linkId ${linkId}.`)
  }

  private numericSingleAnswerForNestedItem(
    linkId: string,
    item: FHIRQuestionnaireResponseItem,
  ): number | undefined {
    if (item.linkId === linkId) {
      return this.numericSingleAnswerForItem(linkId, item)
    }
    for (const child of item.item ?? []) {
      const childAnswer = this.numericSingleAnswerForNestedItem(linkId, child)
      if (childAnswer !== undefined) return childAnswer
    }
    return undefined
  }

  private numericSingleAnswerForItem(
    linkId: string,
    item: FHIRQuestionnaireResponseItem,
  ): number {
    const answers = item.answer ?? []
    if (answers.length !== 1)
      throw new Error(
        `Zero or multiple answers found in response item for linkId ${linkId}.`,
      )
    const code = answers[0].valueCoding?.code
    if (!code)
      throw new Error(
        `No answer code found in response item for linkId ${linkId}.`,
      )
    return parseInt(code)
  }
}
