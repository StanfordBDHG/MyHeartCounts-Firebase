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
  async sendEach(messages: Message[], dryRun?: boolean) {
    // Mock response with success for all messages
    const responses = messages.map(message => ({
      success: true,
      messageId: 'mock-message-id-' + Math.random().toString(36).substr(2, 9)
    }));
    
    return {
      successCount: messages.length,
      failureCount: 0,
      responses: responses
    };
  }
}
