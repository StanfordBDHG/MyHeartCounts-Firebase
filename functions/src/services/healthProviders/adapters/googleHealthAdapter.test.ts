// This source file is part of the MyHeart Counts project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

import { expect } from "chai";
import {
  GoogleHealthAdapter,
  normalizeGoogleHealth,
} from "./googleHealthAdapter.js";
import { type ProviderTokens } from "../../../models/index.js";
import { type ProviderObservation } from "../healthProviderAdapter.js";

const subject = { reference: "user/u1" };

const fakeTokens: ProviderTokens = {
  accessToken: "access",
  refreshToken: "refresh",
  expiresAt: new Date(Date.now() + 3600_000),
  scopes: [],
  providerUserId: "u",
};

const stubFetch = (route: (url: string) => unknown): (() => void) => {
  const original = globalThis.fetch;
  globalThis.fetch = ((input: unknown) => {
    const url =
      typeof input === "string" ? input : (input as { url: string }).url;
    const payload = route(url);
    const response =
      typeof payload === "number" ?
        { ok: false, status: payload, text: () => Promise.resolve("error") }
      : {
          ok: true,
          status: 200,
          text: () =>
            Promise.resolve(
              payload === undefined ? "" : JSON.stringify(payload),
            ),
        };
    return Promise.resolve(response as Response);
  }) as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
};

const observationFor = (
  observations: ProviderObservation[],
  metric: string,
) => {
  const match = observations.find((o) => o.metric === metric);
  if (match === undefined)
    throw new Error(`no observation for metric ${metric}`);
  return match.observation;
};

