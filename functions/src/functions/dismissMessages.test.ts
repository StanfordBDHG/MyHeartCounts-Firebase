//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2025 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  LocalizedText,
  UserMessage,
  UserMessageType,
  UserType,
} from '@stanfordbdhg/engagehf-models'
import { expect } from 'chai'
import { it } from 'mocha'
import { dismissMessages } from './dismissMessages.js'
import { describeWithEmulators } from '../tests/functions/testEnvironment.js'

describeWithEmulators('function: dismissMessages', (env) => {
  it('should dismiss only specified messages when messageIds are provided', async () => {
    // Create test user
    const user = await env.auth.createUser({})
    // Create dismissible messages
    const message1 = new UserMessage({
      type: UserMessageType.weightGain,
      title: new LocalizedText({ text: 'Test Title 1' }),
      description: new LocalizedText({ text: 'Test Description 1' }),
      reference: 'test-reference-1',
      creationDate: new Date(),
      completionDate: undefined,
      isDismissible: true,
    })
    const message2 = new UserMessage({
      type: UserMessageType.vitals,
      title: new LocalizedText({ text: 'Test Title 2' }),
      description: new LocalizedText({ text: 'Test Description 2' }),
      reference: 'test-reference-2',
      creationDate: new Date(),
      completionDate: undefined,
      isDismissible: true,
    })

    // Save messages to the database
    const messageRef1 = env.collections.userMessages(user.uid).doc()
    const messageRef2 = env.collections.userMessages(user.uid).doc()
    const messageRef3 = env.collections.userMessages(user.uid).doc()
    await messageRef1.set(message1)
    await messageRef2.set(message2)

    // Call the dismissMessages function
    const result = await env.call(
      dismissMessages,
      {
        messageIds: [messageRef1.id, messageRef2.id],
        didPerformAction: false,
      },
      {
        uid: user.uid,
        token: { type: UserType.patient, organization: 'stanford' },
      },
    )

    expect(result).to.have.property('dismissedCount')
    expect(result.dismissedCount).to.equal(2)

    // Check that the specified messages have completion dates
    const actualMessage1 = await messageRef1.get()
    const actualMessage2 = await messageRef2.get()
    expect(actualMessage1.data()?.completionDate).to.exist
    expect(actualMessage2.data()?.completionDate).to.exist

    // Check that the unspecified message does NOT have a completion date
    const actualMessage3 = await messageRef3.get()
    expect(actualMessage3.data()?.completionDate).to.not.exist
  })

  it('should dismiss all dismissible messages when no messageIds are provided', async () => {
    // Create test user
    const user = await env.auth.createUser({})

    // Create dismissible and non-dismissible messages
    const dismissibleMessage = new UserMessage({
      type: UserMessageType.weightGain,
      title: new LocalizedText({ text: 'Dismissible Message' }),
      description: new LocalizedText({ text: 'This message can be dismissed' }),
      reference: 'test-reference-1',
      creationDate: new Date(),
      completionDate: undefined,
      isDismissible: true,
    })

    const nonDismissibleMessage = new UserMessage({
      type: UserMessageType.vitals,
      title: new LocalizedText({ text: 'Non-dismissible Message' }),
      description: new LocalizedText({
        text: 'This message cannot be dismissed',
      }),
      reference: 'test-reference-2',
      creationDate: new Date(),
      completionDate: undefined,
      isDismissible: false,
    })

    // Save messages to the database
    const dismissibleRef = env.collections.userMessages(user.uid).doc()
    const nonDismissibleRef = env.collections.userMessages(user.uid).doc()
    await dismissibleRef.set(dismissibleMessage)
    await nonDismissibleRef.set(nonDismissibleMessage)

    // Call the dismissMessages function without messageIds
    const result = await env.call(
      dismissMessages,
      {
        didPerformAction: false,
      },
      {
        uid: user.uid,
        token: { type: UserType.patient, organization: 'stanford' },
      },
    )

    // Verify only dismissible messages were dismissed
    expect(result).to.have.property('dismissedCount')
    expect(result.dismissedCount).to.be.greaterThan(0)

    // Check the dismissible message has completion date, but non-dismissible doesn't
    const actualDismissible = await dismissibleRef.get()
    const actualNonDismissible = await nonDismissibleRef.get()
    expect(actualDismissible.data()?.completionDate).to.exist
    expect(actualNonDismissible.data()?.completionDate).to.not.exist
  })

  it('should allow admin to dismiss messages for other users', async () => {
    // Create test users (admin and regular user)
    const regularUser = await env.auth.createUser({})
    const admin = await env.auth.createUser({})

    // Create a dismissible message for the regular user
    const message = new UserMessage({
      type: UserMessageType.weightGain,
      title: new LocalizedText({ text: 'Test Message' }),
      description: new LocalizedText({ text: 'Message for regular user' }),
      reference: 'test-reference',
      creationDate: new Date(),
      completionDate: undefined,
      isDismissible: true,
    })

    // Save message to the database
    const messageRef = env.collections.userMessages(regularUser.uid).doc()
    await messageRef.set(message)

    // Call the dismissMessages function with admin credentials
    const result = await env.call(
      dismissMessages,
      {
        userId: regularUser.uid,
        messageIds: [messageRef.id],
        didPerformAction: false,
      },
      {
        uid: admin.uid,
        token: { type: UserType.admin, organization: 'stanford' },
      },
    )

    // Verify message was dismissed
    expect(result).to.have.property('dismissedCount')
    expect(result.dismissedCount).to.be.greaterThan(0)

    // Check the message has completion date
    const actualMessage = await messageRef.get()
    expect(actualMessage.data()?.completionDate).to.exist
  })
})
