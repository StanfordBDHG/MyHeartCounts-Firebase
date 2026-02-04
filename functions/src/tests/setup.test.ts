//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//
import { expect } from "chai";

describe("setup", () => {
  it("should always be using UTC timezone", () => {
    expect(new Date().getTimezoneOffset()).to.equal(0);
  });
});
