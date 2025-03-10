//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  type createInvitationInputSchema,
  UserType,
} from '@stanfordbdhg/engagehf-models'
import { expect } from 'chai'
import { type z } from 'zod'
import { createInvitation } from './createInvitation.js'
import { describeWithEmulators } from '../tests/functions/testEnvironment.js'
import { expectError } from '../tests/helpers.js'

describeWithEmulators('function: createInvitation', (env) => {
  it('should create an invitation for a clinician', async () => {
    const input: z.input<typeof createInvitationInputSchema> = {
      auth: {
        displayName: 'Test User',
        email: 'engagehf-test@stanford.edu',
      },
      user: {
        type: UserType.clinician,
        organization: 'stanford',
        receivesAppointmentReminders: false,
        receivesInactivityReminders: true,
        receivesMedicationUpdates: true,
        receivesQuestionnaireReminders: false,
        receivesRecommendationUpdates: true,
        receivesVitalsReminders: false,
        receivesWeightAlerts: false,
      },
    }

    await env.call(createInvitation, input, {
      uid: 'test',
      token: { type: UserType.owner, organization: 'stanford' },
    })

    const invitations = await env.collections.invitations.get()
    expect(invitations.docs).to.have.length(1)

    const invitation = invitations.docs[0].data()
    expect(invitation.code).to.equal(input.auth.email)
  })

  it('should create an invitation for a patient', async () => {
    const input: z.input<typeof createInvitationInputSchema> = {
      auth: {
        displayName: 'Test User',
        email: 'engagehf-test@stanford.edu',
      },
      user: {
        type: UserType.patient,
        organization: 'stanford',
        receivesAppointmentReminders: false,
        receivesInactivityReminders: true,
        receivesMedicationUpdates: true,
        receivesQuestionnaireReminders: false,
        receivesRecommendationUpdates: true,
        receivesVitalsReminders: false,
        receivesWeightAlerts: false,
      },
    }

    await env.call(createInvitation, input, {
      uid: 'test',
      token: { type: UserType.clinician, organization: 'stanford' },
    })

    const invitations = await env.collections.invitations.get()
    expect(invitations.docs).to.have.length(1)

    const invitation = invitations.docs[0].data()
    expect(invitation.code).to.have.length(8)
    expect(invitation.code).to.match(/^[A-Z0-9]{8}$/)
  })

  it('should not create an invitation without authentication', () => {
    const input: z.input<typeof createInvitationInputSchema> = {
      auth: {
        displayName: 'Test User',
      },
      user: {
        type: UserType.patient,
        organization: 'stanford',
        receivesAppointmentReminders: true,
        receivesInactivityReminders: true,
        receivesMedicationUpdates: true,
        receivesQuestionnaireReminders: true,
        receivesRecommendationUpdates: true,
        receivesVitalsReminders: true,
        receivesWeightAlerts: true,
      },
    }

    return expectError(
      async () => env.call(createInvitation, input, { uid: 'test' }),
      (error) => expect(error).to.have.property('code', 'permission-denied'),
    )
  })
})
