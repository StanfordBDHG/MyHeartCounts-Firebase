//
// This source file is part of the Stanford Biodesign Digital Health MyHeart Counts open-source project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2025 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { randomUUID } from 'crypto'
import admin from 'firebase-admin'
import { logger } from 'firebase-functions'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { DateTime } from 'luxon'
import OpenAI from 'openai'
import { getOpenaiApiKey, openaiApiKeyParam } from '../env.js'
import {
  getPredefinedNudgeMessages,
  type BaseNudgeMessage,
} from './nudgeMessages.js'

enum Disease {
  HEART_FAILURE = 'Heart failure',
  PULMONARY_ARTERIAL_HYPERTENSION = 'Pulmonary arterial hypertension',
  DIABETES = 'Diabetes',
  ACHD_SIMPLE = 'ACHD (simple)',
  ACHD_COMPLEX = 'ACHD (complex)',
}

enum StageOfChange {
  PRECONTEMPLATION = 'Precontemplation',
  CONTEMPLATION = 'Contemplation',
  PREPARATION = 'Preparation',
  ACTION = 'Action',
  MAINTENANCE = 'Maintenance',
}

enum EducationLevel {
  HIGHSCHOOL = 'Highschool',
  COLLEGE = 'college',
  COLLAGE = 'collage',
}

interface NudgeMessage extends BaseNudgeMessage {
  generatedAt: admin.firestore.Timestamp
}

export class NudgeService {
  // Properties

  private readonly firestore: admin.firestore.Firestore

  // Constructor

  constructor(firestore?: admin.firestore.Firestore) {
    this.firestore = firestore ?? admin.firestore()
  }

  // Methods

