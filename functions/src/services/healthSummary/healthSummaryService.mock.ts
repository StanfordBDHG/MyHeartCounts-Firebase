//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  advanceDateByDays,
  FHIRAppointment,
  FHIRAppointmentStatus,
  LocalizedText,
  type Observation,
  QuantityUnit,
} from "@stanfordbdhg/engagehf-models";
import {type HealthSummaryService} from "./healthSummaryService.js";
import {
  HealthSummaryData,
  type HealthSummaryVitals,
} from "../../models/healthSummaryData.js";

/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unused-vars */

export class MockHealthSummaryService implements HealthSummaryService {
  // Methods

  async getHealthSummaryData(
    userId: string,
    date: Date,
  ): Promise<HealthSummaryData> {
    return new HealthSummaryData({
      name: "John Doe",
      dateOfBirth: new Date("1970-01-02"),
      providerName: "Dr. XXX",
      nextAppointment: FHIRAppointment.create({
        userId,
        status: FHIRAppointmentStatus.booked,
        created: advanceDateByDays(date, -10),
        start: advanceDateByDays(date, 1),
        durationInMinutes: 60,
      }),
      vitals: await this.getVitals(date),
      symptomScores: [
        {
          questionnaireResponseId: "4",
          overallScore: 40,
          physicalLimitsScore: 50,
          socialLimitsScore: 38,
          qualityOfLifeScore: 20,
          symptomFrequencyScore: 60,
          dizzinessScore: 3,
          date: advanceDateByDays(date, -9),
        },
        {
          questionnaireResponseId: "3",
          overallScore: 60,
          physicalLimitsScore: 58,
          socialLimitsScore: 75,
          qualityOfLifeScore: 37,
          symptomFrequencyScore: 72,
          dizzinessScore: 2,
          date: advanceDateByDays(date, -18),
        },
        {
          questionnaireResponseId: "2",
          overallScore: 44,
          physicalLimitsScore: 50,
          socialLimitsScore: 41,
          qualityOfLifeScore: 25,
          symptomFrequencyScore: 60,
          dizzinessScore: 1,
          date: advanceDateByDays(date, -34),
        },
        {
          questionnaireResponseId: "1",
          overallScore: 75,
          physicalLimitsScore: 58,
          socialLimitsScore: 75,
          qualityOfLifeScore: 60,
          symptomFrequencyScore: 80,
          dizzinessScore: 1,
          date: advanceDateByDays(date, -49),
        },
      ],
      now: date,
    });
  }

  // Helpers

  private async getVitals(date: Date): Promise<HealthSummaryVitals> {
    const [systolicBloodPressure, diastolicBloodPressure] =
      await this.getBloodPressureObservations(date);
    return {
      systolicBloodPressure: systolicBloodPressure,
      diastolicBloodPressure: diastolicBloodPressure,
      heartRate: await this.getHeartRateObservations(date),
      bodyWeight: await this.getBodyWeightObservations(date),
      dryWeight: await this.getMostRecentDryWeightObservation(date),
    };
  }

