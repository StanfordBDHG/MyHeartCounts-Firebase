//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {FHIRQuestionnaireResponse} from "@stanfordbdhg/engagehf-models";
import {expect} from "chai";
import {DefaultSymptomScoreCalculator} from "./defaultSymptomScoreCalculator.js";
import {type SymptomScoreCalculator} from "./symptomScoreCalculator.js";
import {readCsv} from "../../tests/helpers/csv.js";

describe("DefaultSymptomScoreCalculator", () => {
  it("correctly computes symptom scores", () => {
    const calculator: SymptomScoreCalculator =
      new DefaultSymptomScoreCalculator();
    readCsv("src/tests/resources/symptomScores.csv", 2268, (values, index) => {
      if (index === 0) return;
      expect(values).to.have.length(18);

      const q1: Record<string, number> = {
        "Not at all limited": 5,
        "Slightly limited": 4,
        "Moderately limited": 3,
        "Quite a bit limited": 2,
        "Extremely limited": 1,
        "Limited for other reasons or do not do the activity": 6,
        "": 6,
      };
      const answer1a = q1[values[6]];
      expect(answer1a, values[6] + " - q1a").to.exist;
      const answer1b = q1[values[7]];
      expect(answer1b, values[7] + " - q1b").to.exist;
      const answer1c = q1[values[8]];
      expect(answer1c, values[8] + " - q1c").to.exist;

      const q2: Record<string, number> = {
        "Never over the past 2 weeks": 5,
        "Less than once a week": 4,
        "1-2 times a week": 3,
        "3 or more times a week, but not every day": 2,
        "Every morning": 1,
      };
      const answer2 = q2[values[9]];
      expect(answer2, values[9] + " - q2").to.exist;

      const q3: Record<string, number> = {
        "Never over the past 2 weeks": 7,
        "Less than once a week": 6,
        "1-2 times a week": 5,
        "3 or more times as week but not every day": 4,
        "At least once a day": 3,
        "Several times a day": 2,
        "All of the time": 1,
      };
      const answer3 = q3[values[10]];
      expect(answer3, values[10] + " - q3").to.exist;

      const q4: Record<string, number> = {
        "Never over the past 2 weeks": 7,
        "Less than once a week": 6,
        "1-2 times a week": 5,
        "3 or more times a week but not every day": 4,
        "At least once a day": 3,
        "Several times a day": 2,
        "All of the time": 1,
      };
      const answer4 = q4[values[11]];
      expect(answer4, values[11] + " - q4").to.exist;

      const q5: Record<string, number> = {
        "Never over the past 2 weeks": 5,
        "Less than once a week": 4,
        "1-2 times a week": 3,
        "3 or more times a week, but not every night": 2,
        "Every night": 1,
      };
      const answer5 = q5[values[12]];
      expect(answer5, values[12] + " - q5").to.exist;

      const q6: Record<string, number> = {
        "It has <b>extremely</b> limited my enjoyment of life": 1,
        "It has <b>slightly</b> limited my enjoyment of life": 4,
        "It has <b>not limited</b> my enjoyment of life at all": 5,
        "It has <b>moderately</b> limited my enjoyment of life": 3,
        "It has  limited my enjoyment of life <b>quite a bit</b>": 2,
      };
      const answer6 = q6[values[13]];
      expect(answer6, values[13] + " - q6").to.exist;

      const q7: Record<string, number> = {
        "Not at all satisfied": 1,
        "Mostly satisfied": 4,
        "Completely satisfied": 5,
        "Mostly dissatisfied": 2,
        "Somewhat satisfied": 3,
      };
      const answer7 = q7[values[14]];
      expect(answer7, values[14] + " - q7").to.exist;

      const q8: Record<string, number> = {
        "Extremely limited": 1,
        "Moderately limited": 3,
        "Does not apply or did not do for other reasons": 6,
        "Not at all limited": 5,
        "Slightly limited": 4,
        "Quite a bit limited": 2,
      };
      const answer8a = q8[values[15]];
      expect(answer8a, values[15] + " - q8a").to.exist;
      const answer8b = q8[values[16]];
      expect(answer8b, values[16] + " - q8b").to.exist;
      const answer8c = q8[values[17]];
      expect(answer8c, values[17] + " - q8c").to.exist;

      const response = FHIRQuestionnaireResponse.create({
        questionnaire:
          "http://spezi.health/fhir/questionnaire/9528ccc2-d1be-4c4c-9c3c-19f78e51ec19",
        questionnaireResponse: index.toString(),
        date: new Date(),
        answer1a,
        answer1b,
        answer1c,
        answer2,
        answer3,
        answer4,
        answer5,
        answer6,
        answer7,
        answer8a,
        answer8b,
        answer8c,
        answer9: (index % 6) - 1,
      });

      const score = calculator.calculate(response);

      expect(score.questionnaireResponseId).to.equal(response.id);
      expect(score.date).to.equal(response.authored);

      // In this test, we use approximations to compare the expected and actual values.
      // This is to avoid floating point precision issues. Therefore, we use a tolerance of 0.001,
      // which is a reasonable tolerance, since the values are shown to the user as integers anyways.

      if (score.physicalLimitsScore !== undefined) {
        expect(
          score.physicalLimitsScore,
          `${index} - Physical Limits: ${values.join(",")}`,
        ).to.approximately(parseFloat(values[1]), 0.001);
      } else {
        expect(values[1]).to.equal("");
      }

      if (score.symptomFrequencyScore !== undefined) {
        expect(
          score.symptomFrequencyScore,
          `${index} - Symptom Frequency: ${values.join(",")}`,
        ).to.approximately(parseFloat(values[2]), 0.001);
      } else {
        expect(values[2]).to.equal("");
      }

      if (score.qualityOfLifeScore !== undefined) {
        expect(
          score.qualityOfLifeScore,
          `${index} - Quality of Life: ${values.join(",")}`,
        ).to.approximately(parseFloat(values[3]), 0.001);
      } else {
        expect(values[3]).to.equal("");
      }

      if (score.socialLimitsScore !== undefined) {
        expect(
          score.socialLimitsScore,
          `${index} - Social Limits: ${values.join(",")}`,
        ).to.approximately(parseFloat(values[4]), 0.001);
      } else {
        expect(values[4]).to.equal("");
      }

      expect(
        score.overallScore,
        `${index} - Overall score: ${values.join(",")}`,
      ).to.approximately(parseFloat(values[5]), 0.001);

      expect(score.dizzinessScore, `Dizziness: ${values.join(",")}`).to.equal(
        (index % 6) - 1,
      );
    });
  });
});
