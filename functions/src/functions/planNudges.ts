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

/**
 * Creates weekly nudge notifications in backlog for all users
 */
async function createWeeklyNudgeBacklog(): Promise<void> {
  const firestore = admin.firestore()

  // Get all users
  const usersSnapshot = await firestore
    .collection('users')
    .where('type', '==', 'patient')
    .get()

  let usersProcessed = 0
  let nudgesCreated = 0

  for (const userDoc of usersSnapshot.docs) {
    try {
      const rawUserData = userDoc.data()
      const userId = userDoc.id
      usersProcessed++

      // Check if user has required fields
      if (!rawUserData.timeZone || !rawUserData.dateOfBirth) {
        continue
      }

      // Handle dateOfBirth as Firestore Timestamp
      let dateOfBirth: Date
      if (typeof rawUserData.dateOfBirth?.toDate === 'function') {
        dateOfBirth = rawUserData.dateOfBirth.toDate()
      } else if (rawUserData.dateOfBirth instanceof Date) {
        dateOfBirth = rawUserData.dateOfBirth
      } else {
        dateOfBirth = new Date(rawUserData.dateOfBirth)
        if (isNaN(dateOfBirth.getTime())) continue
      }

      // Determine birth year group and gender
      const birthYear = dateOfBirth.getFullYear()
      const birthGroup =
        birthYear < 1990 ? 'born before 1990' : 'born 1990 or after'
      const gender = rawUserData.genderIdentity ?? 'not specified'

      // Create notification message template
      const title = 'Daily Health Check'
      const body = `Hello! Your profile shows: Gender: ${gender}, Birth group: ${birthGroup}. Time for your daily health reminder.`

      // Create nudge notifications for the next 7 days at 1 PM user local time
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        // Calculate target date in user's timezone
        const targetDate = new Date()
        targetDate.setDate(targetDate.getDate() + dayOffset)

        // Create a date for 1 PM in user's timezone
        const userLocalTime = new Date(
          targetDate.toLocaleString('en-US', {
            timeZone: rawUserData.timeZone,
          }),
        )
        userLocalTime.setHours(13, 0, 0, 0) // Set to 1:00 PM

        // Convert back to UTC for storage
        const utcTime = new Date(
          userLocalTime.toLocaleString('en-US', { timeZone: 'UTC' }),
        )

        // Add to notification backlog
        await firestore
          .collection('users')
          .doc(userId)
          .collection('notificationBacklog')
          .add({
            title,
            body,
            timestamp: admin.firestore.Timestamp.fromDate(utcTime),
          })

        nudgesCreated++
      }
    } catch (error) {
      logger.error(
        `Error creating weekly nudges for user ${userDoc.id}: ${String(error)}`,
      )
    }
  }

  logger.info(
    `Weekly nudge creation complete: ${nudgesCreated} nudges created for ${usersProcessed} users`,
  )
}

/**
 * Weekly scheduled function - creates nudge notifications for the week
 */
export const onScheduleWeeklyNudgeCreation = onSchedule(
  {
    schedule: '0 8 * * 1', // Every Monday at 8 AM UTC
    timeZone: 'UTC',
  },
  async () => {
    logger.info('Starting weekly nudge notification creation')

    try {
      // Create nudge notifications for the next 7 days
      await createWeeklyNudgeBacklog()

      logger.info('Weekly nudge notification creation complete')
    } catch (error) {
      logger.error(`Error in weekly nudge creation: ${String(error)}`)
    }
  },
)