//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { z } from 'zod'
import { userAuthConverter } from '../types/userAuth.js'
import { userRegistrationConverter } from '../types/userRegistration.js'

export const createInvitationInputSchema = z.object({
  auth: z.lazy(() => userAuthConverter.value.schema),
  user: z.lazy(() => userRegistrationConverter.value.schema),
})
export type CreateInvitationInput = z.input<typeof createInvitationInputSchema>

export interface CreateInvitationOutput {
  id: string
}
