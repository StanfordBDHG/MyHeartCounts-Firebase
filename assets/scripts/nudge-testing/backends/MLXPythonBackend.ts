/** 
 This source file is part of the Stanford Biodesign Digital Health MyHeart Counts open-source project

 SPDX-FileCopyrightText: 2025 Stanford University

 SPDX-License-Identifier: MIT
*/

import { type ModelBackend, type GenerateOptions } from './ModelBackend.js'
import { type ModelConfig } from '../config/models.js'

interface PythonServiceResponse {
  response: string
  model_id: string
  error?: string
}

export class MLXPythonBackend implements ModelBackend {
  readonly modelId: string
  readonly provider = 'mlx-python' as const
  private serviceUrl: string

  constructor(config: ModelConfig, serviceUrl?: string) {
    this.modelId = config.id
    this.serviceUrl = serviceUrl || 'http://localhost:8000'
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    const timeout = options?.timeout || 120000

    try {
      const response = await fetch(`${this.serviceUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model_id: this.modelId,
          prompt: prompt,
          max_tokens: options?.maxTokens || 512,
          temperature: options?.temperature,
        }),
        signal: AbortSignal.timeout(timeout),
      })

      if (!response.ok) {
        throw new Error(`Python service error: ${response.status} ${response.statusText}`)
      }

      const data: PythonServiceResponse = await response.json()

      if (data.error) {
        throw new Error(`MLX model error: ${data.error}`)
      }

      let extracted = data.response
      if (extracted) {
        extracted = extracted
          .replace(/^```json\s*/i, '')  // Remove ```json at start
          .replace(/^```\s*/i, '')      // Remove ``` at start (if json wasn't there)
          .replace(/\s*```$/i, '')      // Remove ``` at end
          .trim()
      }

      return extracted
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
          throw new Error(`Request timeout after ${timeout / 1000} seconds`)
        }
        throw error
      }
      throw new Error(`Unknown error: ${String(error)}`)
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.serviceUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 second timeout for health check
      })
      return response.ok
    } catch {
      return false
    }
  }

  supportsModel(modelId: string): boolean {
    return modelId === this.modelId
  }
}

