// This source file is part of the MyHeart Counts project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

import { type DatabaseService } from "../../database/databaseService.js";
import { SeedingService } from "../seedingService.js";

export class StaticDataService extends SeedingService {
  // Properties

  private databaseService: DatabaseService;

  // Constructor

  constructor(databaseService: DatabaseService) {
    super({ useIndicesAsKeys: true, path: "./data/" });
    this.databaseService = databaseService;
  }

  // Methods
}
