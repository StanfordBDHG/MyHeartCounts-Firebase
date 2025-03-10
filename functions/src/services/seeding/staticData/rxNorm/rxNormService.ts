//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  CodingSystem,
  type FHIRExtension,
  FHIRExtensionUrl,
  FHIRMedication,
  FHIRMedicationRequest,
  type MedicationClass,
  optionalish,
  QuantityUnit,
} from '@stanfordbdhg/engagehf-models'
import { logger } from 'firebase-functions'
import { z } from 'zod'
import { RxNormApi } from './rxNormApi.js'
import {
  type RxNormConceptProperty,
  type RxTermInfo,
  rxTermInfo,
} from './rxNormModels.js'
import { capitalize } from '../../../../extensions/string.js'

export const medicationDailyDoseSpecificationSchema = z.object({
  drug: z.string(),
  frequency: z.number(),
  quantity: z.number(),
})

export type MedicationDailyDoseSpecification = z.output<
  typeof medicationDailyDoseSpecificationSchema
>

export const medicationSpecificationSchema = z.object({
  code: z.string(),
  brandNames: z.string().array(),
  minimumDailyDose: optionalish(medicationDailyDoseSpecificationSchema),
  targetDailyDose: optionalish(medicationDailyDoseSpecificationSchema),
  ingredients: optionalish(z.string().array()),
  drugs: optionalish(z.string().array()),
  fallbackTerms: optionalish(z.record(rxTermInfo)),
})

export type MedicationSpecification = z.output<
  typeof medicationSpecificationSchema
>

export const medicationClassSpecificationSchema = z.object({
  key: z.string(),
  medications: medicationSpecificationSchema.array(),
})

export type MedicationClassSpecification = z.output<
  typeof medicationClassSpecificationSchema
>

export class RxNormService {
  // Properties

  private readonly api = new RxNormApi()

  // Methods

  async buildFHIRCollections(
    medicationClasses: Map<string, MedicationClass>,
    specification: MedicationClassSpecification[],
  ): Promise<{
    medications: Record<string, FHIRMedication>
    drugs: Record<string, Record<string, FHIRMedication>>
  }> {
    const medications: Record<string, FHIRMedication> = {}
    const drugs: Record<string, Record<string, FHIRMedication>> = {}

    for (const medicationClass of specification) {
      logger.debug(`Processing medication class ${medicationClass.key}...`)

      for (const medication of medicationClass.medications) {
        const medicationName = await this.api.getRxNormName(medication.code)

        let ingredients = [{ name: medicationName, rxcui: medication.code }]
        if (medication.ingredients) {
          ingredients = []
          for (const ingredientRxcui of medication.ingredients) {
            try {
              const ingredientName =
                await this.api.getRxNormName(ingredientRxcui)
              ingredients.push({ name: ingredientName, rxcui: ingredientRxcui })
            } catch (error) {
              logger.error(
                `Error processing ingredient ${ingredientRxcui}: ${JSON.stringify(error)}`,
              )
            }
          }
        }
        logger.info(`Processing medication ${medicationName}...`)

        drugs[medication.code] = {}

        try {
          if (medication.drugs) {
            for (const drugRxcui of medication.drugs) {
              try {
                const fhirDrug = await this.buildFHIRDrug(
                  drugRxcui,
                  ingredients,
                  medication.fallbackTerms?.[drugRxcui] ?? {},
                )
                drugs[medication.code][drugRxcui] = fhirDrug
              } catch (error) {
                logger.error(
                  `Error processing drug ${drugRxcui}: ${JSON.stringify(error)}`,
                )
              }
            }
          } else {
            const medicationDrugs = await this.getDrugsContaining(
              medication.code,
            )
            logger.info(
              `Found ${medicationDrugs.length} drugs for ${medication.code}`,
            )
            for (const drug of medicationDrugs) {
              logger.info(`Processing drug ${JSON.stringify(drug)}...`)
              try {
                const fhirDrug = await this.buildFHIRDrug(
                  drug.rxcui,
                  ingredients,
                  medication.fallbackTerms?.[drug.rxcui] ?? {},
                )
                if (fhirDrug.id) {
                  drugs[medication.code][fhirDrug.id] = fhirDrug
                }
              } catch (error) {
                logger.error(
                  `Error processing drug ${drug.rxcui}: ${JSON.stringify(error)}`,
                )
              }
            }
          }
        } catch (error) {
          logger.error(
            `Error processing medication ${medication.code}: ${JSON.stringify(error)}`,
          )
        }

        const fhirMedication = this.buildFHIRMedication(
          medication.code,
          medicationName,
          medication.brandNames,
          medicationClass.key,
          medicationClasses,
          ingredients,
          medication.minimumDailyDose,
          medication.targetDailyDose,
          drugs[medication.code],
        )
        medications[medication.code] = fhirMedication
      }
    }

    return { medications, drugs }
  }

