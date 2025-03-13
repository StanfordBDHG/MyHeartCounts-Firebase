//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import admin from 'firebase-admin'
import { https } from 'firebase-functions'

admin.initializeApp()

// Get study definition - this will be available at /getStudyDefinition
export const getStudyDefinition = https.onRequest(async (req, res) => {
  const bucket = 'myheartcounts-firebase.appspot.com' // adjust this to your actual bucket name
  const file = `https://storage.googleapis.com/${bucket}/public/studyDefinition.json`
  
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Headers', 'Content-Type')
  
  // Redirect to the actual file
  res.redirect(302, file)
})

export {
  beforeUserCreatedFunction as beforeUserCreated,
  beforeUserSignedInFunction as beforeUserSignedIn,
} from './functions/blocking.js'
export * from './functions/createInvitation.js'
export * from './functions/customSeed.js'
export * from './functions/defaultSeed.js'
export * from './functions/deleteUser.js'
export * from './functions/dismissMessage.js'
export * from './functions/dismissMessages.js'
export * from './functions/enrollUser.js'
export * from './functions/exportHealthSummary.js'
export * from './functions/getUsersInformation.js'
export * from './functions/onHistoryWritten.js'
export * from './functions/onSchedule.js'
export * from './functions/onUserDocumentWritten.js'
export * from './functions/onUserWritten.js'
export * from './functions/registerDevice.js'
export * from './functions/unregisterDevice.js'
export * from './functions/updateStaticData.js'
export * from './functions/updateUserInformation.js'
export * from './functions/disableUser.js'
export * from './functions/enableUser.js'
