//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  User,
  type UserAuth,
} from '@stanfordbdhg/myheartcounts-models'
import { type EnrollUserOptions, type UserService } from './userService.js'
import { type Document } from '../database/databaseService.js'
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unused-vars */

export class MockUserService implements UserService {
  // Methods - Auth

  async getAuth(userId: string): Promise<UserAuth> {
    switch (userId) {
      case 'mockClinician':
        return {
          displayName: 'Dr. XXX',
        }
      case 'mockUser':
        return {
          displayName: 'John Doe',
        }
      default:
        return {
          displayName: 'Unknown',
        }
    }
  }

  async updateAuth(userId: string, user: UserAuth): Promise<void> {
    return
  }

  async updateClaims(userId: string): Promise<void> {
    return
  }

  async enrollUserDirectly(
    userId: string,
    options: EnrollUserOptions,
  ): Promise<Document<User>> {
    return this.getUser(userId)
  }

  async finishUserEnrollment(user: Document<User>): Promise<void> {
    return
  }

  // Methods - User

  async disableUser(userId: string): Promise<void> {
    return
  }

  async enableUser(userId: string): Promise<void> {
    return
  }

  async getAllPatients(): Promise<Array<Document<User>>> {
    return []
  }

  async getUser(userId: string): Promise<Document<User>> {
    return {
      id: userId,
      path: 'users/' + userId,
      lastUpdate: new Date(),
      content: new User({
        type: 'clinician',
        disabled: false,
        dateOfBirth: new Date('1970-01-02'),
        lastActiveDate: new Date('2024-04-04'),
        dateOfEnrollment: new Date('2024-04-02'),
        timeZone: 'America/Los_Angeles',
      }),
    }
  }

  async updateLastActiveDate(userId: string): Promise<void> {
    return
  }

  async markAccountForDeletion(userId: string, markedAt: Date): Promise<void> {
    return
  }

  async deleteUser(userId: string): Promise<void> {
    return
  }

  async deleteExpiredAccounts(): Promise<void> {
    return
  }
}