  // Helpers - Build

  private buildFHIRMedication(
    rxcui: string,
    name: string,
    brandNames: string[],
    medicationClassId: string,
    medicationClasses: Map<string, MedicationClass>,
    ingredients: Array<{ rxcui: string; name: string }>,
    minimumDailyDose: MedicationDailyDoseSpecification | undefined,
    targetDailyDose: MedicationDailyDoseSpecification | undefined,
    drugs: Record<string, FHIRMedication>,
  ): FHIRMedication {
    const result = {
      resourceType: 'Medication',
      id: rxcui,
      code: {
        coding: [
          {
            system: CodingSystem.rxNorm,
            code: rxcui,
            display: capitalize(name),
          },
        ],
      },
      ingredient:
        ingredients.length > 1 ?
          ingredients.map((ingredient) => ({
            itemCodeableConcept: {
              coding: [
                {
                  system: CodingSystem.rxNorm,
                  code: ingredient.rxcui,
                  display: capitalize(ingredient.name),
                },
              ],
            },
          }))
        : undefined,
      extension: [] as FHIRExtension[],
    }
    if (medicationClassId) {
      const localizedName = medicationClasses.get(medicationClassId)?.name
      result.extension.push({
        url: FHIRExtensionUrl.medicationClass,
        valueReference: {
          reference: `medicationClasses/${medicationClassId}`,
          display: localizedName?.localize(), // TODO: What to do about localization here? Ignore?
        },
      })
    }
    if (minimumDailyDose) {
      result.extension.push({
        url: FHIRExtensionUrl.minimumDailyDose,
        valueMedicationRequest: new FHIRMedicationRequest({
          medicationReference: {
            reference: `medications/${rxcui}/drugs/${minimumDailyDose.drug}`,
            display: drugs[minimumDailyDose.drug].code?.coding?.at(0)?.display,
          },
          extension: [
            {
              url: FHIRExtensionUrl.totalDailyDose,
              valueQuantities: drugs[minimumDailyDose.drug].ingredient?.map(
                (ingredient) => {
                  const value =
                    QuantityUnit.mg.valueOf(ingredient.strength?.numerator) ?? 0
                  return {
                    ...QuantityUnit.mg,
                    value:
                      value *
                      minimumDailyDose.quantity *
                      minimumDailyDose.frequency,
                  }
                },
              ),
            },
          ],
          dosageInstruction: [
            {
              timing: {
                repeat: {
                  frequency: minimumDailyDose.frequency,
                  period: 1,
                  periodUnit: 'd',
                },
              },
              doseAndRate: [
                {
                  doseQuantity: {
                    ...QuantityUnit.tablet,
                    value: minimumDailyDose.quantity,
                  },
                },
              ],
            },
          ],
        }),
      })
    }
    if (targetDailyDose) {
      result.extension.push({
        url: FHIRExtensionUrl.targetDailyDose,
        valueMedicationRequest: new FHIRMedicationRequest({
          medicationReference: {
            reference: `medications/${rxcui}/drugs/${targetDailyDose.drug}`,
            display: drugs[targetDailyDose.drug].code?.coding?.at(0)?.display,
          },
          extension: [
            {
              url: FHIRExtensionUrl.totalDailyDose,
              valueQuantities: drugs[targetDailyDose.drug].ingredient?.map(
                (ingredient) => {
                  const value =
                    QuantityUnit.mg.valueOf(ingredient.strength?.numerator) ?? 0
                  return {
                    ...QuantityUnit.mg,
                    value:
                      value *
                      targetDailyDose.quantity *
                      targetDailyDose.frequency,
                  }
                },
              ),
            },
          ],
          dosageInstruction: [
            {
              timing: {
                repeat: {
                  frequency: targetDailyDose.frequency,
                  period: 1,
                  periodUnit: 'd',
                },
              },
              doseAndRate: [
                {
                  doseQuantity: {
                    ...QuantityUnit.tablet,
                    value: targetDailyDose.quantity,
                  },
                },
              ],
            },
          ],
        }),
      })
    }

    for (const brandName of brandNames) {
      result.extension.push({
        url: FHIRExtensionUrl.brandName,
        valueString: brandName,
      })
    }
    return new FHIRMedication(result)
  }

