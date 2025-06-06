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
import { getServiceFactory } from '../services/factory/getServiceFactory.js'

export const onScheduleNudgeNotifications = onSchedule(
  {
    schedule: '*/15 * * * *', // Every 15 minutes
    timeZone: 'UTC',
  },
  async () => {
    logger.info('Starting nudge notification check')

    try {
      const factory = getServiceFactory()
      const messaging = admin.messaging()
      const firestore = admin.firestore()

      const now = new Date()

      // Get all users directly from Firestore to avoid decoding issues
      const usersSnapshot = await firestore
        .collection('users')
        .where('type', '==', 'patient')
        .get()

      logger.info(
        `Checking ${usersSnapshot.size} users for nudge notifications`,
      )

      for (const userDoc of usersSnapshot.docs) {
        try {
          const rawUserData = userDoc.data()
          const userId = userDoc.id

          logger.info(`Checking user ${userId} for notification eligibility`)

          // Check if user has required fields
          if (!rawUserData.timeZone) {
            logger.info(`User ${userId}: SKIP - No timezone`)
            continue
          }

          // Handle dateOfBirth as Firestore Timestamp
          let dateOfBirth: Date
          if (rawUserData.dateOfBirth) {
            if (typeof rawUserData.dateOfBirth?.toDate === 'function') {
              // Firestore Timestamp
              dateOfBirth = rawUserData.dateOfBirth.toDate()
            } else if (rawUserData.dateOfBirth instanceof Date) {
              // Already a Date
              dateOfBirth = rawUserData.dateOfBirth
            } else {
              // Try to parse as string or skip
              dateOfBirth = new Date(rawUserData.dateOfBirth)
              if (isNaN(dateOfBirth.getTime())) {
                logger.info(`User ${userId}: SKIP - Invalid dateOfBirth format`)
                continue
              }
            }
          } else {
            logger.info(`User ${userId}: SKIP - No dateOfBirth`)
            continue
          }

          // Check if it's 1 PM in the user's timezone
          const userTime = new Date(
            now.toLocaleString('en-US', { timeZone: rawUserData.timeZone }),
          )
          const currentHour = userTime.getHours()
          const currentMinute = userTime.getMinutes()

          logger.info(
            `User ${userId}: Current local time is ${currentHour}:${currentMinute.toString().padStart(2, '0')} in timezone ${rawUserData.timeZone}`,
          )

          if (currentHour !== 13 || currentMinute >= 15) {
            logger.info(
              `User ${userId}: SKIP - Not 3 PM time window (${currentHour}:${currentMinute.toString().padStart(2, '0')})`,
            )
            continue
          }

          // Determine birth year group
          const birthYear = dateOfBirth.getFullYear()
          const birthGroup =
            birthYear < 1990 ? 'born before 1990' : 'born 1990 or after'

          // Get gender from user data
          const gender = rawUserData.genderIdentity ?? 'not specified'

          logger.info(
            `User ${userId}: Passed time check - Gender: ${gender}, Birth year: ${birthYear} (${birthGroup})`,
          )

          // Check if user has FCM token
          if (!rawUserData.fcmToken) {
            logger.info(`User ${userId}: SKIP - No FCM token`)
            continue
          }

          logger.info(`User ${userId}: SENDING notification - has FCM token`)

          // Send notification directly using FCM token from user document
          const notificationMessage = {
            token: rawUserData.fcmToken,
            notification: {
              title: 'Daily Health Check',
              body: `Hello! Your profile shows: Gender: ${gender}, Birth group: ${birthGroup}. Time for your daily health reminder.`,
            },
          }

          await messaging.send(notificationMessage)

          logger.info(
            `Sent nudge notification to user ${userId} (Gender: ${gender}, ${birthGroup})`,
          )
        } catch (error) {
          logger.error(`Error processing user ${userDoc.id}: ${String(error)}`)
        }
      }
    } catch (error) {
      logger.error(`Error in nudge notification check: ${String(error)}`)
    }
  },
)
