//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  type Invitation,
  type User,
  type UserAuth,
} from '@stanfordbdhg/engagehf-models'
import { type Document } from '../database/databaseService.js'

export interface CreateInvitationData {
  auth?: UserAuth
  user?: User
}

export interface UserService {
  // Auth

  getAuth(userId: string): Promise<UserAuth>
  updateAuth(userId: string, auth: UserAuth): Promise<void>
  updateClaims(userId: string): Promise<void>

  // Invitations

  createInvitation(content: Invitation): Promise<{ id: string }>
  getInvitationByCode(
    invitationCode: string,
  ): Promise<Document<Invitation> | undefined>
  enrollUser(
    invitation: Document<Invitation>,
    userId: string,
    options: { isSingleSignOn: boolean },
  ): Promise<Document<User>>
  finishUserEnrollment(user: Document<User>): Promise<void>
  deleteInvitation(invitation: Document<Invitation>): Promise<void>


  // Users

  disableUser(userId: string): Promise<void>
  enableUser(userId: string): Promise<void>
  getAllPatients(): Promise<Array<Document<User>>>
  getUser(userId: string): Promise<Document<User> | undefined>
  updateLastActiveDate(userId: string): Promise<void>
  deleteUser(userId: string): Promise<void>
  deleteExpiredAccounts(): Promise<void>
}
