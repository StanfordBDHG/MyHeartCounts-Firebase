<!-- 
This source file is part of the Stanford Biodesign Digital Health MyHeart Counts open-source project
SPDX-FileCopyrightText: 2025 Stanford University and the project authors (see CONTRIBUTORS.md)
SPDX-License-Identifier: MIT
-->

# Nudge Permutation Testing Script

This script generates all possible permutations of the personalization context used in the `planNudges.ts` function and captures the LLM responses for analysis. It supports multiple model backends including OpenAI API and local MLX models.

## Context Variables Tested

This is an overview of what can be tested:

- **genderIdentity**: 'male', 'female'
- **ageGroup**: '<35', '35-50', '51-65', '>65'
- **disease**: null, 'Heart failure', 'Pulmonary arterial hypertension', 'Diabetes', 'ACHD (simple)', 'ACHD (complex)'
- **stateOfChange**: null, 'Precontemplation', 'Contemplation', 'Preparation', 'Action', 'Maintenance'
- **educationLevel**: 'Highschool', 'college', 'collage'
- **language**: 'en', 'es'
- **preferredWorkoutTypes**: 'run,walk', 'HIIT,strength', 'swim,bicycle', 'yoga/pilates,walk', 'sport,run,strength', 'other', 'other,walk,run', 'other,HIIT,walk,swim,run,sport,strength,bicycle,yoga/pilates'
- **preferredNotificationTime**: '7:00 AM', '12:00 PM', '6:00 PM'

Total permutations: 2 × 4 × 6 × 6 × 3 × 2 × 8 × 3 = **13,824 combinations**

## Setup

### 1. Install Node.js Dependencies

```bash
cd assets/scripts/nudge-testing
npm install
```

### 2. Set API Keys

**For OpenAI models:**
```bash
export OPENAI_API_KEY="your-api-key-here"
```

**For SecureGPT models:**
```bash
export SECUREGPT_API_KEY="your-securegpt-api-key-here"
```

### 3. Setup Python Service (for MLX models)

If you want to test MLX models, you need to set up the Python service:

1. **Install Python dependencies:**
   ```bash
   cd python_service
   pip install -r requirements.txt
   ```

2. **Note:** MLX models require Apple Silicon (M1/M2/M3) Mac. The models will be automatically downloaded from Hugging Face on first use.

3. **Start the Python service:**
   ```bash
   npm run start:python-service
   ```
   
   Or manually:
   ```bash
   cd python_service
   python mlx_service.py
   ```
   
   The service will run on `http://localhost:8000` by default.

## Running the Test

### Basic Usage (OpenAI - Default)

By default, the script uses OpenAI models (backward compatible):

```bash
npm run test              # Full test with all permutations
npm run test:sample       # Sample test with 10 permutations
npm run test:random       # Random sample of 10 permutations
```

### Testing MLX Models

To test MLX models, first ensure the Python service is running, then:

```bash
# Test MLX models with sample
npm run test:mlx

# Or manually specify provider
npm run build && node dist/generateNudgePermutations.js --provider mlx-python --sample 5
```

### Testing SecureGPT Models

To test SecureGPT models (GPT-5, Gemini 2.5 Pro, etc.):

```bash
# Test SecureGPT GPT-5
npm run build && node dist/generateNudgePermutations.js --model gpt-5 --sample 5

# Test SecureGPT Gemini 2.5 Pro
npm run build && node dist/generateNudgePermutations.js --model gemini-2.5-pro --sample 5

# Test all SecureGPT models
npm run build && node dist/generateNudgePermutations.js --provider securegpt --sample 10
```

### Testing All Models

To test all available models:

```bash
npm run build && node dist/generateNudgePermutations.js --provider all --sample 10
```

### Command Line Arguments

The script supports the following CLI arguments:

- `--sample <number>` - Test a specific number of permutations (default: 10 if not specified)
- `--random` - Randomly select permutations instead of sequential
- `--model <model-id>` - Test a single specific model (e.g., `--model mlx-community/Llama-3.2-1B-Instruct-4bit`)
- `--models <id1,id2,...>` - Test multiple specific models (comma-separated)
- `--provider <provider-name|all>` - Filter by provider:
  - `openai` - Only OpenAI models
  - `mlx-python` - Only MLX models
  - `securegpt` - Only SecureGPT models (GPT-5, Gemini 2.5 Pro, etc.)
  - `all` - All available models (default if provider is specified)
