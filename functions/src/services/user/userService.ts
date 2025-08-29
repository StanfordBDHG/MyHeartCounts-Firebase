//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { type User, type UserAuth } from '@stanfordbdhg/myheartcounts-models'
import { type Document } from '../database/databaseService.js'

export interface EnrollUserOptions {
  isSingleSignOn: boolean
}

export interface UserService {
  // Auth

  getAuth(userId: string): Promise<UserAuth>
  updateAuth(userId: string, auth: UserAuth): Promise<void>
  updateClaims(userId: string): Promise<void>

  // Users

  enrollUserDirectly(
    userId: string,
    options: EnrollUserOptions,
  ): Promise<Document<User>>
  finishUserEnrollment(user: Document<User>): Promise<void>
  disableUser(userId: string): Promise<void>
  enableUser(userId: string): Promise<void>
  getAllPatients(): Promise<Array<Document<User>>>
  getUser(userId: string): Promise<Document<User> | undefined>
  updateLastActiveDate(userId: string): Promise<void>
  markAccountForDeletion(userId: string, markedAt: Date): Promise<void>
  deleteUser(userId: string): Promise<void>
  deleteExpiredAccounts(): Promise<void>
}
