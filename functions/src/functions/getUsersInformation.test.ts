//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {UserType} from "@stanfordbdhg/engagehf-models";
import {expect} from "chai";
import {it} from "mocha";
import {getUsersInformation} from "./getUsersInformation.js";
import {describeWithEmulators} from "../tests/functions/testEnvironment.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

describeWithEmulators("function: getUsersInformation", (env) => {
  it("should return users information", async () => {
    const adminId = await env.createUser({
      type: UserType.admin,
    });
    const ownerId = await env.createUser({
      type: UserType.owner,
      organization: "stanford",
    });
    const clinicianId = await env.createUser({
      type: UserType.clinician,
      organization: "jhu",
    });
    const patientId = await env.createUser({
      type: UserType.patient,
      organization: "stanford",
    });

    const adminResult = await env.call(
      getUsersInformation,
      {
        userIds: [adminId, ownerId, clinicianId, patientId],
        includeUserData: true,
      },
      {uid: adminId, token: {type: UserType.admin}},
    );
    expect(Object.keys(adminResult)).to.have.length(4);
    expect(adminResult[adminId], "admin: admin object").to.exist;
    expect((adminResult[adminId] as any).data, "admin: admin data").to.exist;
    expect((adminResult[adminId] as any).error, "admin: admin error").to.be
      .undefined;
    expect(adminResult[ownerId], "admin: owner object").to.exist;
    expect((adminResult[ownerId] as any).data, "admin: owner data").to.exist;
    expect((adminResult[ownerId] as any).error, "admin: owner error").to.be
      .undefined;
    expect(adminResult[clinicianId], "admin: clinician object").to.exist;
    expect((adminResult[clinicianId] as any).data, "admin: clinician data").to
      .exist;
    expect((adminResult[clinicianId] as any).error, "admin: clinician error").to
      .be.undefined;
    expect(adminResult[patientId], "admin: patient object").to.exist;
    expect((adminResult[patientId] as any).data, "admin: patient data").to.exist;
    expect((adminResult[patientId] as any).error, "admin: patient error").to.be
      .undefined;

    const ownerResult = await env.call(
      getUsersInformation,
      {
        userIds: [adminId, ownerId, clinicianId, patientId],
        includeUserData: true,
      },
      {
        uid: ownerId,
        token: {type: UserType.owner, organization: "stanford"},
      },
    );
    expect(Object.keys(ownerResult)).to.have.length(4);
    expect(ownerResult[adminId], "owner: admin object").to.exist;
    expect((ownerResult[adminId] as any).data, "owner: admin data").to.be
      .undefined;
    expect((ownerResult[adminId] as any).error, "owner: admin error").to.exist;
    expect(ownerResult[ownerId], "owner: owner object").to.exist;
    expect((ownerResult[ownerId] as any).data, "owner: owner data").to.exist;
    expect((ownerResult[ownerId] as any).error, "owner: owner error").to.be
      .undefined;
    expect(ownerResult[clinicianId], "owner: clinician object").to.exist;
    expect((ownerResult[clinicianId] as any).data, "owner: clinician data").to
      .be.undefined;
    expect((ownerResult[clinicianId] as any).error, "owner: clinician error").to
      .exist;
    expect(ownerResult[patientId], "owner: patient object").to.exist;
    expect((ownerResult[patientId] as any).data, "owner: patient data").to.exist;
    expect((ownerResult[patientId] as any).error, "owner: patient error").to.be
      .undefined;

    const clinicianResult = await env.call(
      getUsersInformation,
      {
        userIds: [adminId, ownerId, clinicianId, patientId],
        includeUserData: true,
      },
      {
        uid: clinicianId,
        token: {type: UserType.clinician, organization: "jhu"},
      },
    );
    expect(Object.keys(clinicianResult)).to.have.length(4);
    expect(clinicianResult[adminId], "clinician: admin object").to.exist;
    expect((clinicianResult[adminId] as any).data, "clinician: admin data").to
      .be.undefined;
    expect((clinicianResult[adminId] as any).error, "clinician: admin error").to
      .exist;
    expect(clinicianResult[ownerId], "clinician: owner object").to.exist;
    expect((clinicianResult[ownerId] as any).data, "clinician: owner data").to
      .be.undefined;
    expect((clinicianResult[ownerId] as any).error, "clinician: owner error").to
      .exist;
    expect(clinicianResult[clinicianId], "clinician: clinician object").to.exist;
    expect(
      (clinicianResult[clinicianId] as any).data,
      "clinician: clinician data",
    ).to.exist;
    expect(
      (clinicianResult[clinicianId] as any).error,
      "clinician: clinician error",
    ).to.be.undefined;
    expect(clinicianResult[patientId], "clinician: patient object").to.exist;
    expect((clinicianResult[patientId] as any).data, "clinician: patient data")
      .to.be.undefined;
    expect(
      (clinicianResult[patientId] as any).error,
      "clinician: patient error",
    ).to.exist;

    const patientResult = await env.call(
      getUsersInformation,
      {
        userIds: [adminId, ownerId, clinicianId, patientId],
        includeUserData: true,
      },
      {
        uid: patientId,
        token: {type: UserType.patient, organization: "stanford"},
      },
    );
    expect(Object.keys(patientResult)).to.have.length(4);
    expect(patientResult[adminId], "patient: admin object").to.exist;
    expect((patientResult[adminId] as any).data, "patient: admin data").to.be
      .undefined;
    expect((patientResult[adminId] as any).error, "patient: admin error").to
      .exist;
    expect(patientResult[ownerId], "patient: owner object").to.exist;
    expect((patientResult[ownerId] as any).data, "patient: owner data").to.be
      .undefined;
    expect((patientResult[ownerId] as any).error, "patient: owner error").to
      .exist;
    expect(patientResult[clinicianId], "patient: clinician object").to.exist;
    expect((patientResult[clinicianId] as any).data, "patient: clinician data")
      .to.be.undefined;
    expect(
      (patientResult[clinicianId] as any).error,
      "patient: clinician error",
    ).to.exist;
    expect(patientResult[patientId], "patient: patient object").to.exist;
    expect((patientResult[patientId] as any).data, "patient: patient data").to
      .exist;
    expect((patientResult[patientId] as any).error, "patient: patient error").to
      .be.undefined;
  });
});
