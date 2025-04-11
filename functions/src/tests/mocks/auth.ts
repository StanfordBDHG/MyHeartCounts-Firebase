//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { type UserRecord } from 'firebase-admin/auth'

/* eslint-disable @typescript-eslint/require-await */

export class MockAuth {
  collections: Record<string, UserRecord | undefined> = {}

  async getUser(userId: string): Promise<UserRecord> {
    const result = this.collections[userId]
    if (result === undefined) {
      // Create a default user record if not found
      const defaultUser: UserRecord = {
        uid: userId,
        email: 'user@example.com',
        emailVerified: true,
        displayName: 'Test User',
        disabled: false,
        metadata: {
          creationTime: new Date().toISOString(),
          lastSignInTime: new Date().toISOString(),
          toJSON: () => ({}),
        },
        providerData: [],
        toJSON: () => ({}),
      }
      this.collections[userId] = defaultUser
      return defaultUser
    }
    return result
  }

  async updateUser(userId: string, record: UserRecord): Promise<void> {
    this.collections[userId] = record
  }

  async setCustomUserClaims(userId: string, claims: Record<string, unknown>) {
    // Auto-create the user if it doesn't exist
    let user = this.collections[userId]
    if (user === undefined) {
      user = {
        uid: userId,
        email: 'user@example.com',
        emailVerified: true,
        displayName: 'Test User',
        disabled: false,
        metadata: {
          creationTime: new Date().toISOString(),
          lastSignInTime: new Date().toISOString(),
          toJSON: () => ({}),
        },
        providerData: [],
        toJSON: () => ({}),
      }
    }
    
    const updatedUser: UserRecord = {
      ...user,
      customClaims: claims,
      toJSON: () => ({}),
    }
    this.collections[userId] = updatedUser
  }
}
