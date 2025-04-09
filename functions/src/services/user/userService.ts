//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  type Invitation,
  type Organization,
  type User,
  type UserAuth,
} from '@stanfordbdhg/engagehf-models'
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
  deleteUser(userId: string): Promise<void>
  deleteExpiredAccounts(): Promise<void>

  // Legacy methods (stubs for backward compatibility)

  // TODO REMOVE PROTOCOLS

  getInvitationByCode(code: string): Promise<Document<Invitation> | undefined>
  enrollUser(
    invitation: Document<Invitation>,
    userId: string,
    options: EnrollUserOptions,
  ): Promise<Document<User>>
  deleteInvitation(invitation: Document<Invitation>): Promise<void>
  createInvitation(content: Invitation): Promise<{ id: string }>
  getOrganizationBySsoProviderId(
    providerId: string,
  ): Promise<Document<Organization> | undefined>
}
