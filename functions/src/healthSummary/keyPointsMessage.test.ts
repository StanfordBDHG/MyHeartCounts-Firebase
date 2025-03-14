//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {LocalizedText} from "@stanfordbdhg/engagehf-models";
import {expect} from "chai";
import {
  HealthSummaryDizzinessCategory,
  type HealthSummaryKeyPointMessage,
  healthSummaryKeyPointMessages,
  healthSummaryKeyPointTexts,
  HealthSummaryMedicationRecommendationsCategory,
  HealthSummarySymptomScoreCategory,
  HealthSummaryWeightCategory,
} from "./keyPointsMessage.js";
import {readCsv} from "../tests/helpers/csv.js";

describe("keyPointsMessage", () => {
  it("should generate the key point message json", () => {
    const keyPointMessages: HealthSummaryKeyPointMessage[] = [];
    readCsv("src/tests/resources/keyPointMessages.csv", 55, (line, index) => {
      if (index === 0) return;

      const recommendations =
        Object.values(HealthSummaryMedicationRecommendationsCategory).find(
          (category) => line[0] === category.toString(),
        ) ?? null;
      const symptoms =
        Object.values(HealthSummarySymptomScoreCategory).find(
          (category) => line[1] === category.toString(),
        ) ?? null;
      const dizziness =
        Object.values(HealthSummaryDizzinessCategory).find(
          (category) => line[2] === category.toString(),
        ) ?? null;
      const weight =
        Object.values(HealthSummaryWeightCategory).find(
          (category) => line[3] === category.toString(),
        ) ?? null;
      const texts = separateKeyPointTexts(line[4]).map(
        (text) => new LocalizedText({en: text}),
      );

      expect(recommendations, `recommendation: ${line[0]}`).to.not.be.null;
      expect(symptoms, `symptoms: ${line[1]}`).to.not.be.null;
      expect(dizziness, `dizziness: ${line[2]}`).to.not.be.null;
      expect(weight, `weight: ${line[3]}`).to.not.be.null;
      expect(texts).to.not.be.empty;

      if (
        recommendations === null ||
        symptoms === null ||
        dizziness === null ||
        weight === null ||
        texts.length === 0
      ) {
        expect.fail("Invalid key point message");
      }

      const message: HealthSummaryKeyPointMessage = {
        recommendationsCategory: recommendations,
        symptomScoreCategory: symptoms,
        dizzinessCategory: dizziness,
        weightCategory: weight,
        texts,
      };

      keyPointMessages.push(message);
    });

    expect(
      keyPointMessages,
      JSON.stringify(
        keyPointMessages.map((message) => ({
          ...message,
          texts: message.texts.map((text) => text.content),
        })),
        null,
        2,
      ),
    ).to.deep.equal(healthSummaryKeyPointMessages.value);
  });

  it("should cover all combinations", () => {
    for (const recommendations of Object.values(
      HealthSummaryMedicationRecommendationsCategory,
    )) {
      for (const symptomScore of Object.values(
        HealthSummarySymptomScoreCategory,
      )) {
        for (const dizziness of Object.values(HealthSummaryDizzinessCategory)) {
          for (const weight of Object.values(HealthSummaryWeightCategory)) {
            const texts = healthSummaryKeyPointTexts({
              recommendations,
              symptomScore,
              dizziness,
              weight,
            });
            expect(
              texts ?? [],
              `${recommendations}, ${symptomScore}, ${dizziness}, ${weight}`,
            ).to.not.be.empty;
          }
        }
      }
    }
  });
});

function separateKeyPointTexts(string: string): string[] {
  return string
    .split("\n")
    .map((line) =>
      (line.match(/[0-9]\.\) .*/g) ? line.substring(4) : line)
        .replace(/\s+/g, " ")
        .trim(),
    );
}
