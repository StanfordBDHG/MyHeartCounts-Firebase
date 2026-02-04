//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { z } from "zod";
import { fhirCodeableConceptConverter } from "./fhirCodeableConcept.js";
import { fhirQuantityConverter } from "./fhirQuantity.js";
import { fhirTimingConverter } from "./fhirTiming.js";
import { Lazy } from "../../helpers/lazy.js";
import { optionalish } from "../../helpers/optionalish.js";
import { SchemaConverter } from "../../helpers/schemaConverter.js";

const fhirDosageDoseAndRateConverter = new Lazy(
  () =>
    new SchemaConverter({
      schema: z.object({
        type: optionalish(
          z.lazy(() => fhirCodeableConceptConverter.value.schema),
        ),
        doseQuantity: optionalish(
          z.lazy(() => fhirQuantityConverter.value.schema),
        ),
      }),
      encode: (object) => ({
        type:
          object.type ?
            fhirCodeableConceptConverter.value.encode(object.type)
          : null,
        doseQuantity:
          object.doseQuantity ?
            fhirQuantityConverter.value.encode(object.doseQuantity)
          : null,
      }),
    }),
);

export const fhirDosageConverter = new Lazy(
  () =>
    new SchemaConverter({
      schema: z.object({
        text: optionalish(z.string()),
        patientInstruction: optionalish(z.string()),
        timing: optionalish(z.lazy(() => fhirTimingConverter.value.schema)),
        doseAndRate: optionalish(
          z.lazy(() => fhirDosageDoseAndRateConverter.value.schema).array(),
        ),
      }),
      encode: (object) => ({
        text: object.text ?? null,
        patientInstruction: object.patientInstruction ?? null,
        timing:
          object.timing ?
            fhirTimingConverter.value.encode(object.timing)
          : null,
        doseAndRate:
          object.doseAndRate?.map(
            fhirDosageDoseAndRateConverter.value.encode,
          ) ?? null,
      }),
    }),
);

export type FHIRDosage = z.output<typeof fhirDosageConverter.value.schema>;
