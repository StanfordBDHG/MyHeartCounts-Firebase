// This source file is part of the MyHeart Counts project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

import { expect } from "chai";

export const expectError = async <T>(
  func: () => T | Promise<T>,
  check: (error: unknown) => void,
): Promise<void> => {
  try {
    await func();
    expect.fail("Expected an error to be thrown");
  } catch (error) {
    check(error);
  }
};
