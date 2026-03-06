// This source file is part of the MyHeart Counts project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

import type { FHIRQuestionnaireResponse } from "@stanfordbdhg/myheartcounts-models";
import { QuestionnaireResponseService } from "./questionnaireResponseService.js";
import type { Document } from "../database/databaseService.js";

export class MultiQuestionnaireResponseService extends QuestionnaireResponseService {
  private readonly components: QuestionnaireResponseService[];

  constructor(components: QuestionnaireResponseService[]) {
    super();
    this.components = components;
  }

  async handle(
    userId: string,
    response: Document<FHIRQuestionnaireResponse>,
    options: { isNew: boolean },
  ): Promise<boolean> {
    let anyHandled = false;
    for (const component of this.components) {
      const handled = await component.handle(userId, response, options);
      if (handled) anyHandled = true;
    }
    return anyHandled;
  }
}
