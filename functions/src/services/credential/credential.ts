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
} from '@stanfordbdhg/myheartcounts-models'
import { https, logger } from 'firebase-functions/v2'
import { type AuthData } from 'firebase-functions/v2/tasks'

export class Credential {
  // Stored Properties

  readonly userId: string
  private readonly claims: Partial<UserClaims>

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

  checkAuthenticated(): void {
    if (this.claims.disabled === true) throw this.disabledError()
  }

  checkUser(userId: string): void {
    this.checkAuthenticated()
    if (this.userId !== userId) {
      throw this.permissionDeniedError()
    }
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
}
