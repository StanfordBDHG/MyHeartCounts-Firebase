//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { z } from "zod";
import { fhirElementConverter } from "./fhirElement.js";
import { Lazy } from "../../helpers/lazy.js";
import { optionalish } from "../../helpers/optionalish.js";
import { SchemaConverter } from "../../helpers/schemaConverter.js";

export const fhirCodingConverter = new Lazy(
  () =>
    new SchemaConverter({
      schema: fhirElementConverter.value.schema.extend({
        system: optionalish(z.string()),
        version: optionalish(z.string()),
        code: optionalish(z.string()),
        display: optionalish(z.string()),
        userSelected: optionalish(z.boolean()),
      }),
      encode: (object) => {
        const result: Record<string, unknown> = {
          ...fhirElementConverter.value.encode(object),
        };

        if (object.system !== undefined) result.system = object.system;
        if (object.version !== undefined) result.version = object.version;
        if (object.code !== undefined) result.code = object.code;
        if (object.display !== undefined) result.display = object.display;
        if (object.userSelected !== undefined)
          result.userSelected = object.userSelected;

        return result;
      },
    }),
);

export type FHIRCoding = z.output<typeof fhirCodingConverter.value.schema>;
