//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  advanceDateByDays,
  type FHIRMedicationRequest,
  type FHIRQuestionnaireResponse,
  median,
  QuantityUnit,
  QuestionnaireReference,
  type UserMedicationRecommendation,
  UserMedicationRecommendationType,
  UserMessage,
  UserMessageType,
  VideoReference,
  UserObservationCollection,
  type User,
  CachingStrategy,
  StaticDataComponent,
  UserType,
  Invitation,
  UserRegistration,
  advanceDateByHours,
} from '@stanfordbdhg/engagehf-models'
import { logger } from 'firebase-functions'
import { _updateStaticData } from '../../functions/updateStaticData.js'
import { type Document } from '../database/databaseService.js'
import { type ServiceFactory } from '../factory/serviceFactory.js'
import { type MessageService } from '../message/messageService.js'
import { type PatientService } from '../patient/patientService.js'
import { type RecommendationVitals } from '../recommendation/recommendationService.js'
import { type UserService } from '../user/userService.js'

export class TriggerService {
  // Properties

  private readonly factory: ServiceFactory

  // Constructor

  constructor(factory: ServiceFactory) {
    this.factory = factory
  }

  // Methods - Schedule

  async everyMorning() {
    const now = new Date()
    const messageService = this.factory.message()
    const userService = this.factory.user()
    const patients = await userService.getAllPatients()

    logger.debug(`everyMorning: Found ${patients.length} patients`)

    await Promise.all([
      this.addDailyReminderMessages({
        patients,
        messageService,
        now,
      }),
      this.addInactivityReminderMessages({
        patients,
        now,
        messageService,
        userService,
      }),
      this.addAppointmentReminderMessages(now),
      this.completeAppointmentReminderMessages(now),
      this.seedStaticDataIfNeeded(),
    ])
  }

  // Methods - Triggers

  async questionnaireResponseWritten(
    userId: string,
    questionnaireResponseId: string,
    beforeData: FHIRQuestionnaireResponse | undefined,
    afterData: FHIRQuestionnaireResponse | undefined,
  ) {
    logger.debug(
      `questionnaireResponseWritten(${userId}, ${questionnaireResponseId}): beforeData: ${beforeData !== undefined ? 'exists' : 'undefined'}, afterData: ${afterData !== undefined ? 'exists' : 'undefined'}`,
    )

    const patientService = this.factory.patient()
    const symptomScoreCalculator = this.factory.symptomScore()

    const newScore =
      afterData ? symptomScoreCalculator.calculate(afterData) : undefined

    logger.debug(
      `questionnaireResponseWritten(${userId}, ${questionnaireResponseId}): Calculated new score ${newScore?.overallScore}`,
    )
    await patientService.updateSymptomScore(
      userId,
      questionnaireResponseId,
      newScore,
    )

    const messageService = this.factory.message()
    if (beforeData === undefined && afterData !== undefined) {
      logger.debug(
        `questionnaireResponseWritten(${userId}, ${questionnaireResponseId}): Completing symptom questionnaire messages`,
      )
      await messageService.completeMessages(
        userId,
        UserMessageType.symptomQuestionnaire,
      )
    }

    logger.debug(
      `questionnaireResponseWritten(${userId}, ${questionnaireResponseId}): Updating recommendations`,
    )

    const recommendations = await this.updateRecommendationsForUser(userId)
    await this.addMedicationUptitrationMessageIfNeeded({
      userId: userId,
      recommendations: recommendations,
    })
  }

  async userEnrolled(user: Document<User>) {
    if (user.content.type !== UserType.patient) {
      logger.error(
        `TriggerService.userEnrolled(${user.id}): Skipping user of type ${user.content.type}.`,
      )
      return
    }
    try {
      await this.updateRecommendationsForUser(user.id)
    } catch (error) {
      logger.error(
        `TriggerService.userEnrolled(${user.id}): Updating recommendations failed due to ${String(error)}`,
      )
    }

    try {
      await this.factory.message().addMessage(
        user.id,
        UserMessage.createWelcome({
          videoReference: VideoReference.welcome,
        }),
        { notify: true },
      )
    } catch (error) {
      logger.error(
        `TriggerService.userEnrolled(${user.id}): Adding welcome message failed due to ${String(error)}`,
      )
    }

    try {
      await this.factory.message().addMessage(
        user.id,
        UserMessage.createSymptomQuestionnaire({
          questionnaireReference: QuestionnaireReference.enUS,
        }),
        { notify: true },
      )
    } catch (error) {
      logger.error(
        `TriggerService.userEnrolled(${user.id}): Adding symptom questionnaire message failed due to ${String(error)}`,
      )
    }
  }

