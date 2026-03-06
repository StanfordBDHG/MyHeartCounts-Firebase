// This source file is part of the MyHeart Counts project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

import { z } from "zod";
import { UserDevicePlatform } from "../types/userDevice.js";

export const unregisterDeviceInputSchema = z.object({
  notificationToken: z.string(),
  platform: z.nativeEnum(UserDevicePlatform),
});
export type UnregisterDeviceInput = z.input<typeof unregisterDeviceInputSchema>;

export type UnregisterDeviceOutput = undefined;
