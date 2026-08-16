// This source file is part of the MyHeart Counts project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

import { type Response } from "express";
import { logger } from "firebase-functions/v2";
import { type Request } from "firebase-functions/v2/https";
import { z } from "zod";
import { getWithingsClientId, getWithingsClientSecret } from "../../../env.js";
import {
  type FHIRReference,
  HealthProviderId,
  type ProviderTokens,
} from "../../../models/index.js";
import {
  type FetchObservationsParams,
  type HealthProviderAdapter,
  type ProviderObservation,
  type ProviderRawArchive,
  type WebhookHandling,
} from "../healthProviderAdapter.js";
import { postJson, settleEndpoint } from "../httpClient.js";
import { buildProviderObservation } from "../observationBuilder.js";
import { MetricSpecs, type MetricSpec } from "../providerCodes.js";

const AUTH_URL = "https://account.withings.com/oauth2_user/authorize2";
const OAUTH_URL = "https://wbsapi.withings.net/v2/oauth2";
const MEASURE_URL = "https://wbsapi.withings.net/measure";
const V2_MEASURE_URL = "https://wbsapi.withings.net/v2/measure";
const V2_SLEEP_URL = "https://wbsapi.withings.net/v2/sleep";
const NOTIFY_URL = "https://wbsapi.withings.net/notify";

const WITHINGS_SCOPES = ["user.metrics", "user.activity", "user.info"];

/** Withings `appli` notification categories we subscribe to. */
const NOTIFY_APPLI = [1 /* weight */, 16 /* activity */, 44 /* sleep */];

/** Withings integer measure types -> shared metric specs (getmeas). */
const MEASURE_TYPE_SPECS = new Map<number, MetricSpec>([
  [1, MetricSpecs.bodyWeight],
  [4, MetricSpecs.height],
  [6, MetricSpecs.bodyFatPercentage],
  [9, MetricSpecs.bloodPressureDiastolic],
  [10, MetricSpecs.bloodPressureSystolic],
  [11, MetricSpecs.heartRate],
  [54, MetricSpecs.oxygenSaturation],
  [71, MetricSpecs.bodyTemperature],
  [123, MetricSpecs.vo2Max],
  [155, MetricSpecs.cardiovascularAge],
]);

/**
 * Withings measure types with no shared MetricSpec (body composition beyond
 * weight/fat%, ECG-derived interval durations, AFib classification, nerve
 * health, etc.) — no HealthKit-equivalent construct exists for most of these,
 * and some (AFib, ECG intervals) are diagnostic-adjacent enough that treating
 * a raw provider code as a physiological quantity would misrepresent it.
 * getmeas is already being called for the mapped types above, so these are
 * fetched too and archived raw rather than silently dropped.
 */
const UNMAPPED_MEASURE_TYPES = [
  5, // fat-free mass
  8, // fat mass weight
  73, // skin temperature
  76, // muscle mass
  77, // hydration
  88, // bone mass
  91, // pulse wave velocity
  130, // AFib result
  135, // QRS interval (ECG)
  136, // PR interval (ECG)
  137, // QT interval (ECG)
  138, // corrected QT interval (ECG)
  139, // AFib result (PPG)
  167, // nerve health score
  168, // extracellular water
  169, // intracellular water
  170, // visceral fat
  174, // segmental fat mass
  175, // segmental muscle mass
  196, // electrodermal activity (feet)
];

const epochSeconds = (date: Date): number => Math.floor(date.getTime() / 1000);
const ymd = (date: Date): string => date.toISOString().slice(0, 10);
const minutesFromSeconds = (
  seconds: number | null | undefined,
): number | undefined =>
  seconds === null || seconds === undefined ?
    undefined
  : Math.round((seconds / 60) * 100) / 100;

// --- Raw response shapes (only the fields we consume) ----------------------

interface WithingsEnvelope<T> {
  status: number;
  body: T;
  error?: string;
}

interface WithingsTokenBody {
  userid: number | string;
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope?: string;
}

interface WithingsMeasure {
  value: number;
  type: number;
  unit: number;
}
interface WithingsMeasureGroup {
  grpid: number;
  date: number;
  measures: WithingsMeasure[];
}
interface WithingsActivity {
  date: string;
  steps?: number;
  distance?: number;
  calories?: number;
}
interface WithingsSleepSeries {
  id: number;
  startdate: number;
  enddate: number;
  date?: string;
  data?: {
    deepsleepduration?: number;
    remsleepduration?: number;
    lightsleepduration?: number;
    wakeupduration?: number;
    hr_average?: number;
    rr_average?: number;
  };
}
interface WithingsWorkout {
  id: number;
  startdate: number;
  enddate: number;
}