  async userAllergyIntoleranceWritten(userId: string): Promise<void> {
    await this.updateRecommendationsForUser(userId)
  }

  async userObservationWritten(
    userId: string,
    collection: UserObservationCollection,
  ): Promise<void> {
    try {
      const userService = this.factory.user()
      await userService.updateLastActiveDate(userId)
    } catch (error) {
      logger.error(
        `TriggerService.userObservationWritten(${userId}, ${collection}): Updating lastActiveDate failed due to ${String(error)}`,
      )
    }

    try {
      const messageSevice = this.factory.message()
      await messageSevice.completeMessages(userId, UserMessageType.inactive)
    } catch (error) {
      logger.error(
        `TriggerService.userObservationWritten(${userId}, ${collection}): Completing inactive messages failed due to ${String(error)}`,
      )
    }

    try {
      await this.updateRecommendationsForUser(userId)
    } catch (error) {
      logger.error(
        `TriggerService.userObservationWritten(${userId}, ${collection}): Updating recommendations failed due to ${String(error)}`,
      )
    }

    if (collection === UserObservationCollection.bodyWeight) {
      try {
        const date = new Date()
        const patientService = this.factory.patient()
        const bodyWeightObservations =
          await patientService.getBodyWeightObservations(
            userId,
            QuantityUnit.lbs,
            advanceDateByDays(date, -7),
          )

        const bodyWeightMedian = median(
          bodyWeightObservations.map((observation) => observation.value),
        )

        logger.debug(
          `TriggerService.userObservationWritten(${userId}, ${collection}): Found ${bodyWeightObservations.length} body weight observations with median ${bodyWeightMedian}`,
        )

        if (!bodyWeightMedian) return
        const mostRecentBodyWeight = bodyWeightObservations[0].value

        logger.debug(
          `TriggerService.userObservationWritten(${userId}, ${collection}): Most recent body weight is ${mostRecentBodyWeight} compared to a median of ${bodyWeightMedian}`,
        )
        if (mostRecentBodyWeight - bodyWeightMedian >= 3) {
          const messageService = this.factory.message()
          const messageDoc = await messageService.addMessage(
            userId,
            UserMessage.createWeightGain(),
            { notify: true },
          )

          const userService = this.factory.user()
          const user = await userService.getUser(userId)
          if (user !== undefined && messageDoc !== undefined) {
            const userAuth = await userService.getAuth(userId)
            const forwardedMessage = UserMessage.createWeightGainForClinician({
              userId: userId,
              userName: userAuth.displayName,
              reference: messageDoc.path,
            })
            await this.forwardMessageToOwnersAndClinician({
              user,
              userService,
              message: forwardedMessage,
              messageService,
            })
          }
        }
      } catch (error) {
        logger.error(
          `Error on user body weight observation written: ${String(error)}`,
        )
      }
    }

    const isUserEnteredObservation = [
      UserObservationCollection.bloodPressure,
      UserObservationCollection.bodyWeight,
      UserObservationCollection.heartRate,
    ].includes(collection)

    if (isUserEnteredObservation) {
      try {
        const patientService = this.factory.patient()
        const yesterday = advanceDateByDays(new Date(), -1)
        const [bloodPressure, bodyWeight, heartRate] = await Promise.all([
          patientService.getBloodPressureObservations(userId, yesterday),
          patientService.getBodyWeightObservations(
            userId,
            QuantityUnit.lbs,
            yesterday,
          ),
          patientService.getHeartRateObservations(userId, yesterday),
        ])

        logger.log(
          `TriggerService.userObservationWritten(${userId}, ${collection}): ${bloodPressure[0].length} SBP, ${bloodPressure[1].length} DBP, ${bodyWeight.length} weight and ${heartRate.length} HR values.`,
        )

        if (
          bloodPressure[0].length > 0 &&
          bloodPressure[1].length > 0 &&
          bodyWeight.length > 0 &&
          heartRate.length > 0
        ) {
          await this.factory
            .message()
            .completeMessages(userId, UserMessageType.vitals)
        }
      } catch (error) {
        logger.error(`Failed updating vitals message: ${String(error)}`)
      }
    }
  }

