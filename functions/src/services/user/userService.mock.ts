//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  Invitation,
  User,
  type UserAuth,
  UserRegistration,
  UserType,
} from "@stanfordbdhg/engagehf-models";

// Define a placeholder Organization type
class Organization {
  name: string;
  contactName: string;
  phoneNumber: string;
  emailAddress: string;
  ssoProviderId: string;

  constructor(props: {
    name: string
    contactName: string
    phoneNumber: string
    emailAddress: string
    ssoProviderId: string
  }) {
    this.name = props.name;
    this.contactName = props.contactName;
    this.phoneNumber = props.phoneNumber;
    this.emailAddress = props.emailAddress;
    this.ssoProviderId = props.ssoProviderId;
  }
}
import {type UserService} from "./userService.js";
import {type Document} from "../database/databaseService.js";

/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unused-vars */

export class MockUserService implements UserService {
  // Methods - Auth

  async getAuth(userId: string): Promise<UserAuth> {
    switch (userId) {
    case "mockClinician":
      return {
        displayName: "Dr. XXX",
      };
    case "mockUser":
      return {
        displayName: "John Doe",
      };
    default:
      return {
        displayName: "Unknown",
      };
    }
  }

  async updateAuth(userId: string, user: UserAuth): Promise<void> {
    return;
  }

  async updateClaims(userId: string): Promise<void> {
    return;
  }

  // Methods - Invitations

  async createInvitation(content: Invitation): Promise<{ id: string }> {
    return {id: "OpEbLvZgsKwqVNnD8FzN"};
  }

  async getInvitationByCode(
    invitationCode: string,
  ): Promise<Document<Invitation>> {
    return {
      id: "1",
      path: "invitations/1",
      lastUpdate: new Date(),
      content: new Invitation({
        user: new UserRegistration({
          type: UserType.patient,
          disabled: false,
          dateOfBirth: new Date("1970-01-02"),
          clinician: "mockPatient",
          receivesInactivityReminders: true,
          receivesQuestionnaireReminders: true,
          receivesRecommendationUpdates: true,
          timeZone: "America/Los_Angeles",
        }),
        code: invitationCode,
      }),
    };
  }

  async enrollUserDirectly(
    userId: string,
    options: { isSingleSignOn: boolean },
  ): Promise<Document<User>> {
    return this.getUser(userId);
  }

  async enrollUser(
    invitation: Document<Invitation>,
    userId: string,
    options: any,
  ): Promise<Document<User>> {
    return this.getUser(userId);
  }

  async finishUserEnrollment(user: Document<User>): Promise<void> {
    return;
  }

  // Methods - Organizations

  async getOrganizationBySsoProviderId(
    providerId: string,
  ): Promise<Document<Organization> | undefined> {
    return undefined;
  }

  async getOrganizations(): Promise<Array<Document<Organization>>> {
    return [];
  }

  async getOrganization(
    organizationId: string,
  ): Promise<Document<Organization> | undefined> {
    return {
      id: organizationId,
      path: "organizations/" + organizationId,
      lastUpdate: new Date(),
      content: new Organization({
        name: "Stanford University",
        contactName: "Alex Sandhu, MD",
        phoneNumber: "+1 (650) 493-5000",
        emailAddress: "dothfteam@stanford.edu",
        ssoProviderId: "oidc.stanford",
      }),
    };
  }

  async deleteInvitation(invitation: Document<Invitation>): Promise<void> {
    return;
  }

  // Methods - User

  async disableUser(userId: string): Promise<void> {
    return;
  }

  async enableUser(userId: string): Promise<void> {
    return;
  }

  async getAllOwners(organizationId: string): Promise<Array<Document<User>>> {
    return [];
  }

  async getAllPatients(): Promise<Array<Document<User>>> {
    return [];
  }

  async getUser(userId: string): Promise<Document<User>> {
    return {
      id: userId,
      path: "users/" + userId,
      lastUpdate: new Date(),
      content: new User({
        type: UserType.clinician,
        disabled: false,
        dateOfBirth: new Date("1970-01-02"),
        clinician: "mockClinician",
        lastActiveDate: new Date("2024-04-04"),
        receivesInactivityReminders: true,
        receivesQuestionnaireReminders: true,
        receivesRecommendationUpdates: true,
        dateOfEnrollment: new Date("2024-04-02"),
        timeZone: "America/Los_Angeles",
      }),
    };
  }

  async updateLastActiveDate(userId: string): Promise<void> {
    return;
  }

  async deleteUser(userId: string): Promise<void> {
    return;
  }

  async deleteExpiredAccounts(): Promise<void> {
    return;
  }
}
