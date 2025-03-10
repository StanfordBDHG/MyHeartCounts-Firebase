//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2025 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  dismissMessagesInputSchema,
  type DismissMessagesOutput,
} from '@stanfordbdhg/engagehf-models'
import { validatedOnCall } from './helpers.js'
import { UserRole } from '../services/credential/credential.js'
import { getServiceFactory } from '../services/factory/getServiceFactory.js'

export const dismissMessages = validatedOnCall(
  'dismissMessages',
  dismissMessagesInputSchema,
  async (request): Promise<DismissMessagesOutput> => {
    const factory = getServiceFactory()
    const credential = factory.credential(request.auth)
    const userId = request.data.userId ?? credential.userId
    credential.check(UserRole.admin, UserRole.user(userId))

    const dismissedCount = await factory.message().dismissMessages(userId, {
      messageIds: request.data.messageIds,
      didPerformAction: request.data.didPerformAction,
    })

    return { dismissedCount }
  },
)