  private async getBloodPressureObservations(
    date: Date,
  ): Promise<[Observation[], Observation[]]> {
    return [
      [
        {
          date: advanceDateByDays(date, -1),
          value: 110,
          unit: QuantityUnit.mmHg,
        },
        {
          date: advanceDateByDays(date, -2),
          value: 114,
          unit: QuantityUnit.mmHg,
        },
        {
          date: advanceDateByDays(date, -3),
          value: 123,
          unit: QuantityUnit.mmHg,
        },
        {
          date: advanceDateByDays(date, -4),
          value: 109,
          unit: QuantityUnit.mmHg,
        },
        {
          date: advanceDateByDays(date, -5),
          value: 105,
          unit: QuantityUnit.mmHg,
        },
        {
          date: advanceDateByDays(date, -6),
          value: 98,
          unit: QuantityUnit.mmHg,
        },
        {
          date: advanceDateByDays(date, -7),
          value: 94,
          unit: QuantityUnit.mmHg,
        },
        {
          date: advanceDateByDays(date, -8),
          value: 104,
          unit: QuantityUnit.mmHg,
        },
        {
          date: advanceDateByDays(date, -9),
          value: 102,
          unit: QuantityUnit.mmHg,
        },
      ],
      [
        {
          date: advanceDateByDays(date, -1),
          value: 70,
          unit: QuantityUnit.mmHg,
        },
        {
          date: advanceDateByDays(date, -2),
          value: 82,
          unit: QuantityUnit.mmHg,
        },
        {
          date: advanceDateByDays(date, -3),
          value: 75,
          unit: QuantityUnit.mmHg,
        },
        {
          date: advanceDateByDays(date, -4),
          value: 77,
          unit: QuantityUnit.mmHg,
        },
        {
          date: advanceDateByDays(date, -5),
          value: 72,
          unit: QuantityUnit.mmHg,
        },
        {
          date: advanceDateByDays(date, -6),
          value: 68,
          unit: QuantityUnit.mmHg,
        },
        {
          date: advanceDateByDays(date, -7),
          value: 65,
          unit: QuantityUnit.mmHg,
        },
        {
          date: advanceDateByDays(date, -8),
          value: 72,
          unit: QuantityUnit.mmHg,
        },
        {
          date: advanceDateByDays(date, -9),
          value: 80,
          unit: QuantityUnit.mmHg,
        },
      ],
    ];
  }

  private async getHeartRateObservations(date: Date): Promise<Observation[]> {
    return [
      {
        date: advanceDateByDays(date, -1),
        value: 79,
        unit: QuantityUnit.bpm,
      },
      {
        date: advanceDateByDays(date, -2),
        value: 62,
        unit: QuantityUnit.bpm,
      },
      {
        date: advanceDateByDays(date, -3),
        value: 77,
        unit: QuantityUnit.bpm,
      },
      {
        date: advanceDateByDays(date, -4),
        value: 63,
        unit: QuantityUnit.bpm,
      },
      {
        date: advanceDateByDays(date, -5),
        value: 61,
        unit: QuantityUnit.bpm,
      },
      {
        date: advanceDateByDays(date, -6),
        value: 70,
        unit: QuantityUnit.bpm,
      },
      {
        date: advanceDateByDays(date, -7),
        value: 67,
        unit: QuantityUnit.bpm,
      },
      {
        date: advanceDateByDays(date, -8),
        value: 80,
        unit: QuantityUnit.bpm,
      },
      {
        date: advanceDateByDays(date, -9),
        value: 65,
        unit: QuantityUnit.bpm,
      },
    ];
  }

  private async getBodyWeightObservations(date: Date): Promise<Observation[]> {
    return [
      {
        date: advanceDateByDays(date, -1),
        value: 269,
        unit: QuantityUnit.lbs,
      },
      {
        date: advanceDateByDays(date, -2),
        value: 267,
        unit: QuantityUnit.lbs,
      },
      {
        date: advanceDateByDays(date, -3),
        value: 267,
        unit: QuantityUnit.lbs,
      },
      {
        date: advanceDateByDays(date, -4),
        value: 265,
        unit: QuantityUnit.lbs,
      },
      {
        date: advanceDateByDays(date, -5),
        value: 268,
        unit: QuantityUnit.lbs,
      },
      {
        date: advanceDateByDays(date, -6),
        value: 268,
        unit: QuantityUnit.lbs,
      },
      {
        date: advanceDateByDays(date, -7),
        value: 266,
        unit: QuantityUnit.lbs,
      },
      {
        date: advanceDateByDays(date, -8),
        value: 266,
        unit: QuantityUnit.lbs,
      },
      {
        date: advanceDateByDays(date, -9),
        value: 267,
        unit: QuantityUnit.lbs,
      },
    ];
  }

  private async getMostRecentDryWeightObservation(
    date: Date,
  ): Promise<Observation | undefined> {
    return {
      date: advanceDateByDays(date, -4),
      value: 267.5,
      unit: QuantityUnit.lbs,
    };
  }
}
