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
} from '@stanfordbdhg/myheartcounts-models'
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

    credential.check(UserRole.admin)

    await userService.enableUser(userId)
  },
)
