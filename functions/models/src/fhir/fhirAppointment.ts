//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { z } from 'zod'
import { fhirCodeableConceptConverter } from './baseTypes/fhirCodeableConcept.js'
import {
  FHIRResource,
  fhirResourceConverter,
  type FHIRResourceInput,
} from './baseTypes/fhirElement.js'
import { fhirReferenceConverter } from './baseTypes/fhirReference.js'
import { FHIRExtensionUrl } from '../codes/codes.js'
import { compactMap } from '../helpers/array.js'
import { dateConverter } from '../helpers/dateConverter.js'
import { Lazy } from '../helpers/lazy.js'
import { optionalish } from '../helpers/optionalish.js'
import { SchemaConverter } from '../helpers/schemaConverter.js'

export enum FHIRAppointmentStatus {
  proposed = 'proposed',
  pending = 'pending',
  booked = 'booked',
  arrived = 'arrived',
  fulfilled = 'fulfilled',
  cancelled = 'cancelled',
  noshow = 'noshow',
  enterdInError = 'entered-in-error',
  checkedIn = 'checked-in',
  waitlist = 'waitlist',
}

export const fhirAppointmentParticipantConverter = new Lazy(
  () =>
    new SchemaConverter({
      schema: z.object({
        actor: optionalish(z.lazy(() => fhirReferenceConverter.value.schema)),
        type: optionalish(
          z.lazy(() => fhirCodeableConceptConverter.value.schema),
        ),
      }),
      encode: (object) => ({
        actor:
          object.actor ?
            fhirReferenceConverter.value.encode(object.actor)
          : null,
        type:
          object.type ?
            fhirCodeableConceptConverter.value.encode(object.type)
          : null,
      }),
    }),
)

export type FHIRAppointmentParticipant = z.output<
  typeof fhirAppointmentParticipantConverter.value.schema
>

export const fhirAppointmentConverter = new Lazy(
  () =>
    new SchemaConverter({
      schema: fhirResourceConverter.value.schema
        .extend({
          status: z.nativeEnum(FHIRAppointmentStatus),
          created: dateConverter.schema,
          start: dateConverter.schema,
          end: dateConverter.schema,
          comment: optionalish(z.string()),
          patientInstruction: optionalish(z.string()),
          participant: optionalish(
            z
              .lazy(() => fhirAppointmentParticipantConverter.value.schema)
              .array(),
          ),
        })
        .transform((values) => new FHIRAppointment(values)),
      encode: (object) => ({
        ...fhirResourceConverter.value.encode(object),
        status: object.status,
        created: dateConverter.encode(object.created),
        start: dateConverter.encode(object.start),
        end: dateConverter.encode(object.end),
        comment: object.comment ?? null,
        patientInstruction: object.patientInstruction ?? null,
        participant:
          object.participant.map(
            fhirAppointmentParticipantConverter.value.encode,
          ) ?? null,
      }),
    }),
)

export class FHIRAppointment extends FHIRResource {
  // Static Functions

  static create(input: {
    userId: string
    created: Date
    status: FHIRAppointmentStatus
    start: Date
    durationInMinutes: number
  }): FHIRAppointment {
    return new FHIRAppointment({
      status: input.status,
      created: input.created,
      start: input.start,
      end: new Date(
        input.start.getTime() + input.durationInMinutes * 60 * 1000,
      ),
      participant: [
        {
          actor: {
            reference: `users/${input.userId}`,
          },
        },
      ],
    })
  }

  // Stored Properties

  readonly resourceType: string = 'Appointment'
  readonly status: FHIRAppointmentStatus
  readonly created: Date
  readonly start: Date
  readonly end: Date
  readonly comment?: string
  readonly patientInstruction?: string
  readonly participant?: FHIRAppointmentParticipant[]

  // Computed Properties

  get providerNames(): string[] {
    return compactMap(
      this.extensionsWithUrl(FHIRExtensionUrl.providerName),
      (extension) => extension.valueString,
    )
  }

  // Constructor

  constructor(
    input: FHIRResourceInput & {
      status: FHIRAppointmentStatus
      created: Date
      start: Date
      end: Date
      comment?: string
      patientInstruction?: string
      participant?: FHIRAppointmentParticipant[]
    },
  ) {
    super(input)
    this.status = input.status
    this.created = input.created
    this.start = input.start
    this.end = input.end
    this.comment = input.comment
    this.patientInstruction = input.patientInstruction
    this.participant = input.participant
  }
}
