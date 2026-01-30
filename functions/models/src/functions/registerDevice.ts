//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { type z } from "zod";
import { userDeviceConverter } from "../types/userDevice.js";

export const registerDeviceInputSchema = userDeviceConverter.value.schema;
export type RegisterDeviceInput = z.input<typeof registerDeviceInputSchema>;

export type RegisterDeviceOutput = undefined;
