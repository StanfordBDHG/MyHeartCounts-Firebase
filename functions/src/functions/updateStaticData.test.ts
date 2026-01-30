//
// This source file is part of the Stanford Biodesign Digital Health MyHeart Counts open-source project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2025 Stanford University
//
// SPDX-License-Identifier: MIT
//

import fs from "fs";
import {
  CachingStrategy,
  LocalizedText,
  StaticDataComponent,
} from "@stanfordbdhg/myheartcounts-models";
import { expect } from "chai";
import { it } from "mocha";
import { _updateStaticData } from "./updateStaticData.js";
import { describeWithEmulators } from "../tests/functions/testEnvironment.js";

describeWithEmulators("function: updateStaticData", (env) => {
  it("updates static data successfully", async () => {
    await _updateStaticData(env.factory, {
      only: Object.values(StaticDataComponent),
      cachingStrategy: CachingStrategy.expectCache,
    });

    // Questionnaires are no longer used
    const questionnaires = await env.collections.questionnaires.get();
    expect(questionnaires.docs).to.have.length(0);
  });
});

const simplify = (data: unknown): unknown =>
  JSON.parse(
    JSON.stringify(data, (key, value): unknown => {
      if (value instanceof LocalizedText) {
        return value.content;
      }
      return value;
    }),
  );
