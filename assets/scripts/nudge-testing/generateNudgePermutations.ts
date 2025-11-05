/** 
 This source file is part of the Stanford Biodesign Digital Health MyHeart Counts open-source project

 SPDX-FileCopyrightText: 2025 Stanford University

 SPDX-License-Identifier: MIT
*/

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import OpenAI from 'openai'

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
  educationLevel: EducationLevel | null
  language: string
  preferredWorkoutTypes: string | null
  preferredNotificationTime: string | null
}

interface TestResult {
  context: TestContext
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
  error?: string
}

class NudgePermutationTester {
  private openai: OpenAI
  private results: TestResult[] = []

  constructor(apiKey: string) {
    this.openai = new OpenAI({
      apiKey: apiKey,
    })
  }


  private getAgeContext(ageGroup: string): string {
    switch (ageGroup) {
      case '<35':
        return 'This participant is 28 years old and should be prompted to think about the short-term benefits of exercise on their mood, energy, and health.'
      case '35-50':
        return 'This participant is 42 years old and in addition to thinking about the short-term benefits of exercise on their mood, energy, and health, should also now be thinking about their long-term risk of chronic disease development, such as cardiovascular disease, dementia, and cancer - exercise is strongly protective against all these long-term conditions.'
      case '51-65':
        return 'This participant is 58 years old and in addition to thinking about the short-term benefits of exercise on their mood, energy, and health, should also now be thinking about their long-term risk of chronic disease development, such as cardiovascular disease, dementia, and cancer - exercise is strongly protective against all these long-term conditions. At this age, they should also be thinking about adding elements of weight bearing exercise into their routines, to promote bone health and prevent fractures that could lead to rapid clinical decline as they age.'
      case '>65':
        return 'This participant is 72 years old and in addition to thinking about the short-term benefits of exercise on their mood, energy, and health, should also now be thinking about their long-term risk of chronic disease development, such as cardiovascular disease, dementia, and cancer - exercise is strongly protective against all these long-term conditions. At this age, they should also be thinking about adding elements of weight bearing exercise into their routines, to promote bone health and prevent fractures that could lead to rapid clinical decline as they age. Finally, they should be considering lower impact sports and activities (e.g., walks and hikes instead of runs).'
      default:
        return ''
    }
  }

