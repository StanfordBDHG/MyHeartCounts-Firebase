//
// This source file is part of the Stanford Biodesign Digital Health MyHeart Counts open-source project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2025 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  updateStaticDataInputSchema,
  type UpdateStaticDataOutput,
} from "@stanfordbdhg/myheartcounts-models";
import { type z } from "zod";
import {
  validatedOnCall,
  validatedOnRequest,
  privilegedServiceAccount,
} from "./helpers.js";
// eslint-disable-next-line import/no-cycle -- Factory pattern requires circular dependency for service initialization
import { getServiceFactory } from "../services/factory/getServiceFactory.js";
import { type ServiceFactory } from "../services/factory/serviceFactory.js";

export const _updateStaticData = async (
  factory: ServiceFactory,
  _input: z.output<typeof updateStaticDataInputSchema>,
) => {
  const _service = factory.staticData();
  const promises: Array<Promise<void>> = [];
  await Promise.all(promises);
};

export const updateStaticData =
  process.env.FUNCTIONS_EMULATOR === "true" ?
    validatedOnRequest(
      "updateStaticData",
      updateStaticDataInputSchema,
      async (_, data, response) => {
        await _updateStaticData(getServiceFactory(), data);
        const result: UpdateStaticDataOutput = {};
        response.send({ result });
      },
      {
        invoker: "public",
        serviceAccount: privilegedServiceAccount,
      },
    )
  : validatedOnCall(
      "updateStaticData",
      updateStaticDataInputSchema,
      async (request): Promise<UpdateStaticDataOutput> => {
        const factory = getServiceFactory();
        factory.credential(request.auth).checkAuthenticated();
        await _updateStaticData(factory, request.data);
        return {};
      },
      {
        invoker: "public",
        serviceAccount: privilegedServiceAccount,
      },
    );
