// This source file is part of the MyHeart Counts project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

import type { FHIRQuestionnaireResponse } from "@stanfordbdhg/myheartcounts-models";
import type { Document } from "../database/databaseService.js";

export abstract class QuestionnaireResponseService {
  abstract handle(
    userId: string,
    response: Document<FHIRQuestionnaireResponse>,
    options: { isNew: boolean },
  ): Promise<boolean>;
}
