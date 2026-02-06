//
// This source file is part of the MyHeartCounts-Firebase project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  FHIRObservation,
  FHIRObservationStatus,
  type Score,
  type FHIRCodeableConcept,
} from "@stanfordbdhg/myheartcounts-models";
import packageJson from "../../../../package.json";

export interface QuestionnaireObservationConfig {
  customCode: string;
  display: string;
  unit: string;
  unitSystem: string;
  ucumCode?: string;
}

export const scoreToObservation = (
  score: Score,
  config: QuestionnaireObservationConfig,
  questionnaireResponseId: string,
  observationId: string,
  userId: string,
): FHIRObservation => {
  const codeableConcept: FHIRCodeableConcept = {
    coding: [
      {
        code: config.customCode,
        display: config.display,
        system: "https://spezi.stanford.edu",
      },
    ],
    text: config.display,
  };

  return new FHIRObservation({
    id: observationId,
    status: FHIRObservationStatus.final,
    subject: {
      reference: `user/${userId}`,
    },
    code: codeableConcept,
    valueQuantity: {
      value: score.overallScore,
      unit: config.unit,
      system: config.unitSystem,
      code: config.ucumCode ?? config.unit,
    },
    effectiveDateTime: score.date,
    issued: new Date(),
    derivedFrom: [
      {
        reference: `QuestionnaireResponse/${questionnaireResponseId}`,
      },
    ],
    extension: [
      {
        url: "https://bdh.stanford.edu/fhir/defs/sampleUploadTimeZone",
        valueString: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      {
        url: "https://bdh.stanford.edu/fhir/defs/sourceRevision/source/name",
        valueString: "My Heart Counts Firebase",
      },
      {
        url: "https://bdh.stanford.edu/fhir/defs/sourceRevision/source/bundleIdentifier",
        valueString: "edu.stanford.MyHeartCounts",
      },
      {
        url: "https://bdh.stanford.edu/fhir/defs/sourceRevision/version",
        valueString: packageJson.version,
      },
      {
        url: "https://bdh.stanford.edu/fhir/defs/sourceRevision/OSVersion",
        valueString: process.version,
      },
    ],
  });
};

export const getDietObservationConfig = (): QuestionnaireObservationConfig => ({
  customCode: "MHCCustomSampleTypeDietMEPAScore",
  display: "Diet MEPA Score",
  unit: "count",
  unitSystem: "http://unitsofmeasure.org",
  ucumCode: "{count}",
});

export const getNicotineObservationConfig =
  (): QuestionnaireObservationConfig => ({
    customCode: "MHCCustomSampleTypeNicotineExposure",
    display: "Nicotine Exposure Score",
    unit: "count",
    unitSystem: "http://unitsofmeasure.org",
    ucumCode: "{count}",
  });

export const getWho5ObservationConfig = (): QuestionnaireObservationConfig => ({
  customCode: "MHCCustomSampleTypeWHO5Score",
  display: "WHO-5 Well-Being Score",
  unit: "count",
  unitSystem: "http://unitsofmeasure.org",
  ucumCode: "{count}",
});
