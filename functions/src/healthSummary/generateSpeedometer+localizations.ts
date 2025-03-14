//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {LocalizedText} from "@stanfordbdhg/engagehf-models";

export function symptomScoreSpeedometerLocalizations(languages: string[]) {
  return {
    trendSuffix: new LocalizedText({
      en: "from previous",
    }).localize(...languages),
    legend: {
      baseline: new LocalizedText({
        en: "Baseline",
      }).localize(...languages),
      previous: new LocalizedText({
        en: "Previous",
      }).localize(...languages),
      current: new LocalizedText({
        en: "Current",
      }).localize(...languages),
    },
  };
}