// --- Response / notification validation (zod) ------------------------------
// Withings payloads are untrusted; validate the fields we depend on and stay
// permissive about the rest.

const withingsTokenBodySchema = z
  .object({
    userid: z.union([z.number(), z.string()]),
    access_token: z.string().min(1),
    refresh_token: z.string().min(1),
    expires_in: z.number(),
    scope: z.string().optional(),
  })
  .passthrough();

const withingsNotificationSchema = z
  .object({
    userid: z.union([z.string(), z.number()]),
    startdate: z.union([z.string(), z.number()]).optional(),
    enddate: z.union([z.string(), z.number()]).optional(),
  })
  .passthrough();

const tokensFrom = (body: WithingsTokenBody): ProviderTokens => ({
  accessToken: body.access_token,
  refreshToken: body.refresh_token,
  expiresAt: new Date(Date.now() + body.expires_in * 1000),
  scopes: body.scope ? body.scope.split(",") : WITHINGS_SCOPES,
  providerUserId: String(body.userid),
});

// --- Pure normalization (exported for unit tests) --------------------------

const midday = (day: string): Date => new Date(`${day}T12:00:00Z`);

export const normalizeWithings = (
  raw: {
    measureGroups?: WithingsMeasureGroup[];
    activities?: WithingsActivity[];
    sleep?: WithingsSleepSeries[];
    workouts?: WithingsWorkout[];
  },
  subject: FHIRReference,
): ProviderObservation[] => {
  const out: ProviderObservation[] = [];
  const add = (
    spec: MetricSpec,
    value: number | undefined,
    effective: Date | { start: Date; end: Date },
    sampleId: string,
  ) => {
    if (value === undefined || Number.isNaN(value)) return;
    out.push(
      buildProviderObservation({
        provider: HealthProviderId.withings,
        sourceName: "Withings",
        subject,
        spec,
        value,
        effective,
        sampleId,
      }),
    );
  };

  for (const group of raw.measureGroups ?? []) {
    const effective = new Date(group.date * 1000);
    for (const measure of group.measures) {
      const spec = MEASURE_TYPE_SPECS.get(measure.type);
      if (!spec) continue;
      const value = measure.value * Math.pow(10, measure.unit);
      add(spec, value, effective, `${group.grpid}-${measure.type}`);
    }
  }

  for (const activity of raw.activities ?? []) {
    add(
      MetricSpecs.steps,
      activity.steps,
      midday(activity.date),
      activity.date,
    );
    add(
      MetricSpecs.distanceWalkingRunning,
      activity.distance,
      midday(activity.date),
      activity.date,
    );
    add(
      MetricSpecs.activeEnergyBurned,
      activity.calories,
      midday(activity.date),
      activity.date,
    );
  }

  for (const series of raw.sleep ?? []) {
    const period = {
      start: new Date(series.startdate * 1000),
      end: new Date(series.enddate * 1000),
    };
    const id = String(series.id);
    add(
      MetricSpecs.sleepDeep,
      minutesFromSeconds(series.data?.deepsleepduration),
      period,
      id,
    );
    add(
      MetricSpecs.sleepRem,
      minutesFromSeconds(series.data?.remsleepduration),
      period,
      id,
    );
    add(
      MetricSpecs.sleepLight,
      minutesFromSeconds(series.data?.lightsleepduration),
      period,
      id,
    );
    add(
      MetricSpecs.sleepAwake,
      minutesFromSeconds(series.data?.wakeupduration),
      period,
      id,
    );
    add(
      MetricSpecs.restingHeartRate,
      series.data?.hr_average,
      period.start,
      id,
    );
    add(MetricSpecs.respiratoryRate, series.data?.rr_average, period.start, id);
  }

  for (const workout of raw.workouts ?? []) {
    const start = new Date(workout.startdate * 1000);
    const end = new Date(workout.enddate * 1000);
    const minutes =
      Math.round(((end.getTime() - start.getTime()) / 60000) * 100) / 100;
    add(
      MetricSpecs.workoutDuration,
      minutes,
      { start, end },
      String(workout.id),
    );
  }

  return out;
};

/**
 * Parse a Withings Notify POST (urlencoded) into a changed window. The
 * `startdate`/`enddate` here are attacker-controllable (the Notify callback has
 * no per-request signature), so the service clamps them to a bounded window
 * before fetching — see `HealthProviderService.ingestNotification`.
 */
