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
} from '@stanfordbdhg/engagehf-models'
import { expect } from 'chai'
import admin from 'firebase-admin'
import { https } from 'firebase-functions'
import { type MessageService } from './messageService.js'
import { cleanupMocks, setupMockFirebase } from '../../tests/setup.js'
import { CollectionsService } from '../database/collections.js'
import { getServiceFactory } from '../factory/getServiceFactory.js'

describe('DefaultMessageService', () => {
  let collectionsService: CollectionsService
  let messageService: MessageService

  beforeEach(() => {
    setupMockFirebase()
    collectionsService = new CollectionsService(admin.firestore())
    messageService = getServiceFactory().message()
  })

  afterEach(() => {
    cleanupMocks()
  })

  describe('dismissMessage', () => {
    it('should update the completionDate of messages', async () => {
      const message = new UserMessage({
        creationDate: new Date('2024-01-01'),
        dueDate: new Date('2024-01-01'),
        type: UserMessageType.medicationChange,
        title: new LocalizedText('Medication Change'),
        description: new LocalizedText('You have a new medication!'),
        action: 'medications',
        isDismissible: true,
      })
      await collectionsService.userMessages('mockUser').doc('0').set(message)
      await messageService.dismissMessage('mockUser', '0', true)
      const updatedMessage = await collectionsService
        .userMessages('mockUser')
        .doc('0')
        .get()
      expect(updatedMessage.data()?.completionDate).to.not.be.undefined
    })

    it('should not update the completionDate of messages', async () => {
      const message = new UserMessage({
        creationDate: new Date('2024-01-01'),
        dueDate: new Date('2024-01-01'),
        type: UserMessageType.preAppointment,
        title: new LocalizedText('Upcoming appointment'),
        description: new LocalizedText('You have an upcoming appointment!'),
        action: 'healthSummary',
        isDismissible: false,
      })
      await collectionsService.userMessages('mockUser').doc('0').set(message)
      try {
        await messageService.dismissMessage('mockUser', '0', true)
        expect.fail('Message should not be dismissible.')
      } catch (error) {
        expect(error).to.deep.equal(
          new https.HttpsError(
            'invalid-argument',
            'Message is not dismissible.',
          ),
        )
      }
    })
  })
})
