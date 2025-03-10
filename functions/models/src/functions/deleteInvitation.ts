//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { z } from 'zod'

export const deleteInvitationInputSchema = z.object({
  invitationCode: z.string(),
})
export type DeleteInvitationInput = z.input<typeof deleteInvitationInputSchema>

export type DeleteInvitationOutput = undefined
