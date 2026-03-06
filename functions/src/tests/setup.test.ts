// This source file is part of the MyHeart Counts project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT
import { expect } from "chai";

describe("setup", () => {
  it("should always be using UTC timezone", () => {
    expect(new Date().getTimezoneOffset()).to.equal(0);
  });
});
