//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { Lazy } from '@stanfordbdhg/engagehf-models'
import {
  type BulkWriter,
  type BulkWriterOptions,
  type Transaction,
  type Firestore,
} from 'firebase-admin/firestore'
import { CollectionsService } from './collections.js'
import { type Document, type DatabaseService } from './databaseService.js'

export class FirestoreService implements DatabaseService {
  // Properties

  private readonly _collectionsService = new Lazy(
    () => new CollectionsService(this._firestore),
  )
  private readonly _firestore: Firestore

  // Public accessors

  get collections(): CollectionsService {
    return this._collectionsService.value
  }

  get firestore(): Firestore {
    return this._firestore
  }

  // Constructor

  constructor(firestore: Firestore) {
    this._firestore = firestore
    // Settings are already applied globally in index.js
  }

  // Methods

  async getQuery<T>(
    query: (
      collectionsService: CollectionsService,
    ) => FirebaseFirestore.Query<T>,
  ): Promise<Array<Document<T>>> {
    const collection = await query(this.collections).get()
    return collection.docs.map((doc) => ({
      id: doc.id,
      path: doc.ref.path,
      lastUpdate: doc.updateTime.toDate(),
      content: doc.data(),
    }))
  }

  async getDocument<T>(
    reference: (
      collectionsService: CollectionsService,
    ) => FirebaseFirestore.DocumentReference<T>,
  ): Promise<Document<T> | undefined> {
    const ref = reference(this.collections)
    const doc = await ref.get()
    const data = doc.exists ? doc.data() : undefined
    return doc.exists && data !== undefined ?
        {
          id: doc.id,
          path: doc.ref.path,
          // `lastUpdate` should not be undefined in this case
          lastUpdate: doc.updateTime?.toDate() ?? doc.readTime.toDate(),
          content: data,
        }
      : undefined
  }

  async bulkWrite(
    write: (
      collectionsService: CollectionsService,
      writer: BulkWriter,
    ) => Promise<void>,
    options?: BulkWriterOptions,
  ): Promise<void> {
    const writer = this._firestore.bulkWriter(options)
    await write(this.collections, writer)
    await writer.close()
  }

  async listCollections<T>(
    docReference: (
      collections: CollectionsService,
    ) => FirebaseFirestore.DocumentReference<T>,
  ): Promise<FirebaseFirestore.CollectionReference[]> {
    return docReference(this.collections).listCollections()
  }

  async runTransaction<T>(
    run: (
      collectionsService: CollectionsService,
      transaction: Transaction,
    ) => Promise<T> | T,
  ): Promise<T> {
    return this._firestore.runTransaction(async (transaction) =>
      run(this.collections, transaction),
    )
  }
}