  private calculateAge(dateOfBirth: Date, present: Date = new Date()): number {
    const yearDiff = present.getFullYear() - dateOfBirth.getFullYear()
    const monthDiff = present.getMonth() - dateOfBirth.getMonth()

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && present.getDate() < dateOfBirth.getDate())
    ) {
      return yearDiff - 1
    }
    return yearDiff
  }

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

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const isSpanish = language === 'es'

        // Build detailed personalization context
        const genderIdentity = userData.genderIdentity || 'female'
        const dateOfBirth = userData.dateOfBirth
        const disease = userData.disease
        const stateOfChange = userData.stateOfChange
        const educationLevel = userData.educationLevel

        // Calculate age from dateOfBirth
        let ageContext = ''
        if (dateOfBirth) {
          const birthDate =
            dateOfBirth instanceof Date ? dateOfBirth : new Date(dateOfBirth)
          const currentAge = this.calculateAge(birthDate)

          if (currentAge < 35) {
            ageContext = `This participant is ${currentAge} years old and should be prompted to think about the short-term benefits of exercise on their mood, energy, and health.`
          } else if (currentAge <= 50) {
            ageContext = `This participant is ${currentAge} years old and in addition to thinking about the short-term benefits of exercise on their mood, energy, and health, should also now be thinking about their long-term risk of chronic disease development, such as cardiovascular disease, dementia, and cancer - exercise is strongly protective against all these long-term conditions.`
          } else if (currentAge <= 65) {
            ageContext = `This participant is ${currentAge} years old and in addition to thinking about the short-term benefits of exercise on their mood, energy, and health, should also now be thinking about their long-term risk of chronic disease development, such as cardiovascular disease, dementia, and cancer - exercise is strongly protective against all these long-term conditions. At this age, they should also be thinking about adding elements of weight bearing exercise into their routines, to promote bone health and prevent fractures that could lead to rapid clinical decline as they age.`
          } else {
            ageContext = `This participant is ${currentAge} years old and in addition to thinking about the short-term benefits of exercise on their mood, energy, and health, should also now be thinking about their long-term risk of chronic disease development, such as cardiovascular disease, dementia, and cancer - exercise is strongly protective against all these long-term conditions. At this age, they should also be thinking about adding elements of weight bearing exercise into their routines, to promote bone health and prevent fractures that could lead to rapid clinical decline as they age. Finally, they should be considering lower impact sports and activities (e.g., walks and hikes instead of runs).`
          }
        }

        // Build gender context
        let genderContext = ''
        if (genderIdentity === 'male') {
          genderContext =
            'This participant is male and may respond better to prompts about playing sports or doing individual activities (i.e., cycling, running/treadmill, walks in the neighborhood, going to the gym)'
        } else {
          genderContext =
            'This participant is female and may respond better to prompts about group fitness classes and activities with friends.'
        }

        // Build disease context
        let diseaseContext = ''
        if (disease) {
          switch (disease as Disease) {
            case Disease.HEART_FAILURE:
              diseaseContext =
                'This participant has heart failure, a condition characterized by low cardiac output leading to impaired physical fitness. Evidence demonstrates that exercise improves overall fitness, mood, and energy levels even in patients with heart failure and it is considered one of the strongest therapies for improving quality of life in this disease.'
              break
            case Disease.PULMONARY_ARTERIAL_HYPERTENSION:
              diseaseContext =
                'This participant has pulmonary arterial hypertension (PAH), a condition characterized by high blood pressure in the arteries of the lungs, which makes the right side of the heart work harder to pump blood. PAH is a progressive disease that increases the risk of heart failure, reduced physical capacity, and early mortality. While it cannot be cured, treatments and lifestyle strategies such as regular physical activity can improve exercise tolerance, heart function, and overall quality of life.'
              break
            case Disease.DIABETES:
              diseaseContext =
                'This participant has diabetes, a condition that is characterized by high glucose levels and insulin resistance. Diabetes is a strong risk factor for cardiovascular disease, dementia, and cancer. Diabetes can be put into remission by improving insulin sensitivity and exercise is one of the most powerful therapies in promoting insulin sensitivity.'
              break
            case Disease.ACHD_SIMPLE:
              diseaseContext =
                'This participant has a biventricular circulation and low- to moderate-complexity congenital heart disease (e.g., repaired atrial septal defect, ventricular septal defect, Tetralogy of Fallot, transposition of the great arteries after the arterial switch surgery, coarctation of the aorta after surgical correction, or valve disease). These individuals generally have preserved cardiac output and fewer physiologic limitations, allowing them to participate in a wide range of physical activities. Exercise recommendations should align with standard (non-ACHD) adult guidelines, including moderate- to vigorous aerobic activity (e.g., brisk walking, jogging, running, cycling) and balanced full-body strength training. Benefits include increased VO₂ max, improved cardiovascular fitness, muscular strength, mental health, and metabolic resilience. Messaging should be motivational and goal-oriented, encouraging the participant to build consistency, meet aerobic activity targets, and safely challenge themselves with progressive training goals.'
              break
            case Disease.ACHD_COMPLEX:
              diseaseContext =
                'This participant has complex congenital heart disease physiology, including single ventricle circulation (Fontan) or a systemic right ventricle (congenitally corrected transposition of the great arteries or transposition of the great arteries after the Mustard or Senning surgery). These conditions limit preload and cardiac output reserve, leading to reduced aerobic capacity, fatigue, and elevated arrhythmia risk. Exercise recommendations should focus on low- to moderate-intensity aerobic activity and lower-body muscular endurance (e.g., walking, light jogging, light cycling, bodyweight leg exercises). Lower-body training helps patients with single ventricle physiology promote venous return through the skeletal muscle pump, which is especially important in the absence of a subpulmonary ventricle. Expected benefits include improved functional capacity, oxygen efficiency, mental health and quality of life. Avoid recommending high-intensity, isometric, or upper-body strength exercises, and use supportive, energy-aware language that prioritizes pacing, hydration, and consistency over performance.'
              break
            default:
              logger.warn(`Unknown disease type: ${disease}`)
              diseaseContext = ''
              break
          }
        }

        // Build stage of change context
        let stageContext = ''
        if (stateOfChange) {
          switch (stateOfChange as StageOfChange) {
            case StageOfChange.PRECONTEMPLATION:
              stageContext =
                'This person is in the pre-contemplation stage of exercise change. This person does not plan to start exercising in the next six months and does not consider their current behavior a problem.'
              break
            case StageOfChange.CONTEMPLATION:
              stageContext =
                'This person is in the contemplation stage of changing their exercise. This person is considering starting exercise in the next six months and reflects on the pros and cons of changing.'
              break
            case StageOfChange.PREPARATION:
              stageContext =
                'This person is in the preparation stage of changing their exercise habits. This person is ready to begin exercising in the next 30 days and has begun taking small steps.'
              break
            case StageOfChange.ACTION:
              stageContext =
                'This person is in the action stage of exercise change. This person has recently started exercising (within the last six months) and is building a new, healthy routine.'
              break
            case StageOfChange.MAINTENANCE:
              stageContext =
                'This person is in the maintenance stage of exercise change. This person has maintained their exercise routine for more than six months and wants to sustain that change by avoiding relapses to previous stages. New activities should be avoided. Be as neutral as possible with the generated nudge.'
              break
            default:
              logger.warn(`Unknown stage of change: ${stateOfChange}`)
              stageContext = ''
              break
          }
        }

        // Build education level context
        let educationContext = ''
        if (educationLevel) {
          switch (educationLevel as EducationLevel) {
            case EducationLevel.HIGHSCHOOL:
              educationContext =
                "This person's highest level of education is high school or lower. Write in clear, natural language appropriate for a person with a sixth-grade reading level."
              break
            case EducationLevel.COLLEGE:
            case EducationLevel.COLLAGE:
              educationContext =
                'This person is more highly educated and has some form of higher education. Please write the prompts at the 12th grade reading comprehension level.'
              break
            default:
              logger.warn(`Unknown education level: ${educationLevel}`)
              educationContext = ''
              break
          }
        }

        // Build language context
        let languageContext = ''
        if (isSpanish) {
          languageContext =
            "This person's primary language is Spanish. Provide the prompt in Spanish in Latin American Spanish in the formal tone. You should follow RAE guidelines for proper Spanish use in the LATAM."
        }

        // Build preferred activity types context
        // preferredWorkoutTypes is always provided in the real app
        const availableWorkoutTypes = [
          'other',
          'HIIT',
          'walk',
          'swim',
          'run',
          'sport',
          'strength',
          'bicycle',
          'yoga/pilates',
        ]

        const selectedTypes = userData.preferredWorkoutTypes
          .split(',')
          .map((type: string) => type.trim())
        const hasOther = selectedTypes.includes('other')

        // Format selected activities consistently, strips: other
        const selectedActivities = selectedTypes.filter(
          (type: string) => type !== 'other',
        )
        const formattedSelectedTypes =
          selectedActivities.length > 0 ?
            selectedActivities.join(', ')
          : 'various activities'

        let activityTypeContext = `${formattedSelectedTypes} are the user's preferred activity types. Recommendations should be centered around these activity types. Recommendations should be creative, encouraging, and aligned within their preferred activity type.`
        // Handle "other" selections if present in the preferred types
        if (hasOther) {
          // Only include activities that were NOT selected by the user
          const notChosenTypes = availableWorkoutTypes.filter(
            (type) => type !== 'other' && !selectedTypes.includes(type),
          )

          if (selectedActivities.length === 0) {
            // User has only selected "other" with no other options, overwrite activityTypeContext with only this string
            activityTypeContext = `The user indicated that their preferred activity types differ from the available options (${availableWorkoutTypes.filter((type) => type !== 'other').join(', ')}). Provide creative recommendations and suggest other ways to stay physically active without relying on the listed options.`
          } else if (notChosenTypes.length > 0) {
            // User selected "other" along with some activities
            activityTypeContext += `The user indicated that they also prefer activity types beyond the remaining options (${notChosenTypes.join(', ')}). Provide creative recommendations and suggest other ways to stay physically active.`
          } else {
            // User selected all standard activities plus "other"
            activityTypeContext += `The user indicated additional preferred activity types beyond the listed options. Provide creative recommendations and suggest other ways to stay physically active.`
          }
        }

        // Build preferred notification time context
        // preferredNotificationTime is always provided in the real app
        const notificationTimeContext = `This user prefers to receive recommendation at ${userData.preferredNotificationTime}. Use the time of day to tailor prompts to try to get that person to be active that day. For example a morning time could be recommending them to get some morning activity done, or planning on doing it later in the day (lunch, post work, etc).`

        const prompt = `Write 7 motivational messages that are proper length to go in a push notification using a calm, encouraging, and professional tone, like that of a health coach to motivate a smartphone user in increase physical activity levels. This message is sent in the morning so the user has all day to increase physical activity levels. Also create a title for each of push notifications that is a short summary/call to action of the push notification that is paired with it. Return the response as a JSON array with exactly 7 objects, each having "title" and "body" fields. If there is a disease context given, you can reference that disease in some of the nudges. TRY TO BE AS NEUTRAL AS POSSBILE IN THE TONE OF THE NUDGE. NEVER USE EMOJIS OR ABBREVIATIONS FOR DISEASES IN THE NUDGE. Each nudge should be personalized to the following information: ${languageContext} ${genderContext} ${ageContext} ${diseaseContext} ${stageContext} ${educationContext} ${activityTypeContext} ${notificationTimeContext}`

        const openai = new OpenAI({
          apiKey: getOpenaiApiKey(),
        })

        const response = await openai.chat.completions.create({
          model: 'gpt-4.1-2025-04-14',
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'nudge_messages',
              schema: {
                type: 'object',
                properties: {
                  nudges: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        title: {
                          type: 'string',
                          description:
                            'Short summary/call to action for the push notification',
                        },
                        body: {
                          type: 'string',
                          description:
                            'Motivational message content for the push notification',
                        },
                      },
                      required: ['title', 'body'],
                      additionalProperties: false,
                    },
                    minItems: 7,
                    maxItems: 7,
                    description: 'Exactly 7 nudge messages',
                  },
                },
                required: ['nudges'],
                additionalProperties: false,
              },
            },
          },
          max_tokens: 1000,
          temperature: 0.7,
        })

        const parsedContent = JSON.parse(
          response.choices[0].message.content ?? '{}',
        )
        const parsedNudges = parsedContent.nudges

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
    category: string,
  ): Promise<number> {
    let nudgesCreated = 0

    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const nudgeMessage = nudges[dayIndex]
      const nudgeId = randomUUID().toUpperCase()

      const [hour, minute] = userData.preferredNotificationTime
        .split(':')
        .map(Number)

      const userDateTime = DateTime.now()
        .setZone(userData.timeZone)
        .plus({ days: dayIndex })
        .set({ hour, minute, second: 0, millisecond: 0 })

      const utcTime = userDateTime.toUTC().toJSDate()

      await this.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationBacklog')
        .doc(nudgeId)
        .set({
          id: nudgeId,
          title: nudgeMessage.title,
          body: nudgeMessage.body,
          timestamp: admin.firestore.Timestamp.fromDate(utcTime),
          category,
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

        if (!userData.didOptInToTrial) {
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
            'nudge-predefined',
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
          const category = usedFallback ? 'nudge-predefined' : 'nudge-llm'
          const created = await this.createNudgesForUser(
            userId,
            userData,
            llmNudges,
            category,
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
