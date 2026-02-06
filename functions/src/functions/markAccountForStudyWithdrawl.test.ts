//
// This source file is part of the Stanford Biodesign Digital Health MyHeart Counts open-source project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2025 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { expect } from "chai";
import type { https } from "firebase-functions/v2";
import { it } from "mocha";
import { markAccountForStudyWithdrawal } from "./markAccountForStudyWithdrawl.js";
import { describeWithEmulators } from "../tests/functions/testEnvironment.js";
import { expectError } from "../tests/helpers.js";

describeWithEmulators("function: markAccountForStudyWithdrawal", (env) => {
  it("marks user for study withdrawal successfully", async () => {
    const userId = await env.createUser({});

    const result = await env.call(
      markAccountForStudyWithdrawal,
      {},
      { uid: userId },
    );

    expect(result.success).to.be.true;
    expect(result.withdrawnAt).to.be.a("string");
    expect(new Date(result.withdrawnAt).getTime()).to.be.lessThanOrEqual(
      Date.now(),
    );
  });

  it("throws error when user account not found", async () => {
    const authUser = await env.auth.createUser({});

    await expectError(
      () => env.call(markAccountForStudyWithdrawal, {}, { uid: authUser.uid }),
      (error) => {
        const httpsError = error as https.HttpsError;
        expect(httpsError.code).to.equal("not-found");
      },
    );
  });

  it("throws error when user account is disabled", async () => {
    const userId = await env.createUser({ disabled: true });

    await expectError(
      () => env.call(markAccountForStudyWithdrawal, {}, { uid: userId }),
      (error) => {
        const httpsError = error as https.HttpsError;
        expect(httpsError.code).to.equal("failed-precondition");
      },
    );
  });
});
