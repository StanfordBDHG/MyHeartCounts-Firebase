/** 
 This source file is part of the Stanford Biodesign Digital Health MyHeart Counts open-source project

 SPDX-FileCopyrightText: 2025 Stanford University

 SPDX-License-Identifier: MIT
*/

import { type ModelProvider } from '../backends/ModelBackend.js'

export interface ModelConfig {
  id: string
  provider: ModelProvider
  displayName: string
  quantization?: string
  size?: string
  enabled: boolean
  config?: {
    apiKey?: string // For API-based providers
    endpoint?: string // For local/remote services
    timeout?: number // Generation timeout in seconds
    [key: string]: any // Allow provider-specific options
  }
}

export const MODEL_CONFIGS: ModelConfig[] = [
  // OpenAI models
  {
    id: 'gpt-5.2-2025-12-11',
    provider: 'openai',
    displayName: 'GPT-5.2',
    enabled: true,
    config: {
      timeout: 60,
    },
  },
  // MLX models
  {
    id: 'mlx-community/Llama-3.2-1B-Instruct-4bit',
    provider: 'mlx-python',
    displayName: 'Llama 3.2 1B Instruct 4bit',
    quantization: '4bit',
    size: '1B',
    enabled: true,
    config: {
      timeout: 60,
    },
  },
  {
    id: 'mlx-community/Llama-3.2-3B-Instruct-4bit',
    provider: 'mlx-python',
    displayName: 'Llama 3.2 3B Instruct 4bit',
    quantization: '4bit',
    size: '3B',
    enabled: true,
    config: {
      timeout: 120,
    },
  },
  {
    id: 'mlx-community/Phi-4-mini-instruct-4bit',
    provider: 'mlx-python',
    displayName: 'Phi-4 Mini Instruct 4bit',
    quantization: '4bit',
    size: '1B',
    enabled: true,
    config: {
      timeout: 60,
    },
  },
  {
    id: 'mlx-community/gemma-3-270m-it-4bit',
    provider: 'mlx-python',
    displayName: 'Gemma 3 270M IT 4bit',
    quantization: '4bit',
    size: '270M',
    enabled: true,
    config: {
      timeout: 60,
    },
  },
  {
    id: 'mlx-community/gemma-3-1b-it-qat-4bit',
    provider: 'mlx-python',
    displayName: 'Gemma 3 1B IT QAT 4bit',
    quantization: 'qat-4bit',
    size: '1B',
    enabled: true,
    config: {
      timeout: 60,
    },
  },
  {
    id: 'mlx-community/gemma-3-4b-it-qat-4bit',
    provider: 'mlx-python',
    displayName: 'Gemma 3 4B IT QAT 4bit',
    quantization: 'qat-4bit',
    size: '4B',
    enabled: true,
    config: {
      timeout: 120,
    },
  },
  {
    id: 'mlx-community/Qwen2.5-0.5B-Instruct-4bit',
    provider: 'mlx-python',
    displayName: 'Qwen2.5 0.5B Instruct 4bit',
    quantization: '4bit',
    size: '0.5B',
    enabled: true,
    config: {
      timeout: 60,
    },
  },
  {
    id: 'mlx-community/Qwen2.5-1.5B-Instruct-4bit',
    provider: 'mlx-python',
    displayName: 'Qwen2.5 1.5B Instruct 4bit',
    quantization: '4bit',
    size: '1.5B',
    enabled: true,
    config: {
      timeout: 60,
    },
  },
  {
    id: 'mlx-community/Qwen2.5-3B-Instruct-4bit',
    provider: 'mlx-python',
    displayName: 'Qwen2.5 3B Instruct 4bit',
    quantization: '4bit',
    size: '3B',
    enabled: true,
    config: {
      timeout: 120,
    },
  },
  {
    id: 'mlx-community/Qwen3-4B-Instruct-2507-4bit',
    provider: 'mlx-python',
    displayName: 'Qwen3 4B Instruct 4bit',
    quantization: '4bit',
    size: '4B',
    enabled: true,
    config: {
      timeout: 120,
    },
  },
  {
    id: 'mlx-community/DeepSeek-R1-Distill-Qwen-1.5B-4bit',
    provider: 'mlx-python',
    displayName: 'DeepSeek R1 Distill Qwen 1.5B 4bit',
    quantization: '4bit',
    size: '1.5B',
    enabled: true,
    config: {
      timeout: 60,
    },
  },
  {
    id: 'mlx-community/Ministral-3-3B-Instruct-2512-4bit',
    provider: 'mlx-python',
    displayName: 'Ministral 3 3B Instruct 4bit',
    quantization: '4bit',
    size: '3B',
    enabled: true,
    config: {
      timeout: 120,
    },
  },
  {
    id: 'mlx-community/SmolLM2-360M-Instruct',
    provider: 'mlx-python',
    displayName: 'SmolLM2 360M Instruct',
    size: '360M',
    enabled: true,
    config: {
      timeout: 60,
    },
  },
  {
    id: 'mlx-community/SmolLM2-1.7B-Instruct',
    provider: 'mlx-python',
    displayName: 'SmolLM2 1.7B Instruct',
    size: '1.7B',
    enabled: true,
    config: {
      timeout: 60,
    },
  },
  {
    id: 'mlx-community/SmolLM3-3B-4bit',
    provider: 'mlx-python',
    displayName: 'SmolLM3 3B 4bit',
    quantization: '4bit',
    size: '3B',
    enabled: true,
    config: {
      timeout: 120,
    },
  },
  // SecureGPT models
  {
    id: 'gpt-5',
    provider: 'securegpt',
    displayName: 'SecureGPT GPT-5',
    enabled: true,
    config: {
      timeout: 120,
      deploymentName: 'gpt-5',
      apiVersion: '2024-12-01-preview',
    },
  },
  {
    id: 'gpt-5-mini',
    provider: 'securegpt',
    displayName: 'SecureGPT GPT-5 Mini',
    enabled: true,
    config: {
      timeout: 120,
      deploymentName: 'gpt-5-mini',
      apiVersion: '2024-12-01-preview',
    },
  },
  {
    id: 'gpt-5-nano',
    provider: 'securegpt',
    displayName: 'SecureGPT GPT-5 Nano',
    enabled: true,
    config: {
      timeout: 120,
      deploymentName: 'gpt-5-nano',
      apiVersion: '2024-12-01-preview',
    },
  },
  {
    id: 'gemini-2.5-pro',
    provider: 'securegpt',
    displayName: 'SecureGPT Gemini 2.5 Pro',
    enabled: true,
    config: {
      timeout: 120,
      endpoint: 'https://apim.stanfordhealthcare.org/gemini-25-pro/gemini-25-pro',
    },
  },
]

