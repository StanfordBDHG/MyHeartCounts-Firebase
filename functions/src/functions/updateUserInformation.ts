//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  updateUserInformationInputSchema,
  type UpdateUserInformationOutput,
} from '@stanfordbdhg/engagehf-models'
import { validatedOnCall } from './helpers.js'
import { UserRole } from '../services/credential/credential.js'
import { getServiceFactory } from '../services/factory/getServiceFactory.js'

export const updateUserInformation = validatedOnCall(
  'updateUserInformation',
  updateUserInformationInputSchema,
  async (request): Promise<UpdateUserInformationOutput> => {
    const factory = getServiceFactory()
    const credential = factory.credential(request.auth)
    const userService = factory.user()

    credential.check(
      UserRole.admin,
      UserRole.clinician,
      UserRole.user(request.data.userId),
    )

    await userService.updateAuth(request.data.userId, request.data.data.auth)
  },
)
