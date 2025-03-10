//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { UserType } from '@stanfordbdhg/engagehf-models'
import { https, logger } from 'firebase-functions'
import {
  beforeUserCreated,
  beforeUserSignedIn,
} from 'firebase-functions/v2/identity'
import { serviceAccount } from './helpers.js'
import { Flags } from '../flags.js'
import { getServiceFactory } from '../services/factory/getServiceFactory.js'

export const beforeUserCreatedFunction = beforeUserCreated(
  { serviceAccount: serviceAccount },
  async (event) => {
    const userId = event.data.uid
    logger.info(`${userId}: Start.`)

    const factory = getServiceFactory()
    const userService = factory.user()
    const credential = event.credential

    logger.info(`${userId}: About to check existence of credential.`)

    // Escape hatch for users using invitation code to enroll
    if (!credential) {
      logger.info(
        `${userId}: Escaped beforeUserCreated because no credential was provided.`,
      )
      return { customClaims: {} }
    }

    logger.info(`${userId}: About to check email address: ${event.data.email}.`)

    if (event.data.email === undefined) {
      logger.error(`Email address not set.`)
      throw new https.HttpsError(
        'invalid-argument',
        'Email address is required for user.',
      )
    }

    logger.info(
      `${userId}: About to get organization by SSO ProviderId: ${credential.providerId}.`,
    )

    const organization = await userService.getOrganizationBySsoProviderId(
      credential.providerId,
    )

    if (organization === undefined) {
      logger.error(
        `${userId}: Organization not found for providerId: ${credential.providerId}.`,
      )
      throw new https.HttpsError(
        'failed-precondition',
        'Organization not found.',
      )
    }

    logger.info(
      `${userId}: About to get invitation by code: ${event.data.email}.`,
    )

    const invitation = await userService.getInvitationByCode(event.data.email)
    if (invitation?.content === undefined) {
      logger.error(
        `${userId}: No valid invitation code found for user with email ${event.data.email}.`,
      )
      throw new https.HttpsError(
        'not-found',
        'No valid invitation code found for user.',
      )
    }

    if (
      /* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */
      Flags.requireInvitationOrganizationToMatchSsoProviderId &&
      invitation.content.user.type !== UserType.admin &&
      invitation.content.user.organization !== organization.id
    ) {
      logger.error(
        `${userId}: Organization does not match invitation code. Invitation UserType (${invitation.content.user.type}), Invitation-Organization (${invitation.content.user.organization}), SSO-Organization (${organization.id})`,
      )
      throw new https.HttpsError(
        'failed-precondition',
        'Organization does not match invitation code.',
      )
    }

    logger.info(`${userId}: Starting user enrolment.`)

    const userDoc = await userService.enrollUser(invitation, userId, {
      isSingleSignOn: true,
    })

    logger.info(`${userId}: Finishing user enrolment.`)

    await factory.trigger().userEnrolled(userDoc)

    logger.info(`${userId}: Successfully enrolled user.`)

    return { customClaims: invitation.content.user.claims }
  },
)

export const beforeUserSignedInFunction = beforeUserSignedIn(
  { serviceAccount: serviceAccount },
  async (event) => {
    try {
      const userService = getServiceFactory().user()
      const user = await userService.getUser(event.data.uid)
      if (user !== undefined) {
        logger.info(`beforeUserSignedIn finished successfully.`)
        return {
          customClaims: user.content.claims,
          sessionClaims: user.content.claims,
        }
      }
      logger.info(`beforeUserSignedIn finished without user.`)
      return { customClaims: {} }
    } catch (error) {
      logger.error(`beforeUserSignedIn finished with error: ${String(error)}`)
      return { customClaims: {} }
    }
  },
)
