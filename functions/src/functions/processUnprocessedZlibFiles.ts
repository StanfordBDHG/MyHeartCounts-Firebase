//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { logger } from 'firebase-functions'
import { onRequest } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { processZlibFile, shouldProcessFile } from './onBulkHealthKitUnpack.js'
import { getServiceFactory } from '../services/factory/getServiceFactory.js'

// Get process ID for consistent log tagging
const PID = process.pid

// Custom logging functions with process ID included
const logDebug = (message: string) => logger.debug(`[pid:${PID}] ${message}`)
const logInfo = (message: string) => logger.info(`[pid:${PID}] ${message}`)
const logWarn = (message: string) => logger.warn(`[pid:${PID}] ${message}`)
const logError = (message: string) => logger.error(`[pid:${PID}] ${message}`)

// Track execution time and check for approaching deadlines
const EXECUTION_START_TIME = Date.now()
const DEADLINE_BUFFER_MS = 2 * 60 * 1000 // 2 minutes safety buffer

/**
 * Check if we're approaching the function timeout
 * @param timeoutSeconds Maximum execution time in seconds
 * @returns Boolean indicating if we're approaching the deadline
 */
function isApproachingDeadline(timeoutSeconds = 1740): boolean {
  // Default to 29 minutes (30 minutes - 1 minute buffer)
  const maxExecutionTimeMs = timeoutSeconds * 1000
  const elapsedTimeMs = Date.now() - EXECUTION_START_TIME

  // Return true if we've used more than timeoutSeconds - buffer
  return elapsedTimeMs > maxExecutionTimeMs - DEADLINE_BUFFER_MS
}

/**
 * Checks if a file was processed within the last 10 minutes
 * @param metadata File metadata object
 * @returns Boolean indicating if the file was recently processed
 */
