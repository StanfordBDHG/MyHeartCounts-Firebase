// This source file is part of the MyHeart Counts project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

import { type Response } from "express";
import { logger } from "firebase-functions/v2";
import { type Request } from "firebase-functions/v2/https";
import { z } from "zod";
import {
  getGoogleHealthClientId,
  getGoogleHealthClientSecret,
} from "../../../env.js";
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
import { getJson, postJson, settleEndpoint } from "../httpClient.js";
import { buildProviderObservation } from "../observationBuilder.js";
import { MetricSpecs } from "../providerCodes.js";

// This adapter replaces the legacy Fitbit Web API (sunsetting September 2026)
// with its Google-managed successor, the Google Health API
// (health.googleapis.com/v4). Endpoint shapes here were confirmed against the
// live Google API discovery document (health.googleapis.com/$discovery/rest),
// the same source Google's own client libraries are generated from.

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const API_BASE = "https://health.googleapis.com/v4";

const GOOGLE_HEALTH_SCOPES = [
  "https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly",
  "https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly",
  "https://www.googleapis.com/auth/googlehealth.sleep.readonly",
];

/** Safety cap on token-paginated fetches. */
const MAX_PAGES = 1000;

const isoDate = (date: Date): string => date.toISOString().slice(0, 10);

const physicalTimeFilter = (field: string, since: Date, until: Date): string =>
  `${field} >= "${since.toISOString()}" AND ${field} < "${until.toISOString()}"`;

const civilDateFilter = (field: string, since: Date, until: Date): string =>
  `${field} >= "${isoDate(since)}" AND ${field} < "${isoDate(until)}"`;

interface GoogleHealthDate {
  year: number;
  month: number;
  day: number;
}

const dailyDate = (date: GoogleHealthDate): Date =>
  new Date(Date.UTC(date.year, date.month - 1, date.day, 12));