  async userMedicationRequestWritten(
    userId: string,
    medicationRequestId: string,
    before: FHIRMedicationRequest | undefined,
    after: FHIRMedicationRequest | undefined,
  ): Promise<void> {
    try {
      await this.updateRecommendationsForUser(userId)
    } catch (error) {
      logger.error(
        `TriggerService.userMedicationRequestWritten(${userId}, ${medicationRequestId}): Updating recommendations failed due to ${String(error)}`,
      )
    }

    // Drug

    const drugReference =
      after?.medicationReference ?? before?.medicationReference
    if (drugReference === undefined) {
      logger.error(
        `TriggerService.userMedicationRequestWritten(${userId}, ${medicationRequestId}): Neither before nor after data contains a medication reference`,
      )
      throw new Error('Drug reference not found.')
    }

    // Medication

    const medicationReference = drugReference.reference
      .split('/')
      .slice(0, 2)
      .join('/')
    const medicationService = this.factory.medication()
    const medication = await medicationService.getReference({
      reference: medicationReference,
    })
    if (medication === undefined) {
      logger.error(
        `TriggerService.userMedicationRequestWritten(${userId}, ${medicationRequestId}): Could not find medication with reference: ${medicationReference}`,
      )
      throw new Error('Medication not found.')
    }
    const medicationName = medication.content.displayName
    if (medicationName === undefined) {
      logger.error(
        `TriggerService.userMedicationRequestWritten(${userId}, ${medicationRequestId}): Could not find name for medication with reference: ${medicationReference}`,
      )
      throw new Error('Medication name not found.')
    }

    // Medication Class

    const medicationClass =
      medication.content.medicationClassReference ?
        await medicationService.getClassReference(
          medication.content.medicationClassReference,
        )
      : undefined

    await this.factory.message().addMessage(
      userId,
      UserMessage.createMedicationChange({
        medicationName: medicationName,
        reference: medicationReference,
        videoReference: medicationClass?.content.videoPath,
      }),
      { notify: true },
    )
  }

  // Methods - Actions

  async updateAllSymptomScores(userId: string) {
    const patientService = this.factory.patient()
    const symptomScores = await patientService.getSymptomScores(userId)

    logger.debug(
      `TriggerService.updateAllSymptomScores(${userId}): Found ${symptomScores.length} symptom scores to delete`,
    )

    for (const symptomScore of symptomScores) {
      logger.debug(
        `TriggerService.updateAllSymptomScores(${userId}): Deleting symptom score at ${symptomScore.path}`,
      )
      await patientService.updateSymptomScore(
        userId,
        symptomScore.id,
        undefined,
      )
    }

    const questionnaireResponses =
      await patientService.getQuestionnaireResponses(userId)

    logger.debug(
      `TriggerService.updateAllSymptomScores(${userId}): Found ${questionnaireResponses.length} questionnaire responses to create symptom scores for`,
    )

    for (const questionnaireResponse of questionnaireResponses) {
      logger.debug(
        `TriggerService.updateAllSymptomScores(${userId}): Creating symptom score for questionnaire response ${questionnaireResponse.path}`,
      )
      await this.questionnaireResponseWritten(
        userId,
        questionnaireResponse.id,
        questionnaireResponse.content,
        questionnaireResponse.content,
      )
    }
  }

