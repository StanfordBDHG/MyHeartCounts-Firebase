//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

const { getEslintConfig } = require('@stanfordspezi/spezi-web-configurations')

module.exports = [
  ...getEslintConfig({ tsconfigRootDir: __dirname }),
  {
    ignores: ['lib/**/*', 'node_modules/**/*'],
  },
]
