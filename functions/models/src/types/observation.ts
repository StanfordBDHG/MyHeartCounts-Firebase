// This source file is part of the MyHeart Counts project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

import { type QuantityUnit } from "../codes/quantityUnit.js";

export interface Observation {
  date: Date;
  value: number;
  unit: QuantityUnit;
}
