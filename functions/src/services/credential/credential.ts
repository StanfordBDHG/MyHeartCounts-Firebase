//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  type UserClaims,
  userClaimsSchema,
  UserType,
} from '@stanfordbdhg/engagehf-models'
import { https, logger } from 'firebase-functions/v2'
import { type AuthData } from 'firebase-functions/v2/tasks'

enum UserRoleType {
  admin = 'admin',
  clinician = 'clinician',
  patient = 'patient',
  user = 'user',
}

export class UserRole {
  // Properties

  readonly type: UserRoleType
  readonly organization?: string
  readonly userId?: string

  // Constructor

  private constructor(
    type: UserRoleType,
    organization?: string,
    userId?: string,
  ) {
    this.type = type
    this.organization = organization
    this.userId = userId
  }

  // Methods

  equals(role: UserRole): boolean {
    return (
      this.type === role.type &&
      this.organization === role.organization &&
      this.userId === role.userId
    )
  }

  // Static Properties

  static readonly admin = new UserRole(UserRoleType.admin, undefined, undefined)
  static readonly clinician = new UserRole(
    UserRoleType.clinician,
    undefined,
    undefined,
  )
  static readonly patient = new UserRole(
    UserRoleType.patient,
    undefined,
    undefined,
  )
  static user(userId: string): UserRole {
    return new UserRole(UserRoleType.user, undefined, userId)
  }
}

export class Credential {
  // Stored Properties

  readonly userId: string
  private readonly claims: Partial<UserClaims>
  
  // Public getters for testing
  get userType(): UserType {
    return this.claims.type ?? UserType.patient
  }
  
  // Helper method for testing
  userHasType(type: UserType): boolean {
    return this.userType === type
  }

  // Constructor

  constructor(authData: AuthData | undefined) {
    if (authData?.uid === undefined) {
      throw new https.HttpsError(
        'unauthenticated',
        'User is not authenticated.',
      )
    }
    try {
      this.claims = userClaimsSchema.partial().parse(authData.token)
    } catch (error: unknown) {
      logger.error(
        `Credential.constructor: Failed to parse user claims due to: ${String(error)}.`,
      )
      throw this.permissionDeniedError()
    }
    this.userId = authData.uid
  }

  // Methods

  check(...roles: UserRole[]): UserRole {
    const role = roles.find((role) => this.checkSingle(role))
    if (role !== undefined) return role
    throw this.permissionDeniedError()
  }

  async checkAsync(
    ...promises: Array<() => Promise<UserRole[]> | UserRole[]>
  ): Promise<UserRole> {
    for (const promise of promises) {
      const roles = await promise()
      const role = roles.find((role) => this.checkSingle(role))
      if (role !== undefined) return role
    }
    throw this.permissionDeniedError()
  }

  permissionDeniedError(): https.HttpsError {
    return new https.HttpsError(
      'permission-denied',
      'User does not have permission.',
    )
  }

  disabledError(): https.HttpsError {
    return new https.HttpsError('permission-denied', 'User is disabled.')
  }

  // Helpers

  private checkSingle(role: UserRole): boolean {
    if (this.claims.disabled === true) throw this.disabledError()

    switch (role.type) {
      case UserRoleType.admin: {
        return this.claims.type === UserType.admin
      }
      case UserRoleType.clinician: {
        return this.claims.type === UserType.clinician
      }
      case UserRoleType.patient: {
        return this.claims.type === UserType.patient
      }
      case UserRoleType.user: {
        return this.userId === role.userId
      }
    }
  }
}
