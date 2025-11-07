//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import admin from 'firebase-admin'
import { https } from 'firebase-functions'
import { defaultServiceAccount } from './functions/helpers.js'

// Initialize Firebase with default settings
admin.initializeApp()

// Set Firestore settings to ignore undefined properties
const firestore = admin.firestore()
firestore.settings({
  ignoreUndefinedProperties: true,
})

// Get study definition - this will be available at /getStudyDefinition
export const getStudyDefinition = https.onRequest(
  {
    serviceAccount: defaultServiceAccount,
  },
  async (req, res) => {
    const bucket = 'myheartcounts-firebase.appspot.com' // adjust this to your actual bucket name
    const file = `https://storage.googleapis.com/${bucket}/public/studyDefinition.json`

    // Set CORS headers
    res.set('Access-Control-Allow-Origin', '*')
    res.set('Access-Control-Allow-Headers', 'Content-Type')

    // Redirect to the actual file
    res.redirect(302, file)
  },
)

export {
  beforeUserCreatedFunction as beforeUserCreated,
  beforeUserSignedInFunction as beforeUserSignedIn,
} from './functions/blocking.js'
export * from './functions/customSeed.js'
export * from './functions/updateStaticData.js'
export * from './functions/updateUserInformation.js'
export * from './functions/disableUser.js'
export * from './functions/enableUser.js'
export * from './functions/planNudges.js'
export * from './functions/sendNudges.js'
export * from './functions/onUserQuestionnaireResponseWritten.js'
export * from './functions/deleteHealthSamples.js'
export * from './functions/onArchivedLiveHealthSampleUploaded.js'
export * from './functions/markAccountForDeletion.js'
export * from './functions/processUserDeletions.js'
