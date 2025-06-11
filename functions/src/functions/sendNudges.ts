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

/**
 * Sends a notification to a user and records it in their history
 */
async function sendNotificationToUser(
  userId: string,
  title: string,
  body: string,
  fcmToken: string,
): Promise<boolean> {
  try {
    const messaging = admin.messaging()
    const firestore = admin.firestore()

    const notificationMessage = {
      token: fcmToken,
      notification: { title, body },
    }

    const sendResult = await messaging.send(notificationMessage)

    if (sendResult) {
      // Record notification in user's history
      await firestore
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

/**
 * Processes notification backlog for all users
 */
async function processNotificationBacklog(): Promise<void> {
  const firestore = admin.firestore()
  const now = new Date()

  // Get all users
  const usersSnapshot = await firestore
    .collection('users')
    .where('type', '==', 'patient')
    .get()

  let totalProcessed = 0
  let totalSent = 0

  for (const userDoc of usersSnapshot.docs) {
    try {
      const userData = userDoc.data()
      const userId = userDoc.id

      // Skip users without FCM token or timezone
      if (!userData.fcmToken || !userData.timeZone) {
        continue
      }

      // Get user's local time
      const userLocalTime = new Date(
        now.toLocaleString('en-US', { timeZone: userData.timeZone }),
      )

      // Get user's notification backlog
      const backlogSnapshot = await firestore
        .collection('users')
        .doc(userId)
        .collection('notificationBacklog')
        .get()

      for (const backlogDoc of backlogSnapshot.docs) {
        try {
          const backlogItem = backlogDoc.data() as NotificationBacklogItem
          totalProcessed++

          // Check if notification time has passed (in user's local time)
          const notificationTime = backlogItem.timestamp.toDate()
          const notificationLocalTime = new Date(
            notificationTime.toLocaleString('en-US', {
              timeZone: userData.timeZone,
            }),
          )

          if (notificationLocalTime <= userLocalTime) {
            // Time has passed, send notification
            const sent = await sendNotificationToUser(
              userId,
              backlogItem.title,
              backlogItem.body,
              userData.fcmToken,
            )

            if (sent) {
              totalSent++
              // Remove from backlog after successful send
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

/**
 * Main scheduled function - processes notification backlog
 */
export const onScheduleNotificationProcessor = onSchedule(
  {
    schedule: '*/15 * * * *', // Every 15 minutes
    timeZone: 'UTC',
  },
  async () => {
    logger.info('Starting notification backlog processing')

    try {
      // Process notification backlog
      await processNotificationBacklog()

      logger.info('Notification backlog processing complete')
    } catch (error) {
      logger.error(`Error in notification backlog processing: ${String(error)}`)
    }
  },
)