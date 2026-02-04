//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

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