const dateKey = (date: GoogleHealthDate): string =>
  `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;

// --- Raw response shapes (only the fields we consume) ----------------------
// Int64 fields (count, millimeters, beatsPerMinute, minutes, ...) are encoded
// as JSON strings by the Google Health API and must be parsed with `Number`.

interface GoogleHealthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
}

interface GHInterval {
  startTime: string;
  endTime: string;
}
interface GHSampleTime {
  physicalTime: string;
}
interface GHSteps {
  count: string;
  interval: GHInterval;
}
interface GHDistance {
  millimeters: string;
  interval: GHInterval;
}
interface GHActiveEnergyBurned {
  kcal: number;
  interval: GHInterval;
}
interface GHWeight {
  weightGrams: number;
  sampleTime: GHSampleTime;
}
interface GHBodyFat {
  percentage: number;
  sampleTime: GHSampleTime;
}
interface GHHeight {
  heightMillimeters: string;
  sampleTime: GHSampleTime;
}
interface GHVo2Max {
  vo2Max: number;
  sampleTime: GHSampleTime;
}
interface GHBloodGlucose {
  bloodGlucoseMilligramsPerDeciliter: number;
  sampleTime: GHSampleTime;
}
interface GHCoreBodyTemperature {
  temperatureCelsius: number;
  sampleTime: GHSampleTime;
}
interface GHFloors {
  count: string;
  interval: GHInterval;
}
interface GHBasalEnergyBurned {
  kcal: number;
  interval: GHInterval;
}
interface GHDailyOxygenSaturation {
  averagePercentage: number;
  date: GoogleHealthDate;
}
interface GHHeartRateVariability {
  rootMeanSquareOfSuccessiveDifferencesMilliseconds?: number;
  standardDeviationMilliseconds?: number;
  sampleTime: GHSampleTime;
}
interface GHDailyRestingHeartRate {
  beatsPerMinute: string;
  date: GoogleHealthDate;
}
interface GHDailyRespiratoryRate {
  breathsPerMinute: number;
  date: GoogleHealthDate;
}
interface GHSleepStageSummary {
  type?: string;
  minutes?: string;
}
interface GHSleep {
  interval: GHInterval;
  summary?: {
    minutesAsleep?: string;
    stagesSummary?: GHSleepStageSummary[];
  };
}
interface GHExercise {
  interval: GHInterval;
}

const stageMinutes = (
  stagesSummary: GHSleepStageSummary[] | undefined,
  type: string,
): number | undefined => {
  const match = stagesSummary?.find((s) => s.type === type);
  return match?.minutes !== undefined ? Number(match.minutes) : undefined;
};

// --- Response validation (zod) ---------------------------------------------
// Provider payloads are untrusted; validate only the envelope shape we depend
// on for pagination and stay permissive about the per-item field shapes,
// which the extraction below already treats defensively.

const googleHealthTokenResponseSchema = z
  .object({
    access_token: z.string().min(1),
    refresh_token: z.string().optional(),
    expires_in: z.number(),
    scope: z.string().optional(),
  })
  .passthrough();

const googleHealthIdentitySchema = z
  .object({ healthUserId: z.string().min(1) })
  .passthrough();

const googleHealthPageEnvelopeSchema = z
  .object({
    dataPoints: z.array(z.record(z.unknown())).optional(),
    nextPageToken: z.string().optional(),
  })
  .passthrough();

const tokensFrom = (
  response: GoogleHealthTokenResponse,
  providerUserId: string,
  fallbackRefreshToken?: string,
): ProviderTokens => {
  const refreshToken = response.refresh_token ?? fallbackRefreshToken;
  if (refreshToken === undefined) {
    throw new Error(
      "Google Health token response omitted refresh_token and no prior refresh token is available",
    );
  }
  return {
    accessToken: response.access_token,
    refreshToken,
    expiresAt: new Date(Date.now() + response.expires_in * 1000),
    scopes: response.scope ? response.scope.split(" ") : GOOGLE_HEALTH_SCOPES,
    providerUserId,
  };
};

// --- Pure normalization (exported for unit tests) --------------------------

export const normalizeGoogleHealth = (
  raw: {
    steps?: unknown[];
    distance?: unknown[];
    activeEnergyBurned?: unknown[];
    weight?: unknown[];
    bodyFat?: unknown[];
    height?: unknown[];
    vo2Max?: unknown[];
    dailyOxygenSaturation?: unknown[];
    heartRateVariability?: unknown[];
    dailyRestingHeartRate?: unknown[];
    dailyRespiratoryRate?: unknown[];
    bloodGlucose?: unknown[];
    coreBodyTemperature?: unknown[];
    floors?: unknown[];
    basalEnergyBurned?: unknown[];
    sleep?: unknown[];
    exercise?: unknown[];
  },
  subject: FHIRReference,
): ProviderObservation[] => {
  const out: ProviderObservation[] = [];
  const add = (
    spec: (typeof MetricSpecs)[keyof typeof MetricSpecs],
    value: number | undefined,
    effective: Date | { start: Date; end: Date },
    sampleId: string,
  ) => {
    if (value === undefined || Number.isNaN(value)) return;
    out.push(
      buildProviderObservation({
        provider: HealthProviderId.googleHealth,
        sourceName: "Google Health",
        subject,
        spec,
        value,
        effective,
        sampleId,
      }),
    );
  };

  for (const item of raw.steps ?? []) {
    const v = (item as { steps?: GHSteps }).steps;
    if (!v) continue;
    add(
      MetricSpecs.steps,
      Number(v.count),
      {
        start: new Date(v.interval.startTime),
        end: new Date(v.interval.endTime),
      },
      `steps-${v.interval.startTime}`,
    );
  }

  for (const item of raw.distance ?? []) {
    const v = (item as { distance?: GHDistance }).distance;
    if (!v) continue;
    add(
      MetricSpecs.distanceWalkingRunning,
      Number(v.millimeters) / 1000,
      {
        start: new Date(v.interval.startTime),
        end: new Date(v.interval.endTime),
      },
      `distance-${v.interval.startTime}`,
    );
  }

  for (const item of raw.activeEnergyBurned ?? []) {
    const v = (item as { activeEnergyBurned?: GHActiveEnergyBurned })
      .activeEnergyBurned;
    if (!v) continue;
    add(
      MetricSpecs.activeEnergyBurned,
      v.kcal,
      {
        start: new Date(v.interval.startTime),
        end: new Date(v.interval.endTime),
      },
      `active-energy-burned-${v.interval.startTime}`,
    );
  }

  for (const item of raw.weight ?? []) {
    const v = (item as { weight?: GHWeight }).weight;
    if (!v) continue;
    add(
      MetricSpecs.bodyWeight,
      v.weightGrams / 1000,
      new Date(v.sampleTime.physicalTime),
      `weight-${v.sampleTime.physicalTime}`,
    );
  }

  for (const item of raw.bodyFat ?? []) {
    const v = (item as { bodyFat?: GHBodyFat }).bodyFat;
    if (!v) continue;
    add(
      MetricSpecs.bodyFatPercentage,
      v.percentage,
      new Date(v.sampleTime.physicalTime),
      `body-fat-${v.sampleTime.physicalTime}`,
    );
  }

  for (const item of raw.height ?? []) {
    const v = (item as { height?: GHHeight }).height;
    if (!v) continue;
    add(
      MetricSpecs.height,
      Number(v.heightMillimeters) / 1000,
      new Date(v.sampleTime.physicalTime),
      `height-${v.sampleTime.physicalTime}`,
    );
  }

  for (const item of raw.vo2Max ?? []) {
    const v = (item as { vo2Max?: GHVo2Max }).vo2Max;
    if (!v) continue;
    add(
      MetricSpecs.vo2Max,
      v.vo2Max,
      new Date(v.sampleTime.physicalTime),
      `vo2-max-${v.sampleTime.physicalTime}`,
    );
  }

  for (const item of raw.dailyOxygenSaturation ?? []) {
    const v = (item as { dailyOxygenSaturation?: GHDailyOxygenSaturation })
      .dailyOxygenSaturation;
    if (!v) continue;
    add(
      MetricSpecs.oxygenSaturation,
      v.averagePercentage,
      dailyDate(v.date),
      `daily-oxygen-saturation-${dateKey(v.date)}`,
    );
  }

  for (const item of raw.heartRateVariability ?? []) {
    const v = (item as { heartRateVariability?: GHHeartRateVariability })
      .heartRateVariability;
    if (!v) continue;
    add(
      MetricSpecs.heartRateVariability,
      v.rootMeanSquareOfSuccessiveDifferencesMilliseconds ??
        v.standardDeviationMilliseconds,
      new Date(v.sampleTime.physicalTime),
      `heart-rate-variability-${v.sampleTime.physicalTime}`,
    );
  }

  for (const item of raw.dailyRestingHeartRate ?? []) {
    const v = (item as { dailyRestingHeartRate?: GHDailyRestingHeartRate })
      .dailyRestingHeartRate;
    if (!v) continue;
    add(
      MetricSpecs.restingHeartRate,
      Number(v.beatsPerMinute),
      dailyDate(v.date),
      `daily-resting-heart-rate-${dateKey(v.date)}`,
    );
  }

  for (const item of raw.dailyRespiratoryRate ?? []) {
    const v = (item as { dailyRespiratoryRate?: GHDailyRespiratoryRate })
      .dailyRespiratoryRate;
    if (!v) continue;
    add(
      MetricSpecs.respiratoryRate,
      v.breathsPerMinute,
      dailyDate(v.date),
      `daily-respiratory-rate-${dateKey(v.date)}`,
    );
  }

  for (const item of raw.bloodGlucose ?? []) {
    const v = (item as { bloodGlucose?: GHBloodGlucose }).bloodGlucose;
    if (!v) continue;
    add(
      MetricSpecs.bloodGlucose,
      v.bloodGlucoseMilligramsPerDeciliter,
      new Date(v.sampleTime.physicalTime),
      `blood-glucose-${v.sampleTime.physicalTime}`,
    );
  }

  for (const item of raw.coreBodyTemperature ?? []) {
    const v = (item as { coreBodyTemperature?: GHCoreBodyTemperature })
      .coreBodyTemperature;
    if (!v) continue;
    add(
      MetricSpecs.bodyTemperature,
      v.temperatureCelsius,
      new Date(v.sampleTime.physicalTime),
      `core-body-temperature-${v.sampleTime.physicalTime}`,
    );
  }

  for (const item of raw.floors ?? []) {
    const v = (item as { floors?: GHFloors }).floors;
    if (!v) continue;
    add(
      MetricSpecs.flightsClimbed,
      Number(v.count),
      {
        start: new Date(v.interval.startTime),
        end: new Date(v.interval.endTime),
      },
      `floors-${v.interval.startTime}`,
    );
  }

  for (const item of raw.basalEnergyBurned ?? []) {
    const v = (item as { basalEnergyBurned?: GHBasalEnergyBurned })
      .basalEnergyBurned;
    if (!v) continue;
    add(
      MetricSpecs.basalEnergyBurned,
      v.kcal,
      {
        start: new Date(v.interval.startTime),
        end: new Date(v.interval.endTime),
      },
      `basal-energy-burned-${v.interval.startTime}`,
    );
  }

  for (const item of raw.sleep ?? []) {
    const v = (item as { sleep?: GHSleep }).sleep;
    if (!v) continue;
    const period = {
      start: new Date(v.interval.startTime),
      end: new Date(v.interval.endTime),
    };
    const id = `sleep-${v.interval.startTime}`;
    const stages = v.summary?.stagesSummary;
    add(
      MetricSpecs.sleepDuration,
      v.summary?.minutesAsleep !== undefined ?
        Number(v.summary.minutesAsleep)
      : undefined,
      period,
      id,
    );
    add(MetricSpecs.sleepDeep, stageMinutes(stages, "DEEP"), period, id);
    add(MetricSpecs.sleepRem, stageMinutes(stages, "REM"), period, id);
    add(MetricSpecs.sleepLight, stageMinutes(stages, "LIGHT"), period, id);
    add(MetricSpecs.sleepAwake, stageMinutes(stages, "AWAKE"), period, id);
  }

  for (const item of raw.exercise ?? []) {
    const v = (item as { exercise?: GHExercise }).exercise;
    if (!v) continue;
    const start = new Date(v.interval.startTime);
    const end = new Date(v.interval.endTime);
    const minutes =
      Math.round(((end.getTime() - start.getTime()) / 60000) * 100) / 100;
    add(
      MetricSpecs.workoutDuration,
      minutes,
      { start, end },
      `exercise-${v.interval.startTime}`,
    );
  }

  return out;
};

export class GoogleHealthAdapter implements HealthProviderAdapter {
  readonly id = HealthProviderId.googleHealth;
  readonly scopes = GOOGLE_HEALTH_SCOPES;
  readonly usesPkce = false;

  buildAuthorizationUrl(params: {
    state: string;
    redirectUri: string;
  }): string {
    const url = new URL(AUTH_URL);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", getGoogleHealthClientId());
    url.searchParams.set("redirect_uri", params.redirectUri);
    url.searchParams.set("scope", this.scopes.join(" "));
    url.searchParams.set("state", params.state);
    // Google only returns a refresh_token on the first consent for a given
    // client/user pair unless re-consent is forced; MHC always needs one.
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    return url.toString();
  }

  async exchangeCode(params: {
    code: string;
    redirectUri: string;
  }): Promise<ProviderTokens> {
    const response = googleHealthTokenResponseSchema.parse(
      await postJson<unknown>(
        TOKEN_URL,
        {
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code: params.code,
            redirect_uri: params.redirectUri,
            client_id: getGoogleHealthClientId(),
            client_secret: getGoogleHealthClientSecret(),
          }),
        },
        "Google Health token exchange",
      ),
    );
    const providerUserId = await this.fetchHealthUserId(response.access_token);
    return tokensFrom(response, providerUserId);
  }

  async refreshTokens(refreshToken: string): Promise<ProviderTokens> {
    const response = googleHealthTokenResponseSchema.parse(
      await postJson<unknown>(
        TOKEN_URL,
        {
          body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: refreshToken,
            client_id: getGoogleHealthClientId(),
            client_secret: getGoogleHealthClientSecret(),
          }),
        },
        "Google Health token refresh",
      ),
    );
    // Google omits the user id (and often the refresh token) on refresh; the
    // service preserves the stored providerUserId, and we fall back to the
    // refresh token that was just used since it remains valid.
    return tokensFrom(response, "", refreshToken);
  }

  async revoke(tokens: ProviderTokens): Promise<void> {
    await fetch(
      `${REVOKE_URL}?${new URLSearchParams({ token: tokens.accessToken }).toString()}`,
      { method: "POST" },
    );
  }

  ensureSubscription(): Promise<{ subscriptionId?: string }> {
    // Google Health push subscriptions require a project-level Subscriber
    // (endpoint verification + a signed-webhook secret) on top of the
    // per-user Subscription, a materially different model from the legacy
    // Fitbit Web API's callback-URL webhooks. Not implemented yet — the
    // scheduled backfill polls instead.
    logger.warn(
      "GoogleHealthAdapter: push subscriptions are not implemented; relying on scheduled backfill polling.",
    );
    return Promise.resolve({});
  }

  async removeSubscription(): Promise<void> {
    // No subscription is ever created (see ensureSubscription), so there is
    // nothing to remove.
  }

  handleWebhook(_req: Request, res: Response): WebhookHandling {
    // No subscriber is ever registered with Google, so this route should
    // never receive real traffic.
    res.status(204).send();
    return { kind: "notifications", notifications: [] };
  }

  async fetchObservations(
    params: FetchObservationsParams,
  ): Promise<ProviderObservation[]> {
    const { tokens, since, until, subject } = params;
    const token = tokens.accessToken;
    const physical = (field: string) => physicalTimeFilter(field, since, until);
    const daily = (field: string) => civilDateFilter(field, since, until);

    const [
      steps,
      distance,
      activeEnergyBurned,
      weight,
      bodyFat,
      height,
      vo2Max,
      dailyOxygenSaturation,
      heartRateVariability,
      dailyRestingHeartRate,
      dailyRespiratoryRate,
      bloodGlucose,
      coreBodyTemperature,
      floors,
      basalEnergyBurned,
      sleep,
      exercise,
    ] = await Promise.all([
      settleEndpoint(
        "GoogleHealth steps",
        this.reconcile("steps", physical("steps.interval.start_time"), token),
      ),
      settleEndpoint(
        "GoogleHealth distance",
        this.reconcile(
          "distance",
          physical("distance.interval.start_time"),
          token,
        ),
      ),
      settleEndpoint(
        "GoogleHealth active-energy-burned",
        this.reconcile(
          "active-energy-burned",
          physical("active_energy_burned.interval.start_time"),
          token,
        ),
      ),
      settleEndpoint(
        "GoogleHealth weight",
        this.reconcile(
          "weight",
          physical("weight.sample_time.physical_time"),
          token,
        ),
      ),
      settleEndpoint(
        "GoogleHealth body-fat",
        this.reconcile(
          "body-fat",
          physical("body_fat.sample_time.physical_time"),
          token,
        ),
      ),
      settleEndpoint(
        "GoogleHealth height",
        this.reconcile(
          "height",
          physical("height.sample_time.physical_time"),
          token,
        ),
      ),
      settleEndpoint(
        "GoogleHealth vo2-max",
        this.reconcile(
          "vo2-max",
          physical("vo2_max.sample_time.physical_time"),
          token,
        ),
      ),
      settleEndpoint(
        "GoogleHealth daily-oxygen-saturation",
        this.reconcile(
          "daily-oxygen-saturation",
          daily("daily_oxygen_saturation.date"),
          token,
        ),
      ),
      settleEndpoint(
        "GoogleHealth heart-rate-variability",
        this.reconcile(
          "heart-rate-variability",
          physical("heart_rate_variability.sample_time.physical_time"),
          token,
        ),
      ),
      settleEndpoint(
        "GoogleHealth daily-resting-heart-rate",
        this.reconcile(
          "daily-resting-heart-rate",
          daily("daily_resting_heart_rate.date"),
          token,
        ),
      ),
      settleEndpoint(
        "GoogleHealth daily-respiratory-rate",
        this.reconcile(
          "daily-respiratory-rate",
          daily("daily_respiratory_rate.date"),
          token,
        ),
      ),
      settleEndpoint(
        "GoogleHealth blood-glucose",
        this.reconcile(
          "blood-glucose",
          physical("blood_glucose.sample_time.physical_time"),
          token,
        ),
      ),
      settleEndpoint(
        "GoogleHealth core-body-temperature",
        this.reconcile(
          "core-body-temperature",
          physical("core_body_temperature.sample_time.physical_time"),
          token,
        ),
      ),
      settleEndpoint(
        "GoogleHealth floors",
        this.reconcile("floors", physical("floors.interval.start_time"), token),
      ),
      settleEndpoint(
        "GoogleHealth basal-energy-burned",
        this.reconcile(
          "basal-energy-burned",
          physical("basal_energy_burned.interval.start_time"),
          token,
        ),
      ),
      settleEndpoint(
        "GoogleHealth sleep",
        this.reconcile("sleep", physical("sleep.interval.end_time"), token),
      ),
      settleEndpoint(
        "GoogleHealth exercise",
        this.reconcile(
          "exercise",
          daily("exercise.interval.civil_start_time"),
          token,
        ),
      ),
    ]);

    return normalizeGoogleHealth(
      {
        steps,
        distance,
        activeEnergyBurned,
        weight,
        bodyFat,
        height,
        vo2Max,
        dailyOxygenSaturation,
        heartRateVariability,
        dailyRestingHeartRate,
        dailyRespiratoryRate,
        bloodGlucose,
        coreBodyTemperature,
        floors,
        basalEnergyBurned,
        sleep,
        exercise,
      },
      subject,
    );
  }

  /** Continuous heart rate is high-cardinality; archive it raw instead of one Firestore doc per sample. */
  async fetchRawArchives(
    params: FetchObservationsParams,
  ): Promise<ProviderRawArchive[]> {
    const { tokens, since, until } = params;
    const heartRate = await settleEndpoint(
      "GoogleHealth heart-rate",
      this.list(
        "heart-rate",
        physicalTimeFilter(
          "heart_rate.sample_time.physical_time",
          since,
          until,
        ),
        tokens.accessToken,
      ),
    );
    if (heartRate === undefined || heartRate.length === 0) return [];
    return [{ dataType: "heartRate", payload: heartRate }];
  }

  // Helpers ------------------------------------------------------------------

  private async fetchHealthUserId(accessToken: string): Promise<string> {
    const identity = googleHealthIdentitySchema.parse(
      await getJson<unknown>(
        `${API_BASE}/users/me/identity`,
        accessToken,
        "Google Health identity",
      ),
    );
    return identity.healthUserId;
  }

  /** Deduplicated data points across sources for a given data type + filter. */
  private async reconcile(
    dataType: string,
    filter: string,
    token: string,
  ): Promise<unknown[]> {
    return this.paginate(dataType, filter, token, "dataPoints:reconcile");
  }

  /** Raw (non-deduplicated) data points, used for the archive tier. */
  private async list(
    dataType: string,
    filter: string,
    token: string,
  ): Promise<unknown[]> {
    return this.paginate(dataType, filter, token, "dataPoints");
  }

  private async paginate(
    dataType: string,
    filter: string,
    token: string,
    pathSuffix: "dataPoints:reconcile" | "dataPoints",
  ): Promise<unknown[]> {
    const results: unknown[] = [];
    let pageToken: string | undefined;
    let guard = 0;
    do {
      const searchParams = new URLSearchParams({ filter, pageSize: "1000" });
      if (pageToken) searchParams.set("pageToken", pageToken);
      const page = googleHealthPageEnvelopeSchema.parse(
        await getJson<unknown>(
          `${API_BASE}/users/me/dataTypes/${dataType}/${pathSuffix}?${searchParams.toString()}`,
          token,
          `Google Health ${dataType}`,
        ),
      );
      results.push(...(page.dataPoints ?? []));
      // `??` would keep an empty-string nextPageToken (Google's "no more
      // pages" signal) and loop forever; the falsy check is required here.
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      pageToken = page.nextPageToken ? page.nextPageToken : undefined;
      guard++;
    } while (pageToken !== undefined && guard < MAX_PAGES);
    return results;
  }
}
