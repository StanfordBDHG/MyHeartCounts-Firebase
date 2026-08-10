// This source file is part of the My Heart Counts Firebase open-source project
//
// SPDX-FileCopyrightText: 2025, 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

const { getEslintNodeConfig } = require('@stanfordspezi/spezi-web-configurations')

module.exports = [
  ...getEslintNodeConfig({ tsconfigRootDir: __dirname }),
  {
    ignores: ['lib/**/*', 'node_modules/**/*'],
  },
]
