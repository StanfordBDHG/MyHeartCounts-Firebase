#!/usr/bin/env node
/** 
 This source file is part of the Stanford Biodesign Digital Health MyHeart Counts open-source project

 SPDX-FileCopyrightText: 2025 Stanford University

 SPDX-License-Identifier: MIT
*/

/**
 * Standalone script to migrate dateOfEnrollment and lastActiveDate fields 
 * from strings to Firestore Timestamps.
 * 
 * Usage:
 * node scripts/migrate-dates.js
 * 
 * Environment variables:
 * - GOOGLE_APPLICATION_CREDENTIALS: Path to service account key
 * - FIRESTORE_EMULATOR_HOST: Use emulator (optional)
 */

const admin = require('firebase-admin')

// Initialize Firebase Admin
if (!admin.apps.length) {
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    console.log('Using Firestore emulator')
    admin.initializeApp({
      projectId: 'demo-project'
    })
  } else {
    admin.initializeApp()
  }
}

const db = admin.firestore()

async function migrateDates() {
  console.log('Starting migration of date fields to Timestamps...')
  
  try {
    const usersRef = db.collection('users')
    const snapshot = await usersRef.get()
    
    let totalUsers = 0
    let migratedEnrollment = 0
    let migratedLastActive = 0
    let skipped = 0
    let errors = 0
    
    console.log(`Found ${snapshot.docs.length} user documents`)
    
    // Process in batches to avoid memory issues
    const batchSize = 500
    const batches = []
    
    for (let i = 0; i < snapshot.docs.length; i += batchSize) {
      const batch = snapshot.docs.slice(i, i + batchSize)
      batches.push(batch)
    }
    
    for (const [batchIndex, batch] of batches.entries()) {
      console.log(`Processing batch ${batchIndex + 1}/${batches.length}`)
      
      const writeBatch = db.batch()
      let batchUpdates = 0
      
      for (const doc of batch) {
        totalUsers++
        const data = doc.data()
        const updates = {}
        
        // Migrate dateOfEnrollment
        if (data.dateOfEnrollment && typeof data.dateOfEnrollment === 'string') {
          try {
            const date = new Date(data.dateOfEnrollment)
            if (!isNaN(date.getTime())) {
              updates.dateOfEnrollment = admin.firestore.Timestamp.fromDate(date)
              migratedEnrollment++
            } else {
              console.warn(`Invalid dateOfEnrollment for user ${doc.id}: ${data.dateOfEnrollment}`)
              errors++
            }
          } catch (error) {
            console.error(`Error processing dateOfEnrollment for user ${doc.id}:`, error.message)
            errors++
          }
        }
        
        // Migrate lastActiveDate
        if (data.lastActiveDate && typeof data.lastActiveDate === 'string') {
          try {
            const date = new Date(data.lastActiveDate)
            if (!isNaN(date.getTime())) {
              updates.lastActiveDate = admin.firestore.Timestamp.fromDate(date)
              migratedLastActive++
            } else {
              console.warn(`Invalid lastActiveDate for user ${doc.id}: ${data.lastActiveDate}`)
              errors++
            }
          } catch (error) {
            console.error(`Error processing lastActiveDate for user ${doc.id}:`, error.message)
            errors++
          }
        }
        
        if (Object.keys(updates).length > 0) {
          writeBatch.update(doc.ref, updates)
          batchUpdates++
        } else {
          skipped++
        }
      }
      
      if (batchUpdates > 0) {
        await writeBatch.commit()
        console.log(`Committed batch ${batchIndex + 1} with ${batchUpdates} updates`)
      }
    }
    
    console.log('\nMigration completed!')
    console.log(`Total users processed: ${totalUsers}`)
    console.log(`dateOfEnrollment fields migrated: ${migratedEnrollment}`)
    console.log(`lastActiveDate fields migrated: ${migratedLastActive}`)
    console.log(`Users skipped (no string dates): ${skipped}`)
    console.log(`Errors encountered: ${errors}`)
    
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

// Run the migration
migrateDates()
  .then(() => {
    console.log('Migration script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Migration script failed:', error)
    process.exit(1)
  })