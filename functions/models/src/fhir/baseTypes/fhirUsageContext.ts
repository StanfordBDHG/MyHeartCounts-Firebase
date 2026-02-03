//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { z } from "zod";
import { fhirCodeableConceptConverter } from "./fhirCodeableConcept.js";
import { fhirCodingConverter } from "./fhirCoding.js";
import { fhirQuantityConverter } from "./fhirQuantity.js";
import { optionalish } from "../../helpers/optionalish.js";
import { SchemaConverter } from "../../helpers/schemaConverter.js";

export const fhirUsageContextConverter = new SchemaConverter({
  schema: z.object({
    code: fhirCodingConverter.value.schema,
    valueCodeableConcept: optionalish(
      z.lazy(() => fhirCodeableConceptConverter.value.schema),
    ),
    valueQuantity: optionalish(
      z.lazy(() => fhirQuantityConverter.value.schema),
    ),
  }),
  encode: (object) => ({
    code: fhirCodingConverter.value.encode(object.code),
    valueCodeableConcept:
      object.valueCodeableConcept ?
        fhirCodeableConceptConverter.value.encode(object.valueCodeableConcept)
      : null,
    valueQuantity:
      object.valueQuantity ?
        fhirQuantityConverter.value.encode(object.valueQuantity)
      : null,
  }),
});

export type FHIRUsageContext = z.output<
  typeof fhirUsageContextConverter.schema
>;
