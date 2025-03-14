//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {UserType} from "@stanfordbdhg/engagehf-models";
import {expect} from "chai";
import {type DecodedIdToken} from "firebase-admin/auth";
import {type AuthData} from "firebase-functions/v2/tasks";
import {describe} from "mocha";
import {Credential, UserRole} from "./credential.js";

describe("Credential", () => {
  function createAuthData(
    userId: string,
    type: UserType,
    organization?: string,
  ): AuthData {
    return {
      uid: userId,
      token: {
        type: type,
        organization: organization,
      } as unknown as DecodedIdToken,
    } as AuthData;
  }

  const organizationId = "mockOrganization";
  const otherOrganizationId = "otherOrganization";
  const adminAuth = createAuthData("mockAdmin", UserType.admin);
  const ownerAuth = createAuthData("mockOwner", UserType.owner, organizationId);
  const clinicianAuth = createAuthData(
    "mockClinician",
    UserType.clinician,
    organizationId,
  );
  const patientAuth = createAuthData(
    "mockPatient",
    UserType.patient,
    organizationId,
  );

  it("correctly understands whether a user is an admin", async () => {
    const credential = new Credential(adminAuth);

    await expectToNotThrow(() => credential.check(UserRole.admin));

    await expectToThrow(
      () => credential.check(UserRole.owner(organizationId)),
      credential.permissionDeniedError(),
    );

    await expectToThrow(
      () => credential.check(UserRole.owner(otherOrganizationId)),
      credential.permissionDeniedError(),
    );

    await expectToThrow(
      () => credential.check(UserRole.clinician(organizationId)),
      credential.permissionDeniedError(),
    );

    await expectToThrow(
      () => credential.check(UserRole.clinician(otherOrganizationId)),
      credential.permissionDeniedError(),
    );

    await expectToThrow(
      () => credential.check(UserRole.patient(organizationId)),
      credential.permissionDeniedError(),
    );

    await expectToThrow(
      () => credential.check(UserRole.patient(otherOrganizationId)),
      credential.permissionDeniedError(),
    );

    await expectToNotThrow(() => credential.check(UserRole.user(adminAuth.uid)));

    await expectToThrow(
      () => credential.check(UserRole.user(patientAuth.uid)),
      credential.permissionDeniedError(),
    );
  });

  it("correctly understands whether a user is an owner", async () => {
    const credential = new Credential(ownerAuth);

    await expectToThrow(
      () => credential.check(UserRole.admin),
      credential.permissionDeniedError(),
    );

    await expectToNotThrow(() =>
      credential.check(UserRole.owner(organizationId)),
    );

    await expectToThrow(
      () => credential.check(UserRole.owner(otherOrganizationId)),
      credential.permissionDeniedError(),
    );

    await expectToThrow(
      () => credential.check(UserRole.clinician(organizationId)),
      credential.permissionDeniedError(),
    );

    await expectToThrow(
      () => credential.check(UserRole.clinician(otherOrganizationId)),
      credential.permissionDeniedError(),
    );

    await expectToThrow(
      () => credential.check(UserRole.patient(organizationId)),
      credential.permissionDeniedError(),
    );

    await expectToThrow(
      () => credential.check(UserRole.patient(otherOrganizationId)),
      credential.permissionDeniedError(),
    );

    await expectToNotThrow(() => credential.check(UserRole.user(ownerAuth.uid)));

    await expectToThrow(
      () => credential.check(UserRole.user(patientAuth.uid)),
      credential.permissionDeniedError(),
    );
  });

  it("correctly understands whether a user is a clinician", async () => {
    const credential = new Credential(clinicianAuth);

    await expectToThrow(
      () => credential.check(UserRole.admin),
      credential.permissionDeniedError(),
    );

    await expectToThrow(() => credential.check(UserRole.owner(organizationId)));

    await expectToThrow(
      () => credential.check(UserRole.owner(otherOrganizationId)),
      credential.permissionDeniedError(),
    );

    await expectToNotThrow(() =>
      credential.check(UserRole.clinician(organizationId)),
    );

    await expectToThrow(
      () => credential.check(UserRole.clinician(otherOrganizationId)),
      credential.permissionDeniedError(),
    );

    await expectToThrow(
      () => credential.check(UserRole.patient(organizationId)),
      credential.permissionDeniedError(),
    );

    await expectToThrow(
      () => credential.check(UserRole.patient(otherOrganizationId)),
      credential.permissionDeniedError(),
    );

    await expectToNotThrow(() =>
      credential.check(UserRole.user(clinicianAuth.uid)),
    );

    await expectToThrow(
      () => credential.check(UserRole.user(patientAuth.uid)),
      credential.permissionDeniedError(),
    );
  });

  it("correctly understands whether a user is a patient", async () => {
    const credential = new Credential(patientAuth);

    await expectToThrow(
      () => credential.check(UserRole.admin),
      credential.permissionDeniedError(),
    );

    await expectToThrow(() => credential.check(UserRole.owner(organizationId)));

    await expectToThrow(
      () => credential.check(UserRole.owner(otherOrganizationId)),
      credential.permissionDeniedError(),
    );

    await expectToThrow(
      () => credential.check(UserRole.clinician(organizationId)),
      credential.permissionDeniedError(),
    );

    await expectToThrow(
      () => credential.check(UserRole.clinician(otherOrganizationId)),
      credential.permissionDeniedError(),
    );

    await expectToNotThrow(() =>
      credential.check(UserRole.patient(organizationId)),
    );

    await expectToThrow(
      () => credential.check(UserRole.patient(otherOrganizationId)),
      credential.permissionDeniedError(),
    );

    await expectToNotThrow(() =>
      credential.check(UserRole.user(patientAuth.uid)),
    );

    await expectToThrow(
      () => credential.check(UserRole.user(ownerAuth.uid)),
      credential.permissionDeniedError(),
    );
  });
});

async function expectToThrow<T>(
  promise: () => Promise<T> | T,
  error?: unknown,
  message?: string,
): Promise<void> {
  try {
    await promise();
    expect.fail("Expected promise to throw");
  } catch (e) {
    if (error !== undefined) expect(e).to.deep.equal(error, message);
  }
}

async function expectToNotThrow<T>(
  promise: () => Promise<T> | T,
  message?: string,
): Promise<T> {
  try {
    return await promise();
  } catch (e) {
    expect.fail("Expected promise to not throw", message);
  }
}
