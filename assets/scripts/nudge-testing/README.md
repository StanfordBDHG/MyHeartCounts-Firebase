<!-- 
This source file is part of the Stanford Biodesign Digital Health MyHeart Counts open-source project
SPDX-FileCopyrightText: 2025 Stanford University and the project authors (see CONTRIBUTORS.md)
SPDX-License-Identifier: MIT
-->

# Nudge Permutation Testing Script

This script generates all possible permutations of the personalization context used in the `planNudges.ts` function and captures the LLM responses for analysis.

## Context Variables Tested

This is an overview of what can be tested:

- **genderIdentity**: 'male', 'female'
- **ageGroup**: '<35', '35-50', '51-65', '>65'
- **disease**: null, 'Heart failure', 'Pulmonary arterial hypertension', 'Diabetes', 'ACHD (simple)', 'ACHD (complex)'
- **stateOfChange**: null, 'Precontemplation', 'Contemplation', 'Preparation', 'Action', 'Maintenance'
- **educationLevel**: null, 'Highschool', 'college', 'collage'
- **language**: 'en', 'es'

Total permutations at tje moment: 2 × 4 × 6 × 6 × 4 × 2 = **2,304 combinations**

## Setup

1. Install dependencies:
   ```bash
   cd assets/scripts/nudge-testing
   npm install
   ```

2. Set your OpenAI API key:
   ```bash
   export OPENAI_API_KEY="your-api-key-here"
   ```

## Running the Test

### Full Test (All 2,304 permutations)
```bash
npm run test
```

### Sample Test (10 permutations to save API costs)
```bash
npm run test:sample           # First 10 permutations
npm run test:random           # 10 random permutations
```

### Custom Sample Size
```bash
npm run test:sample-custom 50          # First 50 permutations
npm run test:random-custom 50 --random # 50 random permutations
```

### Manual Usage
```bash
# Sequential sampling
node dist/generateNudgePermutations.js --sample 25

# Random sampling
node dist/generateNudgePermutations.js --sample 25 --random
```

The script will:
1. Generate the specified number of permutations (sequential or random)
2. Call the OpenAI API for each combination
3. Save results with descriptive filenames:
   - `nudge_permutations_results_sample_10.csv` (sequential sample)
   - `nudge_permutations_results_sample_10_random.csv` (random sample)
   - `nudge_permutations_results_full.csv` (all permutations)

## Output CSV Columns

- `genderIdentity`: The gender identity value used
- `ageGroup`: The age group tested
- `disease`: The disease condition (empty if null)
- `stateOfChange`: The stage of change (empty if null)
- `educationLevel`: The education level (empty if null)
- `language`: The language ('en' or 'es')
- `genderContext`: The generated gender context text
- `ageContext`: The generated age context text
- `diseaseContext`: The generated disease context text
- `stageContext`: The generated stage of change context text
- `educationContext`: The generated education context text
- `languageContext`: The generated language context text
- `fullPrompt`: The complete prompt sent to the LLM
- `llmResponse`: The raw JSON response from the LLM
- `error`: Any error message if the API call failed

## Notes

- The script includes a 100ms delay between API calls to avoid rate limiting
- The script uses the same LLM model and parameters as the production code (gpt-4o-2024-08-06)