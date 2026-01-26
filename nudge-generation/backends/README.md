<!-- 
This source file is part of the Stanford Biodesign Digital Health MyHeart Counts open-source project
SPDX-FileCopyrightText: 2025 Stanford University and the project authors (see CONTRIBUTORS.md)
SPDX-License-Identifier: MIT
-->

# Backend Implementations

This directory contains the backend abstraction layer for supporting multiple LLM providers.

## Architecture

The backend system uses a factory pattern to create appropriate backend instances based on model configuration:

- **ModelBackend** - Interface defining the contract for all backends
- **BackendFactory** - Factory class that creates backend instances
- **OpenAIBackend** - Implementation for OpenAI API
- **MLXPythonBackend** - Implementation for MLX models via Python service
- **SecureGPTBackend** - Implementation for SecureGPT API (supports OpenAI-style, Gemini, and Llama models)

## Adding a New Backend

To add support for a new model provider (e.g., Claude, Gemini):

### 1. Update ModelProvider Type

Edit `ModelBackend.ts` to add the new provider:

```typescript
export type ModelProvider = 'openai' | 'mlx-python' | 'securegpt' | 'claude' | 'gemini' | 'your-new-provider'
```

### 2. Create Backend Implementation

Create a new file `YourNewBackend.ts`:

```typescript
import { type ModelBackend, type GenerateOptions } from './ModelBackend.js'
import { type ModelConfig } from '../config/models.js'

export class YourNewBackend implements ModelBackend {
  readonly modelId: string
  readonly provider = 'your-new-provider' as const

  constructor(config: ModelConfig, apiKey?: string) {
    this.modelId = config.id
    // Initialize your backend here
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    // Implement generation logic
    // Return the generated text as a string
  }

  supportsModel(modelId: string): boolean {
    return modelId === this.modelId
  }
}
```

### 3. Update BackendFactory

Edit `BackendFactory.ts` to add your backend:

```typescript
import { YourNewBackend } from './YourNewBackend.js'

export class BackendFactory {
  static create(config: ModelConfig, openAIApiKey?: string, pythonServiceUrl?: string, secureGPTApiKey?: string): ModelBackend {
    switch (config.provider) {
      // ... existing cases
      case 'your-new-provider':
        return new YourNewBackend(config, apiKey)
      // ...
    }
  }
}
```

**Note:** The factory method signature includes separate API key parameters for different providers. If your backend requires a different API key parameter, you may need to update the factory signature and the main script that calls it.

### 4. Add Model Configurations

Edit `config/models.ts` to add model definitions:

```typescript
{
  id: 'your-model-id',
  provider: 'your-new-provider',
  displayName: 'Your Model Name',
  enabled: true,
  config: {
    // Provider-specific configuration
    apiKey: process.env.YOUR_API_KEY,
    timeout: 60,
  },
}
```

### 5. Update Provider Type in Config

If needed, update the `ModelProvider` type in `config/models.ts` to include your new provider.

## Backend Interface Requirements

All backends must implement the `ModelBackend` interface:

- `modelId: string` - The model identifier
- `provider: ModelProvider` - The provider type
- `generate(prompt: string, options?: GenerateOptions): Promise<string>` - Generate text from prompt
- `supportsModel(modelId: string): boolean` - Check if backend supports a model

## GenerateOptions

The `GenerateOptions` interface is extensible and supports:

- `maxTokens?: number` - Maximum tokens to generate
- `temperature?: number` - Generation temperature
- `[key: string]: any` - Additional provider-specific options

Backends can accept custom options via the `GenerateOptions` parameter.

## Error Handling

Backends should throw errors that will be caught by the main script. The main script will:
- Log the error
- Continue with other models/permutations
- Include the error in the CSV output

## SecureGPT Backend

The `SecureGPTBackend` is a special implementation that supports multiple model types through a single API:

- **OpenAI-style models** (e.g., GPT-5, GPT-4) - Uses OpenAI-compatible API format
- **Gemini models** - Uses Google Gemini API format
- **Llama models** - Uses Llama API format

### Features

- Auto-detects model type from model ID or endpoint configuration
- Supports custom endpoints via `config.endpoint`
- Uses `Ocp-Apim-Subscription-Key` header for authentication
- Handles different API versions (e.g., `2024-12-01-preview` for GPT-5, `2025-04-01-preview` for GPT-4)
- Automatically adjusts token limits for models that use reasoning tokens (e.g., GPT-5, Gemini)

### Configuration Example

```typescript
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
}
```

For Gemini models with custom endpoints:

```typescript
{
  id: 'gemini-2.5-pro',
  provider: 'securegpt',
  displayName: 'SecureGPT Gemini 2.5 Pro',
  enabled: true,
  config: {
    timeout: 120,
    endpoint: 'https://apim.stanfordhealthcare.org/gemini-25-pro/gemini-25-pro',
  },
}
```

## Testing

When adding a new backend:
1. Test with a single model and small sample: `--model <model-id> --sample 1`
2. Verify error handling by testing with invalid credentials/config
3. Check CSV output includes correct model metadata

