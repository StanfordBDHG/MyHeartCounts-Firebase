//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  fhirMedicationRequestConverter,
  fhirQuestionnaireResponseConverter,
  UserObservationCollection,
} from "@stanfordbdhg/engagehf-models";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {DatabaseConverter} from "../services/database/databaseConverter.js";
import {getServiceFactory} from "../services/factory/getServiceFactory.js";

export const onUserAllergyIntoleranceWritten = onDocumentWritten(
  "users/{userId}/allergyIntolerances/{allergyIntoleranceId}",
  async (event) =>
    getServiceFactory()
      .trigger()
      .userAllergyIntoleranceWritten(event.params.userId),
);

export const onUserCreatinineObservationWritten = onDocumentWritten(
  "users/{userId}/creatinineObservations/{observationId}",
  async (event) =>
    getServiceFactory()
      .trigger()
      .userObservationWritten(
        event.params.userId,
        UserObservationCollection.creatinine,
      ),
);

export const onUserBloodPressureObservationWritten = onDocumentWritten(
  "users/{userId}/bloodPressureObservations/{observationId}",
  async (event) =>
    getServiceFactory()
      .trigger()
      .userObservationWritten(
        event.params.userId,
        UserObservationCollection.bloodPressure,
      ),
);

export const onUserBodyWeightObservationWritten = onDocumentWritten(
  "users/{userId}/bodyWeightObservations/{observationId}",
  async (event) =>
    getServiceFactory()
      .trigger()
      .userObservationWritten(
        event.params.userId,
        UserObservationCollection.bodyWeight,
      ),
);

export const onUserDryWeightObservationWritten = onDocumentWritten(
  "users/{userId}/dryWeightObservations/{observationId}",
  async (event) =>
    getServiceFactory()
      .trigger()
      .userObservationWritten(
        event.params.userId,
        UserObservationCollection.dryWeight,
      ),
);

export const onUserEgfrObservationWritten = onDocumentWritten(
  "users/{userId}/eGfrObservations/{observationId}",
  async (event) =>
    getServiceFactory()
      .trigger()
      .userObservationWritten(
        event.params.userId,
        UserObservationCollection.eGfr,
      ),
);

export const onUserHeartRateObservationWritten = onDocumentWritten(
  "users/{userId}/heartRateObservations/{observationId}",
  async (event) =>
    getServiceFactory()
      .trigger()
      .userObservationWritten(
        event.params.userId,
        UserObservationCollection.heartRate,
      ),
);

export const onUserMedicationRequestWritten = onDocumentWritten(
  "users/{userId}/medicationRequests/{medicationRequestId}",
  async (event) => {
    const beforeData = event.data?.before;
    const afterData = event.data?.after;
    const converter = new DatabaseConverter(
      fhirMedicationRequestConverter.value,
    );
    await getServiceFactory()
      .trigger()
      .userMedicationRequestWritten(
        event.params.userId,
        event.params.medicationRequestId,
        beforeData?.exists ? converter.fromFirestore(beforeData) : undefined,
        afterData?.exists ? converter.fromFirestore(afterData) : undefined,
      );
  },
);

export const onUserPotassiumObservationWritten = onDocumentWritten(
  "users/{userId}/potassiumObservations/{observationId}",
  async (event) =>
    getServiceFactory()
      .trigger()
      .userObservationWritten(
        event.params.userId,
        UserObservationCollection.potassium,
      ),
);

export const onUserQuestionnaireResponseWritten = onDocumentWritten(
  "users/{userId}/questionnaireResponses/{questionnaireResponseId}",
  async (event) => {
    const beforeData = event.data?.before;
    const afterData = event.data?.after;
    const converter = new DatabaseConverter(
      fhirQuestionnaireResponseConverter.value,
    );
    await getServiceFactory()
      .trigger()
      .questionnaireResponseWritten(
        event.params.userId,
        event.params.questionnaireResponseId,
        beforeData?.exists ? converter.fromFirestore(beforeData) : undefined,
        afterData?.exists ? converter.fromFirestore(afterData) : undefined,
      );
  },
);
