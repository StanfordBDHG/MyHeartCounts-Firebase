/** 
 This source file is part of the Stanford Biodesign Digital Health MyHeart Counts open-source project

 SPDX-FileCopyrightText: 2025 Stanford University

 SPDX-License-Identifier: MIT
*/

import { type ModelBackend, type GenerateOptions } from './ModelBackend.js'
import { type ModelConfig } from '../config/models.js'

interface SecureGPTModelInfo {
  endpoint: string
  apiVersion?: string
  modelType: 'openai' | 'gemini' | 'llama'
  deploymentName?: string
}

export class SecureGPTBackend implements ModelBackend {
  readonly modelId: string
  readonly provider = 'securegpt' as const
  private apiKey: string
  private modelInfo: SecureGPTModelInfo

  constructor(config: ModelConfig, apiKey: string) {
    this.modelId = config.id
    this.apiKey = apiKey

    // Get model info from config or determine from model ID
    this.modelInfo = this.getModelInfo(config)
  }

  private getModelInfo(config: ModelConfig): SecureGPTModelInfo {
    // Check if endpoint is explicitly configured
    if (config.config?.endpoint) {
      // Determine model type from endpoint pattern
      if (config.config.endpoint.includes('gemini')) {
        return {
          endpoint: config.config.endpoint,
          modelType: 'gemini',
        }
      } else if (config.config.endpoint.includes('llama')) {
        return {
          endpoint: config.config.endpoint,
          modelType: 'llama',
        }
      } else {
        return {
          endpoint: config.config.endpoint,
          apiVersion: config.config.apiVersion || '2024-12-01-preview',
          modelType: 'openai',
          deploymentName: config.config.deploymentName || config.id,
        }
      }
    }

    // Auto-detect from model ID
    const modelId = config.id.toLowerCase()

    if (modelId.includes('gemini')) {
      return {
        endpoint: 'https://apim.stanfordhealthcare.org/gemini-25-pro/gemini-25-pro',
        modelType: 'gemini',
      }
    } else if (modelId.includes('llama')) {
      if (modelId.includes('maverick')) {
        return {
          endpoint: 'https://apim.stanfordhealthcare.org/llama4-maverick/v1/chat/completions',
          modelType: 'llama',
        }
      } else if (modelId.includes('scout')) {
        return {
          endpoint: 'https://apim.stanfordhealthcare.org/llama4-scout/v1/chat/completions',
          modelType: 'llama',
        }
      }
    }

    // Default to OpenAI
    const deploymentName = this.getDeploymentName(config.id)
    const apiVersion = this.getApiVersion(config.id)

    return {
      endpoint: `https://apim.stanfordhealthcare.org/openai-eastus2/deployments/${deploymentName}/chat/completions`,
      apiVersion,
      modelType: 'openai',
      deploymentName,
    }
  }

  private getDeploymentName(modelId: string): string {
    // Map model IDs to deployment names
    const mapping: Record<string, string> = {
      'gpt-5': 'gpt-5',
      'gpt-5-mini': 'gpt-5-mini',
      'gpt-5-nano': 'gpt-5-nano',
      'gpt-4o-mini': 'gpt-4o-mini',
      'gpt-4.1-nano': 'gpt-4.1-nano',
    }

    const lowerId = modelId.toLowerCase()
    for (const [key, value] of Object.entries(mapping)) {
      if (lowerId.includes(key)) {
        return value
      }
    }

    // Default fallback
    return modelId
  }

