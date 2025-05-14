import admin from 'firebase-admin'
import { logger } from 'firebase-functions/v2'
import { getServiceFactory } from '../services/factory/getServiceFactory.js'

/**
 * Gets active users directly from Firestore, bypassing the schema validation
 * to avoid errors with date fields.
 *
 * @returns A promise that resolves to an array of user IDs for active users
 */
export async function getActiveUserIds(): Promise<string[]> {
  try {
    const firestore = admin.firestore()

    // Query users collection directly for disabled=false
    const snapshot = await firestore
      .collection('users')
      .where('disabled', '==', false)
      .get()

    // Extract just the user IDs - this avoids schema validation issues
    const userIds = snapshot.docs.map((doc) => doc.id)

    logger.info(
      `Found ${userIds.length} active users using direct Firestore query`,
    )
    return userIds
  } catch (error) {
    logger.error('Error retrieving active user IDs', {
      error: error instanceof Error ? error.message : String(error),
    })
    return []
  }
}

/**
 * Checks if a user has an FCM token in their document
 * or in their registered devices
 *
 * @param userId The ID of the user to check
 * @returns A promise that resolves to true if the user has at least one valid FCM token
 */
export async function hasValidDevices(userId: string): Promise<boolean> {
  try {
    const firestore = admin.firestore()

    // First check if the user has fcmToken directly in their document
    const userDoc = await firestore.collection('users').doc(userId).get()
    const userData = userDoc.data()

    if (userData?.fcmToken) {
      logger.debug(`User ${userId} has fcmToken directly in user document`)
      return true
    }

    // If no direct token, try the regular device collection approach as fallback
    try {
      const messageService = getServiceFactory().message()
      const devices = await messageService.getUserDevices(userId)

      return (
        devices &&
        devices.length > 0 &&
        devices.some((device) => !!device.notificationToken)
      )
    } catch (deviceError) {
      // Just log and continue, we'll return false below if needed
      logger.debug(`No devices found for user ${userId} in devices collection`)
    }

    return false
  } catch (error) {
    logger.error('Error checking if user has valid FCM token', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    })
    return false
  }
}

/**
 * Sends a notification to a user, handling both FCM tokens stored directly in the user document
 * and in device collections.
 *
 * @param userId The ID of the user to notify
 * @param notification The notification to send (title, body, data)
 * @returns A promise that resolves when the notification has been sent
 */
export async function sendSportReminder(
  userId: string,
  notification: {
    title: Record<string, string>
    body: Record<string, string>
    data?: Record<string, string>
  },
): Promise<boolean> {
  try {
    const firestore = admin.firestore()
    const messaging = admin.messaging()

    // First check if user has direct fcmToken
    const userDoc = await firestore.collection('users').doc(userId).get()
    const userData = userDoc.data()

    if (
      userData?.fcmToken &&
      typeof userData.fcmToken === 'string' &&
      userData.fcmToken.length > 20
    ) {
      // User has direct token - send notification directly
      const token = userData.fcmToken
      const language = userData.language || 'en'

      // Get localized strings
      const title =
        notification.title[language] || notification.title.en || 'Message'
      const body = notification.body[language] || notification.body.en || ''

      // Use a simplified message format similar to Firebase test notifications
      // This avoids platform-specific configuration issues
      const message = {
        token,
        notification: {
          title,
          body,
        },
        data: notification.data ?? {},
      }

      try {
        // Log the message being sent for debugging purposes
        logger.debug('Attempting to send FCM message', {
          userId,
          token: token.substring(0, 10) + '...', // Only log part of the token for security
          hasData: !!notification.data,
          messageFormat: 'simplified',
        })

        await messaging.send(message)
        logger.debug(
          `Successfully sent notification to user's direct FCM token`,
          {
            userId,
          },
        )
        return true
      } catch (fcmError) {
        logger.error(`Failed to send notification to direct FCM token`, {
          userId,
          error:
            fcmError instanceof Error ? fcmError.message : String(fcmError),
          errorDetails: fcmError instanceof Error ? fcmError.stack : undefined,
          errorCode:
            fcmError instanceof Error && 'code' in fcmError ?
              (fcmError as any).code
            : undefined,
        })

        // For any FCM error, consider the token invalid and remove it
        // This is safer than trying to determine which errors mean the token is invalid
        try {
          await firestore.collection('users').doc(userId).update({
            fcmToken: admin.firestore.FieldValue.delete(),
          })
          logger.info(
            `Removed potentially invalid FCM token from user ${userId}`,
          )
        } catch (updateError) {
          logger.error(`Failed to remove FCM token for user ${userId}`, {
            error:
              updateError instanceof Error ?
                updateError.message
              : String(updateError),
          })
        }

        // Try the regular device collection as fallback
      }
    }

    // If we get here, either there was no direct token or it failed
    // Try using the standard MessageService as fallback
    try {
      const messageService = getServiceFactory().message()
      await messageService.sendNotification(userId, notification)
      logger.debug(`Successfully sent notification via MessageService`, {
        userId,
      })
      return true
    } catch (serviceError) {
      logger.error(`Failed to send notification via both methods`, {
        userId,
        error:
          serviceError instanceof Error ?
            serviceError.message
          : String(serviceError),
      })
      return false
    }
  } catch (error) {
    logger.error('Error sending sport reminder', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    })
    return false
  }
}
