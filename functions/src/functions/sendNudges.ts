//
// This source file is part of the Stanford Biodesign Digital Health MyHeart Counts open-source project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2025 Stanford University
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
  isLLMGenerated?: boolean
  generatedAt?: admin.firestore.Timestamp
}

interface NotificationArchiveItem {
  title: string
  body: string
  originalTimestamp: admin.firestore.Timestamp
  processedTimestamp: admin.firestore.FieldValue
  status: 'sent' | 'failed'
  errorMessage?: string
  isLLMGenerated?: boolean
  generatedAt?: admin.firestore.Timestamp
}

export class NotificationService {
  // Properties

  private _firestore?: admin.firestore.Firestore
  private _messaging?: admin.messaging.Messaging

  // Constructor

  private get firestore(): admin.firestore.Firestore {
    if (!this._firestore) {
      this._firestore = admin.firestore()
    }
    return this._firestore
  }

  private get messaging(): admin.messaging.Messaging {
    if (!this._messaging) {
      this._messaging = admin.messaging()
    }
    return this._messaging
  }

  // Methods

  async sendNotificationToUser(
    userId: string,
    title: string,
    body: string,
    fcmToken: string,
    originalTimestamp: admin.firestore.Timestamp,
    isLLMGenerated?: boolean,
    generatedAt?: admin.firestore.Timestamp,
  ): Promise<void> {
    let status: 'sent' | 'failed' = 'failed'
    let errorMessage: string | undefined = undefined

    try {
      const notificationMessage = {
        token: fcmToken,
        notification: { title, body },
      }

      const sendResult = await this.messaging.send(notificationMessage)

      if (sendResult) {
        status = 'sent'
        logger.info(`Sent notification to user ${userId}: ${title}`)
      } else {
        errorMessage = 'Firebase messaging send returned falsy result'
        logger.warn(
          `Failed to send notification to user ${userId}: ${errorMessage}`,
        )
      }
    } catch (error) {
      errorMessage = String(error)
      logger.error(
        `Error sending notification to user ${userId}: ${errorMessage}`,
      )
    }

    const archiveData: NotificationArchiveItem = {
      title,
      body,
      originalTimestamp,
      processedTimestamp: admin.firestore.FieldValue.serverTimestamp(),
      status,
      isLLMGenerated: isLLMGenerated ?? false,
      ...(generatedAt && { generatedAt }),
    }

    if (errorMessage) {
      archiveData.errorMessage = errorMessage
    }

    await this.firestore
      .collection('users')
      .doc(userId)
      .collection('notificationHistory')
      .add(archiveData)
  }

  async processNotificationBacklog(): Promise<void> {
    const now = new Date()

    const usersSnapshot = await this.firestore
      .collection('users')
      .get()

    let totalProcessed = 0
    let totalSent = 0

    for (const userDoc of usersSnapshot.docs) {
      try {
        const userData = userDoc.data()
        const userId = userDoc.id

        if (!userData.timeZone) {
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
              if (!userData.fcmToken) {
                // Archive as failed due to missing FCM token
                const archiveData: NotificationArchiveItem = {
                  title: backlogItem.title,
                  body: backlogItem.body,
                  originalTimestamp: backlogItem.timestamp,
                  processedTimestamp:
                    admin.firestore.FieldValue.serverTimestamp(),
                  status: 'failed',
                  errorMessage: 'No FCM token available for user',
                  isLLMGenerated: backlogItem.isLLMGenerated ?? false,
                  ...(backlogItem.generatedAt && {
                    generatedAt: backlogItem.generatedAt,
                  }),
                }

                await this.firestore
                  .collection('users')
                  .doc(userId)
                  .collection('notificationHistory')
                  .add(archiveData)
              } else {
                await this.sendNotificationToUser(
                  userId,
                  backlogItem.title,
                  backlogItem.body,
                  userData.fcmToken,
                  backlogItem.timestamp,
                  backlogItem.isLLMGenerated,
                  backlogItem.generatedAt,
                )
              }

              totalSent++
              await backlogDoc.ref.delete()
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

let notificationService: NotificationService | undefined

function getNotificationService(): NotificationService {
  if (!notificationService) {
    notificationService = new NotificationService()
  }
  return notificationService
}

export const processNotificationBacklog = () =>
  getNotificationService().processNotificationBacklog()

export const onScheduleNotificationProcessor = onSchedule(
  {
    schedule: '*/15 * * * *',
    timeZone: 'UTC',
  },
  async () => {
    logger.info('Starting notification backlog processing')

    try {
      await getNotificationService().processNotificationBacklog()
      logger.info('Notification backlog processing complete')
    } catch (error) {
      logger.error(`Error in notification backlog processing: ${String(error)}`)
    }
  },
)