  async updateRecommendationsForAllPatients() {
    const userService = this.factory.user()
    const users = await userService.getAllPatients()

    for (const user of users) {
      try {
        await this.updateRecommendationsForUser(user.id)
      } catch (error) {
        logger.error(
          `TriggerService.updateRecommendationsForAllUsers: Updating recommendations for user ${user.id} failed due to ${String(error)}`,
        )
      }
    }
  }

  async updateRecommendationsForUser(
    userId: string,
  ): Promise<UserMedicationRecommendation[]> {
    const medicationService = this.factory.medication()
    const patientService = this.factory.patient()
    const recommendationService = this.factory.recommendation()

    const requests = await patientService.getMedicationRequests(userId)
    logger.debug(
      `TriggerService.updateRecommendationsForUser(${userId}): Found ${requests.length} medication requests`,
    )

    const contraindications = await patientService.getContraindications(userId)
    logger.debug(
      `TriggerService.updateRecommendationsForUser(${userId}): Found ${contraindications.length} contraindications`,
    )

    const vitals = await this.getRecommendationVitals(
      patientService,
      userId,
      advanceDateByDays(new Date(), -14),
    )

    logger.debug(
      `TriggerService.updateRecommendationsForUser(${userId}): Found ${vitals.systolicBloodPressure.length} SBP and ${vitals.heartRate.length} HR values`,
    )
    logger.debug(
      `TriggerService.updateRecommendationsForUser(${userId}): Found ${vitals.creatinine !== undefined ? 1 : 0} creatinine, ${vitals.estimatedGlomerularFiltrationRate !== undefined ? 1 : 0} eGFR and ${vitals.potassium !== undefined ? 1 : 0} potassium values`,
    )

    const latestSymptomScore =
      await patientService.getLatestSymptomScore(userId)

    logger.debug(
      `TriggerService.updateRecommendationsForUser(${userId}): Found ${latestSymptomScore !== undefined ? 1 : 0} symptom scores`,
    )

    const requestContexts = await Promise.all(
      requests.map(async (document) => medicationService.getContext(document)),
    )

    logger.debug(
      `TriggerService.updateRecommendationsForUser(${userId}): Got ${requestContexts.length} request contexts`,
    )

    const recommendations = await recommendationService.compute({
      requests: requestContexts,
      contraindications: contraindications.map((document) => document.content),
      vitals: vitals,
      latestDizzinessScore: latestSymptomScore?.content.dizzinessScore,
    })

    logger.debug(
      `TriggerService.updateRecommendationsForUser(${userId}): Computed ${recommendations.length} recommendations`,
    )

    await patientService.updateMedicationRecommendations(
      userId,
      recommendations,
    )

    logger.debug(
      `TriggerService.updateRecommendationsForUser(${userId}): Updated recommendations successfully`,
    )

    return recommendations
  }

  // Helpers

  private async deleteExpiredAccounts() {
    try {
      await this.factory.user().deleteExpiredAccounts()
    } catch (error) {
      console.error(`Error clearing expired accounts: ${String(error)}`)
    }
  }

  private async getRecommendationVitals(
    patientService: PatientService,
    userId: string,
    cutoffDate: Date,
  ): Promise<RecommendationVitals> {
    return {
      systolicBloodPressure: (
        await patientService.getBloodPressureObservations(userId, cutoffDate)
      )[0],
      heartRate: await patientService.getHeartRateObservations(
        userId,
        cutoffDate,
      ),
      creatinine:
        await patientService.getMostRecentCreatinineObservation(userId),
      estimatedGlomerularFiltrationRate:
        await patientService.getMostRecentEstimatedGlomerularFiltrationRateObservation(
          userId,
        ),
      potassium: await patientService.getMostRecentPotassiumObservation(userId),
    }
  }

