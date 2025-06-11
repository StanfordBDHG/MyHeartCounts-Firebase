//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import admin from 'firebase-admin'
import { logger } from 'firebase-functions'
import { defineSecret } from 'firebase-functions/params'
import { onSchedule } from 'firebase-functions/v2/scheduler'

interface NudgeMessage {
  title: string
  body: string
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

const openaiApiKey = defineSecret('OPENAI_API_KEY')

/**
 * Pre-defined nudge messages for days 7-14 after enrollment - focused on sports motivation
 */
const PREDEFINED_NUDGES: NudgeMessage[] = [
  {
    title: 'Get Moving This Week!',
    body: "Ready for the day? Let's start with some light exercise today. Even 10 minutes makes a difference!",
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
    body: "Your heart is a muscle - let's strengthen it! Go for a jog, hit the gym, or play your favorite active game.",
  },
  {
    title: 'Team Up for Fitness',
    body: 'Exercise is more fun with others! Invite a friend for a workout, join a sports team, or try a fitness class.',
  },
  {
    title: 'Champion of this Week!',
    body: "Amazing work staying active this week! You're building habits that will keep your heart strong. Keep it up!",
  },
]

/**
 * Calculates days since enrollment for a user
 */
function getDaysSinceEnrollment(
  dateOfEnrollment: admin.firestore.Timestamp | Date | string,
): number {
  let enrollmentDate: Date

  if (
    dateOfEnrollment &&
    typeof dateOfEnrollment === 'object' &&
    'toDate' in dateOfEnrollment
  ) {
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
 * Generates 7 personalized nudges using OpenAI API
 */
async function generateLLMNudges(
  userId: string,
  userData: any,
): Promise<NudgeMessage[]> {
  try {
    const prompt = `Generate 7 motivational sports and exercise nudges for a heart health study participant. Each nudge should:
    - Be encouraging and positive
    - Focus on different types of physical activities and sports
    - Be personalized and engaging
    - Include a clear call to action
    - Be suitable for someone in a heart health study
    
    Return the response as a JSON array with exactly 7 objects, each having "title" and "body" fields.
    Example format:
    [
      {"title": "Morning Energy Boost", "body": "Start your day with a 15-minute walk! Your heart will love the gentle cardio."},
      ...
    ]
    
    Make each nudge unique and focus on different activities like walking, swimming, dancing, team sports, strength training, yoga, etc.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiApiKey.value()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      throw new Error(
        `OpenAI API error: ${response.status} ${response.statusText}`,
      )
    }

    const data: OpenAIResponse = await response.json()
    const content = data.choices[0].message.content

    // Parse the JSON response
    const nudges: NudgeMessage[] = JSON.parse(content)

    if (!Array.isArray(nudges) || nudges.length !== 7) {
      throw new Error('Invalid response format from OpenAI API')
    }

    logger.info(`Generated ${nudges.length} LLM nudges for user ${userId}`)
    return nudges
  } catch (error) {
    logger.error(
      `Error generating LLM nudges for user ${userId}: ${String(error)}`,
    )
    // Fallback to predefined nudges if API fails
    return PREDEFINED_NUDGES
  }
}

/**
 * Creates nudge notifications for a specific user
 */
async function createNudgesForUser(
  userId: string,
  userData: any,
  nudges: NudgeMessage[],
  nudgeType: string,
): Promise<number> {
  const firestore = admin.firestore()
  let nudgesCreated = 0

  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const nudgeMessage = nudges[dayIndex]

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
        nudgeType, // Track whether this is 'predefined' or 'llm-generated'
      })

    nudgesCreated++
  }

  return nudgesCreated
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
      if (
        !userData.timeZone ||
        !userData.dateOfEnrollment ||
        !userData.participantGroup
      ) {
        continue
      }

      const daysSinceEnrollment = getDaysSinceEnrollment(
        userData.dateOfEnrollment,
      )
      const participantGroup = userData.participantGroup

      // Group 1: Pre-defined nudges at day 7, LLM nudges at day 14
      // Group 2: LLM nudges at day 7, Pre-defined nudges at day 14
      let shouldCreatePredefinedNudges = false
      let shouldCreateLLMNudges = false

      if (participantGroup === 1 && daysSinceEnrollment === 7) {
        shouldCreatePredefinedNudges = true
      } else if (participantGroup === 1 && daysSinceEnrollment === 14) {
        shouldCreateLLMNudges = true
      } else if (participantGroup === 2 && daysSinceEnrollment === 7) {
        shouldCreateLLMNudges = true
      } else if (participantGroup === 2 && daysSinceEnrollment === 14) {
        shouldCreatePredefinedNudges = true
      }

      if (shouldCreatePredefinedNudges) {
        logger.info(
          `Creating pre-defined nudges for user ${userId}, group ${participantGroup}, ${daysSinceEnrollment} days since enrollment`,
        )
        const created = await createNudgesForUser(
          userId,
          userData,
          PREDEFINED_NUDGES,
          'predefined',
        )
        nudgesCreated += created
      }

      if (shouldCreateLLMNudges) {
        logger.info(
          `Creating LLM-generated nudges for user ${userId}, group ${participantGroup}, ${daysSinceEnrollment} days since enrollment`,
        )
        const llmNudges = await generateLLMNudges(userId, userData)
        const created = await createNudgesForUser(
          userId,
          userData,
          llmNudges,
          'llm-generated',
        )
        nudgesCreated += created
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
    secrets: [openaiApiKey],
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
