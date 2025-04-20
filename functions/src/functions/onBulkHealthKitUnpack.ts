//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { promisify } from 'util'
import * as zlib from 'zlib'
import admin from 'firebase-admin'
import type * as adminTypes from 'firebase-admin'
import { logger } from 'firebase-functions'
import { onRequest } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onObjectFinalized } from 'firebase-functions/v2/storage'
import { getServiceFactory } from '../services/factory/getServiceFactory.js'

/**
 * Extracts the HealthKit identifier from a filename
 *
 * @param filePath The file path to extract from
 * @returns The HealthKit identifier or null if not found
 */
export function extractHealthKitIdentifier(filePath: string): string | null {
  // Extract the filename from the path
  const filename = path.basename(filePath)

  // Check if the filename matches the HealthKitExports pattern
  const match = filename.match(/^HealthKitExports_(.+)\.json\.zlib$/)
  if (match?.[1]) {
    return match[1]
  }

  return null
}

/**
 * Decompress data using various decompression methods
 *
 * @param compressedData The compressed data buffer
 * @returns The decompressed data buffer
 */
export async function decompressData(compressedData: Buffer): Promise<Buffer> {
  const decompressStartTime = Date.now()
  let decompressedData: Buffer
  try {
    // Try standard inflate with async version for better performance
    decompressedData = await new Promise<Buffer>((resolve, reject) => {
      zlib.inflate(compressedData, (err, result) => {
        if (err) reject(err)
        else resolve(result)
      })
    })
    logger.info(
      `Decompressed with inflate in ${Date.now() - decompressStartTime}ms`,
    )
    return decompressedData
  } catch (inflateError) {
    logger.warn(
      `Standard inflate failed after ${Date.now() - decompressStartTime}ms, trying gunzip`,
    )
    const gunzipStartTime = Date.now()
    try {
      // If inflate fails, try gunzip with async version
      decompressedData = await new Promise<Buffer>((resolve, reject) => {
        zlib.gunzip(compressedData, (err, result) => {
          if (err) reject(err)
          else resolve(result)
        })
      })
      logger.info(
        `Decompressed with gunzip in ${Date.now() - gunzipStartTime}ms`,
      )
      return decompressedData
    } catch (gunzipError) {
      logger.warn(
        `Gunzip also failed after ${Date.now() - gunzipStartTime}ms, trying inflateRaw`,
      )
      const inflateRawStartTime = Date.now()
      // If both fail, try inflateRaw as a last resort with async version
      decompressedData = await new Promise<Buffer>((resolve, reject) => {
        zlib.inflateRaw(compressedData, (err, result) => {
          if (err) reject(err)
          else resolve(result)
        })
      })
      logger.info(
        `Decompressed with inflateRaw in ${Date.now() - inflateRawStartTime}ms`,
      )
      return decompressedData
    }
  }
}

/**
 * Parse document information from a key-value pair
 *
 * @param key The key from the JSON content
 * @param value The value from the JSON content
 * @param healthKitIdentifier Optional healthkit identifier
 * @returns Collection name and document ID
 */
export function parseDocumentInfo(
  key: string,
  value: any,
  healthKitIdentifier: string | null,
): { collectionName: string; documentId: string } {
  // Try to extract UUID from the value data if it's an object to use as document ID
  const documentData = value as Record<string, any>
  let uuidFromValue: string | null = null

  // Check if the value has an identifier field with UUID
  if (
    Array.isArray(documentData?.identifier) &&
    documentData?.identifier?.[0]?.id
  ) {
    uuidFromValue = documentData.identifier[0].id
  }

  // Parse the key to get collection name and document ID as fallback
  const keyParts = key.split('/')
  const fileNameParts = keyParts[keyParts.length - 1].split('.')

  let collectionName: string
  let documentId: string

  // Generate a timestamp for IDs if needed
  const timestampId = Date.now().toString()

  // Set collection name based on HealthKit identifier from filename
  if (healthKitIdentifier) {
    collectionName = `HealthKitObservations_${healthKitIdentifier}`

    // Use UUID from JSON if available, otherwise generate a timestamp ID
    if (uuidFromValue) {
      documentId = uuidFromValue
    } else {
      documentId = timestampId
    }
  } else if (keyParts.length > 1) {
    // Fallback for standard collection/document structure
    collectionName = keyParts[0]
    documentId = fileNameParts[0] // Remove .json extension
  } else {
    // Final fallback
    collectionName = fileNameParts[0]
    documentId = uuidFromValue ?? timestampId
  }

  return { collectionName, documentId }
}

