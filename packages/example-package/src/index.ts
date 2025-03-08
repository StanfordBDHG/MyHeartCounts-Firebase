//
// This source file is part of the Stanford Biodesign Digital Health Next.js Template open-source project
//
// SPDX-FileCopyrightText: 2023 Stanford University and the project authors (see CONTRIBUTORS.md)
//
// SPDX-License-Identifier: MIT
//

/**
 * Docs for Example module
 * @packageDocumentation
 */

/**
 * Docs for `generateGreeting` function.
 */
export function generateGreeting(): Greeting {
  return {
    message: 'Welcome',
    project: 'Stanford Biodesign Digital Health Next.js Template',
  }
}

/**
 * A greeting with a message and a proejct name.
 */
export interface Greeting {
  message: string
  project: string
}
