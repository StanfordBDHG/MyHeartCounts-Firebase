/** 
 This source file is part of the Stanford Biodesign Digital Health MyHeart Counts open-source project

 SPDX-FileCopyrightText: 2025 Stanford University

 SPDX-License-Identifier: MIT
*/

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { type ModelBackend } from './backends/ModelBackend.js'
import { BackendFactory } from './backends/BackendFactory.js'
import { MODEL_CONFIGS, type ModelConfig } from './config/models.js'
import { MLXPythonBackend } from './backends/MLXPythonBackend.js'

// Type definitions matching planNudges.ts
enum Disease {
  HEART_FAILURE = 'Heart failure',
  PULMONARY_ARTERIAL_HYPERTENSION = 'Pulmonary arterial hypertension',
  DIABETES = 'Diabetes',
  ACHD_SIMPLE = 'ACHD (simple)',
  ACHD_COMPLEX = 'ACHD (complex)',
}

enum StageOfChange {
  PRECONTEMPLATION = 'Precontemplation',
  CONTEMPLATION = 'Contemplation',
  PREPARATION = 'Preparation',
  ACTION = 'Action',
  MAINTENANCE = 'Maintenance',
}

enum EducationLevel {
  HIGHSCHOOL = 'Highschool',
  COLLEGE = 'college',
  COLLAGE = 'collage',
}

interface TestContext {
  genderIdentity: string
  ageGroup: string
  disease: Disease | null
  stateOfChange: StageOfChange | null
  educationLevel: EducationLevel
  language: string
  preferredWorkoutTypes: string
  preferredNotificationTime: string
}

interface TestResult {
  context: TestContext
  modelId: string
  provider: string
  backendType: string
  genderContext: string
  ageContext: string
  diseaseContext: string
  stageContext: string
  educationContext: string
  languageContext: string
  activityTypeContext: string
  notificationTimeContext: string
  fullPrompt: string
  llmResponse: string
  latencyMs?: number
  error?: string
}

class NudgePermutationTester {
  private results: TestResult[] = []
  private modelsToTest: ModelConfig[] = []

  constructor(
    private openAIApiKey: string | undefined,
    private pythonServiceUrl: string = 'http://localhost:8000',
    private secureGPTApiKey: string | undefined = undefined,
  ) {}

  private getAgeContext(ageGroup: string): string {
    switch (ageGroup) {
      case '<35':
        return 'This participant is 28 years old and should be prompted to think about the short-term benefits of exercise on their mood, energy, and health.'
      case '35-50':
        return 'This participant is 42 years old and in addition to thinking about the short-term benefits of exercise on their mood, energy, and health, should also now be thinking about their long-term risk of chronic disease development, such as cardiovascular disease, dementia, and cancer, unless they already have a chromic condition. IF THEY ALREADY HAVE A CHRONIC CONDITION, they should be thinking about inproving quality of life through exercise.'
      case '51-65':
        return 'This participant is 58 years old and in addition to thinking about the short-term benefits of exercise on their mood, energy, and health, should also now be thinking about their long-term risk of chronic disease development, such as cardiovascular disease, dementia, and cancer, unless they already have a chromic condition. IF THEY ALREADY HAVE A CHRONIC CONDITION, they should be thinking about inproving quality of life through exercise. At this age, they should also be thinking about adding elements of weight bearing exercise into their routines, to promote bone health and prevent fractures that could lead to rapid clinical decline as they age.'
      case '>65':
        return 'This participant is 72 years old and in addition to thinking about the short-term benefits of exercise on their mood, energy, and health, should also now be thinking about their long-term risk of chronic disease development, such as cardiovascular disease, dementia, and cancer, unless they already have a chromic condition. IF THEY ALREADY HAVE A CHRONIC CONDITION, they should be thinking about inproving quality of life through exercise. At this age, they should also be thinking about adding elements of weight bearing exercise into their routines, to promote bone health and prevent fractures that could lead to rapid clinical decline as they age. Finally, they should be considering lower impact sports and activities (e.g., walks and hikes instead of runs).'
      default:
        return ''
    }
  }

  private getGenderContext(genderIdentity: string): string {
    if (genderIdentity === 'male') {
      return 'This participant is male.'
    } else {
      return 'This participant is female.'
    }
  }

