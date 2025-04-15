//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { z } from 'zod'
import { UserDevicePlatform } from '../types/userDevice.js'

export const unregisterDeviceInputSchema = z.object({
  notificationToken: z.string(),
  platform: z.nativeEnum(UserDevicePlatform),
})
export type UnregisterDeviceInput = z.input<typeof unregisterDeviceInputSchema>

export type UnregisterDeviceOutput = undefined
