//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {type UserRecord} from "firebase-admin/auth";

/* eslint-disable @typescript-eslint/require-await */

export class MockAuth {
  collections: Record<string, UserRecord | undefined> = {};

  async getUser(userId: string): Promise<UserRecord> {
    const result = this.collections[userId];
    if (result === undefined) {
      throw new Error("User not found");
    }
    return result;
  }

  async updateUser(userId: string, record: UserRecord): Promise<void> {
    this.collections[userId] = record;
  }

  async setCustomUserClaims(userId: string, claims: Record<string, unknown>) {
    const user = this.collections[userId];
    if (user === undefined) {
      throw new Error("User not found");
    }
    const updatedUser: UserRecord = {
      ...user,
      customClaims: claims,
      toJSON: () => this,
    };
    this.collections[userId] = updatedUser;
  }
}
