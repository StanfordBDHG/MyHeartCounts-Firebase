//
// This source file is part of the MyHeartCounts-Firebase project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { randomUUID } from 'crypto'
import {
  FHIRObservation,
  FHIRObservationStatus,
  type Score,
  type FHIRCodeableConcept,
} from '@stanfordbdhg/myheartcounts-models'

export interface QuestionnaireObservationConfig {
  loincCode: string
  customCode: string
  display: string
  unit: string
  unitSystem: string
}

export function scoreToObservation(
  score: Score,
  config: QuestionnaireObservationConfig,
  questionnaireResponseId: string,
  observationId: string,
): FHIRObservation {
  const codeableConcept: FHIRCodeableConcept = {
    coding: [
      {
        code: config.loincCode,
        system: 'http://loinc.org',
      },
      {
        code: config.customCode,
        display: config.display,
        system: 'https://spezi.stanford.edu',
      },
    ],
  }

  return new FHIRObservation({
    id: observationId,
    status: FHIRObservationStatus.final,
    code: codeableConcept,
    valueQuantity: {
      value: score.overallScore,
      unit: config.unit,
      system: config.unitSystem,
      code: config.loincCode,
    },
    effectiveDateTime: score.date,
    extension: [
      {
        url: 'https://bdh.stanford.edu/fhir/defs/sampleUploadTimeZone',
        valueString: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      {
        url: 'https://bdh.stanford.edu/fhir/defs/sourceRevision/source/name',
        valueString: 'My Heart Counts',
      },
      {
        url: 'https://bdh.stanford.edu/fhir/defs/sourceRevision/source/bundleIdentifier',
        valueString: 'edu.stanford.MyHeartCounts',
      },
      {
        url: 'https://bdh.stanford.edu/fhir/defs/sourceRevision/version',
        valueString: '3.0.0 (955)',
      },
      {
        url: 'https://bdh.stanford.edu/fhir/defs/sourceRevision/OSVersion',
        valueString: '18.5.0',
      },
      {
        url: 'http://hl7.org/fhir/StructureDefinition/derivedFrom',
        valueString: `QuestionnaireResponse/${questionnaireResponseId}`,
      },
      {
        url: 'http://hl7.org/fhir/StructureDefinition/issued',
        valueString: new Date().toISOString(),
      },
      {
        url: 'http://hl7.org/fhir/StructureDefinition/identifier',
        valueString: observationId,
      },
    ],
  })
}

export function getDietObservationConfig(): QuestionnaireObservationConfig {
  return {
    loincCode: '67504-6', // Nutrition assessment LOINC code
    customCode: 'MHCCustomSampleTypeDietMEPAScore',
    display: 'Diet MEPA Score',
    unit: 'count',
    unitSystem: 'http://loinc.org',
  }
}

export function getNicotineObservationConfig(): QuestionnaireObservationConfig {
  return {
    loincCode: '72166-2', // Tobacco use status LOINC code
    customCode: 'MHCCustomSampleTypeNicotineExposure',
    display: 'Nicotine Exposure Score',
    unit: 'count',
    unitSystem: 'http://loinc.org',
  }
}

export function generateUUID(): string {
  return randomUUID()
}
