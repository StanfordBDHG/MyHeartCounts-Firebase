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
import { markAccountForStudyReenrollment } from "./markAccountForStudyReenrollment.js";
import { describeWithEmulators } from "../tests/functions/testEnvironment.js";
import { expectError } from "../tests/helpers.js";

describeWithEmulators("function: markAccountForStudyReenrollment", (env) => {
  it("re-enrolls user in study successfully", async () => {
    const userId = await env.createUser({});

    // First withdraw from study...
    await env.factory.user().markAccountForStudyWithdrawal(userId, new Date());

    // ... then re-enroll!
    const result = await env.call(
      markAccountForStudyReenrollment,
      {},
      { uid: userId },
    );

    expect(result.success).to.equal(true);
    expect(result.reenrolledAt).to.be.a("string");
    const reenrolledTime = new Date(result.reenrolledAt).getTime();
    expect(reenrolledTime).to.be.lessThanOrEqual(Date.now());
  });

  it("throws error when user account not found", async () => {
    const authUser = await env.auth.createUser({});

    await expectError(
      () =>
        env.call(markAccountForStudyReenrollment, {}, { uid: authUser.uid }),
      (error) => {
        const httpsError = error as https.HttpsError;
        expect(httpsError.code).to.equal("not-found");
      },
    );
  });

  it("throws error when user account is disabled", async () => {
    const userId = await env.createUser({ disabled: true });

    await expectError(
      () => env.call(markAccountForStudyReenrollment, {}, { uid: userId }),
      (error) => {
        const httpsError = error as https.HttpsError;
        expect(httpsError.code).to.equal("failed-precondition");
      },
    );
  });
});
