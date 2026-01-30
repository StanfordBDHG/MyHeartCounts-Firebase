//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { z } from "zod";
import { Lazy } from "../../helpers/lazy.js";
import { optionalish } from "../../helpers/optionalish.js";
import { SchemaConverter } from "../../helpers/schemaConverter.js";

export const fhirQuantityConverter = new Lazy(
  () =>
    new SchemaConverter({
      schema: z.object({
        code: optionalish(z.string()),
        system: optionalish(z.string()),
        unit: optionalish(z.string()),
        value: optionalish(z.number()),
      }),
      encode: (object) => {
        const result: Record<string, unknown> = {};

        if (object.code !== undefined) result.code = object.code;
        if (object.system !== undefined) result.system = object.system;
        if (object.unit !== undefined) result.unit = object.unit;
        if (object.value !== undefined) result.value = object.value;

        return result;
      },
    }),
);

export type FHIRQuantity = z.output<typeof fhirQuantityConverter.value.schema>;
