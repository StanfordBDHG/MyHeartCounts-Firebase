//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  dismissMessageInputSchema,
  type DismissMessageOutput,
} from '@stanfordbdhg/myheartcounts-models'
import { validatedOnCall } from './helpers.js'
import { UserRole } from '../services/credential/credential.js'
import { getServiceFactory } from '../services/factory/getServiceFactory.js'

export const dismissMessage = validatedOnCall(
  'dismissMessage',
  dismissMessageInputSchema,
  async (request): Promise<DismissMessageOutput> => {
    const factory = getServiceFactory()
    const credential = factory.credential(request.auth)
    const userId = request.data.userId ?? credential.userId
    credential.check(UserRole.admin, UserRole.user(userId))

    await factory
      .message()
      .dismissMessage(
        userId,
        request.data.messageId,
        request.data.didPerformAction,
      )
  },
)
