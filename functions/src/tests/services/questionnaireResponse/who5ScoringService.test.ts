//
// This source file is part of the MyHeartCounts-Firebase project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  FHIRQuestionnaireResponse,
  Score,
} from "@stanfordbdhg/myheartcounts-models";
import { expect } from "chai";
import { describe, it } from "mocha";
import {
  DefaultWho5ScoreCalculator,
  Who5ScoringQuestionnaireResponseService,
} from "../../../services/questionnaireResponse/who5ScoringService.js";

describe("Who5ScoringQuestionnaireResponseService", () => {
  describe("DefaultWho5ScoreCalculator", () => {
    it("should calculate maximum score (all 5s = 25)", () => {
      const calculator = new DefaultWho5ScoreCalculator();
      const answers = {
        "f641ae63-47d5-447e-8dd4-afe1685d4b1f": 5,
        "a07c0c00-3f05-4273-f7fc-ca6a15686efe": 5,
        "76b48a80-9eb9-4a14-8a8d-a09e980d2be3": 5,
        "23c4edfa-fdbe-4884-8d26-173599f7dffb": 5,
        "80c92e40-1223-4cd8-806c-896e0868703f": 5,
      };
      const score = calculator.calculate(answers);

      expect(score).to.be.instanceOf(Score);
      expect(score.overallScore).to.equal(25);
      expect(score.domainScores).to.deep.equal({});
    });

    it("should calculate minimum score (all 0s = 0)", () => {
      const calculator = new DefaultWho5ScoreCalculator();
      const answers = {
        "f641ae63-47d5-447e-8dd4-afe1685d4b1f": 0,
        "a07c0c00-3f05-4273-f7fc-ca6a15686efe": 0,
        "76b48a80-9eb9-4a14-8a8d-a09e980d2be3": 0,
        "23c4edfa-fdbe-4884-8d26-173599f7dffb": 0,
        "80c92e40-1223-4cd8-806c-896e0868703f": 0,
      };
      const score = calculator.calculate(answers);

      expect(score).to.be.instanceOf(Score);
      expect(score.overallScore).to.equal(0);
      expect(score.domainScores).to.deep.equal({});
    });

    it("should calculate mixed score (5+4+3+2+1 = 15)", () => {
      const calculator = new DefaultWho5ScoreCalculator();
      const answers = {
        "f641ae63-47d5-447e-8dd4-afe1685d4b1f": 5,
        "a07c0c00-3f05-4273-f7fc-ca6a15686efe": 4,
        "76b48a80-9eb9-4a14-8a8d-a09e980d2be3": 3,
        "23c4edfa-fdbe-4884-8d26-173599f7dffb": 2,
        "80c92e40-1223-4cd8-806c-896e0868703f": 1,
      };
      const score = calculator.calculate(answers);

      expect(score).to.be.instanceOf(Score);
      expect(score.overallScore).to.equal(15);
      expect(score.domainScores).to.deep.equal({});
    });

    it("should handle partial answers", () => {
      const calculator = new DefaultWho5ScoreCalculator();
      const answers = {
        "f641ae63-47d5-447e-8dd4-afe1685d4b1f": 5,
        "a07c0c00-3f05-4273-f7fc-ca6a15686efe": 4,
        "76b48a80-9eb9-4a14-8a8d-a09e980d2be3": 3,
      };
      const score = calculator.calculate(answers);

      expect(score).to.be.instanceOf(Score);
      expect(score.overallScore).to.equal(12);
      expect(score.domainScores).to.deep.equal({});
    });

    it("should handle empty answers", () => {
      const calculator = new DefaultWho5ScoreCalculator();
      const answers = {};
      const score = calculator.calculate(answers);

      expect(score).to.be.instanceOf(Score);
      expect(score.overallScore).to.equal(0);
      expect(score.domainScores).to.deep.equal({});
    });
  });

  describe("handle method", () => {
    it("should return false for non-matching questionnaire URLs", async () => {
      const mockDatabaseService = {} as any;
      const mockCalculator = new DefaultWho5ScoreCalculator();

      const service = new Who5ScoringQuestionnaireResponseService({
        databaseService: mockDatabaseService,
        scoreCalculator: mockCalculator,
      });

      const mockResponse = {
        id: "test-response-id",
        path: "users/test-user/questionnaireResponses/test-response-id",
        lastUpdate: new Date(),
        content: new FHIRQuestionnaireResponse({
          id: "test-response",
          authored: new Date(),
          questionnaire: "non-matching-questionnaire-url",
          item: [],
        }),
      };

      const result = await service.handle("test-user", mockResponse, {
        isNew: true,
      });

      expect(result).to.be.false;
    });

    it("should return true for valid WHO-5 responses", async () => {
      const mockDatabaseService = {
        runTransaction: () => Promise.resolve(),
      } as any;
      const mockCalculator = new DefaultWho5ScoreCalculator();

      const service = new Who5ScoringQuestionnaireResponseService({
        databaseService: mockDatabaseService,
        scoreCalculator: mockCalculator,
      });

      const mockResponse = {
        id: "test-response-id",
        path: "users/test-user/questionnaireResponses/test-response-id",
        lastUpdate: new Date(),
        content: new FHIRQuestionnaireResponse({
          id: "test-response",
          authored: new Date(),
          questionnaire: "https://myheartcounts.stanford.edu/fhir/survey/who5",
          item: [
            {
              linkId: "f641ae63-47d5-447e-8dd4-afe1685d4b1f",
              answer: [
                {
                  valueCoding: {
                    code: "all-of-the-time",
                    display: "All of the Time",
                    system: "urn:uuid:be70ecb9-67a8-45c9-9ba5-810a7d6dc6ff",
                  },
                },
              ],
            },
            {
              linkId: "a07c0c00-3f05-4273-f7fc-ca6a15686efe",
              answer: [
                {
                  valueCoding: {
                    code: "most-of-the-time",
                    display: "Most of the time",
                    system: "urn:uuid:be70ecb9-67a8-45c9-9ba5-810a7d6dc6ff",
                  },
                },
              ],
            },
            {
              linkId: "76b48a80-9eb9-4a14-8a8d-a09e980d2be3",
              answer: [
                {
                  valueCoding: {
                    code: "more-than-half-of-the-time",
                    display: "More than half of the time",
                    system: "urn:uuid:be70ecb9-67a8-45c9-9ba5-810a7d6dc6ff",
                  },
                },
              ],
            },
            {
              linkId: "23c4edfa-fdbe-4884-8d26-173599f7dffb",
              answer: [
                {
                  valueCoding: {
                    code: "less-than-half-of-the-time",
                    display: "Less than half of the time",
                    system: "urn:uuid:be70ecb9-67a8-45c9-9ba5-810a7d6dc6ff",
                  },
                },
              ],
            },
            {
              linkId: "80c92e40-1223-4cd8-806c-896e0868703f",
              answer: [
                {
                  valueCoding: {
                    code: "some-of-the-time",
                    display: "Some of the time",
                    system: "urn:uuid:be70ecb9-67a8-45c9-9ba5-810a7d6dc6ff",
                  },
                },
              ],
            },
          ],
        }),
      };

      const result = await service.handle("test-user", mockResponse, {
        isNew: true,
      });

      expect(result).to.be.true;
    });

    it("should return false when all answers are missing", async () => {
      const mockDatabaseService = {
        runTransaction: () => Promise.resolve(),
      } as any;
      const mockCalculator = new DefaultWho5ScoreCalculator();

      const service = new Who5ScoringQuestionnaireResponseService({
        databaseService: mockDatabaseService,
        scoreCalculator: mockCalculator,
      });

      const mockResponse = {
        id: "test-response-id",
        path: "users/test-user/questionnaireResponses/test-response-id",
        lastUpdate: new Date(),
        content: new FHIRQuestionnaireResponse({
          id: "test-response",
          authored: new Date(),
          questionnaire: "https://myheartcounts.stanford.edu/fhir/survey/who5",
          item: [],
        }),
      };

      const result = await service.handle("test-user", mockResponse, {
        isNew: true,
      });

      expect(result).to.be.false;
    });

    it("should return false when fewer than 5 questions are answered", async () => {
      const mockDatabaseService = {
        runTransaction: () => Promise.resolve(),
      } as any;
      const mockCalculator = new DefaultWho5ScoreCalculator();

      const service = new Who5ScoringQuestionnaireResponseService({
        databaseService: mockDatabaseService,
        scoreCalculator: mockCalculator,
      });

      const mockResponse = {
        id: "test-response-id",
        path: "users/test-user/questionnaireResponses/test-response-id",
        lastUpdate: new Date(),
        content: new FHIRQuestionnaireResponse({
          id: "test-response",
          authored: new Date(),
          questionnaire: "https://myheartcounts.stanford.edu/fhir/survey/who5",
          item: [
            {
              linkId: "f641ae63-47d5-447e-8dd4-afe1685d4b1f",
              answer: [
                {
                  valueCoding: {
                    code: "all-of-the-time",
                    display: "All of the Time",
                    system: "urn:uuid:be70ecb9-67a8-45c9-9ba5-810a7d6dc6ff",
                  },
                },
              ],
            },
            {
              linkId: "a07c0c00-3f05-4273-f7fc-ca6a15686efe",
              answer: [
                {
                  valueCoding: {
                    code: "most-of-the-time",
                    display: "Most of the time",
                    system: "urn:uuid:be70ecb9-67a8-45c9-9ba5-810a7d6dc6ff",
                  },
                },
              ],
            },
          ],
        }),
      };

      const result = await service.handle("test-user", mockResponse, {
        isNew: true,
      });

      expect(result).to.be.false;
    });

    it("should handle database transaction errors gracefully", async () => {
      const mockDatabaseService = {
        runTransaction: () => Promise.reject(new Error("Transaction failed")),
      } as any;
      const mockCalculator = new DefaultWho5ScoreCalculator();

      const service = new Who5ScoringQuestionnaireResponseService({
        databaseService: mockDatabaseService,
        scoreCalculator: mockCalculator,
      });

      const mockResponse = {
        id: "test-response-id",
        path: "users/test-user/questionnaireResponses/test-response-id",
        lastUpdate: new Date(),
        content: new FHIRQuestionnaireResponse({
          id: "test-response",
          authored: new Date(),
          questionnaire: "https://myheartcounts.stanford.edu/fhir/survey/who5",
          item: [
            {
              linkId: "f641ae63-47d5-447e-8dd4-afe1685d4b1f",
              answer: [
                {
                  valueCoding: {
                    code: "all-of-the-time",
                    display: "All of the Time",
                    system: "urn:uuid:be70ecb9-67a8-45c9-9ba5-810a7d6dc6ff",
                  },
                },
              ],
            },
            {
              linkId: "a07c0c00-3f05-4273-f7fc-ca6a15686efe",
              answer: [
                {
                  valueCoding: {
                    code: "most-of-the-time",
                    display: "Most of the time",
                    system: "urn:uuid:be70ecb9-67a8-45c9-9ba5-810a7d6dc6ff",
                  },
                },
              ],
            },
            {
              linkId: "76b48a80-9eb9-4a14-8a8d-a09e980d2be3",
              answer: [
                {
                  valueCoding: {
                    code: "more-than-half-of-the-time",
                    display: "More than half of the time",
                    system: "urn:uuid:be70ecb9-67a8-45c9-9ba5-810a7d6dc6ff",
                  },
                },
              ],
            },
            {
              linkId: "23c4edfa-fdbe-4884-8d26-173599f7dffb",
              answer: [
                {
                  valueCoding: {
                    code: "less-than-half-of-the-time",
                    display: "Less than half of the time",
                    system: "urn:uuid:be70ecb9-67a8-45c9-9ba5-810a7d6dc6ff",
                  },
                },
              ],
            },
            {
              linkId: "80c92e40-1223-4cd8-806c-896e0868703f",
              answer: [
                {
                  valueCoding: {
                    code: "some-of-the-time",
                    display: "Some of the time",
                    system: "urn:uuid:be70ecb9-67a8-45c9-9ba5-810a7d6dc6ff",
                  },
                },
              ],
            },
          ],
        }),
      };

      try {
        await service.handle("test-user", mockResponse, { isNew: true });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.equal("Transaction failed");
      }
    });

    it("should extract valueCoding.code correctly", async () => {
      const mockDatabaseService = {
        runTransaction: () => Promise.resolve(),
      } as any;
      const mockCalculator = new DefaultWho5ScoreCalculator();

      const service = new Who5ScoringQuestionnaireResponseService({
        databaseService: mockDatabaseService,
        scoreCalculator: mockCalculator,
      });

      const mockResponse = {
        id: "test-response-id",
        path: "users/test-user/questionnaireResponses/test-response-id",
        lastUpdate: new Date(),
        content: new FHIRQuestionnaireResponse({
          id: "test-response",
          authored: new Date(),
          questionnaire: "https://myheartcounts.stanford.edu/fhir/survey/who5",
          item: [
            {
              linkId: "f641ae63-47d5-447e-8dd4-afe1685d4b1f",
              answer: [
                {
                  valueCoding: {
                    code: "at-no-time",
                    display: "At no time",
                    system: "urn:uuid:be70ecb9-67a8-45c9-9ba5-810a7d6dc6ff",
                  },
                },
              ],
            },
            {
              linkId: "a07c0c00-3f05-4273-f7fc-ca6a15686efe",
              answer: [
                {
                  valueCoding: {
                    code: "at-no-time",
                    display: "At no time",
                    system: "urn:uuid:be70ecb9-67a8-45c9-9ba5-810a7d6dc6ff",
                  },
                },
              ],
            },
            {
              linkId: "76b48a80-9eb9-4a14-8a8d-a09e980d2be3",
              answer: [
                {
                  valueCoding: {
                    code: "at-no-time",
                    display: "At no time",
                    system: "urn:uuid:be70ecb9-67a8-45c9-9ba5-810a7d6dc6ff",
                  },
                },
              ],
            },
            {
              linkId: "23c4edfa-fdbe-4884-8d26-173599f7dffb",
              answer: [
                {
                  valueCoding: {
                    code: "at-no-time",
                    display: "At no time",
                    system: "urn:uuid:be70ecb9-67a8-45c9-9ba5-810a7d6dc6ff",
                  },
                },
              ],
            },
            {
              linkId: "80c92e40-1223-4cd8-806c-896e0868703f",
              answer: [
                {
                  valueCoding: {
                    code: "at-no-time",
                    display: "At no time",
                    system: "urn:uuid:be70ecb9-67a8-45c9-9ba5-810a7d6dc6ff",
                  },
                },
              ],
            },
          ],
        }),
      };

      const result = await service.handle("test-user", mockResponse, {
        isNew: true,
      });

      expect(result).to.be.true;
    });
  });
});
