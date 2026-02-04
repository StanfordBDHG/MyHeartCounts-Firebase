//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { expect } from "chai";
import { type DecodedIdToken } from "firebase-admin/auth";
import { https } from "firebase-functions/v2";
import { type AuthData } from "firebase-functions/v2/tasks";
import { describe } from "mocha";
import { Credential } from "./credential.js";

describe("Credential", () => {
  const createAuthData = (userId: string, disabled = false): AuthData =>
    ({
      uid: userId,
      token: {
        disabled,
      } as unknown as DecodedIdToken,
    }) as AuthData;

  const adminAuth = createAuthData("mockAdmin");
  const patientAuth = createAuthData("mockPatient");
  const disabledAuth = createAuthData("disabledUser", true);

  const expectToNotThrow = (fn: () => void): void => {
    expect(fn).to.not.throw();
  };

  const expectToThrow = (
    fn: () => void,
    errorType: typeof https.HttpsError,
    code: string,
  ): void => {
    expect(fn).to.throw(errorType).with.property("code", code);
  };

  describe("constructor", () => {
    it("throws when auth data is undefined", () => {
      expectToThrow(
        () => new Credential(undefined),
        https.HttpsError,
        "unauthenticated",
      );
    });

    it("correctly parses user claims", () => {
      const credential = new Credential(adminAuth);
      expect(credential.userId).to.equal(adminAuth.uid);
    });

    it("correctly parses patient user claims", () => {
      const credential = new Credential(patientAuth);
      expect(credential.userId).to.equal(patientAuth.uid);
    });
  });

  describe("checkAuthenticated", () => {
    it("allows authenticated users", () => {
      const credential = new Credential(adminAuth);
      expectToNotThrow(() => credential.checkAuthenticated());
    });

    it("blocks disabled users", () => {
      const credential = new Credential(disabledAuth);
      expectToThrow(
        () => credential.checkAuthenticated(),
        https.HttpsError,
        "permission-denied",
      );
    });
  });

  describe("checkUser", () => {
    it("allows users to access their own data", () => {
      const credential = new Credential(patientAuth);
      expectToNotThrow(() => credential.checkUser(patientAuth.uid));
    });

    it("blocks users from accessing other user data", () => {
      const credential = new Credential(patientAuth);
      expectToThrow(
        () => credential.checkUser("different-user"),
        https.HttpsError,
        "permission-denied",
      );
    });

    it("blocks disabled users from accessing their own data", () => {
      const credential = new Credential(disabledAuth);
      expectToThrow(
        () => credential.checkUser(disabledAuth.uid),
        https.HttpsError,
        "permission-denied",
      );
    });
  });
});