  private getDiseaseContext(disease: Disease | null): string {
    if (!disease) return ''

    switch (disease) {
      case Disease.HEART_FAILURE:
        return 'This participant has heart failure, a condition characterized by low cardiac output leading to impaired physical fitness. Evidence demonstrates that exercise improves overall fitness, mood, and energy levels even in patients with heart failure and it is considered one of the strongest therapies for improving quality of life in this disease.'
      case Disease.PULMONARY_ARTERIAL_HYPERTENSION:
        return 'This participant has pulmonary arterial hypertension (PAH), a condition characterized by high blood pressure in the arteries of the lungs, which makes the right side of the heart work harder to pump blood. PAH is a progressive disease that increases the risk of heart failure, reduced physical capacity, and early mortality. While it cannot be cured, treatments and lifestyle strategies such as regular physical activity can improve exercise tolerance, heart function, and overall quality of life.'
      case Disease.DIABETES:
        return 'This participant has diabetes, a condition that is characterized by high glucose levels and insulin resistance. Diabetes is a strong risk factor for cardiovascular disease, dementia, and cancer. Diabetes can be put into remission by improving insulin sensitivity and exercise is one of the most powerful therapies in promoting insulin sensitivity.'
      case Disease.ACHD_SIMPLE:
        return 'This participant has a biventricular circulation and low- to moderate-complexity congenital heart disease (e.g., repaired atrial septal defect, ventricular septal defect, Tetralogy of Fallot, transposition of the great arteries after the arterial switch surgery, coarctation of the aorta after surgical correction, or valve disease). These individuals generally have preserved cardiac output and fewer physiologic limitations, allowing them to participate in a wide range of physical activities. Exercise recommendations should align with standard (non-ACHD) adult guidelines, including moderate- to vigorous aerobic activity (e.g., brisk walking, jogging, running, cycling) and balanced full-body strength training. Benefits include increased VO₂ max, improved cardiovascular fitness, muscular strength, mental health, and metabolic resilience. Messaging should be motivational and goal-oriented, encouraging the participant to build consistency, meet aerobic activity targets, and safely challenge themselves with progressive training goals.'
      case Disease.ACHD_COMPLEX:
        return 'This participant has complex congenital heart disease physiology, including single ventricle circulation (Fontan) or a systemic right ventricle (congenitally corrected transposition of the great arteries or transposition of the great arteries after the Mustard or Senning surgery). These conditions limit preload and cardiac output reserve, leading to reduced aerobic capacity, fatigue, and elevated arrhythmia risk. Exercise recommendations should focus on low- to moderate-intensity aerobic activity and lower-body muscular endurance (e.g., walking, light jogging, light cycling, bodyweight leg exercises). Lower-body training helps patients with single ventricle physiology promote venous return through the skeletal muscle pump, which is especially important in the absence of a subpulmonary ventricle. Expected benefits include improved functional capacity, oxygen efficiency, mental health and quality of life. Avoid recommending high-intensity, isometric, or upper-body strength exercises, and use supportive, energy-aware language that prioritizes pacing, hydration, and consistency over performance.'
      default:
        return ''
    }
  }

  private getStageContext(stateOfChange: StageOfChange | null): string {
    if (!stateOfChange) return ''

    switch (stateOfChange) {
      case StageOfChange.PRECONTEMPLATION:
        return 'This person is in the pre-contemplation stage of exercise change. This person does not plan to start exercising in the next six months and does not consider their current behavior a problem.'
      case StageOfChange.CONTEMPLATION:
        return 'This person is in the contemplation stage of changing their exercise. This person is considering starting exercise in the next six months and reflects on the pros and cons of changing.'
      case StageOfChange.PREPARATION:
        return 'This person is in the preparation stage of changing their exercise habits. This person is ready to begin exercising in the next 30 days and has begun taking small steps.'
      case StageOfChange.ACTION:
        return 'This person is in the action stage of exercise change. This person has recently started exercising (within the last six months) and is building a new, healthy routine.'
      case StageOfChange.MAINTENANCE:
        return 'This person is in the maintenance stage of exercise change. This person has maintained their exercise routine for more than six months and wants to sustain that change by avoiding relapses to previous stages. New activities should be avoided. Be as neutral as possible with the generated nudge.'
      default:
        return ''
    }
  }

