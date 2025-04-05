//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  LocalizedText,
  UserMessage,
  UserMessageType,
  UserType,
  VideoReference,
} from '@stanfordbdhg/engagehf-models'
import { expect } from 'chai'
import { describeWithEmulators } from '../../tests/functions/testEnvironment.js'

describeWithEmulators('TriggerService', (env) => {
  describe('service functionality', () => {
    it('should create user messages', async () => {
      const patientId = await env.createUser({
        type: UserType.patient,
      })

      // Create a simple welcome message
      const message = UserMessage.createWelcome({
        videoReference: VideoReference.welcome,
        creationDate: new Date(),
      })

      // Directly create a message document
      const messagesRef = env.collections.userMessages(patientId).doc()
      await messagesRef.set(message)

      // Verify the message was created
      const messagesSnapshot = await env.collections
        .userMessages(patientId)
        .get()
      expect(messagesSnapshot.docs.length).to.equal(1)
      expect(messagesSnapshot.docs[0].data().type).to.equal(
        UserMessageType.welcome,
      )
    })
  })
})
