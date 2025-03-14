//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  createInvitationInputSchema,
  type CreateInvitationOutput,
  Invitation,
  UserType,
} from "@stanfordbdhg/engagehf-models";
import {https} from "firebase-functions/v2";
import {validatedOnCall} from "./helpers.js";
import {UserRole} from "../services/credential/credential.js";
import {getServiceFactory} from "../services/factory/getServiceFactory.js";

export const createInvitation = validatedOnCall(
  "createInvitation",
  createInvitationInputSchema,
  async (request): Promise<CreateInvitationOutput> => {
    const factory = getServiceFactory();
    const credential = factory.credential(request.auth);

    if (request.data.user.type === UserType.admin) {
      credential.check(UserRole.admin);
    } else if (request.data.user.organization !== undefined) {
      credential.check(
        UserRole.admin,
        UserRole.owner(request.data.user.organization),
        UserRole.clinician(request.data.user.organization),
      );
    } else {
      throw credential.permissionDeniedError();
    }

    const userService = factory.user();
    const isPatient = request.data.user.type === UserType.patient;

    for (let counter = 0; ; counter++) {
      const invitationCode =
        isPatient ? generateInvitationCode(8) : request.data.auth.email;
      if (invitationCode === undefined) {
        throw new https.HttpsError(
          "invalid-argument",
          "Invalid invitation code",
        );
      }

      try {
        const invitation = new Invitation({
          ...request.data,
          code: invitationCode,
        });
        const {id} = await userService.createInvitation(invitation);
        return {id};
      } catch (error) {
        if (counter < 4 && isPatient) continue;
        throw error;
      }
    }
  },
);

function generateInvitationCode(length: number): string {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const charactersLength = characters.length;
  let result = "";
  for (let counter = 0; counter < length; counter++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
