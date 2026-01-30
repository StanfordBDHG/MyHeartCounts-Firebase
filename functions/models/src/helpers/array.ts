//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

// Average

export const average = (values: number[]): number | undefined =>
  values.length === 0 ?
    undefined
  : values.reduce((a, b) => a + b, 0) / values.length;

// Chunks

export const chunks = <T>(array: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(array.length / size) }, (_, index) =>
    array.slice(index * size, (index + 1) * size),
  );

// CompactMap

export const compact = <T>(array: Array<T | undefined>): T[] =>
  array.flatMap((value) => (value !== undefined ? [value] : []));

export const compactMap = <T, V>(
  array: T[],
  map: (arg0: T) => V | undefined,
): V[] =>
  array.flatMap((value) => {
    const mappedValue = map(value);
    return mappedValue !== undefined ? [mappedValue] : [];
  });

// Median

export const median = (values: number[]): number | undefined =>
  presortedPercentile(
    [...values].sort((a, b) => a - b),
    0.5,
  );

export const presortedMedian = (values: number[]): number | undefined =>
  presortedPercentile(values, 0.5);

export const percentile = (
  values: number[],
  percentile: number,
): number | undefined =>
  presortedPercentile(
    [...values].sort((a, b) => a - b),
    percentile,
  );

export const presortedPercentile = (
  values: number[],
  percentile: number,
): number | undefined => {
  if (values.length === 0) return undefined;
  const index = (values.length - 1) * percentile;
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);

  if (lowerIndex === upperIndex) {
    return values[lowerIndex];
  } else {
    const weight = index - lowerIndex;
    return values[lowerIndex] * (1 - weight) + values[upperIndex] * weight;
  }
};

// Percentage

export const percentage = <T>(
  values: T[],
  filter: (value: T) => boolean,
): number | undefined => {
  const total = values.length;
  if (total === 0) return undefined;
  const count = values.filter(filter).length;
  return (count / total) * 100;
};
