#!/bin/bash

#
# This source file is part of the Stanford Biodesign Digital Health MyHeart Counts open-source project
#
# SPDX-FileCopyrightText: 2025 Stanford University
#
# SPDX-License-Identifier: MIT
#

set -e

CONTENT=$(curl --fail http://localhost)
echo "$CONTENT" | grep "Welcome to the Stanford Biodesign Digital Health Next.js Template"

echo "✅ Test Passed!"
