// This source file is part of the MyHeart Counts project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

import { expect } from "chai";
import {
  normalizeWithings,
  parseWithingsNotification,
  WithingsAdapter,
} from "./withingsAdapter.js";
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

const stubFetch = (
  route: (url: string, body: string) => unknown,
): { restore: () => void; bodies: Map<string, string> } => {
  const original = globalThis.fetch;
  const bodies = new Map<string, string>();
  globalThis.fetch = ((
    input: unknown,
    init?: { body?: URLSearchParams | string },
  ) => {
    const url =
      typeof input === "string" ? input : (input as { url: string }).url;
    const body = init?.body?.toString() ?? "";
    bodies.set(url, body);
    const payload = route(url, body);
    return Promise.resolve({
      ok: true,
      status: 200,
      text: () =>
        Promise.resolve(payload === undefined ? "" : JSON.stringify(payload)),
    } as Response);
  }) as typeof fetch;
  return {
    restore: () => {
      globalThis.fetch = original;
    },
    bodies,
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

describe("WithingsAdapter: normalizeWithings", () => {
  it("applies the value * 10^unit scaling and maps measure types", () => {
    const result = normalizeWithings(
      {
        measureGroups: [
          {
            grpid: 100,
            date: 1735732800, // 2025-01-01T12:00:00Z
            measures: [
              { value: 705, type: 1, unit: -1 }, // weight 70.5 kg
              { value: 60, type: 11, unit: 0 }, // heart pulse 60 bpm
              { value: 981, type: 54, unit: -1 }, // spo2 98.1 %
            ],
          },
        ],
      },
      subject,
    );

    expect(observationFor(result, "bodyWeight").valueQuantity?.value).to.equal(
      70.5,
    );
    expect(observationFor(result, "heartRate").valueQuantity?.value).to.equal(
      60,
    );
    expect(
      observationFor(result, "oxygenSaturation").valueQuantity?.value,
    ).to.be.closeTo(98.1, 1e-9);
    // Document id combines group id and measure type for uniqueness.
    expect(observationFor(result, "bodyWeight").id).to.equal("withings-100-1");
  });

  it("maps sleep summary durations from seconds to minutes", () => {
    const result = normalizeWithings(
      {
        sleep: [
          {
            id: 7,
            startdate: 1735689600,
            enddate: 1735718400,
            data: {
              deepsleepduration: 5400,
              remsleepduration: 3600,
              lightsleepduration: 7200,
              wakeupduration: 600,
              hr_average: 52,
              rr_average: 13,
            },
          },
        ],
      },
      subject,
    );
    expect(observationFor(result, "sleepDeep").valueQuantity?.value).to.equal(
      90,
    );
    expect(observationFor(result, "sleepRem").valueQuantity?.value).to.equal(
      60,
    );
    expect(
      observationFor(result, "restingHeartRate").valueQuantity?.value,
    ).to.equal(52);
    expect(observationFor(result, "sleepDeep").id).to.equal("withings-7");
  });

  it("skips sleep stages that are absent instead of emitting zeros", () => {
    const result = normalizeWithings(
      {
        sleep: [
          {
            id: 8,
            startdate: 1735689600,
            enddate: 1735718400,
            data: { deepsleepduration: 5400 },
          },
        ],
      },
      subject,
    );
    const metrics = result.map((o) => o.metric);
    expect(metrics).to.include("sleepDeep");
    expect(metrics).to.not.include("sleepRem");
    expect(metrics).to.not.include("sleepLight");
    expect(metrics).to.not.include("sleepAwake");
  });

  it("maps height, blood pressure, VO2 max and cardiovascular age measure types", () => {
    const result = normalizeWithings(
      {
        measureGroups: [
          {
            grpid: 200,
            date: 1735732800,
            measures: [
              { value: 175, type: 4, unit: -2 }, // height 1.75 m
              { value: 80, type: 9, unit: 0 }, // diastolic 80 mmHg
              { value: 120, type: 10, unit: 0 }, // systolic 120 mmHg
              { value: 421, type: 123, unit: -1 }, // vo2max 42.1 mL/kg/min
              { value: 41, type: 155, unit: 0 }, // vascular age 41 years
            ],
          },
        ],
      },
      subject,
    );
    expect(observationFor(result, "height").valueQuantity?.value).to.equal(
      1.75,
    );
    expect(
      observationFor(result, "bloodPressureDiastolic").valueQuantity?.value,
    ).to.equal(80);
    expect(
      observationFor(result, "bloodPressureSystolic").valueQuantity?.value,
    ).to.equal(120);
    expect(observationFor(result, "vo2Max").valueQuantity?.value).to.equal(
      42.1,
    );
    expect(
      observationFor(result, "cardiovascularAge").valueQuantity?.value,
    ).to.equal(41);
  });

  it("computes workout duration in minutes from the interval", () => {
    const result = normalizeWithings(
      {
        workouts: [{ id: 9, startdate: 1735732800, enddate: 1735734600 }],
      },
      subject,
    );
    expect(
      observationFor(result, "workoutDuration").valueQuantity?.value,
    ).to.equal(30);
    expect(observationFor(result, "workoutDuration").id).to.equal("withings-9");
  });

  it("ignores unmapped measure types", () => {
    const result = normalizeWithings(
      {
        measureGroups: [
          {
            grpid: 1,
            date: 1735732800,
            measures: [{ value: 5, type: 88, unit: 0 }],
          },
        ],
      },
      subject,
    );
    expect(result).to.have.lengthOf(0);
  });
});

describe("WithingsAdapter: fetchObservations", () => {
  it("calls the measure endpoints and normalizes measure groups", async () => {
    const { restore } = stubFetch((url) => {
      if (url.endsWith("/measure")) {
        return {
          status: 0,
          body: {
            measuregrps: [
              {
                grpid: 1,
                date: 1735732800,
                measures: [{ value: 705, type: 1, unit: -1 }],
              },
            ],
          },
        };
      }
      return { status: 0, body: {} };
    });
    try {
      const adapter = new WithingsAdapter();
      const result = await adapter.fetchObservations({
        tokens: fakeTokens,
        since: new Date("2026-01-01T00:00:00Z"),
        until: new Date("2026-01-02T00:00:00Z"),
        subject,
      });
      expect(
        observationFor(result, "bodyWeight").valueQuantity?.value,
      ).to.equal(70.5);
    } finally {
      restore();
    }
  });

  it("calls getworkouts and normalizes workout duration", async () => {
    const { restore, bodies } = stubFetch((url) => {
      if (url.endsWith("/v2/measure")) {
        return {
          status: 0,
          body: {
            series: [{ id: 5, startdate: 1735732800, enddate: 1735734600 }],
          },
        };
      }
      return { status: 0, body: {} };
    });
    try {
      const adapter = new WithingsAdapter();
      const result = await adapter.fetchObservations({
        tokens: fakeTokens,
        since: new Date("2026-01-01T00:00:00Z"),
        until: new Date("2026-01-02T00:00:00Z"),
        subject,
      });
      expect(
        observationFor(result, "workoutDuration").valueQuantity?.value,
      ).to.equal(30);
      const workoutsBody = bodies.get("https://wbsapi.withings.net/v2/measure");
      expect(workoutsBody).to.contain("action=getworkouts");
    } finally {
      restore();
    }
  });
});

describe("WithingsAdapter: fetchRawArchives", () => {
  it("archives intraday activity, sleep and unmapped measure types as raw dataType-tagged payloads", async () => {
    const { restore } = stubFetch((url) => {
      if (url.includes("/v2/measure")) {
        return { status: 0, body: { series: { "1735732800": { steps: 5 } } } };
      }
      if (url.includes("/v2/sleep")) {
        return { status: 0, body: { series: [{ startdate: 1, hr: [60] }] } };
      }
      // Plain (non-v2) /measure is the unmapped-measure-types getmeas call.
      if (url.endsWith("/measure")) {
        return {
          status: 0,
          body: {
            measuregrps: [
              {
                grpid: 1,
                date: 1735732800,
                measures: [{ value: 1, type: 76, unit: 0 }],
              },
            ],
          },
        };
      }
      return { status: 0, body: {} };
    });
    try {
      const adapter = new WithingsAdapter();
      const archives = await adapter.fetchRawArchives({
        tokens: fakeTokens,
        since: new Date("2026-01-01T00:00:00Z"),
        until: new Date("2026-01-02T00:00:00Z"),
        subject,
      });
      const dataTypes = archives.map((a) => a.dataType);
      expect(dataTypes).to.include("activityIntraday");
      expect(dataTypes).to.include("sleepIntraday");
      expect(dataTypes).to.include("measuresUnmapped");
    } finally {
      restore();
    }
  });

  it("drops an endpoint's archive instead of failing when it errors", async () => {
    const { restore } = stubFetch((url) => {
      if (url.includes("/measure")) {
        return { status: 293, error: "unauthorized", body: {} };
      }
      return { status: 0, body: { series: [] } };
    });
    try {
      const adapter = new WithingsAdapter();
      const archives = await adapter.fetchRawArchives({
        tokens: fakeTokens,
        since: new Date("2026-01-01T00:00:00Z"),
        until: new Date("2026-01-02T00:00:00Z"),
        subject,
      });
      expect(archives.map((a) => a.dataType)).to.deep.equal(["sleepIntraday"]);
    } finally {
      restore();
    }
  });
});

describe("WithingsAdapter: removeSubscription", () => {
  it("includes the callbackurl in the revoke request", async () => {
    const { restore, bodies } = stubFetch(() => ({ status: 0, body: {} }));
    try {
      const adapter = new WithingsAdapter();
      await adapter.removeSubscription({
        tokens: fakeTokens,
        callbackUrl: "https://example.test/withingsWebhook",
      });
      const notifyBody = bodies.get("https://wbsapi.withings.net/notify");
      expect(notifyBody).to.contain("action=revoke");
      expect(notifyBody).to.contain(
        encodeURIComponent("https://example.test/withingsWebhook"),
      );
    } finally {
      restore();
    }
  });

  it("skips the revoke entirely when no callbackUrl is supplied", async () => {
    const { restore, bodies } = stubFetch(() => ({ status: 0, body: {} }));
    try {
      const adapter = new WithingsAdapter();
      await adapter.removeSubscription({ tokens: fakeTokens });
      expect(bodies.size).to.equal(0);
    } finally {
      restore();
    }
  });
});

describe("WithingsAdapter: parseWithingsNotification", () => {
  it("parses userid and the epoch window", () => {
    const result = parseWithingsNotification({
      userid: "12345",
      appli: "44",
      startdate: "1735689600",
      enddate: "1735718400",
    });
    expect(result?.providerUserId).to.equal("12345");
    expect(result?.since?.toISOString()).to.equal("2025-01-01T00:00:00.000Z");
  });

  it("accepts a numeric userid", () => {
    expect(parseWithingsNotification({ userid: 99 })?.providerUserId).to.equal(
      "99",
    );
  });

  it("returns undefined when userid is missing", () => {
    expect(parseWithingsNotification({ appli: "1" })).to.equal(undefined);
    expect(parseWithingsNotification(null)).to.equal(undefined);
  });

  it("leaves the window undefined when dates are absent or non-numeric", () => {
    const result = parseWithingsNotification({ userid: "7", appli: "44" });
    expect(result?.providerUserId).to.equal("7");
    expect(result?.since).to.equal(undefined);
    expect(result?.until).to.equal(undefined);
  });
});
