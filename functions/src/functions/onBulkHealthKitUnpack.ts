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
import type * as admin from 'firebase-admin'
import { logger } from 'firebase-functions'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onObjectFinalized } from 'firebase-functions/v2/storage'
import { getServiceFactory } from '../services/factory/getServiceFactory.js'

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
  storage: admin.storage.Storage,
) {
  try {
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

    // Decompress the data
    const decompressedData = zlib.inflateSync(compressedData)

    // Parse the JSON content
    const jsonContent = JSON.parse(decompressedData.toString())

    // For each decompressed item, write it to its own file in the user's directory
    for (const [key, value] of Object.entries(jsonContent)) {
      const destinationPath = `users/${userId}/${key}`
      const tempJsonPath = path.join(os.tmpdir(), `${key}.json`)

      // Create a temporary JSON file
      fs.writeFileSync(tempJsonPath, JSON.stringify(value))

      // Upload to Firebase Storage
      await bucket.upload(tempJsonPath, {
        destination: destinationPath,
        contentType: 'application/json',
      })

      // Clean up temp JSON file
      fs.unlinkSync(tempJsonPath)

      logger.info(
        `Successfully decompressed and uploaded ${key} from ${filePath}`,
      )
    }

    // Delete the original compressed file
    await file.delete()
    logger.info(`Deleted original compressed file ${filePath}`)

    // Clean up temp file
    fs.unlinkSync(tempFilePath)
  } catch (error) {
    logger.error(`Error processing zlib file ${filePath}: ${String(error)}`)
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

    // Get all user directories
    const [userDirs] = await bucket.getFiles({
      prefix: 'users/',
      delimiter: '/',
    })

    // For each user directory
    for (const dir of userDirs) {
      // Extract userId from path (users/{userId}/)
      const match = dir.name.match(/^users\/([^/]+)\/$/)
      if (!match) continue

      const userId = match[1]

      // Get all zlib files in the bulkHealthKitUploads directory
      const [files] = await bucket.getFiles({
        prefix: `users/${userId}/bulkHealthKitUploads/`,
        delimiter: '/',
      })

      // Process each zlib file
      for (const file of files.filter((f) => f.name.endsWith('.zlib'))) {
        await processZlibFile(userId, file.name, storage)
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

    // Process the specific file
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