describe("GoogleHealthAdapter: normalizeGoogleHealth", () => {
  it("parses int64-as-string fields and converts to metric units", () => {
    const result = normalizeGoogleHealth(
      {
        steps: [
          {
            steps: {
              count: "8000",
              interval: {
                startTime: "2026-01-01T00:00:00Z",
                endTime: "2026-01-02T00:00:00Z",
              },
            },
          },
        ],
        distance: [
          {
            distance: {
              millimeters: "5000000", // 5 km
              interval: {
                startTime: "2026-01-01T00:00:00Z",
                endTime: "2026-01-02T00:00:00Z",
              },
            },
          },
        ],
        weight: [
          {
            weight: {
              weightGrams: 70500,
              sampleTime: { physicalTime: "2026-01-01T08:00:00Z" },
            },
          },
        ],
        height: [
          {
            height: {
              heightMillimeters: "1750",
              sampleTime: { physicalTime: "2026-01-01T08:00:00Z" },
            },
          },
        ],
      },
      subject,
    );

    expect(observationFor(result, "steps").valueQuantity?.value).to.equal(8000);
    expect(
      observationFor(result, "distanceWalkingRunning").valueQuantity?.value,
    ).to.equal(5000);
    expect(observationFor(result, "bodyWeight").valueQuantity?.value).to.equal(
      70.5,
    );
    expect(observationFor(result, "height").valueQuantity?.value).to.equal(
      1.75,
    );
  });

  it("prefers RMSSD over SDNN for heart rate variability", () => {
    const result = normalizeGoogleHealth(
      {
        heartRateVariability: [
          {
            heartRateVariability: {
              rootMeanSquareOfSuccessiveDifferencesMilliseconds: 65,
              standardDeviationMilliseconds: 40,
              sampleTime: { physicalTime: "2026-01-01T06:00:00Z" },
            },
          },
        ],
      },
      subject,
    );
    expect(
      observationFor(result, "heartRateVariability").valueQuantity?.value,
    ).to.equal(65);
  });

  it("falls back to SDNN when RMSSD is absent", () => {
    const result = normalizeGoogleHealth(
      {
        heartRateVariability: [
          {
            heartRateVariability: {
              standardDeviationMilliseconds: 40,
              sampleTime: { physicalTime: "2026-01-01T06:00:00Z" },
            },
          },
        ],
      },
      subject,
    );
    expect(
      observationFor(result, "heartRateVariability").valueQuantity?.value,
    ).to.equal(40);
  });

  it("maps blood glucose samples", () => {
    const result = normalizeGoogleHealth(
      {
        bloodGlucose: [
          {
            bloodGlucose: {
              bloodGlucoseMilligramsPerDeciliter: 95,
              sampleTime: { physicalTime: "2026-01-01T07:00:00Z" },
            },
          },
        ],
      },
      subject,
    );
    expect(
      observationFor(result, "bloodGlucose").valueQuantity?.value,
    ).to.equal(95);
  });

  it("maps core body temperature samples", () => {
    const result = normalizeGoogleHealth(
      {
        coreBodyTemperature: [
          {
            coreBodyTemperature: {
              temperatureCelsius: 37.1,
              sampleTime: { physicalTime: "2026-01-01T07:00:00Z" },
            },
          },
        ],
      },
      subject,
    );
    expect(
      observationFor(result, "bodyTemperature").valueQuantity?.value,
    ).to.equal(37.1);
  });

  it("maps daily-summary date objects to a midday UTC instant", () => {
    const result = normalizeGoogleHealth(
      {
        dailyRestingHeartRate: [
          {
            dailyRestingHeartRate: {
              beatsPerMinute: "55",
              date: { year: 2026, month: 1, day: 15 },
            },
          },
        ],
        dailyRespiratoryRate: [
          {
            dailyRespiratoryRate: {
              breathsPerMinute: 14.5,
              date: { year: 2026, month: 1, day: 15 },
            },
          },
        ],
        dailyOxygenSaturation: [
          {
            dailyOxygenSaturation: {
              averagePercentage: 97.5,
              date: { year: 2026, month: 1, day: 15 },
              lowerBoundPercentage: 96,
              upperBoundPercentage: 99,
            },
          },
        ],
      },
      subject,
    );
    expect(
      observationFor(result, "restingHeartRate").valueQuantity?.value,
    ).to.equal(55);
    expect(
      observationFor(result, "respiratoryRate").valueQuantity?.value,
    ).to.equal(14.5);
    expect(
      observationFor(result, "oxygenSaturation").valueQuantity?.value,
    ).to.equal(97.5);
    expect(
      observationFor(
        result,
        "restingHeartRate",
      ).effectiveDateTime?.toISOString(),
    ).to.equal("2026-01-15T12:00:00.000Z");
  });

  it("maps sleep stage minutes and total duration, skipping absent stages", () => {
    const result = normalizeGoogleHealth(
      {
        sleep: [
          {
            sleep: {
              interval: {
                startTime: "2026-01-01T23:00:00Z",
                endTime: "2026-01-02T07:00:00Z",
              },
              summary: {
                minutesAsleep: "460",
                stagesSummary: [
                  { type: "DEEP", minutes: "90" },
                  { type: "AWAKE", minutes: "20" },
                ],
              },
            },
          },
        ],
      },
      subject,
    );
    expect(
      observationFor(result, "sleepDuration").valueQuantity?.value,
    ).to.equal(460);
    expect(observationFor(result, "sleepDeep").valueQuantity?.value).to.equal(
      90,
    );
    expect(observationFor(result, "sleepAwake").valueQuantity?.value).to.equal(
      20,
    );
    const metrics = result.map((o) => o.metric);
    expect(metrics).to.not.include("sleepRem");
    expect(metrics).to.not.include("sleepLight");
  });

  it("computes exercise duration in minutes from the interval", () => {
    const result = normalizeGoogleHealth(
      {
        exercise: [
          {
            exercise: {
              interval: {
                startTime: "2026-01-01T10:00:00Z",
                endTime: "2026-01-01T10:30:00Z",
              },
            },
          },
        ],
      },
      subject,
    );
    expect(
      observationFor(result, "workoutDuration").valueQuantity?.value,
    ).to.equal(30);
  });

  it("maps floors climbed and basal energy burned intervals", () => {
    const result = normalizeGoogleHealth(
      {
        floors: [
          {
            floors: {
              count: "12",
              interval: {
                startTime: "2026-01-01T00:00:00Z",
                endTime: "2026-01-02T00:00:00Z",
              },
            },
          },
        ],
        basalEnergyBurned: [
          {
            basalEnergyBurned: {
              kcal: 1500,
              interval: {
                startTime: "2026-01-01T00:00:00Z",
                endTime: "2026-01-02T00:00:00Z",
              },
            },
          },
        ],
      },
      subject,
    );
    expect(
      observationFor(result, "flightsClimbed").valueQuantity?.value,
    ).to.equal(12);
    expect(
      observationFor(result, "basalEnergyBurned").valueQuantity?.value,
    ).to.equal(1500);
  });

  it("skips items missing the expected union field", () => {
    const result = normalizeGoogleHealth({ steps: [{}] }, subject);
    expect(result).to.have.lengthOf(0);
  });
});