  private getGenderContext(genderIdentity: string): string {
    if (genderIdentity === 'male') {
      return 'This participant is male and may respond better to prompts about playing sports or doing individual activities (i.e., cycling, running/treadmill, walks in the neighborhood, going to the gym)'
    } else {
      return 'This participant is female and may respond better to prompts about group fitness classes and activities with friends.'
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

  private getEducationContext(educationLevel: EducationLevel | null): string {
    if (!educationLevel) return ''

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

  private getActivityTypeContext(preferredWorkoutTypes: string | null): string {
    if (!preferredWorkoutTypes) return ''

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

    let activityTypeContext = `{${preferredWorkoutTypes}} are the user's preferred activity types. Recommendations should be centered around these activity types. Recommendations should be creative, encouraging, and aligned within their preferred activity type.`

    if (hasOther) {
      const notChosenTypes = availableWorkoutTypes.filter(
        (type) => type !== 'other' && !selectedTypes.includes(type),
      )

      if (notChosenTypes.length > 0) {
        activityTypeContext += ` The user has also indicated that they have other preferred activity types beyond ${notChosenTypes.join(', ')}. Provide creative recommendations and possible other ways to stay physically active.`
      } else {
        // User has only selected "other" with no other options
        activityTypeContext += ` The user has indicated that they have other preferred activity types beyond ${availableWorkoutTypes.filter((type) => type !== 'other').join(', ')}. Provide creative recommendations and possible other ways to stay physically active.`
      }
    }

    return activityTypeContext
  }

  private getNotificationTimeContext(preferredNotificationTime: string | null): string {
    if (!preferredNotificationTime) return ''

    return `This user prefers to receive recommendation at ${preferredNotificationTime}. Use the time of day to tailor prompts to try to get that person to be active that day. For example a morning time could be recommending them to get some morning activity done, or planning on doing it later in the day (lunch, post work, etc).`
  }

  private async generateNudgesForContext(context: TestContext): Promise<TestResult> {
    const genderContext = this.getGenderContext(context.genderIdentity)
    const ageContext = this.getAgeContext(context.ageGroup)
    const diseaseContext = this.getDiseaseContext(context.disease)
    const stageContext = this.getStageContext(context.stateOfChange)
    const educationContext = this.getEducationContext(context.educationLevel)
    const languageContext = this.getLanguageContext(context.language)
    const activityTypeContext = this.getActivityTypeContext(context.preferredWorkoutTypes)
    const notificationTimeContext = this.getNotificationTimeContext(context.preferredNotificationTime)

    const prompt = `Write 7 motivational messages that are proper length to go in a push notification using a calm, encouraging, and professional tone, like that of a health coach to motivate a smartphone user in increase physical activity levels. This message is sent in the morning so the user has all day to increae physical activity levels. Also create a title for each of push notifications that is a short summary/call to action of the push notification that is paired with it. Return the response as a JSON array with exactly 7 objects, each having "title" and "body" fields. If there is a disease context given, you can reference that disease in some of the nudges. TRY TO BE AS NEUTRAL AS POSSBILE IN THE TONE OF THE NUDGE. NEVER USE EMOJIS OR ABBREVIATIONS FOR DISEASES IN THE NUDGE. Each nudge should be personalized to the following information: ${languageContext} ${genderContext} ${ageContext} ${diseaseContext} ${stageContext} ${educationContext} ${activityTypeContext} ${notificationTimeContext}`

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-2024-08-06',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
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
        max_tokens: 1000,
        temperature: 0.7,
      })

      const llmResponse = response.choices[0].message.content || ''

      return {
        context,
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
      }
    } catch (error) {
      return {
        context,
        genderContext,
        ageContext,
        diseaseContext,
        stageContext,
        educationContext,
        languageContext,
        activityTypeContext: this.getActivityTypeContext(context.preferredWorkoutTypes),
        notificationTimeContext: this.getNotificationTimeContext(context.preferredNotificationTime),
        fullPrompt: prompt,
        llmResponse: '',
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  private generateAllPermutations(): TestContext[] {
    const genderOptions = ['male', 'female']
    const ageOptions = ['<35', '35-50', '51-65', '>65']
    const diseaseOptions = [null, ...Object.values(Disease)]
    const stageOptions = [null, ...Object.values(StageOfChange)]
    const educationOptions = [null, ...Object.values(EducationLevel)]
    const languageOptions = ['en', 'es']
    const workoutTypeOptions = [
      null,
      'run,walk',
      'HIIT,strength',
      'swim,bicycle',
      'yoga/pilates,walk',
      'sport,run,strength',
      'other',
      'other,walk,run',
      'other,HIIT,walk,swim,run,sport,strength,bicycle,yoga/pilates'
    ]
    const notificationTimeOptions = [null, '7:00 AM', '12:00 PM', '6:00 PM']

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
                      educationLevel: educationLevel as EducationLevel | null,
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
      'genderIdentity',
      'ageGroup',
      'disease',
      'stateOfChange',
      'educationLevel',
      'language',
      'preferredWorkoutTypes',
      'preferredNotificationTime',
      'genderContext',
      'ageContext',
      'diseaseContext',
      'stageContext',
      'educationContext',
      'languageContext',
      'activityTypeContext',
      'notificationTimeContext',
      'fullPrompt',
      'llmResponse',
      'error'
    ]

    const csvRows = [headers.join(',')]

    for (const result of results) {
      const row = [
        result.context.genderIdentity,
        result.context.ageGroup,
        result.context.disease || '',
        result.context.stateOfChange || '',
        result.context.educationLevel || '',
        result.context.language,
        result.context.preferredWorkoutTypes || '',
        result.context.preferredNotificationTime || '',
        result.genderContext,
        result.ageContext,
        result.diseaseContext,
        result.stageContext,
        result.educationContext,
        result.languageContext,
        result.activityTypeContext,
        result.notificationTimeContext,
        result.fullPrompt,
        result.llmResponse,
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

  async runAllPermutations(maxPermutations?: number, randomize = false): Promise<void> {
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

    let completed = 0
    for (const context of permutationsToTest) {
      console.log(`Processing permutation ${completed + 1}/${permutationsToTest.length}...`)
      const result = await this.generateNudgesForContext(context)
      this.results.push(result)
      completed++

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    const suffix = maxPermutations ? `_sample_${maxPermutations}${randomize ? '_random' : ''}` : '_full'
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    const outputPath = path.join(__dirname, `nudge_permutations_results${suffix}.csv`)
    this.writeResultsToCSV(this.results, outputPath)
    console.log(`Results written to ${outputPath}`)
  }
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error('OPENAI_API_KEY environment variable is required')
    process.exit(1)
  }

  // Check for command line arguments to limit permutations
  const args = process.argv.slice(2)
  const maxPermutations = args.includes('--sample') ? parseInt(args[args.indexOf('--sample') + 1]) || 10 : undefined
  const randomize = args.includes('--random')

  if (maxPermutations) {
    console.log(`Starting nudge permutation testing (sample mode: ${maxPermutations} permutations${randomize ? ', randomly selected' : ''})...`)
  } else {
    console.log('Starting nudge permutation testing (full mode: all permutations)...')
  }

  const tester = new NudgePermutationTester(apiKey)
  await tester.runAllPermutations(maxPermutations, randomize)
  console.log('Testing complete!')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}