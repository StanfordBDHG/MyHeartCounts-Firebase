//
// This source file is part of the Stanford Biodesign Digital Health MyHeart Counts open-source project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2025 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { defineSecret } from 'firebase-functions/params'

enum SecretKey {
  OPENAI_API_KEY = 'OPENAI_API_KEY',
}

const openaiApiKey = defineSecret(SecretKey.OPENAI_API_KEY)

export function getOpenaiApiKey(): string {
  return openaiApiKey.value()
}

export function getOpenaiSecretKeys(): string[] {
  return [SecretKey.OPENAI_API_KEY]
}

export const openaiApiKeyParam: ReturnType<typeof defineSecret> = openaiApiKey
