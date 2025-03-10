//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

// Average

export function average(values: number[]): number | undefined {
  return values.length === 0 ?
      undefined
    : values.reduce((a, b) => a + b, 0) / values.length
}

// Chunks

export function chunks<T>(array: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(array.length / size) }, (_, index) =>
    array.slice(index * size, (index + 1) * size),
  )
}

// CompactMap

export function compact<T>(array: Array<T | undefined>): T[] {
  return array.flatMap((value) => (value !== undefined ? [value] : []))
}

export function compactMap<T, V>(
  array: T[],
  map: (arg0: T) => V | undefined,
): V[] {
  return array.flatMap((value) => {
    const mappedValue = map(value)
    return mappedValue !== undefined ? [mappedValue] : []
  })
}

// Median

export function median(values: number[]): number | undefined {
  return presortedPercentile(
    [...values].sort((a, b) => a - b),
    0.5,
  )
}

export function presortedMedian(values: number[]): number | undefined {
  return presortedPercentile(values, 0.5)
}

export function percentile(
  values: number[],
  percentile: number,
): number | undefined {
  return presortedPercentile(
    [...values].sort((a, b) => a - b),
    percentile,
  )
}

export function presortedPercentile(
  values: number[],
  percentile: number,
): number | undefined {
  if (values.length === 0) return undefined
  const index = (values.length - 1) * percentile
  const lowerIndex = Math.floor(index)
  const upperIndex = Math.ceil(index)

  if (lowerIndex === upperIndex) {
    return values[lowerIndex]
  } else {
    const weight = index - lowerIndex
    return values[lowerIndex] * (1 - weight) + values[upperIndex] * weight
  }
}

// Percentage

export function percentage<T>(
  values: T[],
  filter: (value: T) => boolean,
): number | undefined {
  const total = values.length
  if (total === 0) return undefined
  const count = values.filter(filter).length
  return (count / total) * 100
}
