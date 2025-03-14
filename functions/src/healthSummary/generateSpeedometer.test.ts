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
import {generateSpeedometerSvg} from "./generateSpeedometer.js";
import {mockHealthSummaryData} from "../tests/mocks/healthSummaryData.js";
import {TestFlags} from "../tests/testFlags.js";

describe("generateSpeedometer", () => {
  it("should generate the same chart on mock data", async () => {
    const inputData = await mockHealthSummaryData("");
    const actualData = generateSpeedometerSvg(inputData.symptomScores, 258, {
      languages: ["en_US"],
    });
    const expectedPath = "src/tests/resources/mockSpeedometer.svg";
    if (TestFlags.regenerateValues) {
      fs.writeFileSync(expectedPath, actualData);
    } else {
      const expectedData = fs.readFileSync(expectedPath);
      assert.equal(actualData, expectedData.toString("utf8"));
    }
  });

  it("should generate an empty chart the same way", () => {
    const actualData = generateSpeedometerSvg([], 258, {languages: ["en-US"]});
    const expectedPath = "src/tests/resources/emptySpeedometer.svg";
    if (TestFlags.regenerateValues) {
      fs.writeFileSync(expectedPath, actualData);
    } else {
      const expectedData = fs.readFileSync(expectedPath);
      assert.equal(actualData, expectedData.toString("utf8"));
    }
  });
});