/**
 * Process a single zlib file from Firebase Storage
 *
 * @param userId The user ID
 * @param filePath The file path
 * @param storage The Firebase Storage instance
 */
export async function processZlibFile(
  userId: string,
  filePath: string,
  storage: adminTypes.storage.Storage,
) {
  try {
    logger.info(`Processing zlib file for user ${userId}: ${filePath}`)
    const bucket = storage.bucket()
    const file = bucket.file(filePath)

    // Check if file exists
    const [exists] = await file.exists()
    if (!exists) {
      logger.info(`File ${filePath} does not exist, skipping`)
      return
    }
    // Create a temp file path for download
    const tempFilePath = path.join(os.tmpdir(), path.basename(filePath))

    // Track file download time
    const downloadStartTime = Date.now()

    // Download the zlib file directly to memory for better performance
    const [fileBuffer] = await file.download()
    const compressedData = fileBuffer

    logger.info(
      `Downloaded file (${compressedData.length} bytes) in ${Date.now() - downloadStartTime}ms`,
    )

    // Write to temp file as backup (useful if processing very large files)
    const writeStartTime = Date.now()
    await fs.promises.writeFile(tempFilePath, compressedData)
    logger.info(`Wrote backup file in ${Date.now() - writeStartTime}ms`)

    // Extract HealthKit identifier from file name if it matches the HealthKitExports pattern
    const healthKitIdentifier = extractHealthKitIdentifier(filePath)

    // Decompress the data using async methods for better performance
    const decompressedData = await decompressData(compressedData)

    // Parse the JSON content
    const parseStartTime = Date.now()
    const jsonContent = JSON.parse(decompressedData.toString())
    const keys = Object.keys(jsonContent)
    logger.info(
      `Parsed JSON content (${decompressedData.length} bytes, ${keys.length} items) in ${Date.now() - parseStartTime}ms`,
    )
    logger.info(`Processing ${keys.length} items from ${filePath}`)

    // Configuration for chunking
    const maxChunksPerRun = 10
    const chunkSize = 2000 // Chunk size for documents

    // Create a unique execution ID to track this run
    const executionId = `exec_${Date.now()}_${Math.floor(Math.random() * 1000)}`

    // Check if we have a progress marker file from a previous run
    let startChunkIndex = 0
    try {
      const progressFilePath = `${filePath}.progress.json`
      const progressFile = bucket.file(progressFilePath)
      const [progressExists] = await progressFile.exists()

      if (progressExists) {
        const [progressBuffer] = await progressFile.download()
        const progressData = JSON.parse(progressBuffer.toString())

        if (
          progressData?.processedChunks &&
          typeof progressData.processedChunks === 'number'
        ) {
          startChunkIndex = Number(progressData.processedChunks)
          logger.info(
            `Found progress marker: already processed ${startChunkIndex} chunks of data in previous runs`,
          )
        }
      }
    } catch (progressError) {
      // If we can't read the progress file, start from the beginning
      logger.warn(
        `Could not read progress file (will start from beginning): ${String(progressError)}`,
      )
    }

    // Get a reference to the database service through our service factory
    const db = getServiceFactory().databaseService()
    const collections = db.collections

    // Initialize BulkWriter with more conservative settings to avoid timeouts
    const bulkWriter = db.firestore.bulkWriter({
      throttling: {
        maxOpsPerSecond: 200, // More conservative rate to avoid hitting limits
      },
    })

    // Add error handling for the bulk writer
    bulkWriter.onWriteError((error) => {
      if (error.failedAttempts < 5) {
        logger.warn(
          `Retrying write to ${error.documentRef.path}, attempt ${error.failedAttempts}`,
        )
        return true // Retry the write
      } else {
        logger.error(
          `Failed to write to ${error.documentRef.path} after ${error.failedAttempts} attempts`,
        )
        return false // Don't retry anymore
      }
    })

    const documentRefs: Array<{
      ref: adminTypes.firestore.DocumentReference
      data: Record<string, any>
    }> = []

    // For each decompressed item, prepare it for the appropriate Firestore collection
    for (const [key, value] of Object.entries(jsonContent)) {
      try {
        // Parse document info
        const { collectionName, documentId } = parseDocumentInfo(
          key,
          value,
          healthKitIdentifier,
        )

        // For any collection, we use the raw firestore reference
        // to avoid type issues with the converters
        const collectionRef = db.firestore
          .collection('users')
          .doc(userId)
          .collection(collectionName)

        // Store document reference and data for bulk writing
        documentRefs.push({
          ref: collectionRef.doc(documentId),
          data: value as Record<string, any>,
        })
      } catch (writeError) {
        logger.error(`Error writing to Firestore: ${String(writeError)}`)
        throw writeError
      }
    }

    // Execute all writes using BulkWriter with chunking for better performance
    if (documentRefs.length > 0) {
      logger.info(`Bulk writing ${documentRefs.length} documents to Firestore`)

      // Using the chunk size defined earlier in the function

      // Add performance tracking
      const startTime = Date.now()

      // Log the start of execution using the ID defined earlier
      logger.info(
        `Starting execution ${executionId} for ${documentRefs.length} documents`,
      )

      // Skip already processed chunks based on progress marker
      let skipCount = 0
      if (startChunkIndex > 0) {
        skipCount = startChunkIndex * chunkSize
        logger.info(
          `Skipping ${skipCount} already processed documents (${startChunkIndex} chunks)`,
        )
      }

      // Process in chunks to reduce memory usage and improve performance
      // Start from the chunk index indicated by our progress marker
      for (
        let i = startChunkIndex * chunkSize;
        i < documentRefs.length;
        i += chunkSize
      ) {
        const chunkStartTime = Date.now()
        const chunk = documentRefs.slice(i, i + chunkSize)
        const chunkNumber = Math.floor(i / chunkSize) + 1
        const totalChunks = Math.ceil(documentRefs.length / chunkSize)

        logger.info(
          `[${executionId}] Writing chunk ${chunkNumber}/${totalChunks} (${chunk.length} docs)`,
        )

        // We'll use the maxChunksPerRun defined at the end of the function
        const processedChunksThisRun = chunkNumber - startChunkIndex

        if (processedChunksThisRun >= maxChunksPerRun) {
          logger.info(
            `[${executionId}] Reached maximum chunks per run (${maxChunksPerRun}). Processed chunks ${Number(startChunkIndex) + 1}-${chunkNumber} of ${totalChunks}. Remaining chunks will need a separate execution.`,
          )
          break
        }

        // Set each document with the bulkWriter
        const queueStartTime = Date.now()
        for (const doc of chunk) {
          // Use void to explicitly mark as ignored since we're handling errors with onWriteError
          void bulkWriter.set(doc.ref, doc.data)
        }
        logger.info(
          `[${executionId}] Queued ${chunk.length} documents in ${Date.now() - queueStartTime}ms`,
        )

        // Insert a slightly longer delay between chunks to avoid rate limits
        if (
          i + chunkSize < documentRefs.length &&
          chunkNumber < maxChunksPerRun
        ) {
          const delayTime = 50 // Slightly longer delay
          logger.info(
            `[${executionId}] Delaying ${delayTime}ms before next chunk`,
          )
          await new Promise((resolve) => setTimeout(resolve, delayTime))
        }

        logger.info(
          `[${executionId}] Finished processing chunk ${chunkNumber} in ${Date.now() - chunkStartTime}ms`,
        )
      }

      // Wait for all writes to complete with timing
      const commitStartTime = Date.now()
      logger.info(
        `[${executionId}] Starting bulkWriter.close() at ${new Date().toISOString()}`,
      )

      try {
        // Set a longer timeout for large uploads to complete
        const timeoutPromise = new Promise((_, reject) => {
          const timeoutMs = 300000 // 5 minutes timeout
          setTimeout(
            () =>
              reject(
                new Error(
                  `[${executionId}] BulkWriter close timed out after ${timeoutMs}ms`,
                ),
              ),
            timeoutMs,
          )
        })

        // Race the bulkWriter close with the timeout
        await Promise.race([bulkWriter.close(), timeoutPromise])

        logger.info(
          `[${executionId}] BulkWriter.close() completed in ${Date.now() - commitStartTime}ms`,
        )

        // Log overall performance
        logger.info(
          `[${executionId}] Total bulk write operation took ${Date.now() - startTime}ms`,
        )
        logger.info(
          `[${executionId}] Successfully processed batch of documents`,
        )
      } catch (closeError) {
        logger.error(
          `[${executionId}] Error during bulkWriter.close(): ${String(closeError)}`,
        )
        // Continue with cleanup even if bulkWriter.close() fails
      }
    }

    // Only delete the original file if we've processed all chunks
    const totalChunks = Math.ceil(documentRefs.length / chunkSize)
    const allChunksProcessed = totalChunks <= maxChunksPerRun

    if (allChunksProcessed) {
      // Delete the original compressed file with error handling
      try {
        await file.delete()
        logger.info(
          `Deleted original file from storage: ${filePath} (all data processed)`,
        )
      } catch (deleteError) {
        // Log but continue execution
        logger.warn(
          `Error deleting original file ${filePath}: ${String(deleteError)}`,
        )
      }
    } else {
      // Create a progress marker file to indicate processing progress
      try {
        // Remove this line since we're now using startChunkIndex to track progress
        const nextChunkToProcess = Math.min(
          Number(startChunkIndex) + maxChunksPerRun,
          totalChunks,
        )
        const progressMarker = {
          totalDocuments: documentRefs.length,
          processedChunks: nextChunkToProcess,
          totalChunks: totalChunks,
          lastProcessed: Date.now(),
          executionId: executionId,
        }

        // Store progress marker alongside the original file
        const progressFilePath = `${filePath}.progress.json`
        const progressFile = bucket.file(progressFilePath)
        await progressFile.save(JSON.stringify(progressMarker), {
          contentType: 'application/json',
        })

        const documentsProcessed = progressMarker.processedChunks * chunkSize
        const documentsRemaining = documentRefs.length - documentsProcessed

        logger.info(
          `Saved progress marker for ${filePath}: processed ${progressMarker.processedChunks}/${progressMarker.totalChunks} chunks (${documentsProcessed}/${documentRefs.length} documents)`,
        )
        logger.info(
          `File will be processed further in future runs (${documentsRemaining} documents remaining)`,
        )
      } catch (progressError) {
        logger.error(`Failed to save progress marker: ${String(progressError)}`)
      }
    }

    // Clean up temp file with error handling
    try {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath)
        logger.info(`Cleaned up temporary file ${tempFilePath}`)
      } else {
        logger.warn(
          `Temporary file ${tempFilePath} doesn't exist, skipping cleanup`,
        )
      }
    } catch (cleanupError) {
      // Just log cleanup errors but don't halt execution
      logger.warn(`Error cleaning up temp file: ${String(cleanupError)}`)
    }

    logger.info(`Successfully processed ${keys.length} items from ${filePath}`)
  } catch (error) {
    logger.error(`Error processing zlib file ${filePath}: ${String(error)}`)
    logger.error(`Stack trace: ${(error as Error).stack ?? 'No stack trace'}`)
    throw error
  }
}