  private async addMedicationUptitrationMessageIfNeeded(input: {
    userId: string
    recommendations: UserMedicationRecommendation[]
  }): Promise<boolean> {
    const hasImprovementAvailable = input.recommendations.some(
      (recommendation) =>
        [
          UserMedicationRecommendationType.improvementAvailable,
          UserMedicationRecommendationType.notStarted,
        ].includes(recommendation.displayInformation.type),
    )

    logger.debug(
      `TriggerService.addMedicationUptitrationMessageIfNeeded(${input.userId}): Improvement available: ${hasImprovementAvailable ? 'yes' : 'no'}`,
    )

    if (!hasImprovementAvailable) return false
    const message = UserMessage.createMedicationUptitration()
    const messageService = this.factory.message()
    const messageDoc = await messageService.addMessage(input.userId, message, {
      notify: true,
    })

    const userService = this.factory.user()
    const user = await userService.getUser(input.userId)
    if (messageDoc !== undefined && user !== undefined) {
      const userAuth = await userService.getAuth(input.userId)
      const forwardedMessage =
        UserMessage.createMedicationUptitrationForClinician({
          userId: input.userId,
          userName: userAuth.displayName,
          reference: messageDoc.path,
        })
      await this.forwardMessageToOwnersAndClinician({
        user,
        userService,
        message: forwardedMessage,
        messageService,
      })
      return true
    } else {
      return false
    }
  }

  private async forwardMessageToOwnersAndClinician(input: {
    user: Document<User>
    message: UserMessage
    userService: UserService
    messageService: MessageService
  }) {
    const owners =
      input.user.content.organization !== undefined ?
        await input.userService.getAllOwners(input.user.content.organization)
      : []
    const clinican = input.user.content.clinician

    const recipientIds = owners.map((owner) => owner.id)
    if (clinican !== undefined) recipientIds.push(clinican)

    logger.debug(
      `TriggerService.forwardMessageToOwnersAndClinician(${input.user.id}): Found ${recipientIds.length} recipients (${recipientIds.join(', ')}).`,
    )

    for (const recipientId of recipientIds) {
      await input.messageService.addMessage(recipientId, input.message, {
        notify: true,
      })
    }
  }

  private async addDailyReminderMessages(options: {
    patients: Array<Document<User>>
    messageService: MessageService
    now: Date
  }) {
    const symptomReminderMessage = UserMessage.createSymptomQuestionnaire({
      questionnaireReference: QuestionnaireReference.enUS,
    })
    const vitalsMessage = UserMessage.createVitals()

    await Promise.all(
      options.patients.map(async (user) => {
        try {
          await options.messageService.addMessage(user.id, vitalsMessage, {
            notify: true,
            user: user.content,
          })

          const enrollmentDuration = Math.abs(
            user.content.dateOfEnrollment.getTime() - options.now.getTime(),
          )
          const durationOfOneDayInMilliseconds = 24 * 60 * 60 * 1000

          logger.debug(
            `everyMorning(user: ${user.id}): enrolled on ${user.content.dateOfEnrollment.toISOString()}, which was ${enrollmentDuration} ms ago`,
          )
          if (
            enrollmentDuration % (durationOfOneDayInMilliseconds * 14) <
              durationOfOneDayInMilliseconds &&
            enrollmentDuration > durationOfOneDayInMilliseconds
          ) {
            await options.messageService.addMessage(
              user.id,
              symptomReminderMessage,
              {
                notify: true,
                user: user.content,
              },
            )
          }

          if (
            enrollmentDuration % (durationOfOneDayInMilliseconds * 14) >
              durationOfOneDayInMilliseconds * 2 &&
            enrollmentDuration % (durationOfOneDayInMilliseconds * 14) <
              durationOfOneDayInMilliseconds * 3
          ) {
            const recommendations = await this.factory
              .patient()
              .getMedicationRecommendations(user.id)
            await this.addMedicationUptitrationMessageIfNeeded({
              userId: user.id,
              recommendations: recommendations.map((doc) => doc.content),
            })
          }
        } catch (error) {
          logger.error(
            `everyMorning(user: ${user.id}): Failed due to ${String(error)}`,
          )
        }
      }),
    )
  }

