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

      let usersChecked = 0
      let notificationsSent = 0
      const skippedReasons = {
        noTimezone: 0,
        noDateOfBirth: 0,
        invalidDateOfBirth: 0,
        wrongTime: 0,
        noFcmToken: 0,
      }

      for (const userDoc of usersSnapshot.docs) {
        try {
          const rawUserData = userDoc.data()
          const userId = userDoc.id
          usersChecked++

          // Check if user has required fields
          if (!rawUserData.timeZone) {
            skippedReasons.noTimezone++
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
                skippedReasons.invalidDateOfBirth++
                continue
              }
            }
          } else {
            skippedReasons.noDateOfBirth++
            continue
          }

          // Check if it's 1 PM in the user's timezone
          const userTime = new Date(
            now.toLocaleString('en-US', { timeZone: rawUserData.timeZone }),
          )
          const currentHour = userTime.getHours()
          const currentMinute = userTime.getMinutes()

          if (currentHour !== 13 || currentMinute >= 15) {
            skippedReasons.wrongTime++
            continue
          }

          // Determine birth year group
          const birthYear = dateOfBirth.getFullYear()
          const birthGroup =
            birthYear < 1990 ? 'born before 1990' : 'born 1990 or after'

          // Get gender from user data
          const gender = rawUserData.genderIdentity ?? 'not specified'

          // Check if user has FCM token
          if (!rawUserData.fcmToken) {
            skippedReasons.noFcmToken++
            continue
          }

          // Send notification directly using FCM token from user document
          const notificationTitle = 'Daily Health Check'
          const notificationBody = `Hello! Your profile shows: Gender: ${gender}, Birth group: ${birthGroup}. Time for your daily health reminder.`

          const notificationMessage = {
            token: rawUserData.fcmToken,
            notification: {
              title: notificationTitle,
              body: notificationBody,
            },
          }

          const sendResult = await messaging.send(notificationMessage)

          if (sendResult) {
            notificationsSent++

            // Record notification in user's subcollection
            await firestore
              .collection('users')
              .doc(userId)
              .collection('notificationHistory')
              .add({
                title: notificationTitle,
                body: notificationBody,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
              })

            logger.info(
              `Sent notification to user ${userId} (Gender: ${gender}, ${birthGroup})`,
            )
          } else {
            logger.warn(`Failed to send notification to user ${userId}`)
          }
        } catch (error) {
          logger.error(`Error processing user ${userDoc.id}: ${String(error)}`)
        }
      }

      // Summary logging
      logger.info(
        `Nudge notification summary: ${notificationsSent} sent, ${usersChecked} checked. Skipped: ${skippedReasons.noTimezone} no timezone, ${skippedReasons.noDateOfBirth} no DOB, ${skippedReasons.invalidDateOfBirth} invalid DOB, ${skippedReasons.wrongTime} wrong time, ${skippedReasons.noFcmToken} no FCM token`,
      )
    } catch (error) {
      logger.error(`Error in nudge notification check: ${String(error)}`)
    }
  },
)
