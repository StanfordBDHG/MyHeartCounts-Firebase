//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  FHIRAppointment,
  FHIRAppointmentStatus,
  Invitation,
  UserAuth,
  UserRegistration,
  UserType,
} from "@stanfordbdhg/engagehf-models";
import {expect} from "chai";
import {it} from "mocha";
import {deleteInvitation} from "./deleteInvitation.js";
import {describeWithEmulators} from "../tests/functions/testEnvironment.js";

describeWithEmulators("function: deleteInvitation", (env) => {
  it("deletes an invitation successfully", async () => {
    const invitation = new Invitation({
      auth: new UserAuth({
        displayName: "Test User",
        email: "engagehf-test@stanford.edu",
      }),
      code: "TESTCODE",
      user: new UserRegistration({
        type: UserType.patient,
        disabled: false,
        organization: "stanford",
        receivesAppointmentReminders: false,
        receivesInactivityReminders: true,
        receivesMedicationUpdates: true,
        receivesQuestionnaireReminders: false,
        receivesRecommendationUpdates: true,
        receivesVitalsReminders: false,
        receivesWeightAlerts: false,
      }),
    });

    const invitationRef = env.collections.invitations.doc();
    await invitationRef.set(invitation);

    const appointment = FHIRAppointment.create({
      userId: invitationRef.id,
      status: FHIRAppointmentStatus.booked,
      created: new Date(),
      start: new Date(),
      durationInMinutes: 90,
    });

    const appointmentRef = env.collections
      .invitationAppointments(invitationRef.id)
      .doc();
    await appointmentRef.set(appointment);

    await env.call(
      deleteInvitation,
      {invitationCode: invitation.code},
      {
        uid: "test",
        token: {type: UserType.owner, organization: "stanford"},
      },
    );

    const actualInvitation = await invitationRef.get();
    expect(actualInvitation.exists).to.be.false;

    const actualAppointment = await appointmentRef.get();
    expect(actualAppointment.exists).to.be.false;
  });
});
