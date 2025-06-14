//
// This source file is part of the Stanford Biodesign Digital Health MyHeart Counts open-source project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2025 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  unregisterDeviceInputSchema,
  type UnregisterDeviceOutput,
} from '@stanfordbdhg/myheartcounts-models'
import { validatedOnCall } from './helpers.js'
import { getServiceFactory } from '../services/factory/getServiceFactory.js'

export const unregisterDevice = validatedOnCall(
  'unregisterDevice',
  unregisterDeviceInputSchema,
  async (request): Promise<UnregisterDeviceOutput> => {
    const factory = getServiceFactory()
    const credential = factory.credential(request.auth)
    await factory
      .message()
      .unregisterDevice(
        credential.userId,
        request.data.notificationToken,
        request.data.platform,
      )
  },
)
