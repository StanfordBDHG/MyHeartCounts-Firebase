// This source file is part of the MyHeart Counts project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

export const advanceDateByDays = (date: Date, days: number): Date =>
  advanceDateBySeconds(date, days * 24 * 60 * 60);

export const advanceDateByHours = (date: Date, minutes: number): Date =>
  advanceDateBySeconds(date, minutes * 60 * 60);

export const advanceDateByMinutes = (date: Date, minutes: number): Date =>
  advanceDateBySeconds(date, minutes * 60);

export const advanceDateBySeconds = (date: Date, seconds: number): Date =>
  new Date(date.getTime() + seconds * 1000);
