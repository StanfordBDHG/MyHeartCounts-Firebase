//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

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
