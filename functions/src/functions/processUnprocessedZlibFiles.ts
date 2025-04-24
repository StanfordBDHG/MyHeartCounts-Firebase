//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { logger } from 'firebase-functions'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onRequest } from 'firebase-functions/v2/https'
import { getServiceFactory } from '../services/factory/getServiceFactory.js'
import { processZlibFile, shouldProcessFile } from './onBulkHealthKitUnpack.js'

// Get process ID for consistent log tagging
const PID = process.pid

// Custom logging functions with process ID included
const logDebug = (message: string) => logger.debug(`[pid:${PID}] ${message}`)
const logInfo = (message: string) => logger.info(`[pid:${PID}] ${message}`)
const logWarn = (message: string) => logger.warn(`[pid:${PID}] ${message}`)
const logError = (message: string) => logger.error(`[pid:${PID}] ${message}`)

/**
 * Checks if a file was processed within the last 10 minutes
 * @param metadata File metadata object
 * @returns Boolean indicating if the file was recently processed
 */
function wasRecentlyProcessed(metadata: Record<string, string> | undefined): boolean {
  if (!metadata || !metadata.lastProcessed) {
    return false
  }

  const lastProcessedTime = parseInt(metadata.lastProcessed, 10)
  if (isNaN(lastProcessedTime)) {
    return false
  }

  const tenMinutesAgo = Date.now() - 10 * 60 * 1000 // 10 minutes in milliseconds
  return lastProcessedTime > tenMinutesAgo
}

/**
 * Process unprocessed zlib files for a specific user
 * @param userId User ID
 * @param storage Firebase Storage instance
 * @returns Number of files processed
 */
async function processUnprocessedFilesForUser(userId: string, storage: any): Promise<number> {
  try {
    const bucket = storage.bucket()
    
    // Get all zlib files in the bulkHealthKitUploads directory
    const [files] = await bucket.getFiles({
      prefix: `users/${userId}/bulkHealthKitUploads/`,
    })
    
    // Filter to only .zlib files
    const zlibFiles = files.filter((file: { name: string }) => file.name.endsWith('.zlib'))
    
    if (zlibFiles.length === 0) {
      return 0
    }
    
    logDebug(`Found ${zlibFiles.length} .zlib files for user ${userId}`)
    
    let processedCount = 0
    
    // Process each file if needed
    for (const file of zlibFiles) {
      // Only process files in the correct directory
      if (!shouldProcessFile(file.name)) {
        continue
      }
      
      try {
        // Get file metadata
        const [metadata] = await file.getMetadata()
        const customMetadata = metadata?.metadata
        
        // If no metadata exists, add lastProcessed timestamp and skip
        if (!customMetadata || Object.keys(customMetadata).length === 0) {
          logDebug(`Adding initial metadata to ${file.name}`)
          await file.setMetadata({
            metadata: {
              lastProcessed: String(Date.now())
            }
          })
          continue
        }
        
        // Check if file was processed in the last 10 minutes
        if (wasRecentlyProcessed(customMetadata)) {
          logDebug(`Skipping ${file.name} - processed in the last 10 minutes`)
          continue
        }
        
        // Process the file
        logInfo(`Processing file for user ${userId}: ${file.name}`)
        await processZlibFile(userId, file.name, storage)
        processedCount++
        
      } catch (error) {
        logError(`Error processing file ${file.name}: ${String(error)}`)
      }
    }
    
    return processedCount
    
  } catch (error) {
    logError(`Error processing files for user ${userId}: ${String(error)}`)
    return 0
  }
}

/**
 * Find all users with .zlib files in their bulkHealthKitUploads directory
 * @param storage Firebase Storage instance
 * @returns Set of user IDs
 */
async function findUsersWithZlibFiles(storage: any): Promise<Set<string>> {
  const userIds = new Set<string>()
  
  try {
    const bucket = storage.bucket()
    
    // Look for all files in users/*/bulkHealthKitUploads/
    const [files] = await bucket.getFiles({
      prefix: 'users/',
      delimiter: '/',
    })
    
    // Extract user IDs from file paths
    for (const file of files) {
      // Check if this is a potential .zlib file in the right location
      if (file.name.includes('/bulkHealthKitUploads/') && file.name.endsWith('.zlib')) {
        const match = file.name.match(/^users\/([^/]+)\//)
        if (match && match[1]) {
          userIds.add(match[1])
        }
      }
    }
    
  } catch (error) {
    logError(`Error finding users with zlib files: ${String(error)}`)
  }
  
  return userIds
}

/**
 * Main function to check for and process unprocessed zlib files
 */
export async function checkUnprocessedZlibFiles() {
  try {
    logInfo('Starting scheduled check for unprocessed zlib files')
    
    const storage = getServiceFactory().storage()
    const users = await findUsersWithZlibFiles(storage)
    
    if (users.size === 0) {
      logInfo('No users with zlib files found')
      return { processed: 0 }
    }
    
    logInfo(`Found ${users.size} users with potential zlib files`)
    
    let totalProcessed = 0
    
    // Process each user's files in series to avoid overwhelming the system
    // Convert Set to Array for compatibility with ES5 target
    const userIds = Array.from(users)
    for (const userId of userIds) {
      const userProcessed = await processUnprocessedFilesForUser(userId, storage)
      totalProcessed += userProcessed
    }
    
    logInfo(`Completed scheduled check - processed ${totalProcessed} files`)
    return { processed: totalProcessed }
    
  } catch (error) {
    logError(`Error in scheduled zlib file check: ${String(error)}`)
    throw error
  }
}

/**
 * Scheduled function that runs every hour to check for unprocessed zlib files
 * This function has a 30-minute timeout and checks for .zlib files in user storage
 */
export const processUnprocessedZlibFilesHourly = onSchedule(
  {
    schedule: 'every 60 minutes',
    timeoutSeconds: 1800, // 30 minutes
    memory: '1GiB',
    region: 'us-central1',
  },
  async () => {
    await checkUnprocessedZlibFiles()
  }
)

// For testing in local emulator

export const triggerUnprocessedZlibFilesCheck = onRequest(
  {
    cors: true,
    timeoutSeconds: 1800, // 30 minutes
  },
  async (req, res) => {
    try {
      const result = await checkUnprocessedZlibFiles()
      res.status(200).send({
        success: true,
        message: `Processed ${result.processed} files`,
        result
      })
    } catch (error) {
      logError(`Error in HTTP trigger: ${String(error)}`)
      res.status(500).send({ success: false, error: String(error) })
    }
  }
)