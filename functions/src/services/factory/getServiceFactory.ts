// This source file is part of the MyHeart Counts project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

// eslint-disable-next-line import/no-cycle -- Factory getter pattern requires importing concrete implementation; cycle is necessary for dependency injection architecture where services reference ServiceFactory interface
import { DefaultServiceFactory } from "./defaultServiceFactory.js";
import { type ServiceFactory } from "./serviceFactory.js";

export const getServiceFactory = (): ServiceFactory =>
  new DefaultServiceFactory();
