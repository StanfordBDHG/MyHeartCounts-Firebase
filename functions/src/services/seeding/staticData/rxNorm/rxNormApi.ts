//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import * as https from 'https'
import { optionalish } from '@stanfordbdhg/engagehf-models'
import { logger } from 'firebase-functions'
import { z } from 'zod'
import {
  rxNormRelatedDrugGroupResponse,
  type RxNormRelatedDrugGroupResponse,
  rxTermInfo,
  type RxTermInfo,
} from './rxNormModels.js'

export class RxNormApi {
  // Methods

  /// docs: https://lhncbc.nlm.nih.gov/RxNav/APIs/api-RxTerms.getAllRxTermInfo.html
  async getAllRxTermInfo(rxcui: string): Promise<RxTermInfo | undefined> {
    const data = await this.get(
      `RxTerms/rxcui/${rxcui}/allinfo.json`,
      z.object({ rxtermsProperties: optionalish(rxTermInfo) }),
    )
    return data.rxtermsProperties
  }

  /// docs: https://lhncbc.nlm.nih.gov/RxNav/APIs/api-RxNorm.getRelatedByType.html
  async getRelated(
    rxcui: string,
    relation: string,
  ): Promise<RxNormRelatedDrugGroupResponse> {
    return this.get(
      `rxcui/${rxcui}/related.json?rela=${relation}`,
      rxNormRelatedDrugGroupResponse,
    )
  }

  /// docs: https://lhncbc.nlm.nih.gov/RxNav/APIs/api-RxNorm.getRxNormName.html
  async getRxNormName(rxcui: string): Promise<string> {
    const data = await this.get(
      `rxcui/${rxcui}.json`,
      z.object({
        idGroup: z.object({ name: z.string() }),
      }),
    )
    return data.idGroup.name
  }

  // Helpers

  private async get<Schema extends z.ZodTypeAny>(
    path: string,
    schema: Schema,
  ): Promise<z.output<Schema>> {
    return new Promise((resolve, reject) => {
      const request = https.get(
        'https://rxnav.nlm.nih.gov/REST/' + path,
        (response) => {
          let body = Buffer.alloc(0)
          response.on(
            'data',
            (chunk: Buffer) => (body = Buffer.concat([body, chunk])),
          )
          response.on('error', reject)
          response.on('end', () => {
            const statusCode = response.statusCode ?? 500
            if (statusCode >= 200 && statusCode <= 299) {
              try {
                logger.debug(body.toString('utf8'))
                resolve(
                  schema.parse(
                    JSON.parse(body.toString('utf8')),
                  ) as z.output<Schema>,
                )
              } catch (error: unknown) {
                /* eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors */
                reject(error)
              }
            } else {
              reject(
                Error(
                  `Request failed with status code ${response.statusCode})`,
                ),
              )
            }
          })
        },
      )
      request.on('error', reject)
      request.end()
    })
  }
}
