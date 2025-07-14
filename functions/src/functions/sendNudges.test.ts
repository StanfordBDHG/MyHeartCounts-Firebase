//
// This source file is part of the Stanford Biodesign Digital Health MyHeart Counts open-source project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2025 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { expect } from 'chai'
import admin from 'firebase-admin'
import { it, describe } from 'mocha'
import { stub, restore } from 'sinon'
import { processNotificationBacklog } from './sendNudges.js'
import { describeWithEmulators } from '../tests/functions/testEnvironment.js'
import { MockMessaging } from '../tests/mocks/messaging.js'

describeWithEmulators('function: sendNudges', (env) => {
  let mockMessaging: MockMessaging

  beforeEach(() => {
    mockMessaging = new MockMessaging()
    // Stub the messaging function directly on the admin object
    // this prevents actual firebase calls in tests
    stub(admin, 'messaging').returns(mockMessaging as any)
  })

  afterEach(() => {
    restore()
  })
  describe('Notification processing', () => {
    it('does not send notifications when time has not passed', async () => {
      const userId = 'test-user-future'
      const futureTime = new Date()
      futureTime.setMinutes(futureTime.getMinutes() + 30)

      await env.firestore.collection('users').doc(userId).set({
        type: 'patient',
        fcmToken: 'test-fcm-token',
        timeZone: 'UTC',
      })

      await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationBacklog')
        .add({
          title: 'Future Notification',
          body: 'This notification is for the future',
          timestamp: admin.firestore.Timestamp.fromDate(futureTime),
        })

      await processNotificationBacklog()

      const historySnapshot = await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationHistory')
        .get()

      expect(historySnapshot.size).to.equal(0)

      const backlogSnapshot = await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationBacklog')
        .get()

      expect(backlogSnapshot.size).to.equal(1)
    })

    it('skips users without FCM token', async () => {
      const userId = 'test-user-no-token'
      const pastTime = new Date()
      pastTime.setMinutes(pastTime.getMinutes() - 30)

      await env.firestore.collection('users').doc(userId).set({
        type: 'patient',
        timeZone: 'UTC',
      })

      await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationBacklog')
        .add({
          title: 'Test Notification',
          body: 'This notification should not be sent',
          timestamp: admin.firestore.Timestamp.fromDate(pastTime),
        })

      await processNotificationBacklog()

      const historySnapshot = await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationHistory')
        .get()

      expect(historySnapshot.size).to.equal(0)

      const backlogSnapshot = await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationBacklog')
        .get()

      expect(backlogSnapshot.size).to.equal(1)
    })

    it('skips users without timezone', async () => {
      const userId = 'test-user-no-timezone'
      const pastTime = new Date()
      pastTime.setMinutes(pastTime.getMinutes() - 30)

      await env.firestore.collection('users').doc(userId).set({
        type: 'patient',
        fcmToken: 'test-fcm-token',
      })

      await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationBacklog')
        .add({
          title: 'Test Notification',
          body: 'This notification should not be sent',
          timestamp: admin.firestore.Timestamp.fromDate(pastTime),
        })

      await processNotificationBacklog()

      const historySnapshot = await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationHistory')
        .get()

      expect(historySnapshot.size).to.equal(0)

      const backlogSnapshot = await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationBacklog')
        .get()

      expect(backlogSnapshot.size).to.equal(1)
    })
  })

  describe('Error handling', () => {
    it('handles empty notification backlog gracefully', async () => {
      const userId = 'test-user-empty'

      await env.firestore.collection('users').doc(userId).set({
        type: 'patient',
        fcmToken: 'test-fcm-token',
        timeZone: 'UTC',
      })

      await processNotificationBacklog()

      const historySnapshot = await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationHistory')
        .get()

      expect(historySnapshot.size).to.equal(0)
    })

    it('handles users with no backlog collection', async () => {
      const userId = 'test-user-no-backlog'

      await env.firestore.collection('users').doc(userId).set({
        type: 'patient',
        fcmToken: 'test-fcm-token',
        timeZone: 'UTC',
      })

      await processNotificationBacklog()

      const historySnapshot = await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationHistory')
        .get()

      expect(historySnapshot.size).to.equal(0)
    })
  })

  describe('Non-patient users', () => {
    it('skips non-patient users', async () => {
      const userId = 'test-clinician'
      const pastTime = new Date()
      pastTime.setMinutes(pastTime.getMinutes() - 30)

      await env.firestore.collection('users').doc(userId).set({
        type: 'clinician',
        fcmToken: 'test-fcm-token',
        timeZone: 'UTC',
      })

      await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationBacklog')
        .add({
          title: 'Clinician Notification',
          body: 'This should not be processed',
          timestamp: admin.firestore.Timestamp.fromDate(pastTime),
        })

      await processNotificationBacklog()

      const historySnapshot = await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationHistory')
        .get()

      expect(historySnapshot.size).to.equal(0)

      const backlogSnapshot = await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationBacklog')
        .get()

      expect(backlogSnapshot.size).to.equal(1)
    })
  })
})
