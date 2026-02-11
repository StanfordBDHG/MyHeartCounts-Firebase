//
// This source file is part of the MyHeartCounts-Firebase project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { expect } from "chai";
import { describe, it } from "mocha";
import { getPackageVersion } from "../../helpers/packageVersion.js";

describe("getPackageVersion", () => {
  it("should return a valid version string", () => {
    const version = getPackageVersion();
    expect(version).to.be.a("string");
    expect(version).to.match(/^\d+\.\d+\.\d+$/);
  });

  it("should cache the version on subsequent calls", () => {
    const version1 = getPackageVersion();
    const version2 = getPackageVersion();
    expect(version1).to.equal(version2);
  });

  it("should return the version from package.json", () => {
    const version = getPackageVersion();
    expect(version).to.equal("0.1.1");
  });
});
