// This source file is part of the MyHeart Counts project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

export class MockStorage {
  bucket(): MockStorageBucket {
    return new MockStorageBucket(this);
  }
}

export class MockStorageBucket {
  private storage: MockStorage;

  constructor(storage: MockStorage) {
    this.storage = storage;
  }

  upload(
    _path: string,
    _options?: { destination?: string; contentType?: string },
  ): Promise<void> {
    return Promise.resolve();
  }
}
