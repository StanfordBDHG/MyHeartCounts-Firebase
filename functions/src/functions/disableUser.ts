//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  disableUserInputSchema,
  type DisableUserOutput,
} from '@stanfordbdhg/myheartcounts-models'
import { validatedOnCall } from './helpers.js'
import { UserRole } from '../services/credential/credential.js'
import { getServiceFactory } from '../services/factory/getServiceFactory.js'

export const disableUser = validatedOnCall(
  'disableUser',
  disableUserInputSchema,
  async (request): Promise<DisableUserOutput> => {
    const factory = getServiceFactory()
    const credential = factory.credential(request.auth)
    const userId = request.data.userId
    const userService = factory.user()

    credential.check(UserRole.admin)

    await userService.disableUser(userId)
  },
)
