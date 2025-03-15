//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  StaticDataComponent,
  updateStaticDataInputSchema,
  type UpdateStaticDataOutput,
} from '@stanfordbdhg/engagehf-models'
import { type z } from 'zod'
import { validatedOnCall, validatedOnRequest } from './helpers.js'
import { Flags } from '../flags.js'
import { UserRole } from '../services/credential/credential.js'
import { getServiceFactory } from '../services/factory/getServiceFactory.js'
import { type ServiceFactory } from '../services/factory/serviceFactory.js'

export async function _updateStaticData(
  factory: ServiceFactory,
  input: z.output<typeof updateStaticDataInputSchema>,
) {
  const service = factory.staticData()
  const promises: Array<Promise<void>> = []
  if (input.only.includes(StaticDataComponent.questionnaires)) {
    promises.push(service.updateQuestionnaires(input.cachingStrategy))
  }
  if (input.only.includes(StaticDataComponent.videoSections)) {
    promises.push(service.updateVideoSections(input.cachingStrategy))
  }
  await Promise.all(promises)
}

export const updateStaticData =
  Flags.isEmulator ?
    validatedOnRequest(
      'updateStaticData',
      updateStaticDataInputSchema,
      async (_, data, response) => {
        await _updateStaticData(getServiceFactory(), data)
        const result: UpdateStaticDataOutput = {}
        response.send({ result })
      },
    )
  : validatedOnCall(
      'updateStaticData',
      updateStaticDataInputSchema,
      async (request): Promise<UpdateStaticDataOutput> => {
        const factory = getServiceFactory()
        factory.credential(request.auth).check(UserRole.admin)
        await _updateStaticData(factory, request.data)
        return {}
      },
    )
