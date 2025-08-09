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
import { getOpenaiApiKey, openaiApiKeyParam } from '../env.js'
import {
  getPredefinedNudgeMessages,
  type BaseNudgeMessage,
} from './nudgeMessages.js'

interface NudgeMessage extends BaseNudgeMessage {
  generatedAt: admin.firestore.Timestamp
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

export class NudgeService {
  // Properties

  private readonly firestore: admin.firestore.Firestore

  // Constructor

  constructor(firestore?: admin.firestore.Firestore) {
    this.firestore = firestore ?? admin.firestore()
  }

  // Methods

  getPredefinedNudges(language: string): NudgeMessage[] {
    const generatedAt = admin.firestore.Timestamp.now()
    const baseNudges = getPredefinedNudgeMessages(language)
    return baseNudges.map((nudge) => ({
      ...nudge,
      generatedAt,
    }))
  }

  getDaysSinceEnrollment(
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

  async getRecentStepCount(userId: string): Promise<number | null> {
    try {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const stepCountSnapshot = await this.firestore
        .collection('users')
        .doc(userId)
        .collection('HealthObservations_HKQuantityTypeIdentifierStepCount')
        .where(
          'startDate',
          '>=',
          admin.firestore.Timestamp.fromDate(sevenDaysAgo),
        )
        .orderBy('startDate', 'desc')
        .limit(7)
        .get()

      if (stepCountSnapshot.empty) {
        return null
      }

      const totalSteps = stepCountSnapshot.docs.reduce((sum, doc) => {
        const data = doc.data()
        const stepValue = typeof data.value === 'number' ? data.value : 0
        return sum + stepValue
      }, 0)

      return Math.round(totalSteps / stepCountSnapshot.size)
    } catch (error) {
      logger.warn(
        `Failed to get step count for user ${userId}: ${String(error)}`,
      )
      return null
    }
  }

  async generateLLMNudges(
    userId: string,
    language: string,
    userData: any,
  ): Promise<{ nudges: NudgeMessage[]; usedFallback: boolean }> {
    const maxRetries = 3
    let lastError: Error | null = null

    // Get personalization data
    const recentStepCount = await this.getRecentStepCount(userId)
    const educationLevel = userData.educationLevel

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const isSpanish = language === 'es'

        // Build personalization context
        const personalizationContext = []
        if (recentStepCount !== null) {
          personalizationContext.push(
            isSpanish ?
              `Promedio de pasos diarios recientes: ${recentStepCount}`
            : `Recent daily step count average: ${recentStepCount}`,
          )
        }
        if (educationLevel) {
          personalizationContext.push(
            isSpanish ?
              `Nivel educativo: ${educationLevel}`
            : `Education level: ${educationLevel}`,
          )
        }

        const contextStr =
          personalizationContext.length > 0 ?
            isSpanish ?
              `\n\nInformación del participante:\n${personalizationContext.map((ctx) => `- ${ctx}`).join('\n')}\n`
            : `\n\nParticipant information:\n${personalizationContext.map((ctx) => `- ${ctx}`).join('\n')}\n`
          : ''

        const prompt =
          isSpanish ?
            `Genera 7 recordatorios motivacionales de deportes y ejercicio para un participante en un estudio de salud cardíaca.${contextStr}
Cada recordatorio debe:
- Ser alentador y positivo
- Enfocarse en diferentes tipos de actividades físicas y deportes
- Ser personalizado y atractivo basado en la información del participante
- Incluir una llamada clara a la acción
- Ser adecuado para alguien en un estudio de salud cardíaca
- Adaptar el lenguaje y las sugerencias al nivel educativo del participante
- Incorporar referencias al conteo de pasos cuando sea relevante

Devuelve la respuesta como un array JSON con exactamente 7 objetos, cada uno con campos "title" y "body".
Formato de ejemplo:
[
  {"title": "Impulso de Energía Matutino", "body": "¡Comienza tu día con una caminata de 15 minutos! Tu corazón amará el cardio suave."},
  ...
]

Haz cada recordatorio único y enfócate en diferentes actividades como caminar, nadar, bailar, deportes de equipo, entrenamiento de fuerza, yoga, etc.`
          : `Generate 7 motivational sports and exercise nudges for a heart health study participant.${contextStr}
Each nudge should:
- Be encouraging and positive
- Focus on different types of physical activities and sports
- Be personalized and engaging based on the participant's information
- Include a clear call to action
- Be suitable for someone in a heart health study
- Adapt language and suggestions to the participant's education level
- Incorporate step count references when relevant

Return the response as a JSON array with exactly 7 objects, each having "title" and "body" fields.
Example format:
[
  {"title": "Morning Energy Boost", "body": "Start your day with a 15-minute walk! Your heart will love the gentle cardio."},
  ...
]

Make each nudge unique and focus on different activities like walking, swimming, dancing, team sports, strength training, yoga, etc.`

        const response = await fetch(
          'https://api.openai.com/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${getOpenaiApiKey()}`,
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
          },
        )

        if (!response.ok) {
          throw new Error(
            `OpenAI API error: ${response.status} ${response.statusText}`,
          )
        }

        const data: OpenAIResponse = await response.json()
        const content = data.choices[0].message.content

        const parsedNudges: Array<{ title: string; body: string }> =
          JSON.parse(content)

        if (!Array.isArray(parsedNudges) || parsedNudges.length !== 7) {
          throw new Error('Invalid response format from OpenAI API')
        }

        const generatedAt = admin.firestore.Timestamp.now()
        const nudges: NudgeMessage[] = parsedNudges.map((nudge) => ({
          ...nudge,
          isLLMGenerated: true,
          generatedAt,
        }))

        logger.info(
          `Generated ${nudges.length} LLM nudges for user ${userId} in ${language} (attempt ${attempt})`,
        )
        return { nudges, usedFallback: false }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        logger.warn(
          `Attempt ${attempt}/${maxRetries} failed for LLM nudge generation for user ${userId}: ${String(error)}`,
        )

        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
        }
      }
    }

    logger.error(
      `All ${maxRetries} attempts failed for LLM nudge generation for user ${userId}. Final error: ${String(lastError)}`,
    )
    return { nudges: this.getPredefinedNudges(language), usedFallback: true }
  }

  async createNudgesForUser(
    userId: string,
    userData: any,
    nudges: NudgeMessage[],
    nudgeType: string,
  ): Promise<number> {
    let nudgesCreated = 0

    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const nudgeMessage = nudges[dayIndex]

      const targetDate = new Date()
      targetDate.setDate(targetDate.getDate() + dayIndex)

      const userLocalTime = new Date(
        targetDate.toLocaleString('en-US', {
          timeZone: userData.timeZone,
        }),
      )
      userLocalTime.setHours(13, 0, 0, 0)

      const utcTime = new Date(
        userLocalTime.toLocaleString('en-US', { timeZone: 'UTC' }),
      )

      await this.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationBacklog')
        .add({
          title: nudgeMessage.title,
          body: nudgeMessage.body,
          timestamp: admin.firestore.Timestamp.fromDate(utcTime),
          nudgeType,
          isLLMGenerated: nudgeMessage.isLLMGenerated,
          generatedAt: nudgeMessage.generatedAt,
        })

      nudgesCreated++
    }

    return nudgesCreated
  }

  getUserLanguage(userData: any): string {
    return userData.userLanguage === 'es' ? 'es' : 'en'
  }

  async createNudgeNotifications(): Promise<void> {
    const regularUsersSnapshot = await this.firestore.collection('users').get()

    const manualTriggerSnapshot = await this.firestore
      .collection('users')
      .where('triggerNudgeGeneration', '==', true)
      .get()

    const allUserDocs = new Map()

    regularUsersSnapshot.docs.forEach((doc) => {
      allUserDocs.set(doc.id, doc)
    })

    manualTriggerSnapshot.docs.forEach((doc) => {
      allUserDocs.set(doc.id, doc)
    })

    const usersSnapshot = { docs: Array.from(allUserDocs.values()) }

    let usersProcessed = 0
    let nudgesCreated = 0

    for (const userDoc of usersSnapshot.docs) {
      try {
        const userData = userDoc.data()
        const userId = userDoc.id
        usersProcessed++

        if (
          !userData.timeZone ||
          !userData.dateOfEnrollment ||
          !userData.participantGroup
        ) {
          continue
        }

        const daysSinceEnrollment = this.getDaysSinceEnrollment(
          userData.dateOfEnrollment,
        )
        const participantGroup = userData.participantGroup
        const userLanguage = this.getUserLanguage(userData)
        const manualTrigger = userData.triggerNudgeGeneration === true

        let shouldCreatePredefinedNudges = false
        let shouldCreateLLMNudges = false
        let isManualTrigger = false

        if (manualTrigger) {
          shouldCreateLLMNudges = true
          isManualTrigger = true
        } else if (participantGroup === 1 && daysSinceEnrollment === 7) {
          shouldCreatePredefinedNudges = true
        } else if (participantGroup === 1 && daysSinceEnrollment === 14) {
          shouldCreateLLMNudges = true
        } else if (participantGroup === 2 && daysSinceEnrollment === 7) {
          shouldCreateLLMNudges = true
        } else if (participantGroup === 2 && daysSinceEnrollment === 14) {
          shouldCreatePredefinedNudges = true
        }

        if (shouldCreatePredefinedNudges) {
          const triggerReason =
            isManualTrigger ? 'manual trigger' : (
              `group ${participantGroup}, ${daysSinceEnrollment} days since enrollment`
            )
          logger.info(
            `Creating pre-defined nudges for user ${userId} (${triggerReason}), language: ${userLanguage}`,
          )
          const predefinedNudges = this.getPredefinedNudges(userLanguage)
          const created = await this.createNudgesForUser(
            userId,
            userData,
            predefinedNudges,
            'predefined',
          )
          nudgesCreated += created
        }

        if (shouldCreateLLMNudges) {
          const triggerReason =
            isManualTrigger ? 'manual trigger' : (
              `group ${participantGroup}, ${daysSinceEnrollment} days since enrollment`
            )
          logger.info(
            `Creating LLM-generated nudges for user ${userId} (${triggerReason}), language: ${userLanguage}`,
          )
          const { nudges: llmNudges, usedFallback } =
            await this.generateLLMNudges(userId, userLanguage, userData)
          const nudgeType = usedFallback ? 'predefined' : 'llm-generated'
          const created = await this.createNudgesForUser(
            userId,
            userData,
            llmNudges,
            nudgeType,
          )
          nudgesCreated += created
        }

        if (
          isManualTrigger &&
          (shouldCreatePredefinedNudges || shouldCreateLLMNudges)
        ) {
          await this.firestore.collection('users').doc(userId).update({
            triggerNudgeGeneration: false,
          })
          logger.info(`Reset manual trigger flag for user ${userId}`)
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
}

let nudgeService: NudgeService | undefined

function getNudgeService(): NudgeService {
  if (!nudgeService) {
    nudgeService = new NudgeService()
  }
  return nudgeService
}

export const createNudgeNotifications = () =>
  getNudgeService().createNudgeNotifications()

export const onScheduleDailyNudgeCreation = onSchedule(
  {
    schedule: '0 8 * * *',
    timeZone: 'UTC',
    secrets: [openaiApiKeyParam],
  },
  async () => {
    logger.info('Starting daily nudge notification creation')

    try {
      await getNudgeService().createNudgeNotifications()
      logger.info('Daily nudge notification creation complete')
    } catch (error) {
      logger.error(`Error in daily nudge creation: ${String(error)}`)
    }
  },
)
