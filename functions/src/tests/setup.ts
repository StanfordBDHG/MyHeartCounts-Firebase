// This source file is part of the MyHeart Counts project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

import admin from "firebase-admin";
import { stub, restore } from "sinon";
import { MockFirebase } from "./mocks/firebase.js";

export const setupMockFirebase = (): MockFirebase => {
  const result = new MockFirebase();
  stub(admin, "auth").get(() => () => result.auth);
  stub(admin, "firestore").get(() => () => result.firestore);
  stub(admin, "messaging").get(() => () => result.messaging);
  stub(admin, "storage").get(() => () => result.storage);
  return result;
};

export const cleanupMocks = () => {
  restore();
};
