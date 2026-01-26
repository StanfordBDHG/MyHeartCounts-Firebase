/** 
 This source file is part of the Stanford Biodesign Digital Health MyHeart Counts open-source project

 SPDX-FileCopyrightText: 2025 Stanford University

 SPDX-License-Identifier: MIT
*/

import { type ModelBackend } from './ModelBackend.js'
import { type ModelConfig } from '../config/models.js'
import { OpenAIBackend } from './OpenAIBackend.js'
import { MLXPythonBackend } from './MLXPythonBackend.js'
import { SecureGPTBackend } from './SecureGPTBackend.js'

export class BackendFactory {
  static create(config: ModelConfig, openAIApiKey?: string, pythonServiceUrl?: string, secureGPTApiKey?: string): ModelBackend {
    switch (config.provider) {
      case 'openai':
        if (!openAIApiKey) {
          throw new Error('OpenAI API key is required for OpenAI models')
        }
        return new OpenAIBackend(config, openAIApiKey)
      case 'mlx-python':
        return new MLXPythonBackend(config, pythonServiceUrl)
      case 'securegpt':
        if (!secureGPTApiKey) {
          throw new Error('SecureGPT API key is required for SecureGPT models')
        }
        return new SecureGPTBackend(config, secureGPTApiKey)
      default:
        throw new Error(`Unsupported provider: ${config.provider}`)
    }
  }
}