/**
 * Process all zlib files for all users
 */
async function processAllZlibFiles() {
  try {
    const storage = getServiceFactory().storage()
    const bucket = storage.bucket()

    // Get all files to extract user IDs
    const [allUserFiles] = await bucket.getFiles({
      prefix: 'users/',
    })

    // Extract unique user IDs from file paths
    const userIds = new Set<string>()

    for (const file of allUserFiles) {
      // Extract userId from path (users/{userId}/...)
      const match = file.name.match(/^users\/([^/]+)\//)
      if (match?.[1]) {
        userIds.add(match[1])
      }
    }

    const userIdArray = Array.from(userIds)
    const totalUsers = userIdArray.length
    logger.info(`Found ${totalUsers} users with files to process`)

    // Process users in parallel with a concurrency limit
    const userConcurrencyLimit = 3 // Adjust based on your environment

    // Process users in batches
    for (let i = 0; i < userIdArray.length; i += userConcurrencyLimit) {
      const userBatch = userIdArray.slice(i, i + userConcurrencyLimit)
      logger.info(
        `Processing batch of ${userBatch.length} users (${i + 1}-${Math.min(i + userConcurrencyLimit, userIdArray.length)} of ${userIdArray.length})`,
      )

      // Process this batch of users in parallel
      await Promise.all(
        userBatch.map(async (userId) => {
          // Get all zlib files in the bulkHealthKitUploads directory
          const [files] = await bucket.getFiles({
            prefix: `users/${userId}/bulkHealthKitUploads/`,
          })

          // Check for files that might be zlib but don't have the correct extension
          for (const file of files) {
            const isZlib = file.name.endsWith('.zlib')

            // Check for files that might be zlib but don't have the extension
            if (
              !isZlib &&
              (file.name.includes('.json.zlib') ||
                file.name.endsWith('.zlib.json'))
            ) {
              logger.warn(
                `${file.name} appears to be a zlib file with incorrect extension`,
              )

              // Try to process it anyway - just strip the .json if present
              const correctedPath = file.name
                .replace('.json.zlib', '.zlib')
                .replace('.zlib.json', '.zlib')

              try {
                // Copy to a path with correct extension so our filter will catch it
                await bucket.file(file.name).copy(bucket.file(correctedPath))
                logger.info(`Copied to ${correctedPath} for processing`)
              } catch (copyErr) {
                logger.error(`Failed to copy file: ${String(copyErr)}`)
              }
            }
          }

          // Process each zlib file in parallel
          const zlibFiles = files.filter((f) => f.name.endsWith('.zlib'))

          if (zlibFiles.length > 0) {
            logger.info(
              `Processing ${zlibFiles.length} .zlib files for user ${userId}`,
            )

            // Process files in parallel with a concurrency limit
            const concurrencyLimit = 5 // Adjust based on your environment

            // Process files in batches
            for (let j = 0; j < zlibFiles.length; j += concurrencyLimit) {
              const batch = zlibFiles.slice(j, j + concurrencyLimit)

              // Process this batch in parallel
              await Promise.all(
                batch.map((file) =>
                  processZlibFile(userId, file.name, storage),
                ),
              )

              logger.info(
                `Completed batch ${j / concurrencyLimit + 1} of ${Math.ceil(zlibFiles.length / concurrencyLimit)}`,
              )
            }
          }
        }),
      )
    }

    logger.info('Successfully processed all zlib files')
  } catch (error) {
    logger.error(`Error processing zlib files: ${String(error)}`)
    throw error
  }
}

/**
 * Storage trigger that processes .zlib files as soon as they are uploaded
 */
export const onZlibFileUploaded = onObjectFinalized(
  {
    // Use a more generic bucket option to avoid initialization errors during testing
    bucket: undefined, // This will match any bucket in the project
    timeoutSeconds: 300, // Extend timeout to 5 minutes
    region: 'us-central1',
    memory: '1GiB',
  },
  async (event) => {
    try {
      // Extract file information from the event
      const filePath = event.data.name
      logger.info(`File uploaded: ${filePath}`)

      // Only process .zlib files in the bulkHealthKitUploads directory
      if (
        !filePath.endsWith('.zlib') ||
        !filePath.includes('/bulkHealthKitUploads/')
      ) {
        logger.info(
          `Skipping file: ${filePath} - Not a .zlib file or not in bulkHealthKitUploads directory`,
        )
        return
      }

      // Extract user ID from the file path (users/{userId}/...)
      const userIdMatch = filePath.match(/^users\/([^/]+)\//)
      if (!userIdMatch?.[1]) {
        logger.error(`Could not extract user ID from file path: ${filePath}`)
        return
      }

      const userId = userIdMatch[1]
      logger.info(`Processing file for user ${userId}: ${filePath}`)

      // Process the specific file
      const storage = getServiceFactory().storage()
      await processZlibFile(userId, filePath, storage)

      logger.info(`Successfully processed file: ${filePath}`)
    } catch (error) {
      logger.error(`Error processing uploaded file: ${String(error)}`)
      logger.error(`Stack trace: ${(error as Error).stack ?? 'No stack trace'}`)
      throw error
    }
  },
)

/**
 * HTTP endpoint to manually trigger the bulk health kit processing
 * This is kept for backward compatibility and administrative purposes
 */
export const processBulkHealthKit = onRequest(
  {
    cors: true,
    timeoutSeconds: 540, // Extend timeout to 9 minutes for HTTP function
  },
  async (req, res) => {
    try {
      // Check if the request includes a specific file path
      const specificPath = req.query.path as string | undefined
      const specificUserId = req.query.userId as string | undefined

      if (specificPath && specificUserId) {
        // Process the specific file
        const storage = getServiceFactory().storage()
        await processZlibFile(specificUserId, specificPath, storage)

        res.status(200).send({
          success: true,
          message: `Processed file ${specificPath} for user ${specificUserId}`,
        })
      } else {
        // Process all files
        await processAllZlibFiles()
        res.status(200).send({
          success: true,
          message: 'Processed all zlib files successfully',
        })
      }
    } catch (error) {
      logger.error(`Error in HTTP trigger: ${String(error)}`)
      res.status(500).send({ success: false, error: String(error) })
    }
  },
)