  private async buildFHIRDrug(
    rxcui: string,
    ingredients: Array<{ rxcui: string; name: string }>,
    fallbackTerms: RxTermInfo | undefined,
  ): Promise<FHIRMedication> {
    let rxTermInfo = await this.api.getAllRxTermInfo(rxcui)
    if (rxTermInfo === undefined || Object.entries(rxTermInfo).length === 0) {
      logger.error(
        `Error getting term info for ${rxcui}. Using fallback terms...`,
      )
      rxTermInfo = fallbackTerms ?? {}
    }
    const amounts = this.removingSuffix(
      (rxTermInfo.strength ?? '').toUpperCase(),
      'MG',
    )
      .split('-')
      .map(parseFloat)
    return new FHIRMedication({
      id: rxcui,
      code: {
        coding: [
          {
            system: CodingSystem.rxNorm,
            code: rxcui,
            display: capitalize(
              rxTermInfo.displayName ?? rxTermInfo.fullName ?? '',
            ),
          },
        ],
      },
      form: {
        coding: [
          {
            system: CodingSystem.rxNorm,
            code: rxTermInfo.rxnormDoseForm,
            display: rxTermInfo.rxnormDoseForm,
          },
        ],
      },
      ingredient: ingredients.map((ingredient, index) => ({
        itemCodeableConcept: {
          coding: [
            {
              system: CodingSystem.rxNorm,
              code: ingredient.rxcui,
              display: capitalize(ingredient.name),
            },
          ],
        },
        strength: {
          numerator: {
            ...QuantityUnit.mg,
            value: amounts[index],
          },
          denominator: {
            value: 1,
          },
        },
      })),
    })
  }

  // Helpers

  private async getDrugsContaining(
    rxcui: string,
  ): Promise<RxNormConceptProperty[]> {
    const ingredientsData = await this.api.getRelated(rxcui, 'ingredient_of')
    const ingredients =
      ingredientsData.relatedGroup?.conceptGroup.find(
        (group) => group.tty === 'SCDC',
      )?.conceptProperties ?? []
    const allDrugs = []
    for (const ingredient of ingredients) {
      const drugData = await this.api.getRelated(
        ingredient.rxcui,
        'constitutes',
      )
      const drugs = drugData.relatedGroup?.conceptGroup.find(
        (group) => group.tty === 'SCD',
      )?.conceptProperties
      allDrugs.push(...(drugs ?? []))
    }
    return allDrugs
  }

  private removingSuffix(string: string, suffix: string, trim = true): string {
    const input = trim ? string.trim() : string
    const output =
      input.endsWith(suffix) ? input.slice(0, -suffix.length).trim() : input
    return trim ? output.trim() : output
  }
}