  private getEducationContext(educationLevel: EducationLevel): string {
    switch (educationLevel) {
      case EducationLevel.HIGHSCHOOL:
        return "This person's highest level of education is high school or lower. Write in clear, natural language appropriate for a person with a sixth-grade reading level."
      case EducationLevel.COLLEGE:
      case EducationLevel.COLLAGE:
        return 'This person is more highly educated and has some form of higher education. Please write the prompts at the 12th grade reading comprehension level.'
      default:
        return ''
    }
  }

  private getLanguageContext(language: string): string {
    if (language === 'es') {
      return "This person's primary language is Spanish. Provide the prompt in Spanish in Latin American Spanish in the formal tone. You should follow RAE guidelines for proper Spanish use in the LATAM."
    }
    return ''
  }

  private getActivityTypeContext(preferredWorkoutTypes: string): string {

    // Available workout types, edit here if needed down the line
    const availableWorkoutTypes = [
      'other',
      'HIIT',
      'walk',
      'swim',
      'run',
      'sport',
      'strength',
      'bicycle',
      'yoga/pilates',
    ]

    const selectedTypes = preferredWorkoutTypes
      .split(',')
      .map((type: string) => type.trim())
    const hasOther = selectedTypes.includes('other')

    // Format selected activities consistently, strips: other
    const selectedActivities = selectedTypes.filter(type => type !== 'other')
    const formattedSelectedTypes = selectedActivities.length > 0 ?
      selectedActivities.join(', ') : 'various activities'

    let activityTypeContext = `${formattedSelectedTypes} are the user's preferred activity types. Recommendations should be centered around these activity types. Recommendations should be creative, encouraging, and aligned within their preferred activity type.`
    // Handle "other" selections if present in the preferred types
    if (hasOther) {
      // Only include activities that were NOT selected by the user
      const notChosenTypes = availableWorkoutTypes.filter(
        (type) => type !== 'other' && !selectedTypes.includes(type),
      )

      if (selectedActivities.length === 0) {
        // User has only selected "other" with no other options, overwrite activityTypeContext with only this string
        activityTypeContext = `The user indicated that their preferred activity types differ from the available options (${availableWorkoutTypes.filter((type) => type !== 'other').join(', ')}). Provide creative recommendations and suggest other ways to stay physically active without relying on the listed options.`
      } else if (notChosenTypes.length > 0) {
        // User selected "other" along with some activities
        activityTypeContext += `The user indicated that they also prefer activity types beyond the remaining options (${notChosenTypes.join(', ')}). Provide creative recommendations and suggest other ways to stay physically active.`
      } else {
        // User selected all standard activities plus "other"
        activityTypeContext += `The user indicated additional preferred activity types beyond the listed options. Provide creative recommendations and suggest other ways to stay physically active.`
      }
    }

    return activityTypeContext
  }

  private getNotificationTimeContext(preferredNotificationTime: string): string {
    return `This user prefers to receive recommendation at ${preferredNotificationTime}. Tailor the prompt to match the typical context of that time of day and suggest realistic opportunities for activity they could do the same day they recieve the prompt, even if it is late evening. For instance, if the time is in the morning, encourage early activity or planning for later (e.g., lunch or after work). Avoid irrelevant examples that do not fit the selected time of day.`
  }