  private getApiVersion(modelId: string): string {
    const lowerId = modelId.toLowerCase()
    if (lowerId.includes('gpt-5')) {
      return '2024-12-01-preview'
    }
    if (lowerId.includes('gpt-4')) {
      return '2025-04-01-preview'
    }
    // Default
    return '2024-12-01-preview'
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    const timeout = options?.timeout || 120000

    try {
      let response: Response

      switch (this.modelInfo.modelType) {
        case 'openai':
          response = await this.generateOpenAIStyle(prompt, options)
          break
        case 'gemini':
          response = await this.generateGeminiStyle(prompt, options)
          break
        case 'llama':
          response = await this.generateLlamaStyle(prompt, options)
          break
        default:
          throw new Error(`Unsupported SecureGPT model type: ${this.modelInfo.modelType}`)
      }

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`SecureGPT API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()
      return this.extractResponse(data, this.modelInfo.modelType)
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

  private async generateOpenAIStyle(
    prompt: string,
    options: GenerateOptions | undefined,
  ): Promise<Response> {
    const url = this.modelInfo.apiVersion
      ? `${this.modelInfo.endpoint}?api-version=${this.modelInfo.apiVersion}`
      : this.modelInfo.endpoint

    const isGPT5 = this.modelId.toLowerCase().includes('gpt-5')

    // Build messages array
    const messages = [
      {
        role: 'user',
        content: prompt,
      },
    ]

    // GPT-5 doesn't require model field in body (deployment is in URL)
    // GPT-4 models may require it depending on API version
    const body: any = {
      messages,
    }
    
    // Only include model field for non-GPT-5 models if needed
    if (!isGPT5) {
      body.model = this.modelInfo.deploymentName || this.modelId
    }

    // GPT-5 uses max_completion_tokens, GPT-4 uses max_tokens
    if (isGPT5) {
      if (options?.maxTokens) {
        // Increase limit significantly: 8x the requested amount, minimum 4096, to ensure we get actual content
        body.max_completion_tokens = Math.max(options.maxTokens * 8, 4096)
      }
    } else {
      if (options?.maxTokens) {
        body.max_tokens = options.maxTokens
      }
      if (options?.temperature !== undefined) {
        body.temperature = options.temperature
      }
    }

    body.response_format = {
      type: 'json_schema',
      json_schema: {
        name: 'nudge_messages',
        schema: {
          type: 'object',
          properties: {
            nudges: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: {
                    type: 'string',
                    description: 'Short summary/call to action for the push notification',
                  },
                  body: {
                    type: 'string',
                    description: 'Motivational message content for the push notification',
                  },
                },
                required: ['title', 'body'],
                additionalProperties: false,
              },
              minItems: 7,
              maxItems: 7,
              description: 'Exactly 7 nudge messages',
            },
          },
          required: ['nudges'],
          additionalProperties: false,
        },
      },
    }

    // Add any additional options (excluding those already handled)
    if (options) {
      Object.keys(options).forEach(key => {
        if (key !== 'maxTokens' && key !== 'temperature' && key !== 'timeout' && key !== 'response_format') {
          body[key] = options[key]
        }
      })
    }

    const timeout = options?.timeout || 120000
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
    })
    
    return response
  }

  private async generateGeminiStyle(
    prompt: string,
    options: GenerateOptions | undefined,
  ): Promise<Response> {
    const requestTimeout = options?.timeout || 120000
    const body: any = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generation_config: {},
    }

    if (options?.maxTokens) {
      // Increase token limit significantly for Gemini to account for reasoning tokens
      // Use at least 4096 tokens, or 8x the requested amount, whichever is larger
      body.generation_config.max_output_tokens = Math.max(options.maxTokens * 8, 4096)
    } else {
      body.generation_config.max_output_tokens = 4096
    }
    if (options?.temperature !== undefined) {
      body.generation_config.temperature = options.temperature
    }

    // Add any additional generation config options
    if (options) {
      Object.keys(options).forEach(key => {
        if (key !== 'maxTokens' && key !== 'temperature' && key !== 'timeout') {
          if (!body.generation_config) {
            body.generation_config = {}
          }
          body.generation_config[key] = options[key]
        }
      })
    }

    const timeout = options?.timeout || 120000
    
    const response = await fetch(this.modelInfo.endpoint, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
    })
    
    return response
  }

  private async generateLlamaStyle(
    prompt: string,
    options: GenerateOptions | undefined,
  ): Promise<Response> {
    const body: any = {
      model: this.getLlamaModelName(),
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }

    if (options?.maxTokens) {
      body.max_tokens = options.maxTokens
    }
    if (options?.temperature !== undefined) {
      body.temperature = options.temperature
    }

    // Add any additional options
    if (options) {
      Object.keys(options).forEach(key => {
        if (key !== 'maxTokens' && key !== 'temperature' && key !== 'timeout') {
          body[key] = options[key]
        }
      })
    }

    const timeout = options?.timeout || 120000
    
    const response = await fetch(this.modelInfo.endpoint, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
    })
    
    return response
  }

  private getLlamaModelName(): string {
    const modelId = this.modelId.toLowerCase()
    if (modelId.includes('maverick')) {
      return 'Llama-4-Maverick-17B-128E-Instruct-FP8'
    } else if (modelId.includes('scout')) {
      return 'Llama-4-Scout-17B-16E-Instruct'
    }
    return this.modelId
  }

  private extractResponse(data: any, modelType: string): string {
    switch (modelType) {
      case 'openai':
        return data.choices?.[0]?.message?.content || ''
      case 'gemini':
        // Handle different response structures
        let extracted = ''
        
        // Standard Gemini API format: data.candidates[0].content.parts[0].text
        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
          extracted = data.candidates[0].content.parts[0].text
        }
        // Handle array response (if API returns array directly)
        // Gemini may split responses across multiple array elements, so we need to concatenate them
        else if (Array.isArray(data) && data.length > 0) {
          // Concatenate text from all array elements
          const textParts: string[] = []
          for (const element of data) {
            if (element.candidates?.[0]?.content?.parts?.[0]?.text) {
              textParts.push(element.candidates[0].content.parts[0].text)
            } else if (element.content?.parts?.[0]?.text) {
              textParts.push(element.content.parts[0].text)
            } else if (typeof element === 'string') {
              textParts.push(element)
            }
          }
          extracted = textParts.join('')
        }
        // Handle object with numeric key (e.g., {"0": {...}})
        else if (data['0']) {
          const element = data['0']
          if (element.candidates?.[0]?.content?.parts?.[0]?.text) {
            extracted = element.candidates[0].content.parts[0].text
          } else if (element.content?.parts?.[0]?.text) {
            extracted = element.content.parts[0].text
          } else if (typeof element === 'string') {
            extracted = element
          }
        }
        
        if (extracted) {
          extracted = extracted
            .replace(/^```json\s*/i, '')  // Remove ```json at start
            .replace(/^```\s*/i, '')    // Remove ``` at start (if json wasn't there)
            .replace(/\s*```$/i, '')     // Remove ``` at end
            .trim()
        }
        
        return extracted
      case 'llama':
        return data.choices?.[0]?.message?.content || ''
      default:
        throw new Error(`Unknown model type: ${modelType}`)
    }
  }

  supportsModel(modelId: string): boolean {
    return modelId === this.modelId
  }
}

