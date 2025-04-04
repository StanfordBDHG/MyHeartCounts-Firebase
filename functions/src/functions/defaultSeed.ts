//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  DebugDataComponent,
  defaultSeedInputSchema,
  type DefaultSeedOutput,
  UserDebugDataComponent,
  UserType,
} from '@stanfordbdhg/engagehf-models'
import { logger } from 'firebase-functions'
import { type z } from 'zod'
import { validatedOnCall, validatedOnRequest } from './helpers.js'
import { _updateStaticData } from './updateStaticData.js'
import { Flags } from '../flags.js'
import { UserRole } from '../services/credential/credential.js'
import { getServiceFactory } from '../services/factory/getServiceFactory.js'
import { type ServiceFactory } from '../services/factory/serviceFactory.js'
import { type DebugDataService } from '../services/seeding/debugData/debugDataService.js'
import { type TriggerService } from '../services/trigger/triggerService.js'

async function _seedClinicianCollections(input: {
  debugData: DebugDataService
  trigger: TriggerService
  userId: string
  patients: Array<{
    id: string
    name: string | undefined
  }>
  components: UserDebugDataComponent[]
}): Promise<void> {
  const promises: Array<Promise<void>> = []
  if (input.components.includes(UserDebugDataComponent.messages)) {
    promises.push(
      input.debugData.seedClinicianMessages(input.userId, input.patients),
    )
  }
  await Promise.all(promises)
}

async function _seedPatientCollections(input: {
  debugData: DebugDataService
  trigger: TriggerService
  userId: string
  components: UserDebugDataComponent[]
  date: Date
}): Promise<void> {
  const promises: Array<Promise<void>> = []
  
  if (input.components.includes(UserDebugDataComponent.heartRateObservations)) {
    promises.push(
      input.debugData.seedUserHeartRateObservations(input.userId, input.date),
    )
  }
  if (input.components.includes(UserDebugDataComponent.messages)) {
    promises.push(input.debugData.seedUserMessages(input.userId, input.date))
  }
  if (
    input.components.includes(UserDebugDataComponent.questionnaireResponses)
  ) {
    promises.push(
      input.debugData.seedUserQuestionnaireResponses(input.userId, input.date),
    )
  }
  
  await Promise.all(promises)
}

export async function _defaultSeed(
  factory: ServiceFactory,
  data: z.output<typeof defaultSeedInputSchema>,
) {
  if (data.staticData) await _updateStaticData(factory, data.staticData)

  const debugDataService = factory.debugData()
  const triggerService = factory.trigger()

  // Always seed public files regardless of component selection
  await debugDataService.seedPublicFiles()

  if (data.only.includes(DebugDataComponent.users)) {
    const userIds = await debugDataService.seedUsers()
    const userService = factory.user()

    const allPatients = await userService.getAllPatients()

    for (const userId of userIds) {
      try {
        const user = await userService.getUser(userId)
        if (user?.content.type === UserType.patient) {
          await _seedPatientCollections({
            debugData: debugDataService,
            trigger: triggerService,
            userId,
            components: data.onlyUserCollections,
            date: data.date,
          })
        } else if (user?.content.type === UserType.clinician) {
          const clinicianPatients = allPatients.filter(
            (patient) => patient.content.clinician === user.id,
          )
          const patients = await Promise.all(
            clinicianPatients.map(async (patient) => {
              const patientAuth = await userService.getAuth(patient.id)
              return {
                name: patientAuth.displayName,
                id: patient.id,
              }
            }),
          )
          await _seedClinicianCollections({
            debugData: debugDataService,
            trigger: triggerService,
            userId,
            components: data.onlyUserCollections,
            patients,
          })
        }
      } catch (error) {
        logger.error(`Failed to seed user ${userId}: ${String(error)}`)
      }
    }
  }

  for (const userData of data.userData) {
    try {
      await _seedPatientCollections({
        debugData: debugDataService,
        trigger: triggerService,
        userId: userData.userId,
        components: userData.only,
        date: data.date,
      })
    } catch (error) {
      logger.error(
        `Failed to seed user data ${userData.userId}: ${String(error)}`,
      )
    }
  }
}

export const defaultSeed =
  Flags.isEmulator ?
    validatedOnRequest(
      'defaultSeed',
      defaultSeedInputSchema,
      async (_, data, response) => {
        await _defaultSeed(getServiceFactory(), data)
        const result: DefaultSeedOutput = {}
        response.send({ result })
      },
    )
  : validatedOnCall(
      'defaultSeed',
      defaultSeedInputSchema,
      async (request): Promise<DefaultSeedOutput> => {
        const factory = getServiceFactory()
        factory.credential(request.auth).check(UserRole.admin)
        await _defaultSeed(factory, request.data)
        return {}
      },
    )
