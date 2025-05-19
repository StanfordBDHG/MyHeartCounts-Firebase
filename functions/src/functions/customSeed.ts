//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { customSeedingOptionsSchema } from '@stanfordbdhg/myheartcounts-models'
import { validatedOnRequest } from './helpers.js'
import { getServiceFactory } from '../services/factory/getServiceFactory.js'

export const customSeed = validatedOnRequest(
  'customSeed',
  customSeedingOptionsSchema,
  async (_, data, response) => {
    const factory = getServiceFactory()

    if (process.env.FUNCTIONS_EMULATOR !== 'true') {
      throw factory.credential(undefined).permissionDeniedError()
    }

    await factory.debugData().seedCustom(data)
    response.write('Success', 'utf8')
    response.end()
  },
)
