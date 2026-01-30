//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { DefaultServiceFactory } from "./defaultServiceFactory.js";
import { type ServiceFactory } from "./serviceFactory.js";

export const getServiceFactory = (): ServiceFactory =>
  new DefaultServiceFactory();
