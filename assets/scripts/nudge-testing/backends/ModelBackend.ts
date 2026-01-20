/** 
 This source file is part of the Stanford Biodesign Digital Health MyHeart Counts open-source project

 SPDX-FileCopyrightText: 2025 Stanford University

 SPDX-License-Identifier: MIT
*/

export interface GenerateOptions {
  maxTokens?: number
  temperature?: number
  // Extensible for provider-specific options
  [key: string]: any
}

export type ModelProvider = 'openai' | 'mlx-python' | 'securegpt'

export interface ModelBackend {
  readonly modelId: string
  readonly provider: ModelProvider
  generate(prompt: string, options?: GenerateOptions): Promise<string>
  supportsModel(modelId: string): boolean
}

