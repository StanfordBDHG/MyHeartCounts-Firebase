//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  enableUserInputSchema,
  type EnableUserOutput,
} from '@stanfordbdhg/engagehf-models'
import { validatedOnCall } from './helpers.js'
import { UserRole } from '../services/credential/credential.js'
import { getServiceFactory } from '../services/factory/getServiceFactory.js'

export const enableUser = validatedOnCall(
  'enableUser',
  enableUserInputSchema,
  async (request): Promise<EnableUserOutput> => {
    const factory = getServiceFactory()
    const credential = factory.credential(request.auth)
    const userId = request.data.userId
    const userService = factory.user()

    await credential.checkAsync(
      () => [UserRole.admin],
      async () => {
        const user = await userService.getUser(credential.userId)
        return user?.content.organization !== undefined ?
            [
              UserRole.owner(user.content.organization),
              UserRole.clinician(user.content.organization),
            ]
          : []
      },
    )

    await userService.enableUser(userId)
  },
)
