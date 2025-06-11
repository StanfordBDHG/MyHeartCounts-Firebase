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

interface NudgeMessage {
  title: string
  body: string
}

/**
 * Pre-defined nudge messages for days 7-14 after enrollment - focused on sports motivation
 */
const PREDEFINED_NUDGES: NudgeMessage[] = [
  {
    title: 'Get Moving This Week!',
    body: 'Ready for week 2? Let\'s start with some light exercise today. Even 10 minutes makes a difference!',
  },
  {
    title: 'Your Heart Loves Movement',
    body: 'Time to get active! Try a brisk walk, dancing, or your favorite sport. Your heart will thank you.',
  },
  {
    title: 'Build Your Fitness Streak',
    body: 'Keep the momentum going! What physical activity will you choose today? Swimming, cycling, or maybe some yoga?',
  },
  {
    title: 'Sports Challenge Day',
    body: 'Challenge yourself today! Try a new sport or activity. Tennis, basketball, or even jumping rope - what sounds fun?',
  },
  {
    title: 'Cardio Power Hour',
    body: 'Your heart is a muscle - let\'s strengthen it! Go for a jog, hit the gym, or play your favorite active game.',
  },
  {
    title: 'Team Up for Fitness',
    body: 'Exercise is more fun with others! Invite a friend for a workout, join a sports team, or try a fitness class.',
  },
  {
    title: 'Champion of Week 2!',
    body: 'Amazing work staying active this week! You\'re building habits that will keep your heart strong. Keep it up!',
  },
]

/**
 * Calculates days since enrollment for a user
 */
function getDaysSinceEnrollment(dateOfEnrollment: admin.firestore.Timestamp | Date | string): number {
  let enrollmentDate: Date
  
  if (typeof dateOfEnrollment?.toDate === 'function') {
    enrollmentDate = dateOfEnrollment.toDate()
  } else if (dateOfEnrollment instanceof Date) {
    enrollmentDate = dateOfEnrollment
  } else {
    enrollmentDate = new Date(dateOfEnrollment)
  }
  
  const now = new Date()
  const timeDiff = now.getTime() - enrollmentDate.getTime()
  return Math.floor(timeDiff / (1000 * 60 * 60 * 24))
}

/**
 * Creates nudge notifications for eligible users based on enrollment date and participant group
 */
async function createNudgeNotifications(): Promise<void> {
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
      const userData = userDoc.data()
      const userId = userDoc.id
      usersProcessed++

      // Check if user has required fields
      if (!userData.timeZone || !userData.dateOfEnrollment || !userData.participantGroup) {
        continue
      }

      const daysSinceEnrollment = getDaysSinceEnrollment(userData.dateOfEnrollment)
      const participantGroup = userData.participantGroup

      // Check if user is eligible for nudges based on group and enrollment date
      let shouldCreateNudges = false
      
      if (participantGroup === 1 && daysSinceEnrollment === 7) {
        shouldCreateNudges = true
      } else if (participantGroup === 2 && daysSinceEnrollment === 14) {
        shouldCreateNudges = true
      }

      if (!shouldCreateNudges) {
        continue
      }

      logger.info(`Creating nudges for user ${userId}, group ${participantGroup}, ${daysSinceEnrollment} days since enrollment`)

      // Create 7 nudge notifications for days 7-14 (or 14-21 for group 2)
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const nudgeMessage = PREDEFINED_NUDGES[dayIndex]
        
        // Calculate target date (today + dayIndex)
        const targetDate = new Date()
        targetDate.setDate(targetDate.getDate() + dayIndex)

        // Create a date for 1 PM in user's timezone
        const userLocalTime = new Date(
          targetDate.toLocaleString('en-US', {
            timeZone: userData.timeZone,
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
            title: nudgeMessage.title,
            body: nudgeMessage.body,
            timestamp: admin.firestore.Timestamp.fromDate(utcTime),
          })

        nudgesCreated++
      }
    } catch (error) {
      logger.error(
        `Error creating nudges for user ${userDoc.id}: ${String(error)}`,
      )
    }
  }

  logger.info(
    `Nudge creation complete: ${nudgesCreated} nudges created for ${usersProcessed} users processed`,
  )
}

/**
 * Daily scheduled function - creates nudge notifications based on enrollment date and participant group
 */
export const onScheduleDailyNudgeCreation = onSchedule(
  {
    schedule: '0 8 * * *', // Every day at 8 AM UTC
    timeZone: 'UTC',
  },
  async () => {
    logger.info('Starting daily nudge notification creation')

    try {
      await createNudgeNotifications()

      logger.info('Daily nudge notification creation complete')
    } catch (error) {
      logger.error(`Error in daily nudge creation: ${String(error)}`)
    }
  },
)