- `--python-service-url <url>` - Override Python service URL (default: http://localhost:8000)
- `--timeout <seconds>` - Override default generation timeout (default: 60s)

### Examples

```bash
# Test specific MLX model with 5 permutations
npm run build && node dist/generateNudgePermutations.js --model mlx-community/SmolLM2-360M-Instruct --sample 5

# Test multiple models
npm run build && node dist/generateNudgePermutations.js --models "gpt-5.2-2025-12-11,mlx-community/Llama-3.2-1B-Instruct-4bit" --sample 10

# Test all MLX models with random sampling
npm run build && node dist/generateNudgePermutations.js --provider mlx-python --sample 20 --random

# Custom Python service URL
npm run build && node dist/generateNudgePermutations.js --provider mlx-python --python-service-url http://localhost:9000

# Test SecureGPT GPT-5
npm run build && node dist/generateNudgePermutations.js --model gpt-5 --sample 5

# Test SecureGPT Gemini 2.5 Pro
npm run build && node dist/generateNudgePermutations.js --model gemini-2.5-pro --sample 5
```

## Available Models

### OpenAI Models
- `gpt-5.2-2025-12-11` - GPT-5.2 (default)

### SecureGPT Models
- `gpt-5` - SecureGPT GPT-5
- `gpt-5-mini` - SecureGPT GPT-5 Mini
- `gpt-5-nano` - SecureGPT GPT-5 Nano
- `gemini-2.5-pro` - SecureGPT Gemini 2.5 Pro

### MLX Models (15 models available)
- `mlx-community/Llama-3.2-1B-Instruct-4bit`
- `mlx-community/Llama-3.2-3B-Instruct-4bit`
- `mlx-community/Phi-4-mini-instruct-4bit`
- `mlx-community/gemma-3-270m-it-4bit`
- `mlx-community/gemma-3-1b-it-qat-4bit`
- `mlx-community/gemma-3-4b-it-qat-4bit`
- `mlx-community/Qwen2.5-0.5B-Instruct-4bit`
- `mlx-community/Qwen2.5-1.5B-Instruct-4bit`
- `mlx-community/Qwen2.5-3B-Instruct-4bit`
- `mlx-community/Qwen3-4B-Instruct-2507-4bit`
- `mlx-community/DeepSeek-R1-Distill-Qwen-1.5B-4bit`
- `mlx-community/Ministral-3-3B-Instruct-2512-4bit`
- `mlx-community/SmolLM2-360M-Instruct`
- `mlx-community/SmolLM2-1.7B-Instruct`
- `mlx-community/SmolLM3-3B-4bit`

## Output

The script saves results to CSV files with descriptive filenames:

- `nudge_permutations_results_<model-ids>_sample_<number>.csv` - Sample results
- `nudge_permutations_results_<model-ids>_sample_<number>_random.csv` - Random sample results
- `nudge_permutations_results_<model-ids>_full.csv` - Full permutation results

## Output CSV Columns

The CSV output includes the following columns:

- `modelId` - The model identifier used
- `provider` - The model provider (e.g., 'openai', 'mlx-python')
- `backendType` - The backend type (same as provider)
- `genderIdentity` - The gender identity value used
- `ageGroup` - The age group tested
- `disease` - The disease condition (empty if null)
- `stateOfChange` - The stage of change (empty if null)
- `educationLevel` - The education level
- `language` - The language ('en' or 'es')
- `preferredNotificationTime` - The preferred notification time
- `genderContext` - The generated gender context text
- `ageContext` - The generated age context text
- `diseaseContext` - The generated disease context text
- `stageContext` - The generated stage of change context text
- `educationContext` - The generated education context text
- `languageContext` - The generated language context text
- `notificationTimeContext` - The generated notification time context text
- `fullPrompt` - The complete prompt sent to the LLM
- `llmResponse` - The raw JSON response from the LLM
- `latencyMs` - Generation latency in milliseconds
- `error` - Any error message if the API call failed

## Architecture

The script uses a backend abstraction layer that supports multiple model providers:

- **OpenAIBackend** - Handles OpenAI API calls
- **MLXPythonBackend** - Communicates with Python MLX service via HTTP
- **BackendFactory** - Creates appropriate backend instances

This architecture makes it easy to add new model providers in the future (e.g., Claude, Gemini).

## Troubleshooting

### Python Service Not Available

If you see a warning about the Python service not being available:
1. Ensure the Python service is running: `npm run start:python-service`
2. Check that the service URL is correct (default: http://localhost:8000)
3. Verify Python dependencies are installed: `pip install -r python_service/requirements.txt`

### Model Loading Errors

If a specific model fails to load:
- The script will log the error and continue with other models
- Check the error message in the CSV output
- For MLX models, ensure you have Apple Silicon Mac and sufficient memory

### Timeout Errors

If you encounter timeout errors:
- Increase the timeout using `--timeout <seconds>`
- Default timeout is 60s for models <1B, 120s for larger models
- Larger models may need more time, especially on first load

## Notes

- Models are tested **sequentially** (one at a time) to avoid resource contention
- MLX models are loaded **on-demand** in the Python service (not cached)
- The script maintains backward compatibility - default behavior uses OpenAI only
- First request for each MLX model may be slower as the model needs to be downloaded/loaded