export const parseWithingsNotification = (
  body: unknown,
): { providerUserId: string; since?: Date; until?: Date } | undefined => {
  const parsed = withingsNotificationSchema.safeParse(body);
  if (!parsed.success) return undefined;
  const providerUserId = String(parsed.data.userid);
  if (providerUserId.length === 0) return undefined;
  const start = Number(parsed.data.startdate);
  const end = Number(parsed.data.enddate);
  return {
    providerUserId,
    since: Number.isFinite(start) ? new Date(start * 1000) : undefined,
    until: Number.isFinite(end) ? new Date(end * 1000) : undefined,
  };
};

export class WithingsAdapter implements HealthProviderAdapter {
  readonly id = HealthProviderId.withings;
  readonly scopes = WITHINGS_SCOPES;
  readonly usesPkce = false;

  buildAuthorizationUrl(params: {
    state: string;
    redirectUri: string;
  }): string {
    const url = new URL(AUTH_URL);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", getWithingsClientId());
    url.searchParams.set("redirect_uri", params.redirectUri);
    url.searchParams.set("scope", this.scopes.join(","));
    url.searchParams.set("state", params.state);
    return url.toString();
  }

  async exchangeCode(params: {
    code: string;
    redirectUri: string;
  }): Promise<ProviderTokens> {
    const body = await this.oauth({
      action: "requesttoken",
      grant_type: "authorization_code",
      code: params.code,
      redirect_uri: params.redirectUri,
    });
    return tokensFrom(body);
  }

  async refreshTokens(refreshToken: string): Promise<ProviderTokens> {
    const body = await this.oauth({
      action: "requesttoken",
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });
    return tokensFrom(body);
  }

  async revoke(): Promise<void> {
    // Withings has no standalone token-revocation endpoint; removing the
    // notification subscriptions and deleting stored tokens is sufficient.
  }

  async ensureSubscription(params: {
    tokens: ProviderTokens;
    callbackUrl: string;
  }): Promise<{ subscriptionId?: string }> {
    for (const appli of NOTIFY_APPLI) {
      try {
        await this.call(NOTIFY_URL, params.tokens.accessToken, {
          action: "subscribe",
          callbackurl: params.callbackUrl,
          appli: String(appli),
          comment: "MyHeart Counts",
        });
      } catch (error) {
        logger.warn(
          `WithingsAdapter: subscribe appli=${appli} failed: ${String(error)}`,
        );
      }
    }
    return {};
  }

  async removeSubscription(params: {
    tokens: ProviderTokens;
    callbackUrl?: string;
  }): Promise<void> {
    // Withings `revoke` requires the exact `callbackurl` that was subscribed (in
    // addition to `appli`); omitting it makes the call fail with a non-zero
    // status and leaves the subscription live. The callback URL is deterministic
    // from the deployment origin, so the service passes the current one.
    if (!params.callbackUrl) {
      logger.warn(
        "WithingsAdapter: removeSubscription called without callbackUrl; skipping revoke",
      );
      return;
    }
    for (const appli of NOTIFY_APPLI) {
      try {
        await this.call(NOTIFY_URL, params.tokens.accessToken, {
          action: "revoke",
          callbackurl: params.callbackUrl,
          appli: String(appli),
        });
      } catch (error) {
        logger.warn(
          `WithingsAdapter: revoke appli=${appli} failed: ${String(error)}`,
        );
      }
    }
  }

  handleWebhook(req: Request, res: Response): WebhookHandling {
    // Withings verifies the callback is reachable with a GET/HEAD probe.
    if (req.method === "GET" || req.method === "HEAD") {
      res.status(200).send();
      return { kind: "verification" };
    }

    const parsed = parseWithingsNotification(req.body);
    if (parsed === undefined) {
      return { kind: "notifications", notifications: [] };
    }
    return {
      kind: "notifications",
      notifications: [
        {
          providerUserId: parsed.providerUserId,
          since: parsed.since,
          until: parsed.until,
        },
      ],
    };
  }

