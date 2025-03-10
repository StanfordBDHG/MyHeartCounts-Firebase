//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { z } from 'zod'
import { localizedTextConverter } from './localizedText.js'
import {
  type FHIRReference,
  fhirReferenceConverter,
} from '../fhir/baseTypes/fhirReference.js'
import { Lazy } from '../helpers/lazy.js'
import { optionalish } from '../helpers/optionalish.js'
import { SchemaConverter } from '../helpers/schemaConverter.js'

export enum UserMedicationRecommendationType {
  improvementAvailable = 'improvementAvailable',
  moreLabObservationsRequired = 'moreLabObservationsRequired',
  morePatientObservationsRequired = 'morePatientObservationsRequired',
  noActionRequired = 'noActionRequired',
  notStarted = 'notStarted',
  personalTargetDoseReached = 'personalTargetDoseReached',
  targetDoseReached = 'targetDoseReached',
}

export const userMedicationRecommendationDoseScheduleConverter = new Lazy(
  () =>
    new SchemaConverter({
      schema: z.object({
        frequency: z.number(),
        quantity: z.number().array(),
      }),
      encode: (object) => ({
        frequency: object.frequency,
        quantity: object.quantity,
      }),
    }),
)

export type UserMedicationRecommendationDoseSchedule = z.output<
  typeof userMedicationRecommendationDoseScheduleConverter.value.schema
>

export const userMedicationRecommendationDosageInformationConverter = new Lazy(
  () =>
    new SchemaConverter({
      schema: z.object({
        currentSchedule: z
          .lazy(
            () =>
              userMedicationRecommendationDoseScheduleConverter.value.schema,
          )
          .array(),
        minimumSchedule: z
          .lazy(
            () =>
              userMedicationRecommendationDoseScheduleConverter.value.schema,
          )
          .array(),
        targetSchedule: z
          .lazy(
            () =>
              userMedicationRecommendationDoseScheduleConverter.value.schema,
          )
          .array(),
        unit: z.string(),
      }),
      encode: (object) => ({
        currentSchedule: object.currentSchedule.map(
          userMedicationRecommendationDoseScheduleConverter.value.encode,
        ),
        minimumSchedule: object.minimumSchedule.map(
          userMedicationRecommendationDoseScheduleConverter.value.encode,
        ),
        targetSchedule: object.targetSchedule.map(
          userMedicationRecommendationDoseScheduleConverter.value.encode,
        ),
        unit: object.unit,
      }),
    }),
)

export const userMedicationRecommendationDisplayInformationConverter = new Lazy(
  () =>
    new SchemaConverter({
      schema: z.object({
        title: localizedTextConverter.schema,
        subtitle: localizedTextConverter.schema,
        description: localizedTextConverter.schema,
        type: z.nativeEnum(UserMedicationRecommendationType),
        videoPath: optionalish(z.string()),
        dosageInformation: z.lazy(
          () =>
            userMedicationRecommendationDosageInformationConverter.value.schema,
        ),
      }),
      encode: (object) => ({
        title: localizedTextConverter.encode(object.title),
        subtitle: localizedTextConverter.encode(object.subtitle),
        description: localizedTextConverter.encode(object.description),
        type: object.type,
        videoPath: object.videoPath ?? null,
        dosageInformation:
          userMedicationRecommendationDosageInformationConverter.value.encode(
            object.dosageInformation,
          ),
      }),
    }),
)

export type UserMedicationRecommendationDisplayInformation = z.output<
  typeof userMedicationRecommendationDisplayInformationConverter.value.schema
>

export const userMedicationRecommendationConverter = new Lazy(
  () =>
    new SchemaConverter({
      schema: z
        .object({
          currentMedication: z
            .lazy(() => fhirReferenceConverter.value.schema)
            .array(),
          recommendedMedication: optionalish(
            z.lazy(() => fhirReferenceConverter.value.schema),
          ),
          displayInformation: z.lazy(
            () =>
              userMedicationRecommendationDisplayInformationConverter.value
                .schema,
          ),
        })
        .transform((values) => new UserMedicationRecommendation(values)),
      encode: (object) => ({
        currentMedication: object.currentMedication.map(
          fhirReferenceConverter.value.encode,
        ),
        recommendedMedication:
          object.recommendedMedication ?
            fhirReferenceConverter.value.encode(object.recommendedMedication)
          : null,
        displayInformation:
          userMedicationRecommendationDisplayInformationConverter.value.encode(
            object.displayInformation,
          ),
      }),
    }),
)

export class UserMedicationRecommendation {
  // Properties

  readonly currentMedication: FHIRReference[]
  readonly recommendedMedication?: FHIRReference
  readonly displayInformation: UserMedicationRecommendationDisplayInformation

  // Constructor

  constructor(input: {
    currentMedication: FHIRReference[]
    recommendedMedication?: FHIRReference
    displayInformation: UserMedicationRecommendationDisplayInformation
  }) {
    this.currentMedication = input.currentMedication
    this.recommendedMedication = input.recommendedMedication
    this.displayInformation = input.displayInformation
  }
}
