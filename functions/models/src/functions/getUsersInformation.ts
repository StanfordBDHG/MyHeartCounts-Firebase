//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { z } from 'zod'
import { optionalishDefault } from '../helpers/optionalish.js'
import { type InferEncoded } from '../helpers/schemaConverter'
import { type userConverter } from '../types/user.js'
import { type userAuthConverter } from '../types/userAuth.js'

export const getUsersInformationInputSchema = z.object({
  includeUserData: optionalishDefault(z.boolean(), false),
  userIds: z.string().array().max(100),
})
export type GetUsersInformationInput = z.input<
  typeof getUsersInformationInputSchema
>

export interface UserInformation {
  auth: InferEncoded<typeof userAuthConverter>
  user: InferEncoded<typeof userConverter> | undefined
}

export type GetUsersInformationOutput = Record<
  string,
  | {
      data: UserInformation
      error?: undefined
    }
  | { data?: undefined; error: { code: string; message: string } }
>
