//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { enrollUserInputSchema } from '@stanfordbdhg/engagehf-models'
import { https, logger } from 'firebase-functions'
import { validatedOnCall } from './helpers.js'
import { getServiceFactory } from '../services/factory/getServiceFactory.js'

export const enrollUser = validatedOnCall(
  'enrollUser',
  enrollUserInputSchema,
  async (request) => {
    const factory = getServiceFactory()
    const credential = factory.credential(request.auth)
    const triggerService = factory.trigger()
    const userService = factory.user()

    const userId = credential.userId
    const invitationCode = request.data.invitationCode

    const invitation = await userService.getInvitationByCode(invitationCode)
    if (invitation === undefined)
      throw new https.HttpsError('not-found', 'Invitation not found')

    const userDoc = await userService.enrollUser(invitation, userId, {
      isSingleSignOn: false,
    })

    logger.debug(
      `setupUser: User '${userId}' successfully enrolled in the study with invitation code: ${invitationCode}`,
    )

    await triggerService.userEnrolled(userDoc)

    logger.debug(`setupUser: User '${userId}' enrollment triggers finished`)
  },
)