  private async generateNudgesForContext(
    context: TestContext,
    backend: ModelBackend,
    modelConfig: ModelConfig,
  ): Promise<TestResult> {
    const genderContext = this.getGenderContext(context.genderIdentity)
    const ageContext = this.getAgeContext(context.ageGroup)
    const diseaseContext = this.getDiseaseContext(context.disease)
    const stageContext = this.getStageContext(context.stateOfChange)
    const educationContext = this.getEducationContext(context.educationLevel)
    const languageContext = this.getLanguageContext(context.language)
    const activityTypeContext = this.getActivityTypeContext(context.preferredWorkoutTypes)
    const notificationTimeContext = this.getNotificationTimeContext(context.preferredNotificationTime)

    const prompt = `Write 7 motivational messages that are proper length to go in a push notification using a calm, encouraging, and professional tone, like that of a health coach to motivate a smartphone user in increase physical activity levels.  Also create a title for each of push notifications that is a short summary/call to action of the push notification that is paired with it. Return the response as a JSON array with exactly 7 objects, each having "title" and "body" fields. If there is a disease context given, you can reference that disease in some of the nudges. When generating nudges, avoid the word 'healthy' and remove unnecessary qualifiers such as 'brisk' or 'deep'. Suggest only simple, low-risk activities without adding extra exercises or medical disclaimers not provided. Keep messages concise, calm, and practical; focus on one clear activity with plain language. Keep recommendations practical, varied, and easy to integrate into daily routines. NEVER USE EM DASHES, EMOJIS OR ABBREVIATIONS FOR DISEASES IN THE NUDGE. Each nudge should be personalized to the following information: ${languageContext} ${genderContext} ${ageContext} ${diseaseContext} ${stageContext} ${educationContext} ${notificationTimeContext} Think carefully before delivering the prompts to ensure they are personalized to the information given (especially any given disease context) and give recommendations based on research backed motivational methods.`
    const startTime = Date.now()

    try {
      const timeout = modelConfig.config?.timeout ? modelConfig.config.timeout * 1000 : 60000
      const options = {
        maxTokens: 512,
        temperature: 0.7,
        timeout,
      }

      const llmResponse = await backend.generate(prompt, options)
      const latencyMs = Date.now() - startTime

      return {
        context,
        modelId: modelConfig.id,
        provider: modelConfig.provider,
        backendType: modelConfig.provider,
        genderContext,
        ageContext,
        diseaseContext,
        stageContext,
        educationContext,
        languageContext,
        activityTypeContext,
        notificationTimeContext,
        fullPrompt: prompt,
        llmResponse,
        latencyMs,
      }
    } catch (error) {
      const latencyMs = Date.now() - startTime
      return {
        context,
        modelId: modelConfig.id,
        provider: modelConfig.provider,
        backendType: modelConfig.provider,
        genderContext,
        ageContext,
        diseaseContext,
        stageContext,
        educationContext,
        languageContext,
        activityTypeContext,
        notificationTimeContext,
        fullPrompt: prompt,
        llmResponse: '',
        latencyMs,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  private generateAllPermutations(): TestContext[] {
    const genderOptions = ['male', 'female']
    const ageOptions = ['<35', '35-50', '51-65', '>65']
    const diseaseOptions = [null, ...Object.values(Disease)]
    const stageOptions = [null, ...Object.values(StageOfChange)]
    const educationOptions = [...Object.values(EducationLevel)]
    const languageOptions = ['en', 'en']
    const workoutTypeOptions = [
      'run,walk',
      'HIIT,strength',
      'swim,bicycle',
      'yoga/pilates,walk',
      'sport,run,strength',
      'other',
      'other,walk,run',
      'other,HIIT,walk,swim,run,sport,strength,bicycle,yoga/pilates'
    ]
    const notificationTimeOptions = ['7:00 AM', '12:00 PM', '6:00 PM']

    const permutations: TestContext[] = []

    for (const genderIdentity of genderOptions) {
      for (const ageGroup of ageOptions) {
        for (const disease of diseaseOptions) {
          for (const stateOfChange of stageOptions) {
            for (const educationLevel of educationOptions) {
              for (const language of languageOptions) {
                for (const preferredWorkoutTypes of workoutTypeOptions) {
                  for (const preferredNotificationTime of notificationTimeOptions) {
                    permutations.push({
                      genderIdentity,
                      ageGroup,
                      disease: disease as Disease | null,
                      stateOfChange: stateOfChange as StageOfChange | null,
                      educationLevel: educationLevel as EducationLevel,
                      language,
                      preferredWorkoutTypes,
                      preferredNotificationTime,
                    })
                  }
                }
              }
            }
          }
        }
      }
    }

    return permutations
  }

  private escapeCSVValue(value: string): string {
    // Always escape values that contain commas, quotes, or newlines
    if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
      // Replace quotes with double quotes and wrap in quotes
      // Also normalize all line breaks to spaces to keep CSV structure intact
      const escaped = value
        .replace(/"/g, '""')
        .replace(/\r?\n/g, ' ')
        .replace(/\r/g, ' ')
      return `"${escaped}"`
    }
    return value
  }

  private writeResultsToCSV(results: TestResult[], filename: string): void {
    const headers = [
      'modelId',
      'provider',
      'backendType',
      'genderIdentity',
      'ageGroup',
      'disease',
      'stateOfChange',
      'educationLevel',
      'language',
      'preferredNotificationTime',
      'genderContext',
      'ageContext',
      'diseaseContext',
      'stageContext',
      'educationContext',
      'languageContext',
      'notificationTimeContext',
      'fullPrompt',
      'llmResponse',
      'latencyMs',
      'error'
    ]

    const csvRows = [headers.join(',')]

    for (const result of results) {
      const row = [
        result.modelId,
        result.provider,
        result.backendType,
        result.context.genderIdentity,
        result.context.ageGroup,
        result.context.disease || '',
        result.context.stateOfChange || '',
        result.context.educationLevel,
        result.context.language,
        result.context.preferredNotificationTime,
        result.genderContext,
        result.ageContext,
        result.diseaseContext,
        result.stageContext,
        result.educationContext,
        result.languageContext,
        result.notificationTimeContext,
        result.fullPrompt,
        result.llmResponse,
        result.latencyMs?.toString() || '',
        result.error || ''
      ].map(value => this.escapeCSVValue(String(value)))

      csvRows.push(row.join(','))
    }

    fs.writeFileSync(filename, csvRows.join('\n'), 'utf8')
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  async checkPythonServiceHealth(): Promise<boolean> {
    try {
      const testBackend = new MLXPythonBackend(
        { id: 'test', provider: 'mlx-python', displayName: 'test', enabled: true },
        this.pythonServiceUrl
      )
      return await testBackend.checkHealth()
    } catch {
      return false
    }
  }

  setModelsToTest(models: ModelConfig[]): void {
    this.modelsToTest = models
  }

  async runAllPermutations(maxPermutations?: number, randomize = false): Promise<void> {
    if (this.modelsToTest.length === 0) {
      throw new Error('No models configured for testing. Use --model, --models, or --provider to select models.')
    }

    // Check Python service health if MLX models are being tested
    const hasMLXModels = this.modelsToTest.some(m => m.provider === 'mlx-python')
    if (hasMLXModels) {
      const isHealthy = await this.checkPythonServiceHealth()
      if (!isHealthy) {
        console.warn(`Warning: Python service at ${this.pythonServiceUrl} is not available. MLX models will be skipped.`)
        this.modelsToTest = this.modelsToTest.filter(m => m.provider !== 'mlx-python')
        if (this.modelsToTest.length === 0) {
          throw new Error('No models available for testing. Python service is required for MLX models.')
        }
      }
    }

    const allPermutations = this.generateAllPermutations()

    let permutationsToTest: TestContext[]
    if (maxPermutations) {
      if (randomize) {
        const shuffled = this.shuffleArray(allPermutations)
        permutationsToTest = shuffled.slice(0, maxPermutations)
      } else {
        permutationsToTest = allPermutations.slice(0, maxPermutations)
      }
    } else {
      permutationsToTest = allPermutations
    }

    console.log(`Generated ${allPermutations.length} total permutations`)
    console.log(`Testing ${permutationsToTest.length} permutations${randomize ? ' (randomly selected)' : ''}`)
    console.log(`Testing ${this.modelsToTest.length} model(s): ${this.modelsToTest.map(m => m.id).join(', ')}`)

    let completed = 0
    const totalTests = this.modelsToTest.length * permutationsToTest.length

    // Run models sequentially
    for (const modelConfig of this.modelsToTest) {
      console.log(`\nTesting model: ${modelConfig.id} (${modelConfig.provider})`)

      let backend: ModelBackend
      try {
        backend = BackendFactory.create(modelConfig, this.openAIApiKey, this.pythonServiceUrl, this.secureGPTApiKey)
      } catch (error) {
        console.error(`Failed to create backend for ${modelConfig.id}: ${error instanceof Error ? error.message : String(error)}`)
        continue
      }

      // Test each permutation with this model
      for (const context of permutationsToTest) {
        console.log(`Processing permutation ${completed + 1}/${totalTests} (model: ${modelConfig.id})...`)
        const result = await this.generateNudgesForContext(context, backend, modelConfig)
        this.results.push(result)
        completed++

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    // Generate filename
    let modelIds: string
    if (this.modelsToTest.length === 1) {
      // Single model: use full model ID
      modelIds = this.modelsToTest[0].id.replace(/\//g, '-')
    } else if (this.modelsToTest.length <= 3) {
      // 2-3 models: use shortened model IDs
      modelIds = this.modelsToTest
        .map(m => m.id.split('/').pop())
        .join('_')
    } else {
      // 4+ models: use provider and count to keep filename short
      const providers = [...new Set(this.modelsToTest.map(m => m.provider))]
      if (providers.length === 1) {
        modelIds = `${providers[0]}_${this.modelsToTest.length}models`
      } else {
        modelIds = `multi-provider_${this.modelsToTest.length}models`
      }
    }
    
    const suffix = maxPermutations ? `_sample_${maxPermutations}${randomize ? '_random' : ''}` : '_full'
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    const outputPath = path.join(__dirname, `nudge_permutations_results_${modelIds}${suffix}.csv`)
    this.writeResultsToCSV(this.results, outputPath)
    console.log(`\nResults written to ${outputPath}`)
  }
}

function parseCLIArgs(): {
  maxPermutations?: number
  randomize: boolean
  modelIds?: string[]
  provider?: string
  pythonServiceUrl?: string
} {
  const args = process.argv.slice(2)
  const result: {
    maxPermutations?: number
    randomize: boolean
    modelIds?: string[]
    provider?: string
    pythonServiceUrl?: string
  } = {
    randomize: false,
  }

  if (args.includes('--sample')) {
    const index = args.indexOf('--sample')
    result.maxPermutations = parseInt(args[index + 1]) || 10
  }

  if (args.includes('--random')) {
    result.randomize = true
  }

  if (args.includes('--model')) {
    const index = args.indexOf('--model')
    result.modelIds = [args[index + 1]]
  }

  if (args.includes('--models')) {
    const index = args.indexOf('--models')
    result.modelIds = args[index + 1].split(',').map(id => id.trim())
  }

  if (args.includes('--provider')) {
    const index = args.indexOf('--provider')
    result.provider = args[index + 1]
  }

  if (args.includes('--python-service-url')) {
    const index = args.indexOf('--python-service-url')
    result.pythonServiceUrl = args[index + 1]
  }

  return result
}

function selectModels(
  cliArgs: ReturnType<typeof parseCLIArgs>,
): ModelConfig[] {
  let models = MODEL_CONFIGS.filter(m => m.enabled)

  // Filter by provider
  if (cliArgs.provider && cliArgs.provider !== 'all') {
    models = models.filter(m => m.provider === cliArgs.provider)
  }

  // Filter by specific model IDs
  if (cliArgs.modelIds) {
    models = models.filter(m => cliArgs.modelIds!.includes(m.id))
  }

  // Default: if no filters, use OpenAI only (backward compatible)
  if (!cliArgs.provider && !cliArgs.modelIds) {
    models = models.filter(m => m.provider === 'openai')
  }

  return models
}

async function main() {
  const cliArgs = parseCLIArgs()
  const openAIApiKey = process.env.OPENAI_API_KEY
  const secureGPTApiKey = process.env.SECUREGPT_API_KEY
  const pythonServiceUrl = cliArgs.pythonServiceUrl || 'http://localhost:8000'

  const modelsToTest = selectModels(cliArgs)

  if (modelsToTest.length === 0) {
    console.error('No models selected for testing. Use --model, --models, or --provider to select models.')
    process.exit(1)
  }

  const needsOpenAI = modelsToTest.some(m => m.provider === 'openai')
  if (needsOpenAI && !openAIApiKey) {
    console.error('OPENAI_API_KEY environment variable is required for OpenAI models')
    process.exit(1)
  }

  const needsSecureGPT = modelsToTest.some(m => m.provider === 'securegpt')
  if (needsSecureGPT && !secureGPTApiKey) {
    console.error('SECUREGPT_API_KEY environment variable is required for SecureGPT models')
    process.exit(1)
  }

  if (cliArgs.maxPermutations) {
    console.log(`Starting nudge permutation testing (sample mode: ${cliArgs.maxPermutations} permutations${cliArgs.randomize ? ', randomly selected' : ''})...`)
  } else {
    console.log('Starting nudge permutation testing (full mode: all permutations)...')
  }

  const tester = new NudgePermutationTester(openAIApiKey, pythonServiceUrl, secureGPTApiKey)
  tester.setModelsToTest(modelsToTest)
  await tester.runAllPermutations(cliArgs.maxPermutations, cliArgs.randomize)
  console.log('Testing complete!')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}
