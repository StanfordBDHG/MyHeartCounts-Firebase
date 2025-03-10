//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { z } from 'zod'
import { optionalish, optionalishDefault } from '../helpers/optionalish.js'

export const dismissMessagesInputSchema = z.object({
  userId: optionalish(z.string()),
  messageIds: optionalish(z.array(z.string())),
  didPerformAction: optionalishDefault(z.boolean(), false),
})
export type DismissMessagesInput = z.input<typeof dismissMessagesInputSchema>

export interface DismissMessagesOutput {
  dismissedCount: number
}
