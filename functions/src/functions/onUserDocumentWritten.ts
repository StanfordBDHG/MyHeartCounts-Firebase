//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { fhirQuestionnaireResponseConverter } from '@stanfordbdhg/engagehf-models'
import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import { DatabaseConverter } from '../services/database/databaseConverter.js'
import { getServiceFactory } from '../services/factory/getServiceFactory.js'

export const onUserQuestionnaireResponseWritten = onDocumentWritten(
  'users/{userId}/questionnaireResponses/{questionnaireResponseId}',
  async (event) => {
    const beforeData = event.data?.before
    const afterData = event.data?.after
    const converter = new DatabaseConverter(
      fhirQuestionnaireResponseConverter.value,
    )
    await getServiceFactory()
      .trigger()
      .questionnaireResponseWritten(
        event.params.userId,
        event.params.questionnaireResponseId,
        beforeData?.exists ? converter.fromFirestore(beforeData) : undefined,
        afterData?.exists ? converter.fromFirestore(afterData) : undefined,
      )
  },
)