function wasRecentlyProcessed(
  metadata: Record<string, string> | undefined,
): boolean {
  if (!metadata?.lastProcessed) {
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
async function processUnprocessedFilesForUser(
  userId: string,
  storage: any,
): Promise<number> {
  try {
    const bucket = storage.bucket()
    // We need the array of file paths, not the file objects themselves
    const zlibFilePaths: string[] = []

    // Try standard path format first
    try {
      const [files] = await bucket.getFiles({
        prefix: `users/${userId}/bulkHealthKitUploads/`,
      })

      // Filter to only .zlib files (case insensitive)
      files.forEach((file: any) => {
        if (
          file.name.endsWith('.zlib') ||
          file.name.toLowerCase().endsWith('.zlib')
        ) {
          zlibFilePaths.push(file.name)
        }
      })

      logDebug(
        `Found ${zlibFilePaths.length} zlib files in standard path for user ${userId}`,
      )
    } catch (error) {
      logWarn(
        `Error getting files from standard path for user ${userId}: ${String(error)}`,
      )
    }

    // If no files found, try alternative storage URL format
    if (zlibFilePaths.length === 0) {
      try {
        const altPrefix = `myheart-counts-development.firebasestorage.app/users/${userId}/bulkHealthKitUploads/`
        const [altFiles] = await bucket.getFiles({
          prefix: altPrefix,
        })

        // Filter to only .zlib files (case insensitive)
        altFiles.forEach((file: any) => {
          if (
            file.name.endsWith('.zlib') ||
            file.name.toLowerCase().endsWith('.zlib')
          ) {
            zlibFilePaths.push(file.name)
          }
        })

        logDebug(
          `Found ${zlibFilePaths.length} zlib files in alternative path for user ${userId}`,
        )
      } catch (error) {
        logWarn(
          `Error getting files from alternative path for user ${userId}: ${String(error)}`,
        )
      }
    }

    if (zlibFilePaths.length === 0) {
      return 0
    }

    logInfo(`Found ${zlibFilePaths.length} .zlib files for user ${userId}`)

    let processedCount = 0

    // Process each file if needed
    for (const filePath of zlibFilePaths) {
      // Check if we're approaching the deadline before processing each file
      if (isApproachingDeadline()) {
        logWarn(
          `Approaching execution deadline, stopping processing for user ${userId} after ${processedCount} files`,
        )
        break
      }

      // Only process files in the correct directory
      if (!shouldProcessFile(filePath)) {
        logDebug(`Skipping ${filePath} - doesn't match expected pattern`)
        continue
      }

      try {
        // Get the file object to access its methods
        const file = bucket.file(filePath)

        // Get file metadata
        const [metadata] = await file.getMetadata()
        const customMetadata = metadata?.metadata

        // If no metadata exists, add lastProcessed timestamp and skip
        if (!customMetadata || Object.keys(customMetadata).length === 0) {
          logDebug(`Adding initial metadata to ${filePath}`)
          await file.setMetadata({
            metadata: {
              lastProcessed: String(Date.now()),
            },
          })
          continue
        }

        // Check if file was processed in the last 10 minutes
        if (wasRecentlyProcessed(customMetadata)) {
          logDebug(`Skipping ${filePath} - processed in the last 10 minutes`)
          continue
        }

        // Process the file
        logInfo(`Processing file for user ${userId}: ${filePath}`)
        await processZlibFile(userId, filePath, storage)
        processedCount++

        // Update metadata after successful processing
        await file.setMetadata({
          metadata: {
            lastProcessed: String(Date.now()),
            processedBy: `scheduled-function-${PID}`,
          },
        })
      } catch (error) {
        logError(`Error processing file ${filePath}: ${String(error)}`)

        // Update metadata even on error to prevent continuous retries of problematic files
        try {
          const errorFile = bucket.file(filePath)
          await errorFile.setMetadata({
            metadata: {
              lastProcessed: String(Date.now()),
              processingError: String(error).substring(0, 1000), // Truncate long error messages
              processedBy: `scheduled-function-${PID}`,
            },
          })
        } catch (metadataError) {
          logError(`Failed to update error metadata: ${String(metadataError)}`)
        }
      }
    }

    logInfo(`Processed ${processedCount} files for user ${userId}`)
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

    // Get all files in users directory without delimiter to get all nested files
    const [files] = await bucket.getFiles({
      prefix: 'users/',
    })

    // Process all files to find those in bulkHealthKitUploads ending with .zlib
    for (const file of files) {
      if (
        file.name.includes('/bulkHealthKitUploads/') &&
        (file.name.endsWith('.zlib') ||
          file.name.toLowerCase().endsWith('.zlib'))
      ) {
        // Extract user ID from path (users/{userId}/...)
        const match = file.name.match(/^users\/([^/]+)\//)
        if (match?.[1]) {
          userIds.add(match[1])
          logDebug(`Found zlib file for user ${match[1]}: ${file.name}`)
        }
      }
    }

    // If no files found, try with alternate URL format for development environment
    if (userIds.size === 0) {
      // Check for Firebase Storage URLs instead of direct path references
      const altPrefix = 'myheart-counts-development.firebasestorage.app/users/'
      const [altFiles] = await bucket.getFiles({
        prefix: altPrefix,
      })

      for (const file of altFiles) {
        if (
          file.name.includes('/bulkHealthKitUploads/') &&
          (file.name.endsWith('.zlib') ||
            file.name.toLowerCase().endsWith('.zlib'))
        ) {
          // Extract user ID from storage URL format
          const match = file.name.match(/users\/([^/]+)\//)
          if (match?.[1]) {
            userIds.add(match[1])
            logDebug(
              `Found zlib file with storage URL for user ${match[1]}: ${file.name}`,
            )
          }
        }
      }
    }

    logInfo(`Found ${userIds.size} users with zlib files`)
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

    // Convert Set to Array for compatibility with ES5 target
    const userIds = Array.from(users)

    // Shuffle the user IDs for fairness across multiple executions
    for (let i = userIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[userIds[i], userIds[j]] = [userIds[j], userIds[i]]
    }

    // Process all users concurrently, but each user's files are still processed sequentially
    // Use a deadline-aware approach to avoid DEADLINE_EXCEEDED errors
    let processedUsers = 0
    let skippedUsers = 0
    const results: number[] = []

    // Optional: set a limit to the number of users processed in one execution
    const MAX_USERS_PER_EXECUTION = 10
    const usersToProcess = userIds.slice(0, MAX_USERS_PER_EXECUTION)

    if (userIds.length > MAX_USERS_PER_EXECUTION) {
      logInfo(
        `Limiting processing to first ${MAX_USERS_PER_EXECUTION} of ${userIds.length} users`,
      )
    }

    // Process users in batches to better monitor timeout
    const userBatchSize = 3 // Process 3 users at a time
    for (let i = 0; i < usersToProcess.length; i += userBatchSize) {
      // Check if we're approaching the deadline
      if (isApproachingDeadline()) {
        logWarn(
          `Approaching execution deadline, processed ${processedUsers} users, skipping ${userIds.length - i} remaining users`,
        )
        skippedUsers = userIds.length - i
        break
      }

      const userBatch = usersToProcess.slice(i, i + userBatchSize)
      const batchResults = await Promise.all(
        userBatch.map(async (userId) => {
          logInfo(`Processing files for user ${userId}`)
          const processed = await processUnprocessedFilesForUser(
            userId,
            storage,
          )
          logInfo(`Completed processing ${processed} files for user ${userId}`)
          return processed
        }),
      )

      results.push(...batchResults)
      processedUsers += userBatch.length

      logInfo(
        `Completed batch of ${userBatch.length} users (${processedUsers}/${usersToProcess.length})`,
      )
    }

    // Sum up the total processed files
    const totalProcessed = results.reduce(
      (total, current) => total + current,
      0,
    )

    // Calculate execution time
    const executionTimeMs = Date.now() - EXECUTION_START_TIME

    // Create a detailed report
    const completionMessage =
      skippedUsers > 0 ?
        `Partially completed scheduled check - processed ${totalProcessed} files across ${processedUsers} users (${skippedUsers} users skipped due to timeout)`
      : `Completed scheduled check - processed ${totalProcessed} files across ${processedUsers} users`

    logInfo(completionMessage)

    return {
      processed: totalProcessed,
      usersProcessed: processedUsers,
      totalUsers: userIds.length,
      usersSkipped: skippedUsers,
      hitDeadline: skippedUsers > 0,
      executionTimeMs,
      averageTimePerFileMs:
        totalProcessed > 0 ? Math.round(executionTimeMs / totalProcessed) : 0,
    }
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
    try {
      // Call the function but don't return its value - scheduled functions must return void
      const result = await checkUnprocessedZlibFiles()
      logInfo(
        `Function execution complete: processed ${result.processed} files across ${result.usersProcessed ?? 0} users`,
      )
    } catch (error) {
      // Log the error but don't rethrow to prevent function termination
      logError(`Caught error in scheduled function: ${String(error)}`)
    }
    // No return value for scheduled functions
  },
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
        result,
      })
    } catch (error) {
      logError(`Error in HTTP trigger: ${String(error)}`)
      res.status(500).send({ success: false, error: String(error) })
    }
  },
)
