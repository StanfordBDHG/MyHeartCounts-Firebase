//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  getUsersInformationInputSchema,
  type GetUsersInformationOutput,
  userAuthConverter,
  userConverter,
} from '@stanfordbdhg/myheartcounts-models'
import { https } from 'firebase-functions'
import { validatedOnCall } from './helpers.js'
import { UserRole } from '../services/credential/credential.js'
import { getServiceFactory } from '../services/factory/getServiceFactory.js'

export const getUsersInformation = validatedOnCall(
  'getUsersInformation',
  getUsersInformationInputSchema,
  async (request): Promise<GetUsersInformationOutput> => {
    const factory = getServiceFactory()
    const credential = factory.credential(request.auth)
    const userService = factory.user()

    const result: GetUsersInformationOutput = {}
    for (const userId of request.data.userIds) {
      try {
        const userData = await userService.getUser(userId)

        credential.check(
          UserRole.admin,
          UserRole.clinician,
          UserRole.user(userId),
        )

        const user = await userService.getAuth(userId)
        result[userId] = {
          data: {
            auth: userAuthConverter.value.encode(user),
            user:
              request.data.includeUserData && userData !== undefined ?
                userConverter.value.encode(userData.content)
              : undefined,
          },
        }
      } catch (error) {
        if (error instanceof https.HttpsError) {
          result[userId] = {
            error: {
              code: error.code,
              message: error.message,
            },
          }
        } else if (error instanceof Error) {
          result[userId] = {
            error: {
              code: '500',
              message: error.message,
            },
          }
        } else {
          result[userId] = {
            error: {
              code: '500',
              message: 'Internal server error',
            },
          }
        }
      }
    }
    return result
  },
)