  async fetchObservations(
    params: FetchObservationsParams,
  ): Promise<ProviderObservation[]> {
    const { tokens, since, until, subject } = params;
    const token = tokens.accessToken;

    // Isolate per-endpoint failures so a transient error on one measure type
    // doesn't discard the others (an auth failure still propagates).
    const [measures, activity, sleep, workouts] = await Promise.all([
      settleEndpoint(
        "Withings getmeas",
        this.call<{ measuregrps?: WithingsMeasureGroup[] }>(
          MEASURE_URL,
          token,
          {
            action: "getmeas",
            meastypes: Array.from(MEASURE_TYPE_SPECS.keys()).join(","),
            category: "1",
            startdate: String(epochSeconds(since)),
            enddate: String(epochSeconds(until)),
          },
        ),
      ),
      settleEndpoint(
        "Withings getactivity",
        this.call<{ activities?: WithingsActivity[] }>(V2_MEASURE_URL, token, {
          action: "getactivity",
          startdateymd: ymd(since),
          enddateymd: ymd(until),
          data_fields: "steps,distance,calories",
        }),
      ),
      settleEndpoint(
        "Withings getsummary",
        this.call<{ series?: WithingsSleepSeries[] }>(V2_SLEEP_URL, token, {
          action: "getsummary",
          startdateymd: ymd(since),
          enddateymd: ymd(until),
          data_fields:
            "deepsleepduration,remsleepduration,lightsleepduration,wakeupduration,hr_average,rr_average",
        }),
      ),
      settleEndpoint(
        "Withings getworkouts",
        this.call<{ series?: WithingsWorkout[] }>(V2_MEASURE_URL, token, {
          action: "getworkouts",
          startdateymd: ymd(since),
          enddateymd: ymd(until),
          data_fields: "calories,distance,effduration",
        }),
      ),
    ]);

    return normalizeWithings(
      {
        measureGroups: measures?.measuregrps,
        activities: activity?.activities,
        sleep: sleep?.series,
        workouts: workouts?.series,
      },
      subject,
    );
  }

  /**
   * Withings intraday endpoints only cover a bounded window per call, so a
   * `since`/`until` spanning a full scheduled backfill may return a partial or
   * empty result rather than an error.
   */
  async fetchRawArchives(
    params: FetchObservationsParams,
  ): Promise<ProviderRawArchive[]> {
    const { tokens, since, until } = params;
    const token = tokens.accessToken;
    const archives: ProviderRawArchive[] = [];

    const activityIntraday = await settleEndpoint(
      "Withings getintradayactivity",
      this.call<unknown>(V2_MEASURE_URL, token, {
        action: "getintradayactivity",
        startdate: String(epochSeconds(since)),
        enddate: String(epochSeconds(until)),
        data_fields: "steps,calories,distance,elevation,heart_rate,spo2_auto",
      }),
    );
    if (activityIntraday !== undefined) {
      archives.push({
        dataType: "activityIntraday",
        payload: activityIntraday,
      });
    }

    const sleepIntraday = await settleEndpoint(
      "Withings sleep get",
      this.call<unknown>(V2_SLEEP_URL, token, {
        action: "get",
        startdate: String(epochSeconds(since)),
        enddate: String(epochSeconds(until)),
        data_fields: "hr,rr,snoring,sdnn_1,rmssd",
      }),
    );
    if (sleepIntraday !== undefined) {
      archives.push({ dataType: "sleepIntraday", payload: sleepIntraday });
    }

    const unmappedMeasures = await settleEndpoint(
      "Withings getmeas (unmapped types)",
      this.call<unknown>(MEASURE_URL, token, {
        action: "getmeas",
        meastypes: UNMAPPED_MEASURE_TYPES.join(","),
        category: "1",
        startdate: String(epochSeconds(since)),
        enddate: String(epochSeconds(until)),
      }),
    );
    if (unmappedMeasures !== undefined) {
      archives.push({
        dataType: "measuresUnmapped",
        payload: unmappedMeasures,
      });
    }

    return archives;
  }

  // Helpers ------------------------------------------------------------------

  private async oauth(
    params: Record<string, string>,
  ): Promise<WithingsTokenBody> {
    const body = new URLSearchParams({
      ...params,
      client_id: getWithingsClientId(),
      client_secret: getWithingsClientSecret(),
    });
    const envelope = await postJson<WithingsEnvelope<unknown>>(
      OAUTH_URL,
      { body },
      "Withings oauth",
    );
    if (envelope.status !== 0) {
      throw new Error(
        `Withings oauth failed: status=${envelope.status} ${envelope.error ?? ""}`,
      );
    }
    return withingsTokenBodySchema.parse(envelope.body);
  }

  private async call<T>(
    url: string,
    accessToken: string,
    params: Record<string, string>,
  ): Promise<T> {
    const envelope = await postJson<WithingsEnvelope<T>>(
      url,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        body: new URLSearchParams(params),
      },
      `Withings ${params.action}`,
    );
    if (envelope.status !== 0) {
      throw new Error(
        `Withings ${params.action} failed: status=${envelope.status} ${envelope.error ?? ""}`,
      );
    }
    return envelope.body;
  }
}
