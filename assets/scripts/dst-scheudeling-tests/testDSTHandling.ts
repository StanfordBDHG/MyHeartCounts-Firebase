/** 
 This source file is part of the Stanford Biodesign Digital Health MyHeart Counts open-source project

 SPDX-FileCopyrightText: 2025 Stanford University

 SPDX-License-Identifier: MIT
*/

import { DateTime } from 'luxon'

/**
 * Test script to verify luxon DST handling in nudge scheduling - written by Paul Goldschmidt, Nov 2025.
 * Run with: npx tsx testDSTHandling.ts
 */

console.log('=== DST Transition Test ===\n')

const planningDate = DateTime.fromObject(
  { year: 2024, month: 3, day: 8, hour: 3 },
  { zone: 'America/New_York' }
)

console.log(`Planning Date: ${planningDate.toISO()}`)
console.log(`Planning Date Local: ${planningDate.toLocaleString(DateTime.DATETIME_FULL)}\n`)

const preferredHour = 9
const preferredMinute = 0

console.log('Scheduling 7 notifications for 9:00 AM local time:\n')

for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
  // Taken from the code in planNudges.ts lines 437-442
  const userDateTime = planningDate
    .setZone('America/New_York')
    .plus({ days: dayIndex })
    .set({ hour: preferredHour, minute: preferredMinute, second: 0, millisecond: 0 })

  const utcTime = userDateTime.toUTC()

  console.log(`Day ${dayIndex} (${userDateTime.toFormat('MMM dd')})`)
  console.log(`  Local: ${userDateTime.toLocaleString(DateTime.DATETIME_FULL)}`)
  console.log(`  UTC:   ${utcTime.toISO()}`)
  console.log(`  Offset: UTC${userDateTime.toFormat('ZZ')}`)
  console.log(`  Is DST: ${userDateTime.isInDST}`)
  console.log()
}
const fallPlanningDate = DateTime.fromObject(
  { year: 2024, month: 11, day: 1, hour: 4 },
  { zone: 'America/New_York' }
)

console.log(`Planning Date: ${fallPlanningDate.toISO()}`)
console.log(`Planning Date Local: ${fallPlanningDate.toLocaleString(DateTime.DATETIME_FULL)}\n`)

console.log('Scheduling 7 notifications for 9:00 AM local time:\n')

for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
  const userDateTime = fallPlanningDate
    .setZone('America/New_York')
    .plus({ days: dayIndex })
    .set({ hour: preferredHour, minute: preferredMinute, second: 0, millisecond: 0 })

  const utcTime = userDateTime.toUTC()

  console.log(`Day ${dayIndex} (${userDateTime.toFormat('MMM dd')})`)
  console.log(`  Local: ${userDateTime.toLocaleString(DateTime.DATETIME_FULL)}`)
  console.log(`  UTC:   ${utcTime.toISO()}`)
  console.log(`  Offset: UTC${userDateTime.toFormat('ZZ')}`)
  console.log(`  Is DST: ${userDateTime.isInDST}`)
  console.log()
}

console.log('(2:00-2:59 AM does not exist on March 10th)\n')

// Test the non-existent time (eg2:30 AM doesn't exist on March 10)
const springEdgeCase = DateTime.fromObject(
  { year: 2024, month: 3, day: 8, hour: 3 },
  { zone: 'America/New_York' }
)

for (let dayIndex = 0; dayIndex < 4; dayIndex++) {
  const userDateTime = springEdgeCase
    .setZone('America/New_York')
    .plus({ days: dayIndex })
    .set({ hour: 2, minute: 30, second: 0, millisecond: 0 })

  const utcTime = userDateTime.toUTC()

  console.log(`Day ${dayIndex} (${userDateTime.toFormat('MMM dd')})`)
  console.log(`  Requested: 2:30 AM`)
  console.log(`  Actual Local: ${userDateTime.toFormat('h:mm a ZZZZ')}`)
  console.log(`  UTC: ${utcTime.toISO()}`)

  if (dayIndex === 2) {
    console.log(`NOTE: 2:30 AM doesn't exist! Luxon adjusted to 3:30 AM EDT`)
  }
  console.log()
}

console.log('(1:00-1:59 AM happens twice on November 3 - clocks fall back to 1:00 AM)\n')

const fallEdgeCase = DateTime.fromObject(
  { year: 2024, month: 11, day: 1, hour: 4 },
  { zone: 'America/New_York' }
)

for (let dayIndex = 0; dayIndex < 5; dayIndex++) {
  const userDateTime = fallEdgeCase
    .setZone('America/New_York')
    .plus({ days: dayIndex })
    .set({ hour: 1, minute: 30, second: 0, millisecond: 0 })

  const utcTime = userDateTime.toUTC()

  console.log(`Day ${dayIndex} (${userDateTime.toFormat('MMM dd')})`)
  console.log(`  Requested: 1:30 AM`)
  console.log(`  Actual Local: ${userDateTime.toFormat('h:mm a ZZZZ')}`)
  console.log(`  UTC: ${utcTime.toISO()}`)

  if (dayIndex === 2) {
    console.log(`  ℹ️  NOTE: 1:30 AM happens twice. Luxon uses the second occurrence (EST)`)
  }
  console.log()
}