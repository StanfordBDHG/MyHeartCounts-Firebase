// This source file is part of the MyHeart Counts project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

import type { Timestamp } from "firebase-admin/firestore";

export interface PendingHealthSampleDeletion {
  userId: string;
  collection: string;
  documentId: string;
  jobId: string;
  requestingUserId: string;
  reason: "TRANSIENT_ERROR" | "NOT_FOUND";
  lastError: string | null;
  retryCount: number;
  createdAt: Timestamp;
  nextRetryAt: Timestamp;
}
