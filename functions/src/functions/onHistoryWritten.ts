//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import { getServiceFactory } from '../services/factory/getServiceFactory.js'

export const onHistoryOneLevelDeepWritten = onDocumentWritten(
  '{collection0}/{id0}',
  async (event) => {
    if (event.data === undefined || event.params.collection0 === 'history')
      return
    await getServiceFactory().history().recordChange(event.data)
  },
)

export const onHistoryTwoLevelsDeepWritten = onDocumentWritten(
  '{collection0}/{id0}/{collection1}/{id1}',
  async (event) => {
    if (event.data === undefined) return
    await getServiceFactory().history().recordChange(event.data)
  },
)
