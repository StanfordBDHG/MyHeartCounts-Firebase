//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as zlib from 'zlib'

/* eslint-disable @typescript-eslint/no-unused-vars */

export interface MockFile {
  name: string
  content: Buffer
  metadata?: Record<string, any>
  exists?: boolean
}

export class MockStorage {
  constructor() {
    this._files = new Map<string, MockFile>()
  }

  private _files: Map<string, MockFile>

  addMockFile(file: MockFile): void {
    this._files.set(file.name, {
      ...file,
      exists: file.exists ?? true,
    })
  }

  clearMockFiles(): void {
    this._files.clear()
  }

  bucket(bucketName?: string): MockStorageBucket {
    return new MockStorageBucket(this)
  }

  _getFile(name: string): MockFile | undefined {
    return this._files.get(name)
  }

  _getAllFiles(): MockFile[] {
    return Array.from(this._files.values())
  }
}

export class MockStorageBucket {
  private storage: MockStorage

  constructor(storage: MockStorage) {
    this.storage = storage
  }

  file(filePath: string): MockStorageFile {
    return new MockStorageFile(this.storage, filePath)
  }

  getFiles(options?: { prefix?: string }): Promise<[MockStorageFile[]]> {
    let files = this.storage._getAllFiles()

    if (options?.prefix) {
      const prefix = options.prefix
      files = files.filter((file) => file.name.startsWith(prefix))
    }

    return Promise.resolve([
      files.map((file) => new MockStorageFile(this.storage, file.name)),
    ])
  }

  upload(
    path: string,
    options?: { destination?: string; contentType?: string },
  ): Promise<void> {
    return Promise.resolve()
  }
}

export class MockStorageFile {
  private storage: MockStorage
  readonly name: string

  constructor(storage: MockStorage, name: string) {
    this.storage = storage
    this.name = name
  }

  exists(): Promise<[boolean]> {
    const file = this.storage._getFile(this.name)
    return Promise.resolve([file?.exists ?? false])
  }

  download(): Promise<[Buffer]> {
    const file = this.storage._getFile(this.name)
    if (!file?.exists) {
      return Promise.reject(new Error(`File ${this.name} does not exist`))
    }
    return Promise.resolve([file.content])
  }

  delete(): Promise<void> {
    const file = this.storage._getFile(this.name)
    if (!file?.exists) {
      return Promise.reject(new Error(`File ${this.name} does not exist`))
    }

    // Mark as deleted (not exists)
    this.storage.addMockFile({
      ...file,
      exists: false,
    })

    return Promise.resolve()
  }

  save(content: string, options?: { contentType?: string }): Promise<void> {
    this.storage.addMockFile({
      name: this.name,
      content: Buffer.from(content),
      metadata: options ? { contentType: options.contentType } : undefined,
      exists: true,
    })
    return Promise.resolve()
  }

  copy(destinationFile: MockStorageFile): Promise<void> {
    const file = this.storage._getFile(this.name)
    if (!file?.exists) {
      return Promise.reject(new Error(`File ${this.name} does not exist`))
    }

    this.storage.addMockFile({
      name: destinationFile.name,
      content: file.content,
      metadata: file.metadata,
      exists: true,
    })

    return Promise.resolve()
  }
}
