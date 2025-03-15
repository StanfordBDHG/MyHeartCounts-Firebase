//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { isDeepStrictEqual } from 'util'
import { type DocumentSnapshot } from 'firebase-admin/firestore'
import { type Change } from 'firebase-functions'
import { type HistoryService } from './historyService.js'
import { type DatabaseService } from '../database/databaseService.js'

export class DatabaseHistoryService implements HistoryService {
  // Properties

  private readonly databaseService: DatabaseService

  // Constructor

  constructor(databaseService: DatabaseService) {
    this.databaseService = databaseService
  }

  // Methods

  async isEmpty(): Promise<boolean> {
    const result = await this.databaseService.getQuery((collections) =>
      collections.history.limit(1),
    )
    return result.length === 0
  }

  async recordChange(change: Change<DocumentSnapshot>): Promise<void> {
    if (isDeepStrictEqual(change.before.data(), change.after.data())) return
    const path = change.after.ref.path
    await this.databaseService.runTransaction((collections, transaction) => {
      transaction.create(collections.history.doc(), {
        path: path,
        data: change.after.data(),
        date: new Date(),
      })
    })
  }
}
