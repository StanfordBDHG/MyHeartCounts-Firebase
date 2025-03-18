//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

export enum FHIRExtensionUrl {
  brandName = 'http://engagehf.bdh.stanford.edu/fhir/StructureDefinition/Medication/extension/brandName',
  medicationClass = 'http://engagehf.bdh.stanford.edu/fhir/StructureDefinition/Medication/extension/medicationClass',
  minimumDailyDose = 'http://engagehf.bdh.stanford.edu/fhir/StructureDefinition/Medication/extension/minimumDailyDose',
  targetDailyDose = 'http://engagehf.bdh.stanford.edu/fhir/StructureDefinition/Medication/extension/targetDailyDose',
  totalDailyDose = 'http://engagehf.bdh.stanford.edu/fhir/StructureDefinition/MedicationRequest/extension/totalDailyDose',
  providerName = 'http://engagehf.bdh.stanford.edu/fhir/StructureDefinition/Appointment/extension/providerName',
}

export enum CodingSystem {
  loinc = 'http://loinc.org',
  rxNorm = 'http://www.nlm.nih.gov/research/umls/rxnorm',
  snomedCt = 'http://snomed.info/sct',
}

export enum LoincCode {
  bloodPressure = '85354-9',
  systolicBloodPressure = '8480-6',
  diastolicBloodPressure = '8462-4',
  bodyWeight = '29463-7',
  heartRate = '8867-4',
  creatinine = '2160-0',
  estimatedGlomerularFiltrationRate = '98979-8',
  potassium = '6298-4',

  // HealthKit mobility metrics
  flightsClimbed = '93825-7', // Defined in LOINC as "Steps climbed"
  stepCount = '41950-7', // Defined in LOINC as "Physical activity Steps"
  distanceWalkingRunning = '41951-5', // Defined in LOINC as "Physical activity Distance"
  distanceCycling = '93823-2', // Approximate - "Bicycling duration"
  distanceWheelchair = '93824-0', // Approximate - "Wheelchair propulsion duration"
  distanceSwimming = '93819-0', // Approximate - "Swimming duration"
  walkingSpeed = '41908-5', // Defined in LOINC as "Walking speed"
  walkingStepLength = '93826-5', // Defined in LOINC as "Step length"
  walkingAsymmetryPercentage = '93827-3', // Custom code
  walkingDoubleSupportPercentage = '93828-1', // Custom code
  stairAscentSpeed = '93829-9', // Custom code
  stairDescentSpeed = '93830-7', // Custom code
  walkingSteadiness = '93831-5', // Custom code
  walkingSteadinessEvent = '93832-3', // Custom code
  sixMinuteWalkTestDistance = '69721-6', // Defined in LOINC

  // HealthKit activity metrics
  appleExerciseTime = '93833-1', // Custom code
  appleMoveTime = '93834-9', // Custom code
  appleStandTime = '93835-6', // Custom code
  appleStandHour = '93836-4', // Custom code

  // HealthKit vital signs
  oxygenSaturation = '2708-6', // Defined in LOINC
  bodyTemperature = '8310-5', // Defined in LOINC as "Body temperature"
  respiratoryRate = '9279-1', // Defined in LOINC
  basalBodyTemperature = '8334-5', // Defined in LOINC
  bloodGlucose = '2339-0', // Defined in LOINC
  vo2Max = '93837-2', // Custom code

  // HealthKit heart metrics
  restingHeartRate = '40443-4', // Defined in LOINC as "Heart rate - resting"
  heartRateVariabilitySDNN = '80404-7', // Defined in LOINC
  heartRateRecoveryOneMinute = '93838-0', // Custom code
  atrialFibrillationBurden = '93839-8', // Custom code
  walkingHeartRateAverage = '93840-6', // Custom code
  lowHeartRateEvent = '93841-4', // Custom code
  highHeartRateEvent = '93842-2', // Custom code
  irregularHeartRhythmEvent = '93843-0', // Custom code

  // HealthKit body measurements
  height = '8302-2', // Defined in LOINC as "Body height"
  bodyMassIndex = '39156-5', // Defined in LOINC
  leanBodyMass = '91557-9', // Defined in LOINC
  bodyFatPercentage = '41982-0', // Defined in LOINC
  waistCircumference = '8280-0', // Defined in LOINC

  // HealthKit other measurements
  mindfulSession = '93844-8', // Custom code
  bloodAlcoholContent = '5640-4', // Defined in LOINC as "Ethanol [Mass/volume] in Blood"
  dietaryCholesterol = '93845-5', // Custom code
  dietaryVitaminD = '93846-3', // Custom code
  inhalerUsage = '93847-1', // Custom code

  // HealthKit electrocardiograms
  electrocardiogram = '93848-9', // Custom code using ECG series

  // HealthKit workouts
  workout = '93849-7', // Custom code
}
