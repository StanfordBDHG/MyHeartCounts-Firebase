// This source file is part of the MyHeart Counts project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { expect } from "chai";
import { describe, it } from "mocha";
import { getPackageVersion } from "../../helpers/packageVersion.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("getPackageVersion", () => {
  it("should return a valid version string", () => {
    const version = getPackageVersion();
    expect(version).to.be.a("string");
    expect(version).to.match(/^\d+\.\d+\.\d+(-[\w.]+)?$/);
  });

  it("should cache the version on subsequent calls", () => {
    const version1 = getPackageVersion();
    const version2 = getPackageVersion();
    expect(version1).to.equal(version2);
  });

  it("should return the version from package.json", () => {
    const packageJsonPath = join(__dirname, "../../../package.json");
    const { version: expectedVersion } = JSON.parse(
      readFileSync(packageJsonPath, "utf-8"),
    ) as { version: string };
    expect(getPackageVersion()).to.equal(expectedVersion);
  });
});
