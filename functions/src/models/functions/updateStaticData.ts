// This source file is part of the MyHeart Counts project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

import { z } from "zod";
import { optionalishDefault } from "../helpers/optionalish.js";

export enum CachingStrategy {
  expectCache = "expectCache",
  ignoreCache = "ignoreCache",
  updateCache = "updateCache",
  updateCacheIfNeeded = "updateCacheIfNeeded",
}

export enum StaticDataComponent {
  questionnaires = "questionnaires",
}

export const updateStaticDataInputSchema = z.object({
  only: optionalishDefault(
    z.array(z.nativeEnum(StaticDataComponent)),
    Object.values(StaticDataComponent),
  ),
  cachingStrategy: optionalishDefault(
    z.nativeEnum(CachingStrategy),
    CachingStrategy.updateCacheIfNeeded,
  ),
});
export type UpdateStaticDataInput = z.input<typeof updateStaticDataInputSchema>;
export type UpdateStaticDataOutput = Record<string, never>;
