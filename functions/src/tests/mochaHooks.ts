// This source file is part of the MyHeart Counts project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

import { logger } from "firebase-functions";

// Silence verbose Firebase logger output (only) during test runs.
logger.debug = () => undefined;
logger.info = () => undefined;
logger.log = () => undefined;
