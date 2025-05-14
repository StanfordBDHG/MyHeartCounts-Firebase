import { logger } from 'firebase-functions/v2'
import {
  onSchedule,
  type ScheduledEvent,
} from 'firebase-functions/v2/scheduler'
import {
  getActiveUserIds,
  hasValidDevices,
  sendSportReminder,
} from './sportReminderHelpers.js'

/**
 * Sends a notification asking users if they want to do some sports.
 * Runs every hour via cron schedule.
 *
 * @returns A promise that resolves when all notifications have been sent.
 */
export const sendSportReminderHourly = onSchedule(
  {
    schedule: '0 * * * *', // Run at the beginning of every hour
    timeZone: 'America/Los_Angeles', // Pacific Time Zone
    retryCount: 3,
    minBackoffSeconds: 60,
  },
  async (context: ScheduledEvent) => {
    logger.info('Starting hourly sport reminder notification service', {
      timeTriggered: context.scheduleTime,
      instanceId: context.jobName,
    })

    try {
      // Get just the active user IDs directly from Firestore
      // This bypasses the database schema validation issues
      const userIds = await getActiveUserIds()

      let notificationsSent = 0
      let usersWithoutTokens = 0

      // Process each user by ID only
      await Promise.all(
        userIds.map(async (userId) => {
          try {
            // Check if user has any valid devices with FCM tokens
            const isValid = await hasValidDevices(userId)

            if (!isValid) {
              usersWithoutTokens++
              return
            }

            // Create and send the sport activity message with localized content
            const message = {
              title: {
                en: 'Time for Activity',
                de: 'Zeit für Bewegung',
              },
              body: {
                en: 'Hello from the Backend of MHC! Greetings, Paul G',
                de: 'Hallo aus dem Backend von MHC & Gruesse Paul G',
              },
              data: {
                type: 'SPORT_REMINDER',
                actionType: 'OPEN_SPORT_SECTION',
              },
            }

            // Send the notification using our custom helper that handles both token storage approaches
            const success = await sendSportReminder(userId, message)
            if (success) {
              notificationsSent++
            }
          } catch (error) {
            logger.error('Error sending sport reminder to user', {
              userId: userId,
              error: error instanceof Error ? error.message : String(error),
            })
          }
        }),
      )

      logger.info('Completed sport reminder notification service', {
        totalUsers: userIds.length,
        notificationsSent,
        usersWithoutTokens,
        successRate:
          userIds.length > 0 ?
            `${Math.round((notificationsSent / userIds.length) * 100)}%`
          : '0%',
      })
    } catch (error) {
      logger.error('Failed to execute sport reminder notification service', {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  },
)
