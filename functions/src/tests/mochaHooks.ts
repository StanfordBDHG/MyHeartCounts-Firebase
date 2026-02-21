//
// This source file is part of the Stanford Biodesign Digital Health MyHeart Counts open-source project
// based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2025 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { logger } from "firebase-functions";

// Silence verbose Firebase logger output (only) during test runs.
logger.debug = () => undefined;
logger.info = () => undefined;
logger.log = () => undefined;