describe("GoogleHealthAdapter: fetchObservations", () => {
  it("reconciles each data type and tolerates a failing endpoint", async () => {
    const restore = stubFetch((url) => {
      if (url.includes("/dataTypes/steps/dataPoints:reconcile")) {
        return {
          dataPoints: [
            {
              steps: {
                count: "8000",
                interval: {
                  startTime: "2026-01-01T00:00:00Z",
                  endTime: "2026-01-02T00:00:00Z",
                },
              },
            },
          ],
        };
      }
      if (url.includes("/dataTypes/weight/dataPoints:reconcile")) return 500; // transient failure
      return { dataPoints: [] };
    });
    try {
      const adapter = new GoogleHealthAdapter();
      const result = await adapter.fetchObservations({
        tokens: fakeTokens,
        since: new Date("2026-01-01T00:00:00Z"),
        until: new Date("2026-01-02T00:00:00Z"),
        subject,
      });
      expect(observationFor(result, "steps").valueQuantity?.value).to.equal(
        8000,
      );
    } finally {
      restore();
    }
  });

  it("fetches floors and basal-energy-burned data types", async () => {
    const restore = stubFetch((url) => {
      if (url.includes("/dataTypes/floors/dataPoints:reconcile")) {
        return {
          dataPoints: [
            {
              floors: {
                count: "5",
                interval: {
                  startTime: "2026-01-01T00:00:00Z",
                  endTime: "2026-01-02T00:00:00Z",
                },
              },
            },
          ],
        };
      }
      if (url.includes("/dataTypes/basal-energy-burned/dataPoints:reconcile")) {
        return {
          dataPoints: [
            {
              basalEnergyBurned: {
                kcal: 1400,
                interval: {
                  startTime: "2026-01-01T00:00:00Z",
                  endTime: "2026-01-02T00:00:00Z",
                },
              },
            },
          ],
        };
      }
      return { dataPoints: [] };
    });
    try {
      const adapter = new GoogleHealthAdapter();
      const result = await adapter.fetchObservations({
        tokens: fakeTokens,
        since: new Date("2026-01-01T00:00:00Z"),
        until: new Date("2026-01-02T00:00:00Z"),
        subject,
      });
      expect(
        observationFor(result, "flightsClimbed").valueQuantity?.value,
      ).to.equal(5);
      expect(
        observationFor(result, "basalEnergyBurned").valueQuantity?.value,
      ).to.equal(1400);
    } finally {
      restore();
    }
  });

  it("follows pageToken pagination", async () => {
    let calls = 0;
    const restore = stubFetch((url) => {
      if (!url.includes("/dataTypes/steps/dataPoints:reconcile")) {
        return { dataPoints: [] };
      }
      calls += 1;
      if (!url.includes("pageToken")) {
        return {
          dataPoints: [
            {
              steps: {
                count: "1000",
                interval: {
                  startTime: "2026-01-01T00:00:00Z",
                  endTime: "2026-01-01T12:00:00Z",
                },
              },
            },
          ],
          nextPageToken: "page2",
        };
      }
      return {
        dataPoints: [
          {
            steps: {
              count: "500",
              interval: {
                startTime: "2026-01-01T12:00:00Z",
                endTime: "2026-01-02T00:00:00Z",
              },
            },
          },
        ],
      };
    });
    try {
      const adapter = new GoogleHealthAdapter();
      const result = await adapter.fetchObservations({
        tokens: fakeTokens,
        since: new Date("2026-01-01T00:00:00Z"),
        until: new Date("2026-01-02T00:00:00Z"),
        subject,
      });
      expect(calls).to.equal(2);
      expect(result.filter((o) => o.metric === "steps")).to.have.lengthOf(2);
    } finally {
      restore();
    }
  });
});

describe("GoogleHealthAdapter: fetchRawArchives", () => {
  it("archives continuous heart rate via the non-reconciled list endpoint", async () => {
    const restore = stubFetch((url) => {
      if (url.includes("/dataTypes/heart-rate/dataPoints?")) {
        return {
          dataPoints: [
            {
              heartRate: {
                beatsPerMinute: "60",
                sampleTime: { physicalTime: "2026-01-01T00:00:00Z" },
              },
            },
          ],
        };
      }
      return { dataPoints: [] };
    });
    try {
      const adapter = new GoogleHealthAdapter();
      const archives = await adapter.fetchRawArchives({
        tokens: fakeTokens,
        since: new Date("2026-01-01T00:00:00Z"),
        until: new Date("2026-01-02T00:00:00Z"),
        subject,
      });
      expect(archives).to.have.lengthOf(1);
      expect(archives[0]?.dataType).to.equal("heartRate");
    } finally {
      restore();
    }
  });

  it("returns no archive when there is nothing to report", async () => {
    const restore = stubFetch(() => ({ dataPoints: [] }));
    try {
      const adapter = new GoogleHealthAdapter();
      const archives = await adapter.fetchRawArchives({
        tokens: fakeTokens,
        since: new Date("2026-01-01T00:00:00Z"),
        until: new Date("2026-01-02T00:00:00Z"),
        subject,
      });
      expect(archives).to.have.lengthOf(0);
    } finally {
      restore();
    }
  });
});

describe("GoogleHealthAdapter: OAuth", () => {
  it("requests offline access and forces re-consent so a refresh_token is returned", () => {
    const adapter = new GoogleHealthAdapter();
    const url = new URL(
      adapter.buildAuthorizationUrl({
        state: "s1",
        redirectUri: "https://example.test/callback",
      }),
    );
    expect(url.searchParams.get("access_type")).to.equal("offline");
    expect(url.searchParams.get("prompt")).to.equal("consent");
    expect(url.searchParams.get("redirect_uri")).to.equal(
      "https://example.test/callback",
    );
  });

  it("reuses the prior refresh token when a refresh response omits one", async () => {
    const restore = stubFetch((url) => {
      if (url === "https://oauth2.googleapis.com/token") {
        return { access_token: "new-access", expires_in: 3600 };
      }
      return {};
    });
    try {
      const adapter = new GoogleHealthAdapter();
      const tokens = await adapter.refreshTokens("original-refresh-token");
      expect(tokens.refreshToken).to.equal("original-refresh-token");
      expect(tokens.accessToken).to.equal("new-access");
    } finally {
      restore();
    }
  });
});
