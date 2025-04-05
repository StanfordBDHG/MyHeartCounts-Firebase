//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  deleteUserInputSchema,
  type DeleteUserOutput,
} from '@stanfordbdhg/engagehf-models'
import { validatedOnCall } from './helpers.js'
import { UserRole } from '../services/credential/credential.js'
import { getServiceFactory } from '../services/factory/getServiceFactory.js'

export const deleteUser = validatedOnCall(
  'deleteUser',
  deleteUserInputSchema,
  async (request): Promise<DeleteUserOutput> => {
    const factory = getServiceFactory()
    const credential = factory.credential(request.auth)
    const userService = factory.user()

    credential.check(UserRole.admin)

    await userService.deleteUser(request.data.userId)
  },
)
