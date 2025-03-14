//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import assert from "assert";
import fs from "fs";
import {describe, it} from "mocha";
import {generateChartSvg} from "./generateChart.js";
import {mockHealthSummaryData} from "../tests/mocks/healthSummaryData.js";
import {TestFlags} from "../tests/testFlags.js";

describe("generateChart", () => {
  it("should generate the same chart on mock data", async () => {
    const inputData = await mockHealthSummaryData("");
    const actualData = generateChartSvg(
      inputData.vitals.bodyWeight,
      {width: 258, height: 193.5},
      {top: 20, right: 40, bottom: 40, left: 40},
      inputData.vitals.dryWeight?.value,
    );
    const expectedPath = "src/tests/resources/mockChart.svg";
    if (TestFlags.regenerateValues) {
      fs.writeFileSync(expectedPath, actualData);
    } else {
      const expectedData = fs.readFileSync(expectedPath);
      assert.equal(actualData, expectedData.toString("utf8"));
    }
  });

  it("should generate an empty chart the same way", () => {
    const actualData = generateChartSvg(
      [],
      {width: 258, height: 193.5},
      {top: 20, right: 40, bottom: 40, left: 40},
    );
    const expectedPath = "src/tests/resources/emptyChart.svg";
    if (TestFlags.regenerateValues) {
      fs.writeFileSync(expectedPath, actualData);
    } else {
      const expectedData = fs.readFileSync(expectedPath);
      assert.equal(actualData, expectedData.toString("utf8"));
    }
  });
});
