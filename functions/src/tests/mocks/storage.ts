//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

/* eslint-disable @typescript-eslint/no-unused-vars */

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
    path: string,
    options?: { destination?: string; contentType?: string },
  ): Promise<void> {
    return Promise.resolve();
  }
}
