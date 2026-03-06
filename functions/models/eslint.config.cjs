// This source file is part of the MyHeart Counts project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

const { getEslintConfig } = require('@stanfordspezi/spezi-web-configurations')

module.exports = [
  ...getEslintConfig({ tsconfigRootDir: __dirname }),
  {
    ignores: ['lib/**/*', 'node_modules/**/*'],
  },
]
