//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  Timestamp,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
} from 'firebase-admin/firestore'

/* eslint-disable @typescript-eslint/no-dynamic-delete */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */

export class MockFirestore {
  collections = new Map<string, Map<string, unknown>>()

  collection(path: string) {
    return new MockFirestoreCollectionRef(this, path)
  }

  doc(path: string) {
    return new MockFirestoreDocRef(this, path)
  }

  replaceAll(record: Record<string, Record<string, unknown>>) {
    this.collections = new Map<string, Map<string, unknown>>()
    for (const collectionName in record) {
      const collection = record[collectionName]
      const collectionMap = new Map<string, unknown>()
      this.collections.set(collectionName, collectionMap)
      for (const docName in collection) {
        collectionMap.set(docName, collection[docName])
      }
    }
  }

  runTransaction(
    callback: (transaction: MockFirestoreTransaction) => Promise<void>,
  ) {
    return callback(new MockFirestoreTransaction())
  }

  bulkWriter(): MockFirestoreBulkWriter {
    return new MockFirestoreBulkWriter()
  }

  recursiveDelete(reference: MockFirestoreRef) {
    if (reference instanceof MockFirestoreCollectionRef) {
      this.collections.delete(reference.path)
    } else if (reference instanceof MockFirestoreDocRef) {
      reference.delete()
    } else {
      throw new Error('Unsupported reference type')
    }
    this.collections.forEach((_, key) => {
      if (key.startsWith(reference.path + '/')) {
        this.collections.delete(key)
      }
    })
  }
}

class MockFirestoreBulkWriter {
  close() {
    return
  }
}

class MockFirestoreTransaction {
  get(reference: MockFirestoreRef) {
    return (reference as any).get()
  }

  create(reference: MockFirestoreDocRef, data: any) {
    reference.create(data)
  }

  set(reference: MockFirestoreDocRef, data: any) {
    reference.set(data)
  }

  update(reference: MockFirestoreDocRef, data: any) {
    reference.update(data)
  }

  delete(reference: MockFirestoreDocRef) {
    reference.delete()
  }
}

class MockFirestoreRef {
  firestore: MockFirestore
  path: string

  constructor(firestore: MockFirestore, path: string) {
    this.firestore = firestore
    this.path = path
  }

  collection(path: string) {
    return new MockFirestoreCollectionRef(
      this.firestore,
      `${this.path}/${path}`,
    )
  }

  doc(path: string) {
    return new MockFirestoreDocRef(this.firestore, `${this.path}/${path}`)
  }
}

class MockFirestoreCollectionRef extends MockFirestoreRef {
  get() {
    const result = this.firestore.collections.get(this.path) ?? new Map()
    const docs: any[] = []
    let size = 0
    result.forEach((value, key) => {
      size += 1
      docs.push({
        id: key,
        exists: true,
        ref: this.doc(key as string) as any,
        updateTime: Timestamp.now(),
        data: () => value,
      })
    })
    return {
      docs: docs,
      ref: this as any,
      size: size,
    }
  }

  where(
    field: string,
    operator: string,
    value: any,
  ): MockFirestoreCollectionRef {
    return new MockFirestoreFilteredCollectionRef(this, field, operator, value)
  }

  limit(limit: number): MockFirestoreCollectionRef {
    return new MockFirestoreLimitedCollectionRef(this, limit)
  }

  withConverter<T>(
    converter: FirestoreDataConverter<T>,
  ): MockFirestoreCollectionRef {
    return new MockFirestoreConvertedCollectionRef(this, converter)
  }
}

class MockFirestoreConvertedCollectionRef<
  T,
> extends MockFirestoreCollectionRef {
  readonly ref: MockFirestoreCollectionRef
  readonly converter: FirestoreDataConverter<T>

  constructor(
    ref: MockFirestoreCollectionRef,
    converter: FirestoreDataConverter<T>,
  ) {
    super(ref.firestore, ref.path)
    this.ref = ref
    this.converter = converter
  }

  get() {
    const docs = this.ref.get().docs.map((doc) => {
      const newData = this.converter.fromFirestore(doc as QueryDocumentSnapshot)
      return {
        exists: doc.exists,
        id: doc.id,
        ref: doc.ref,
        updateTime: doc.updateTime,
        data: () => newData,
      }
    })

    return {
      docs: docs,
      ref: this as any,
      size: docs.length,
    }
  }

  doc(path: string) {
    return new MockFirestoreConvertedDocRef(
      new MockFirestoreDocRef(this.firestore, `${this.path}/${path}`),
      this.converter,
    )
  }

  where(field: string, operator: string, value: any) {
    return new MockFirestoreConvertedCollectionRef(
      new MockFirestoreFilteredCollectionRef(this.ref, field, operator, value),
      this.converter,
    )
  }

  limit(limit: number) {
    return new MockFirestoreConvertedCollectionRef(
      new MockFirestoreLimitedCollectionRef(this.ref, limit),
      this.converter,
    )
  }
}

