//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  FHIRAppointment,
  fhirAppointmentConverter,
  FHIRAppointmentStatus,
  FHIRObservation,
  fhirObservationConverter,
  Invitation,
  LoincCode,
  QuantityUnit,
  UserAuth,
  UserMessageType,
  UserRegistration,
  UserType,
  UserObservationCollection,
} from "@stanfordbdhg/engagehf-models";
import {expect} from "chai";
import {enrollUser} from "./enrollUser.js";
import {describeWithEmulators} from "../tests/functions/testEnvironment.js";
import {expectError} from "../tests/helpers.js";

describeWithEmulators("function: enrollUser", (env) => {
  it("fails to enroll a user without an invitation code", async () => {
    const authUser = await env.auth.createUser({});
    await expectError(
      async () =>
        env.call(
          enrollUser,
          {invitationCode: "TESTCODE"},
          {uid: authUser.uid},
        ),
      (error) => expect(error).to.have.property("code", "not-found"),
    );
  });

  it("correctly enrolls a user", async () => {
    const invitation = new Invitation({
      auth: new UserAuth({
        email: "engagehf-test@stanford.edu",
      }),
      code: "TESTCODE",
      user: new UserRegistration({
        type: UserType.patient,
        disabled: false,
        organization: "stanford",
        receivesAppointmentReminders: true,
        receivesInactivityReminders: true,
        receivesMedicationUpdates: true,
        receivesQuestionnaireReminders: true,
        receivesRecommendationUpdates: true,
        receivesVitalsReminders: true,
        receivesWeightAlerts: true,
      }),
    });
    const invitationRef = env.collections.invitations.doc();
    await invitationRef.set(invitation);

    const expectedAppointment = new FHIRAppointment({
      status: FHIRAppointmentStatus.booked,
      created: new Date("2023-12-24"),
      start: new Date("2023-12-31"),
      end: new Date("2024-01-01"),
      participant: [],
    });

    await env.collections
      .invitationAppointments(invitationRef.id)
      .doc()
      .set(expectedAppointment);

    const expectedObservation = FHIRObservation.createSimple({
      id: "1",
      code: LoincCode.bodyWeight,
      value: 70,
      unit: QuantityUnit.kg,
      date: new Date(),
    });

    await env.collections
      .invitationObservations(
        invitationRef.id,
        UserObservationCollection.bodyWeight,
      )
      .doc()
      .set(expectedObservation);

    const authUser = await env.auth.createUser({});
    await env.call(
      enrollUser,
      {invitationCode: "TESTCODE"},
      {uid: authUser.uid},
    );

    const userService = env.factory.user();
    const dbUser = await userService.getUser(authUser.uid);
    expect(dbUser).to.exist;
    if (dbUser !== undefined) await userService.finishUserEnrollment(dbUser);

    const users = await env.collections.users.get();
    expect(users.docs).to.have.length(1);

    const user = users.docs.at(0)?.data();
    expect(user?.invitationCode).to.equal(invitation.code);
    expect(user?.dateOfEnrollment.getTime()).to.approximately(
      new Date().getTime(),
      2000,
    );

    const actualAppointments = await env.collections
      .userAppointments(authUser.uid)
      .get();
    expect(actualAppointments.docs).to.have.length(1);
    const actualAppointment = actualAppointments.docs.at(0)?.data();
    if (actualAppointment === undefined) {
      expect.fail("actualAppointment is undefined");
    } else {
      expect(
        fhirAppointmentConverter.value.encode(actualAppointment),
      ).to.deep.equal(
        fhirAppointmentConverter.value.encode(expectedAppointment),
      );
    }

    const actualObservations = await env.collections
      .userObservations(authUser.uid, UserObservationCollection.bodyWeight)
      .get();
    expect(actualObservations.docs).to.have.length(1);
    const actualObservation = actualObservations.docs.at(0)?.data();
    if (actualObservation === undefined) {
      expect.fail("actualObservation is undefined");
    } else {
      expect(
        fhirObservationConverter.value.encode(actualObservation),
      ).to.deep.equal(
        fhirObservationConverter.value.encode(expectedObservation),
      );
    }

    const userMessages = await env.collections.userMessages(authUser.uid).get();
    expect(userMessages.docs.length).to.equal(2);
    expect(
      userMessages.docs.find(
        (message) => message.data().type == UserMessageType.welcome,
      ),
    ).to.exist;
    expect(
      userMessages.docs.find(
        (message) =>
          message.data().type == UserMessageType.symptomQuestionnaire,
      ),
    ).to.exist;
  });
});
