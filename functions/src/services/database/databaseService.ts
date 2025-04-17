//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  type Transaction,
  type BulkWriter,
  type BulkWriterOptions,
} from 'firebase-admin/firestore'
import { type CollectionsService } from './collections'

export interface Document<Content> {
  id: string
  path: string
  lastUpdate: Date
  content: Content
}

export interface DatabaseService {
  // Collection and Firestore access
  readonly collections: CollectionsService
  readonly firestore: FirebaseFirestore.Firestore

  getQuery<T>(
    query: (
      collectionsService: CollectionsService,
    ) => FirebaseFirestore.Query<T>,
  ): Promise<Array<Document<T>>>

  getDocument<T>(
    reference: (
      collectionsService: CollectionsService,
    ) => FirebaseFirestore.DocumentReference<T>,
  ): Promise<Document<T> | undefined>

  bulkWrite(
    write: (
      collectionsService: CollectionsService,
      writer: BulkWriter,
    ) => Promise<void>,
    options?: BulkWriterOptions,
  ): Promise<void>

  listCollections<T>(
    collection: (
      collections: CollectionsService,
    ) => FirebaseFirestore.DocumentReference<T>,
  ): Promise<FirebaseFirestore.CollectionReference[]>

  runTransaction<T>(
    run: (
      collectionsService: CollectionsService,
      transaction: Transaction,
    ) => Promise<T> | T,
  ): Promise<T>
}
