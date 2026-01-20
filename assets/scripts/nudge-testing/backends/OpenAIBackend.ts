/** 
 This source file is part of the Stanford Biodesign Digital Health MyHeart Counts open-source project

 SPDX-FileCopyrightText: 2025 Stanford University

 SPDX-License-Identifier: MIT
*/

import OpenAI from 'openai'
import { type ModelBackend, type GenerateOptions } from './ModelBackend.js'
import { type ModelConfig } from '../config/models.js'

export class OpenAIBackend implements ModelBackend {
  readonly modelId: string
  readonly provider = 'openai' as const
  private openai: OpenAI

  constructor(config: ModelConfig, openAIApiKey: string) {
    this.modelId = config.id
    this.openai = new OpenAI({
      apiKey: openAIApiKey,
    })
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    const timeout = options?.timeout || 120000
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await this.openai.chat.completions.create(
        {
          model: this.modelId,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: options?.maxTokens,
          temperature: options?.temperature,
          response_format: {
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
          },
        },
        {
          signal: controller.signal,
        },
      )

      clearTimeout(timeoutId)
      return response.choices[0].message.content || ''
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${timeout / 1000} seconds`)
        }
        throw error
      }
      throw new Error(`Unknown error: ${String(error)}`)
    }
  }

  supportsModel(modelId: string): boolean {
    return modelId === this.modelId
  }
}

