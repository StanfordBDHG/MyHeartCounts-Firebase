//
// This source file is part of the MyHeartCounts-Firebase project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

// Small helper function to inject the current functions version to the backend generated FHIR Observations

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface PackageJson {
  version: string;
}

let cachedVersion: string | undefined;

export const getPackageVersion = (): string => {
  if (cachedVersion) {
    return cachedVersion;
  }

  try {
    const packageJsonPath = join(__dirname, "../../package.json");
    const packageJsonContent = readFileSync(packageJsonPath, "utf-8");
    const packageJson = JSON.parse(packageJsonContent) as PackageJson;
    cachedVersion = packageJson.version;
    return cachedVersion;
  } catch (error) {
    console.error("Failed to read package.json version:", error);
    return "unknown";
  }
};
