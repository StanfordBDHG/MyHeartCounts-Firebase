//
// This source file is part of the MyHeartCounts-Firebase project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import type { FHIRQuestionnaireResponse } from "@stanfordbdhg/myheartcounts-models";
import type { Document } from "../database/databaseService.js";

export abstract class QuestionnaireResponseService {
  abstract handle(
    userId: string,
    response: Document<FHIRQuestionnaireResponse>,
    options: { isNew: boolean },
  ): Promise<boolean>;
}
