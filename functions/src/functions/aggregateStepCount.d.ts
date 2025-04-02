//
// This source file is part of the MyHeartCounts project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { type CallableFunction } from '@stanfordbdhg/engagehf-models'

/**
 * Aggregates all step count observations from all users for a specific day.
 * If no date is provided, defaults to today.
 * 
 * Input:
 * - date: (Optional) The date to aggregate steps for in ISO format (YYYY-MM-DD)
 * 
 * Output:
 * - The total number of steps aggregated across all users
 */
export const aggregateStepCount: CallableFunction<{
  date?: string
}, number>