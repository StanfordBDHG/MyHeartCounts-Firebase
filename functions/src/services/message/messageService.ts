//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  type UserDevicePlatform,
  type User,
  type UserDevice,
  type UserMessage,
  type UserMessageType,
} from '@stanfordbdhg/myheartcounts-models'
import { type Document } from '../database/databaseService'

export interface MessageService {
  // Notifications

  registerDevice(userId: string, device: UserDevice): Promise<void>
  unregisterDevice(
    notificationToken: string,
    platform: UserDevicePlatform,
  ): Promise<void>

  // Messages

  addMessage(
    userId: string,
    message: UserMessage,
    options?: {
      notify?: boolean
      user?: User | null
      replaceDuplicates?: boolean
    },
  ): Promise<Document<UserMessage> | undefined>

  completeMessages(
    userId: string,
    type: UserMessageType,
    filter?: (message: UserMessage) => boolean,
  ): Promise<void>

  dismissMessage(
    userId: string,
    messageId: string,
    didPerformAction: boolean,
  ): Promise<void>

  // For test coverage only - public wrapper around private method
  sendNotification(
    userId: string,
    notification: {
      title: Record<string, string>
      body: Record<string, string>
    },
    options?: {
      language?: string
    },
  ): Promise<void>
}