  private async addInactivityReminderMessages(options: {
    patients: Array<Document<User>>
    now: Date
    messageService: MessageService
    userService: UserService
  }) {
    const inactivePatients = options.patients.filter(
      (patient) =>
        advanceDateByDays(patient.content.lastActiveDate, 7) < options.now,
    )
    await Promise.all(
      inactivePatients.map(async (user) => {
        const messageDoc = await options.messageService.addMessage(
          user.id,
          UserMessage.createInactive({}),
          { notify: true },
        )

        if (messageDoc !== undefined) {
          const userAuth = await options.userService.getAuth(user.id)
          const forwardedMessage = UserMessage.createInactiveForClinician({
            userId: user.id,
            userName: userAuth.displayName,
            reference: messageDoc.path,
          })
          await this.forwardMessageToOwnersAndClinician({
            user,
            userService: options.userService,
            message: forwardedMessage,
            messageService: options.messageService,
          })
        }
      }),
    )
  }

  private async addAppointmentReminderMessages(now: Date) {
    const patientService = this.factory.patient()
    const userService = this.factory.user()
    const messageService = this.factory.message()

    const tomorrow = advanceDateByDays(now, 1)
    const upcomingAppointments = await patientService.getEveryAppoinment(
      advanceDateByHours(tomorrow, -8),
      advanceDateByHours(tomorrow, 16),
    )

    logger.debug(
      `TriggerService.addAppointmentReminderMessages: Found ${upcomingAppointments.length} upcoming appointments`,
    )

    await Promise.all(
      upcomingAppointments.map(async (appointment) => {
        try {
          const userId = appointment.path.split('/')[1]
          const messageDoc = await messageService.addMessage(
            userId,
            UserMessage.createPreAppointment({
              reference: appointment.path,
            }),
            { notify: true },
          )
          const user = await userService.getUser(userId)
          if (user !== undefined && messageDoc !== undefined) {
            const userAuth = await userService.getAuth(userId)
            const forwardedMessage =
              UserMessage.createPreAppointmentForClinician({
                userId: userId,
                userName: userAuth.displayName,
                reference: messageDoc.path,
              })
            await this.forwardMessageToOwnersAndClinician({
              user,
              userService,
              message: forwardedMessage,
              messageService,
            })
          }
        } catch (error) {
          logger.error(
            `TriggerService.addAppointmentReminderMessages: Error adding messages for appointment ${appointment.path}: ${String(error)}`,
          )
        }
      }),
    )
  }

  private async completeAppointmentReminderMessages(now: Date) {
    const patientService = this.factory.patient()
    const messageService = this.factory.message()
    const yesterday = advanceDateByDays(now, -1)
    const pastAppointments = await patientService.getEveryAppoinment(
      advanceDateByHours(yesterday, -8),
      advanceDateByHours(yesterday, 16),
    )

    logger.debug(
      `TriggerService.completeAppointmentReminderMessages: Found ${pastAppointments.length} past appointments`,
    )

    await Promise.all(
      pastAppointments.map(async (appointment) => {
        try {
          await messageService.completeMessages(
            appointment.path.split('/')[1],
            UserMessageType.preAppointment,
            (message) => message.reference === appointment.path,
          )
        } catch (error) {
          logger.error(
            `TriggerService.completeAppointmentReminderMessages: Error completing messages for appointment ${appointment.path}: ${String(error)}`,
          )
        }
      }),
    )
  }

  private async seedStaticDataIfNeeded() {
    try {
      const isEmpty = await this.factory.history().isEmpty()
      if (isEmpty) {
        await this.factory.user().createInvitation(
          new Invitation({
            code: '<your admin email>',
            user: new UserRegistration({
              type: UserType.admin,
              disabled: false,
              receivesAppointmentReminders: false,
              receivesInactivityReminders: false,
              receivesMedicationUpdates: false,
              receivesQuestionnaireReminders: false,
              receivesRecommendationUpdates: false,
              receivesVitalsReminders: false,
              receivesWeightAlerts: false,
            }),
          }),
        )
        await _updateStaticData(this.factory, {
          only: Object.values(StaticDataComponent),
          cachingStrategy: CachingStrategy.updateCacheIfNeeded,
        })
      }
    } catch (error) {
      logger.error(
        `TriggerService.updateStaticData: Error updating static data '${String(error)}'.`,
      )
    }
  }
}
