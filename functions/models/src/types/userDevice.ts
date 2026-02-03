//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { z } from "zod";
import { Lazy } from "../helpers/lazy.js";
import { optionalish } from "../helpers/optionalish.js";
import { SchemaConverter } from "../helpers/schemaConverter.js";

export enum UserDevicePlatform {
  Android = "Android",
  iOS = "iOS",
}

export const userDeviceConverter = new Lazy(
  () =>
    new SchemaConverter({
      schema: z
        .object({
          notificationToken: z.string(),
          platform: z.nativeEnum(UserDevicePlatform),
          osVersion: optionalish(z.string()),
          appVersion: optionalish(z.string()),
          appBuild: optionalish(z.string()),
          language: optionalish(z.string()),
          timeZone: optionalish(z.string()),
        })
        .transform((values) => new UserDevice(values)),
      encode: (object) => ({
        notificationToken: object.notificationToken,
        platform: object.platform,
        osVersion: object.osVersion ?? null,
        appVersion: object.appVersion ?? null,
        appBuild: object.appBuild ?? null,
        language: object.language ?? null,
        timeZone: object.timeZone ?? null,
      }),
    }),
);

export class UserDevice {
  // Properties

  readonly notificationToken: string;
  readonly platform: UserDevicePlatform;
  readonly osVersion?: string;
  readonly appVersion?: string;
  readonly appBuild?: string;
  readonly language?: string;
  readonly timeZone?: string;

  // Constructor

  constructor(input: {
    notificationToken: string;
    platform: UserDevicePlatform;
    osVersion?: string;
    appVersion?: string;
    appBuild?: string;
    language?: string;
    timeZone?: string;
  }) {
    this.notificationToken = input.notificationToken;
    this.platform = input.platform;
    this.osVersion = input.osVersion;
    this.appVersion = input.appVersion;
    this.appBuild = input.appBuild;
    this.language = input.language;
    this.timeZone = input.timeZone;
  }
}