class MockFirestoreFilteredCollectionRef extends MockFirestoreCollectionRef {
  readonly ref: MockFirestoreCollectionRef
  readonly field: string
  readonly operator: string
  readonly value: any

  constructor(
    ref: MockFirestoreCollectionRef,
    field: string,
    operator: string,
    value: any,
  ) {
    super(ref.firestore, ref.path)
    this.ref = ref
    this.field = field
    this.operator = operator
    this.value = value
  }

  get() {
    const docs = this.ref.get().docs.filter((doc) => {
      const value = doc.data()[this.field]
      switch (this.operator) {
        case '==':
          return value === this.value
        case '<':
          return value < this.value
        case '<=':
          return value <= this.value
        case '>':
          return value > this.value
        case '>=':
          return value >= this.value
        default:
          throw new Error('Unsupported operator')
      }
    })

    return {
      docs: docs,
      ref: this as any,
      size: docs.length,
    }
  }
}

class MockFirestoreLimitedCollectionRef extends MockFirestoreCollectionRef {
  readonly ref: MockFirestoreCollectionRef
  readonly _limit: number

  constructor(ref: MockFirestoreCollectionRef, limit: number) {
    super(ref.firestore, ref.path)
    this.ref = ref
    this._limit = limit
  }

  get() {
    const docs = this.ref.get().docs.slice(0, this._limit)

    return {
      docs: docs,
      ref: this as any,
      size: docs.length,
    }
  }
}

class MockFirestoreDocRef extends MockFirestoreRef {
  get() {
    const pathComponents = this.path.split('/')
    const collectionPath = pathComponents.slice(0, -1).join('/')
    const result = this.firestore.collections
      .get(collectionPath)
      ?.get(pathComponents[pathComponents.length - 1])
    return {
      exists: result !== undefined,
      id: pathComponents[pathComponents.length - 1],
      ref: this as any,
      updateTime: Timestamp.now(),
      data: () => result as any,
    }
  }

  create(data: any) {
    const pathComponents = this.path.split('/')
    const collectionPath = pathComponents.slice(0, -1).join('/')
    if (this.firestore.collections.get(collectionPath) === undefined) {
      this.firestore.collections.set(collectionPath, new Map())
    }
    if (
      this.firestore.collections
        .get(collectionPath)
        ?.get(pathComponents[pathComponents.length - 1]) !== undefined
    ) {
      throw new Error('Document already exists')
    }
    this.firestore.collections
      .get(collectionPath)
      ?.set(pathComponents[pathComponents.length - 1], data)
  }

  listCollections() {
    const prefix = this.path + '/'
    const result: string[] = []
    this.firestore.collections.forEach((_, key) => {
      if (!key.startsWith(prefix)) return
      const collectionName = key.slice(prefix.length)
      if (collectionName.includes('/')) return
      result.push(collectionName)
    })
    return result
  }

  set(data: any) {
    const pathComponents = this.path.split('/')
    const collectionPath = pathComponents.slice(0, -1).join('/')
    if (this.firestore.collections.get(collectionPath) === undefined) {
      this.firestore.collections.set(collectionPath, new Map())
    }
    this.firestore.collections
      .get(collectionPath)
      ?.set(pathComponents[pathComponents.length - 1], data)
  }

  update(data: any) {
    const value = this.get().data()
    this.set({ ...value, ...data })
  }

  delete() {
    const pathComponents = this.path.split('/')
    const collectionPath = pathComponents.slice(0, -1).join('/')
    this.firestore.collections
      .get(collectionPath)
      ?.delete(pathComponents[pathComponents.length - 1])
  }

  withConverter<T>(converter: FirestoreDataConverter<T>) {
    return new MockFirestoreConvertedDocRef(this, converter)
  }
}

class MockFirestoreConvertedDocRef<T> extends MockFirestoreDocRef {
  readonly ref: MockFirestoreDocRef
  readonly converter: FirestoreDataConverter<T>

  constructor(ref: MockFirestoreDocRef, converter: FirestoreDataConverter<T>) {
    super(ref.firestore, ref.path)
    this.ref = ref
    this.converter = converter
  }

  get() {
    const result = super.get()
    const data = result.data()
    const clone = {
      exists: result.exists,
      id: result.id,
      ref: result.ref,
      updateTime: result.updateTime,
      data: () => data,
    }
    result.data = () =>
      this.converter.fromFirestore(clone as QueryDocumentSnapshot)
    return result
  }

  create(data: any) {
    super.create(this.converter.toFirestore(data))
  }

  set(data: any) {
    super.set(this.converter.toFirestore(data))
  }

  update(data: any) {
    const value = this.get().data()
    this.set({ ...value, ...data })
  }
}
