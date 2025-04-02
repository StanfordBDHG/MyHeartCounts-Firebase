//
// This source file is part of the MyHeartCounts project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { validatedOnCall } from '../extensions/string.js'
import { getServiceFactory } from '../services/factory/getServiceFactory.js'
import { logger } from 'firebase-functions/v2'
import { z } from 'zod'
import { isToday, isSameDay, startOfDay, parseISO } from 'date-fns'

/**
 * Input parameters for the aggregateStepCount function.
 */
const aggregateStepCountInputSchema = z.object({
  date: z.string().optional(), // Optional date in ISO format (YYYY-MM-DD)
})

type AggregateStepCountInput = z.infer<typeof aggregateStepCountInputSchema>

/**
 * Aggregates all step count observations ("Number of steps in unspecified time Pedometer") 
 * from all users for a specific day.
 * If no date is provided, defaults to today.
 * 
 * @param request - The function request containing optional date parameter
 * @returns The total number of steps aggregated across all users
 */
export const aggregateStepCount = validatedOnCall(
  'aggregateStepCount',
  aggregateStepCountInputSchema,
  async (request): Promise<number> => {
    const { date: dateString } = request.data
    
    // Parse the date or use today
    const targetDate = dateString ? 
      startOfDay(new Date(dateString)) : 
      startOfDay(new Date())
    
    const factory = getServiceFactory()
    const userService = factory.user()
    const databaseService = factory.databaseService
    
    logger.info(`Aggregating step counts for date: ${targetDate.toISOString().split('T')[0]}`)
    
    // Get all users
    const allUsers = await userService.getAllPatients()
    
    let totalSteps = 0
    
    // Process each user
    for (const user of allUsers) {
      const userId = user.id
      
      try {
        // Access the user's HealthKit observations
        const healthKitRef = databaseService.firestore.collection('users')
          .doc(userId)
          .collection('HealthKitObservations')
        
        // Query for step count observations
        const querySnapshot = await healthKitRef
          .where('code.coding', 'array-contains', {
            code: "41950-7",
            system: "http://loinc.org",
            display: "Number of steps in unspecified time Pedometer"
          })
          .get()
        
        if (querySnapshot.empty) {
          logger.info(`No step count data found for user ${userId}`)
          continue
        }
        
        // Process each step count observation
        for (const doc of querySnapshot.docs) {
          const observation = doc.data()
          
          // Get date from the observation
          let obsDate: Date | null = null
          
          if (observation.effectiveDateTime) {
            obsDate = parseISO(observation.effectiveDateTime)
          } else if (observation.effectivePeriod?.start) {
            obsDate = parseISO(observation.effectivePeriod.start)
          }
          
          if (!obsDate) continue
          
          // Check if observation is from the target date
          if (isSameDay(obsDate, targetDate)) {
            // Extract the step count value
            if (observation.valueQuantity?.value && 
                observation.valueQuantity?.code === "steps") {
              
              // Add steps to total
              totalSteps += Number(observation.valueQuantity.value)
              logger.info(`Added ${observation.valueQuantity.value} steps from user ${userId} (${doc.id})`)
            }
          }
        }
      } catch (error) {
        logger.error(`Error processing steps for user ${userId}: ${error}`)
      }
    }
    
    logger.info(`Total step count for ${targetDate.toISOString().split('T')[0]}: ${totalSteps}`)
    
    return totalSteps
  }
)