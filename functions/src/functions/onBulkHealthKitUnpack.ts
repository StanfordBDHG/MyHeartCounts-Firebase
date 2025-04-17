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
function extractHealthKitIdentifier(filePath: string): string | null {
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
 * Process a single zlib file from Firebase Storage
 *
 * @param userId The user ID
 * @param filePath The file path
 * @param storage The Firebase Storage instance
 */
async function processZlibFile(
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

    // Download the zlib file
    await file.download({ destination: tempFilePath })

    // Read the downloaded file
    const compressedData = fs.readFileSync(tempFilePath)

    // Extract HealthKit identifier from file name if it matches the HealthKitExports pattern
    const healthKitIdentifier = extractHealthKitIdentifier(filePath)

    // Decompress the data
    let decompressedData: Buffer
    try {
      // Try standard inflate
      decompressedData = zlib.inflateSync(compressedData)
    } catch (inflateError) {
      logger.warn(`Standard inflate failed, trying gunzip`)
      try {
        // If inflate fails, try gunzip
        decompressedData = zlib.gunzipSync(compressedData)
      } catch (gunzipError) {
        logger.warn(`Gunzip also failed, trying deflate`)
        // If both fail, try deflate as a last resort
        decompressedData = zlib.deflateSync(compressedData)
      }
    }

    // Parse the JSON content
    const jsonContent = JSON.parse(decompressedData.toString())
    const keys = Object.keys(jsonContent)
    logger.info(`Processing ${keys.length} items from ${filePath}`)

    // For each decompressed item, write it to the appropriate Firestore collection
    for (const [key, value] of Object.entries(jsonContent)) {
      let collectionName: string
      let documentId: string

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

      // Set collection name based on HealthKit identifier from filename
      if (healthKitIdentifier) {
        collectionName = `HealthKitObservations_${healthKitIdentifier}`

        // Use UUID from JSON if available, otherwise generate a timestamp ID
        if (uuidFromValue) {
          documentId = uuidFromValue
        } else {
          documentId = admin.firestore.Timestamp.now().toMillis().toString()
        }
      } else if (keyParts.length > 1) {
        // Fallback for standard collection/document structure
        collectionName = keyParts[0]
        documentId = fileNameParts[0] // Remove .json extension
      } else {
        // Final fallback
        collectionName = fileNameParts[0]
        documentId =
          uuidFromValue ?? admin.firestore.Timestamp.now().toMillis().toString()
      }

      // Get a reference to the database service through our service factory
      const db = getServiceFactory().databaseService()
      const collections = db.collections

      try {
        // Convert to proper firestore document data
        const documentData = value as Record<string, any>

        // For any collection, we use the raw firestore reference
        // to avoid type issues with the converters
        const collectionRef = db.firestore
          .collection('users')
          .doc(userId)
          .collection(collectionName)

        // Write the document
        await collectionRef.doc(documentId).set(documentData)
      } catch (writeError) {
        logger.error(`Error writing to Firestore: ${String(writeError)}`)
        throw writeError
      }
    }

    // Delete the original compressed file
    await file.delete()

    // Clean up temp file
    fs.unlinkSync(tempFilePath)

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

    // For each user ID
    for (const userId of userIdArray) {
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
          (file.name.includes('.json.zlib') || file.name.endsWith('.zlib.json'))
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

      // Process each zlib file
      const zlibFiles = files.filter((f) => f.name.endsWith('.zlib'))

      if (zlibFiles.length > 0) {
        logger.info(
          `Processing ${zlibFiles.length} .zlib files for user ${userId}`,
        )

        for (const file of zlibFiles) {
          await processZlibFile(userId, file.name, storage)
        }
      }
    }

    logger.info('Successfully processed all zlib files')
  } catch (error) {
    logger.error(`Error processing zlib files: ${String(error)}`)
    throw error
  }
}

/**
 * Process a specific zlib file that was just uploaded
 */
export const onBulkHealthKitUploaded = onObjectFinalized(
  { bucket: 'myheartcounts-firebase.appspot.com' },
  async (event) => {
    const filePath = event.data.name

    // Only process zlib files in bulkHealthKitUploads directories
    if (
      !filePath.includes('/bulkHealthKitUploads/') ||
      !filePath.endsWith('.zlib')
    ) {
      return
    }

    // Extract userId from path (users/{userId}/bulkHealthKitUploads/file.zlib)
    const match = filePath.match(/^users\/([^/]+)\/bulkHealthKitUploads\//)
    if (!match) {
      logger.error(`Invalid file path: ${filePath}`)
      return
    }

    const userId = match[1]
    const storage = getServiceFactory().storage()

    // Process the zlib file
    await processZlibFile(userId, filePath, storage)
  },
)

/**
 * Scheduled function that runs hourly to process any zlib files
 */
export const onScheduleHourlyZlibProcessor = onSchedule(
  {
    schedule: 'every 60 minutes',
  },
  async () => {
    await processAllZlibFiles()
  },
)

/**
 * HTTP endpoint to manually trigger the bulk health kit processing
 */
export const processBulkHealthKit = onRequest(
  { cors: true },
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
