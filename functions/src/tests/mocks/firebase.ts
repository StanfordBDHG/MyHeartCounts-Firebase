// This source file is part of the MyHeart Counts project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

import { MockAuth } from "./auth.js";
import { MockFirestore } from "./firestore.js";
import { MockMessaging } from "./messaging.js";
import { MockStorage } from "./storage.js";

export class MockFirebase {
  readonly auth = new MockAuth();
  readonly firestore = new MockFirestore();
  readonly messaging = new MockMessaging();
  readonly storage = new MockStorage();
}
