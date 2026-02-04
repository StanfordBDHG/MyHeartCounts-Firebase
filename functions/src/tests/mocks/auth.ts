//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import crypto from "crypto";
import { type ListUsersResult, type UserRecord } from "firebase-admin/auth";

export class MockAuth {
  collections: Record<string, UserRecord | undefined> = {};

  // eslint-disable-next-line @typescript-eslint/require-await
  async getUser(userId: string): Promise<UserRecord> {
    const result = this.collections[userId];
    if (result === undefined) {
      // Create a default user record if not found
      const defaultUser: UserRecord = {
        uid: userId,
        email: "user@example.com",
        emailVerified: true,
        displayName: "Test User",
        disabled: false,
        metadata: {
          creationTime: new Date().toISOString(),
          lastSignInTime: new Date().toISOString(),
          toJSON: () => ({}),
        },
        providerData: [],
        toJSON: () => ({}),
      };
      this.collections[userId] = defaultUser;
      return defaultUser;
    }
    return result;
  }

  updateUser(userId: string, record: UserRecord): void {
    this.collections[userId] = record;
  }

  setCustomUserClaims(userId: string, claims: Record<string, unknown>): void {
    // Auto-create the user if it doesn't exist
    this.collections[userId] ??= {
      uid: userId,
      email: "user@example.com",
      emailVerified: true,
      displayName: "Test User",
      disabled: false,
      metadata: {
        creationTime: new Date().toISOString(),
        lastSignInTime: new Date().toISOString(),
        toJSON: () => ({}),
      },
      providerData: [],
      toJSON: () => ({}),
    };
    const user = this.collections[userId];

    const updatedUser: UserRecord = {
      uid: user.uid,
      email: user.email,
      emailVerified: user.emailVerified,
      displayName: user.displayName,
      photoURL: user.photoURL,
      phoneNumber: user.phoneNumber,
      disabled: user.disabled,
      metadata: user.metadata,
      providerData: user.providerData,
      passwordHash: user.passwordHash,
      passwordSalt: user.passwordSalt,
      tokensValidAfterTime: user.tokensValidAfterTime,
      tenantId: user.tenantId,
      multiFactor: user.multiFactor,
      customClaims: claims,
      toJSON: () => ({}),
    };
    this.collections[userId] = updatedUser;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async listUsers(): Promise<ListUsersResult> {
    const users: UserRecord[] = Object.values(this.collections).filter(
      (user): user is UserRecord => user !== undefined,
    );

    return {
      users,
      pageToken: undefined,
    };
  }

  deleteUser(uid: string): void {
    // Use property access with computed key instead of delete operator
    this.collections[uid] = undefined;
  }

  createUser(props: {
    email?: string;
    password?: string;
    displayName?: string;
  }): UserRecord {
    const uid = "user-" + crypto.randomBytes(8).toString("hex");
    const user: UserRecord = {
      uid,
      email: props.email ?? "user@example.com",
      emailVerified: true,
      displayName: props.displayName ?? "Test User",
      disabled: false,
      metadata: {
        creationTime: new Date().toISOString(),
        lastSignInTime: new Date().toISOString(),
        toJSON: () => ({}),
      },
      providerData: [],
      toJSON: () => ({}),
    };

    this.collections[uid] = user;
    return user;
  }
}
