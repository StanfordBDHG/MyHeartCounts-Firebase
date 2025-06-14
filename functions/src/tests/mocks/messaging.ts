//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { type Message } from 'firebase-admin/messaging'

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/require-await */

export class MockMessaging {
  async send(message: Message, dryRun?: boolean): Promise<string> {
    const tokenMessage = message as { token?: string }
    const isFailure = tokenMessage.token?.includes('fail') ?? false

    if (isFailure) {
      throw new Error('Invalid FCM token')
    }

    return 'mock-message-id-' + Math.random().toString(36).substr(2, 9)
  }

  async sendEach(messages: Message[], dryRun?: boolean) {
    // Process each message and determine success/failure
    const responses = messages.map((message) => {
      // Check for token format to simulate failures
      const tokenMessage = message as { token?: string }

      // Tokens with 'fail' in them will simulate a failure response
      const isFailure = tokenMessage.token?.includes('fail') ?? false

      return {
        success: !isFailure,
        messageId:
          isFailure ? undefined : (
            'mock-message-id-' + Math.random().toString(36).substr(2, 9)
          ),
        error:
          isFailure ?
            { code: 'messaging/invalid-argument', message: 'Invalid token' }
          : undefined,
      }
    })

    // Count successes and failures
    const successCount = responses.filter((r) => r.success).length
    const failureCount = responses.length - successCount

    return {
      successCount,
      failureCount,
      responses,
    }
  }
}
