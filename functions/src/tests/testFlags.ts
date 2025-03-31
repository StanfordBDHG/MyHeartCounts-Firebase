//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

/* eslint-disable @typescript-eslint/no-namespace */

export namespace TestFlags {
  export const forceRunDisabledTests =
    process.env.FORCE_RUN_DISABLED_TESTS === 'true'
  export const forceRunExpensiveTests =
    process.env.FORCE_RUN_EXPENSIVE_TESTS === 'true'
  export const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true'
  export const regenerateValues = process.env.REGENERATE_VALUES === 'true'
  export const connectsToEmulator = process.env.EMULATORS_ACTIVE === 'true' || process.env.FUNCTIONS_EMULATOR === 'true'
}
