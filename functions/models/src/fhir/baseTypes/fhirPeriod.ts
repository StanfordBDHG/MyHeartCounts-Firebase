//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { z } from "zod";
import { dateConverterISO } from "../../helpers/dateConverter.js";
import { Lazy } from "../../helpers/lazy.js";
import { optionalish } from "../../helpers/optionalish.js";
import { SchemaConverter } from "../../helpers/schemaConverter.js";

export const fhirPeriodConverter = new Lazy(
  () =>
    new SchemaConverter({
      schema: z.object({
        start: optionalish(dateConverterISO.schema),
        end: optionalish(dateConverterISO.schema),
      }),
      encode: (object) => {
        const result: Record<string, unknown> = {};

        if (object.start) result.start = dateConverterISO.encode(object.start);
        if (object.end) result.end = dateConverterISO.encode(object.end);

        return result;
      },
    }),
);

export type FHIRPeriod = z.output<typeof fhirPeriodConverter.value.schema>;
