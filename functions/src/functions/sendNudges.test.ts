//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { expect } from 'chai'
import { it, describe } from 'mocha'
import admin from 'firebase-admin'
import type { Timestamp } from '@google-cloud/firestore'
import { processNotificationBacklog } from './sendNudges.js'
import { describeWithEmulators } from '../tests/functions/testEnvironment.js'

describeWithEmulators('function: sendNudges', (env) => {
  describe('Notification processing', () => {
    it('sends notifications when time has passed', async () => {
      const userId = 'test-user-send'
      const pastTime = new Date()
      pastTime.setMinutes(pastTime.getMinutes() - 30)

      await env.firestore.collection('users').doc(userId).set({
        type: 'patient',
        fcmToken: 'test-fcm-token',
        timeZone: 'UTC'
      })

      await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationBacklog')
        .add({
          title: 'Test Notification',
          body: 'This is a test notification',
          timestamp: admin.firestore.Timestamp.fromDate(pastTime)
        })

      await processNotificationBacklog()

      const historySnapshot = await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationHistory')
        .get()

      expect(historySnapshot.size).to.equal(1)
      
      const notification = historySnapshot.docs[0].data()
      expect(notification.title).to.equal('Test Notification')
      expect(notification.body).to.equal('This is a test notification')
      expect(notification.timestamp).to.be.instanceOf(admin.firestore.Timestamp)

      const backlogSnapshot = await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationBacklog')
        .get()

      expect(backlogSnapshot.size).to.equal(0)
    })

    it('does not send notifications when time has not passed', async () => {
      const userId = 'test-user-future'
      const futureTime = new Date()
      futureTime.setMinutes(futureTime.getMinutes() + 30)

      await env.firestore.collection('users').doc(userId).set({
        type: 'patient',
        fcmToken: 'test-fcm-token',
        timeZone: 'UTC'
      })

      await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationBacklog')
        .add({
          title: 'Future Notification',
          body: 'This notification is for the future',
          timestamp: admin.firestore.Timestamp.fromDate(futureTime)
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
        timeZone: 'UTC'
      })

      await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationBacklog')
        .add({
          title: 'Test Notification',
          body: 'This notification should not be sent',
          timestamp: admin.firestore.Timestamp.fromDate(pastTime)
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
        fcmToken: 'test-fcm-token'
      })

      await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationBacklog')
        .add({
          title: 'Test Notification',
          body: 'This notification should not be sent',
          timestamp: admin.firestore.Timestamp.fromDate(pastTime)
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

    it('processes multiple notifications for a user', async () => {
      const userId = 'test-user-multiple'
      const pastTime1 = new Date()
      pastTime1.setMinutes(pastTime1.getMinutes() - 60)
      
      const pastTime2 = new Date()
      pastTime2.setMinutes(pastTime2.getMinutes() - 30)

      await env.firestore.collection('users').doc(userId).set({
        type: 'patient',
        fcmToken: 'test-fcm-token',
        timeZone: 'UTC'
      })

      await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationBacklog')
        .add({
          title: 'First Notification',
          body: 'First notification body',
          timestamp: admin.firestore.Timestamp.fromDate(pastTime1)
        })

      await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationBacklog')
        .add({
          title: 'Second Notification',
          body: 'Second notification body',
          timestamp: admin.firestore.Timestamp.fromDate(pastTime2)
        })

      await processNotificationBacklog()

      const historySnapshot = await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationHistory')
        .get()

      expect(historySnapshot.size).to.equal(2)

      const backlogSnapshot = await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationBacklog')
        .get()

      expect(backlogSnapshot.size).to.equal(0)
    })

    it('processes multiple users', async () => {
      const user1Id = 'test-user-1'
      const user2Id = 'test-user-2'
      const pastTime = new Date()
      pastTime.setMinutes(pastTime.getMinutes() - 30)

      await env.firestore.collection('users').doc(user1Id).set({
        type: 'patient',
        fcmToken: 'test-fcm-token-1',
        timeZone: 'UTC'
      })

      await env.firestore.collection('users').doc(user2Id).set({
        type: 'patient',
        fcmToken: 'test-fcm-token-2',
        timeZone: 'America/New_York'
      })

      await env.firestore
        .collection('users')
        .doc(user1Id)
        .collection('notificationBacklog')
        .add({
          title: 'User 1 Notification',
          body: 'Notification for user 1',
          timestamp: admin.firestore.Timestamp.fromDate(pastTime)
        })

      await env.firestore
        .collection('users')
        .doc(user2Id)
        .collection('notificationBacklog')
        .add({
          title: 'User 2 Notification',
          body: 'Notification for user 2',
          timestamp: admin.firestore.Timestamp.fromDate(pastTime)
        })

      await processNotificationBacklog()

      const user1HistorySnapshot = await env.firestore
        .collection('users')
        .doc(user1Id)
        .collection('notificationHistory')
        .get()

      const user2HistorySnapshot = await env.firestore
        .collection('users')
        .doc(user2Id)
        .collection('notificationHistory')
        .get()

      expect(user1HistorySnapshot.size).to.equal(1)
      expect(user2HistorySnapshot.size).to.equal(1)
    })
  })

  describe('Time zone handling', () => {
    it('correctly handles different time zones', async () => {
      const userId = 'test-user-timezone'
      
      const utcTime = new Date()
      utcTime.setMinutes(utcTime.getMinutes() - 30)

      const nyTime = new Date(utcTime.toLocaleString('en-US', { timeZone: 'America/New_York' }))
      
      await env.firestore.collection('users').doc(userId).set({
        type: 'patient',
        fcmToken: 'test-fcm-token',
        timeZone: 'America/New_York'
      })

      await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationBacklog')
        .add({
          title: 'Timezone Test',
          body: 'Testing timezone handling',
          timestamp: admin.firestore.Timestamp.fromDate(utcTime)
        })

      await processNotificationBacklog()

      const historySnapshot = await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationHistory')
        .get()

      expect(historySnapshot.size).to.equal(1)
    })

    it('handles mixed past and future notifications correctly in different timezones', async () => {
      const userId = 'test-user-mixed-time'
      
      const pastTime = new Date()
      pastTime.setMinutes(pastTime.getMinutes() - 30)
      
      const futureTime = new Date()
      futureTime.setMinutes(futureTime.getMinutes() + 30)

      await env.firestore.collection('users').doc(userId).set({
        type: 'patient',
        fcmToken: 'test-fcm-token',
        timeZone: 'Europe/London'
      })

      await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationBacklog')
        .add({
          title: 'Past Notification',
          body: 'This should be sent',
          timestamp: admin.firestore.Timestamp.fromDate(pastTime)
        })

      await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationBacklog')
        .add({
          title: 'Future Notification',
          body: 'This should not be sent',
          timestamp: admin.firestore.Timestamp.fromDate(futureTime)
        })

      await processNotificationBacklog()

      const historySnapshot = await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationHistory')
        .get()

      expect(historySnapshot.size).to.equal(1)
      
      const sentNotification = historySnapshot.docs[0].data()
      expect(sentNotification.title).to.equal('Past Notification')

      const backlogSnapshot = await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationBacklog')
        .get()

      expect(backlogSnapshot.size).to.equal(1)
      
      const remainingNotification = backlogSnapshot.docs[0].data()
      expect(remainingNotification.title).to.equal('Future Notification')
    })
  })

  describe('Error handling', () => {
    it('continues processing other notifications when one fails', async () => {
      const user1Id = 'test-user-fail'
      const user2Id = 'test-user-success'
      const pastTime = new Date()
      pastTime.setMinutes(pastTime.getMinutes() - 30)

      await env.firestore.collection('users').doc(user1Id).set({
        type: 'patient',
        fcmToken: 'invalid-token',
        timeZone: 'UTC'
      })

      await env.firestore.collection('users').doc(user2Id).set({
        type: 'patient',
        fcmToken: 'valid-token',
        timeZone: 'UTC'
      })

      await env.firestore
        .collection('users')
        .doc(user1Id)
        .collection('notificationBacklog')
        .add({
          title: 'Failed Notification',
          body: 'This may fail to send',
          timestamp: admin.firestore.Timestamp.fromDate(pastTime)
        })

      await env.firestore
        .collection('users')
        .doc(user2Id)
        .collection('notificationBacklog')
        .add({
          title: 'Successful Notification',
          body: 'This should succeed',
          timestamp: admin.firestore.Timestamp.fromDate(pastTime)
        })

      await processNotificationBacklog()

      const user2HistorySnapshot = await env.firestore
        .collection('users')
        .doc(user2Id)
        .collection('notificationHistory')
        .get()

      expect(user2HistorySnapshot.size).to.equal(1)
    })

    it('handles empty notification backlog gracefully', async () => {
      const userId = 'test-user-empty'

      await env.firestore.collection('users').doc(userId).set({
        type: 'patient',
        fcmToken: 'test-fcm-token',
        timeZone: 'UTC'
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
        timeZone: 'UTC'
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
        timeZone: 'UTC'
      })

      await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationBacklog')
        .add({
          title: 'Clinician Notification',
          body: 'This should not be processed',
          timestamp: admin.firestore.Timestamp.fromDate(pastTime)
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