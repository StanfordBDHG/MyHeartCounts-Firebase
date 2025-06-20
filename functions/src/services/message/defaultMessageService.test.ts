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
  QuestionnaireReference,
} from '@stanfordbdhg/myheartcounts-models'
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

  describe('registerDevice', () => {
    it('should create a new device document when registering a new device', async () => {
      const userId = 'testUser'
      const platform = 'iOS' as any // Type workaround
      const token = 'test-token-123'

      await messageService.registerDevice(userId, {
        platform,
        notificationToken: token,
      } as any) // Type workaround

      // Check if a device was created
      const devicesQuerySnapshot = await collectionsService
        .userDevices(userId)
        .get()
      expect(devicesQuerySnapshot.docs.length).to.equal(1)

      const deviceDoc = devicesQuerySnapshot.docs[0]
      const deviceData = deviceDoc.data()

      expect(deviceData.platform).to.equal(platform)
      expect(deviceData.notificationToken).to.equal(token)
    })

    it('should update an existing device when registering with the same token', async () => {
      const userId = 'testUser'
      const platform = 'iOS' as any // Type workaround
      const token = 'test-token-123'
      const language = 'en'

      // Register device first time
      await messageService.registerDevice(userId, {
        platform,
        notificationToken: token,
      } as any) // Type workaround

      // Register device second time with additional data
      await messageService.registerDevice(userId, {
        platform,
        notificationToken: token,
        language,
      } as any) // Type workaround

      // Should still have only one device
      const devicesQuerySnapshot = await collectionsService
        .userDevices(userId)
        .get()
      expect(devicesQuerySnapshot.docs.length).to.equal(1)

      // The device should have been updated with the language
      const deviceDoc = devicesQuerySnapshot.docs[0]
      const deviceData = deviceDoc.data()

      expect(deviceData.platform).to.equal(platform)
      expect(deviceData.notificationToken).to.equal(token)
      expect(deviceData.language).to.equal(language)
    })
  })

  describe('unregisterDevice', () => {
    it('should remove a device when unregistering', async () => {
      const userId = 'testUser'
      const platform = 'iOS' as any // Type workaround
      const token = 'test-token-123'

      // First register a device
      await messageService.registerDevice(userId, {
        platform,
        notificationToken: token,
      } as any) // Type workaround

      // Verify the device was created
      let devicesQuerySnapshot = await collectionsService
        .userDevices(userId)
        .get()
      expect(devicesQuerySnapshot.docs.length).to.equal(1)

      // Unregister the device
      await messageService.unregisterDevice(token, platform)

      // The device should be gone
      devicesQuerySnapshot = await collectionsService.userDevices(userId).get()
      expect(devicesQuerySnapshot.docs.length).to.equal(0)
    })

    it('should do nothing if the device does not exist', async () => {
      // Unregister a non-existent device
      await messageService.unregisterDevice('non-existent-token', 'iOS' as any)

      // No errors should be thrown
    })
  })

  describe('dismissMessage', () => {
    it('should update the completionDate of messages', async () => {
      const message = new UserMessage({
        creationDate: new Date('2024-01-01'),
        dueDate: new Date('2024-01-01'),
        type: UserMessageType.weightGain,
        title: LocalizedText.raw({
          en: 'Weight increase since last week',
        }),
        description: LocalizedText.raw({
          en: 'Your weight increased over 3 lbs. Your care team will be informed.',
        }),
        action: 'observations',
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
        title: LocalizedText.raw({
          en: 'Upcoming appointment',
        }),
        description: LocalizedText.raw({
          en: 'You have an upcoming appointment!',
        }),
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

  describe('addMessage', () => {
    it('should add a new message', async () => {
      const userId = 'testAddMessageUser'
      const message = UserMessage.createWelcome({
        creationDate: new Date(),
      })

      await messageService.addMessage(userId, message)

      // Verify message was added
      const messagesSnapshot = await collectionsService
        .userMessages(userId)
        .get()
      expect(messagesSnapshot.docs.length).to.equal(1)

      const messageData = messagesSnapshot.docs[0].data()
      expect(messageData.type).to.equal(UserMessageType.welcome)
    })

    it('should handle notify option', async () => {
      const userId = 'testNotifyUser'
      const message = UserMessage.createSymptomQuestionnaire({
        questionnaireReference: QuestionnaireReference.enUS,
      })

      // This won't actually trigger a notification in the mock,
      // but ensures code path is covered
      await messageService.addMessage(userId, message, { notify: true })

      // Verify message was added
      const messagesSnapshot = await collectionsService
        .userMessages(userId)
        .get()
      expect(messagesSnapshot.docs.length).to.equal(1)
    })

    it('should handle replaceDuplicates option', async () => {
      const userId = 'testReplaceUser'

      // Create first message
      const message1 = UserMessage.createVitals({})
      await messageService.addMessage(userId, message1)

      // Create second message with same type
      const message2 = UserMessage.createVitals({
        creationDate: new Date(Date.now() + 1000), // Slightly newer
      })

      // Replace duplicates
      await messageService.addMessage(userId, message2, {
        replaceDuplicates: true,
      })

      // Should still have only one message, the newer one
      const messagesSnapshot = await collectionsService
        .userMessages(userId)
        .get()
      expect(messagesSnapshot.docs.length).to.equal(1)

      // The message should have the newer creation date
      const messageData = messagesSnapshot.docs[0].data()
      // Handle various date formats
      let dateValue: number
      if (messageData.creationDate) {
        // Get timestamp by converting to number
        dateValue = Number(messageData.creationDate)
        if (isNaN(dateValue)) {
          // If it's not a number, try using it as a Date object
          dateValue = new Date(messageData.creationDate).getTime()
        }
      } else {
        dateValue = 0
      }

      expect(dateValue).to.be.greaterThan(message1.creationDate.getTime())
    })
  })

  describe('sendNotification', () => {
    it('should attempt to send notifications if devices exist', async () => {
      const userId = 'testNotificationUser'
      const platform = 'iOS' as any
      const token = 'test-notification-token'

      // Register a device first
      await messageService.registerDevice(userId, {
        platform,
        notificationToken: token,
      } as any)

      // This won't actually send in the mock but covers the code path
      await messageService.sendNotification(userId, {
        title: { en: 'Test Title' },
        body: { en: 'Test Body' },
      })

      // Test passes if no error is thrown
    })

    it('should do nothing if no devices exist', async () => {
      // This won't find any devices but shouldn't error
      await messageService.sendNotification('nonExistentUser', {
        title: { en: 'Test Title' },
        body: { en: 'Test Body' },
      })

      // Test passes if no error is thrown
    })

    it('should handle notifications with multiple languages', async () => {
      const userId = 'testMultiLangUser'
      const platform = 'iOS' as any
      const token = 'test-notification-token-2'

      // Register a device with language preference
      await messageService.registerDevice(userId, {
        platform,
        notificationToken: token,
        language: 'fr',
      } as any)

      // Send notification with multiple languages
      await messageService.sendNotification(userId, {
        title: {
          en: 'Test Title',
          fr: 'Titre de Test',
          de: 'Test Titel',
        },
        body: {
          en: 'Test Body',
          fr: 'Corps de Test',
          de: 'Test Körper',
        },
      })

      // Test passes if no error is thrown
    })

    it('should handle device with empty token', async () => {
      const userId = 'testEmptyTokenUser'
      const platform = 'iOS' as any

      // Register a device with empty token
      await messageService.registerDevice(userId, {
        platform,
        notificationToken: '', // Empty string instead of undefined
        language: 'en',
      } as any)

      // Send notification - should skip this device and not error
      await messageService.sendNotification(userId, {
        title: { en: 'Test Title' },
        body: { en: 'Test Body' },
      })

      // Test passes if no error is thrown
    })

    it('should handle notification failures gracefully', async () => {
      const userId = 'testFailureUser'
      const platform = 'iOS' as any
      const token = 'test-notification-token-fail'

      // Register a device
      await messageService.registerDevice(userId, {
        platform,
        notificationToken: token,
      } as any)

      // Setup mock to return failure for this particular test
      // This is done by modifying the device token to a special value
      // that our mock will recognize as a failure case

      // Send notification that will "fail" in the mock
      await messageService.sendNotification(userId, {
        title: { en: 'Test Title' },
        body: { en: 'Test Body' },
      })

      // Test passes if no error is thrown (showing it handles failures gracefully)
    })
  })
})
