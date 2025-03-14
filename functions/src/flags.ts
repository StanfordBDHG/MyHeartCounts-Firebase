//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

/* eslint-disable @typescript-eslint/no-namespace */

export namespace Flags {
  export const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
  export const requireInvitationOrganizationToMatchSsoProviderId = false;
}
