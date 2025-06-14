//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import admin from 'firebase-admin'
import { logger } from 'firebase-functions'
import { onSchedule } from 'firebase-functions/v2/scheduler'

interface NotificationBacklogItem {
  title: string
  body: string
  timestamp: admin.firestore.Timestamp
}

export class NotificationService {
  // Properties

  private readonly firestore: admin.firestore.Firestore
  private readonly messaging: admin.messaging.Messaging

  // Constructor

  constructor() {
    this.firestore = admin.firestore()
    this.messaging = admin.messaging()
  }

  // Methods

  async sendNotificationToUser(
    userId: string,
    title: string,
    body: string,
    fcmToken: string,
  ): Promise<boolean> {
    try {
      const notificationMessage = {
        token: fcmToken,
        notification: { title, body },
      }

      const sendResult = await this.messaging.send(notificationMessage)

      if (sendResult) {
        await this.firestore
          .collection('users')
          .doc(userId)
          .collection('notificationHistory')
          .add({
            title,
            body,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          })

        logger.info(`Sent notification to user ${userId}: ${title}`)
        return true
      } else {
        logger.warn(`Failed to send notification to user ${userId}`)
        return false
      }
    } catch (error) {
      logger.error(
        `Error sending notification to user ${userId}: ${String(error)}`,
      )
      return false
    }
  }

  async processNotificationBacklog(): Promise<void> {
    const now = new Date()

    const usersSnapshot = await this.firestore
      .collection('users')
      .where('type', '==', 'patient')
      .get()

    let totalProcessed = 0
    let totalSent = 0

    for (const userDoc of usersSnapshot.docs) {
      try {
        const userData = userDoc.data()
        const userId = userDoc.id

        if (!userData.fcmToken || !userData.timeZone) {
          continue
        }

        const backlogSnapshot = await this.firestore
          .collection('users')
          .doc(userId)
          .collection('notificationBacklog')
          .get()

        for (const backlogDoc of backlogSnapshot.docs) {
          try {
            const backlogItem = backlogDoc.data() as NotificationBacklogItem
            totalProcessed++

            const notificationTime = backlogItem.timestamp.toDate()

            if (notificationTime <= now) {
              const sent = await this.sendNotificationToUser(
                userId,
                backlogItem.title,
                backlogItem.body,
                userData.fcmToken,
              )

              if (sent) {
                totalSent++
                await backlogDoc.ref.delete()
              }
            }
          } catch (error) {
            logger.error(
              `Error processing backlog item for user ${userId}: ${String(error)}`,
            )
          }
        }
      } catch (error) {
        logger.error(`Error processing user ${userDoc.id}: ${String(error)}`)
      }
    }

    logger.info(
      `Backlog processing complete: ${totalSent} sent, ${totalProcessed} processed`,
    )
  }
}

const notificationService = new NotificationService()

export const processNotificationBacklog = () =>
  notificationService.processNotificationBacklog()

export const onScheduleNotificationProcessor = onSchedule(
  {
    schedule: '*/15 * * * *',
    timeZone: 'UTC',
  },
  async () => {
    logger.info('Starting notification backlog processing')

    try {
      await notificationService.processNotificationBacklog()
      logger.info('Notification backlog processing complete')
    } catch (error) {
      logger.error(`Error in notification backlog processing: ${String(error)}`)
    }
  },
)
