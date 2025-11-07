//
// This source file is part of the Stanford Biodesign Digital Health MyHeart Counts open-source project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2025 Stanford University
//
// SPDX-License-Identifier: MIT
//

import type { Response } from 'express'
import { logger } from 'firebase-functions'
import { https } from 'firebase-functions/v2'
import {
  type CallableFunction,
  type CallableOptions,
  type CallableRequest,
  onCall,
  onRequest,
  type Request,
} from 'firebase-functions/v2/https'
import { z } from 'zod'

export const privilegedServiceAccount = `cloudfunctionsserviceaccount@${process.env.GCLOUD_PROJECT}.iam.gserviceaccount.com`
export const defaultServiceAccount = `limited-cloudfunction-sa@${process.env.GCLOUD_PROJECT}.iam.gserviceaccount.com`

export function validatedOnCall<Schema extends z.ZodTypeAny, Return>(
  name: string,
  schema: Schema,
  handler: (request: CallableRequest<z.output<Schema>>) => Promise<Return>,
  options: CallableOptions = {
    invoker: 'public',
  },
): CallableFunction<z.input<Schema>, Promise<Return>> {
  return onCall(options, async (request) => {
    try {
      logger.debug(
        `onCall(${name}) from user '${request.auth?.uid}' with '${JSON.stringify(request.data)}'`,
      )
      request.data = schema.parse(request.data) as z.output<Schema>
      return await handler(request)
    } catch (error) {
      logger.debug(
        `onCall(${name}) from user '${request.auth?.uid}' failed with '${String(error)}'.`,
      )
      if (error instanceof z.ZodError) {
        throw new https.HttpsError(
          'invalid-argument',
          'Invalid request data',
          error.errors,
        )
      }
      throw error
    }
  })
}

export function validatedOnRequest<Schema extends z.ZodTypeAny>(
  name: string,
  schema: Schema,
  handler: (
    request: Request,
    data: z.output<Schema>,
    response: Response,
  ) => void | Promise<void>,
  options: https.HttpsOptions = {
    invoker: 'public',
  },
): https.HttpsFunction {
  return onRequest(options, async (request, response) => {
    try {
      logger.debug(`onRequest(${name}) with ${JSON.stringify(request.body)}`)
      const data = schema.parse(request.body) as z.output<Schema>
      await handler(request, data, response)
      return
    } catch (error) {
      logger.debug(`onRequest(${name}) failed with ${String(error)}.`)
      if (error instanceof z.ZodError) {
        response.status(400).send({
          code: 'invalid-argument',
          message: 'Invalid request data',
          details: error.errors,
        })
        return
      }
      throw error
    }
  })
}
