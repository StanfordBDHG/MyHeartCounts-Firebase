//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import admin from 'firebase-admin'
import { https } from 'firebase-functions'
import { getServiceFactory } from './services/factory/getServiceFactory.js'

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

// One-time function to delete the invitations collection (admin only)
export const cleanupInvitations = https.onCall(async (request) => {
  const factory = getServiceFactory()
  try {
    // Check if user is admin
    factory.credential(request.auth).check('admin')
    
    // Delete invitations collection
    const databaseService = factory.database()
    await databaseService.bulkWrite(async (collections, writer) => {
      const invitationsRef = collections.firestore.collection('invitations')
      const snapshot = await invitationsRef.get()
      
      if (snapshot.empty) {
        return { message: 'No invitation documents found' }
      }
      
      // Delete all invitation documents
      for (const doc of snapshot.docs) {
        await collections.firestore.recursiveDelete(doc.ref, writer)
      }
      
      return { message: `Successfully deleted ${snapshot.size} invitation documents` }
    })
  } catch (error) {
    throw new https.HttpsError('permission-denied', 'Only admins can run this function')
  }
})

export {
  beforeUserCreatedFunction as beforeUserCreated,
  beforeUserSignedInFunction as beforeUserSignedIn,
} from './functions/blocking.js'
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
