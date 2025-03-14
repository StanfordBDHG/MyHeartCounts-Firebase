//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  percentage,
  presortedMedian,
  presortedPercentile,
  type Observation,
} from "@stanfordbdhg/engagehf-models";
import {logger} from "firebase-functions";
import 'jspdf-autotable' /* eslint-disable-line */
import { type CellDef } from 'jspdf-autotable' /* eslint-disable-line */
import {healthSummaryLocalizations} from "./generate+localizations.js";
import {generateChartSvg} from "./generateChart.js";
import {generateSpeedometerSvg} from "./generateSpeedometer.js";
import {PdfGenerator} from "./pdfGenerator.js";
import {type HealthSummaryData} from "../models/healthSummaryData.js";

export interface HealthSummaryOptions {
  languages: string[]
}

export function generateHealthSummary(
  data: HealthSummaryData,
  options: HealthSummaryOptions,
): Buffer {
  logger.debug(
    `generateHealthSummary: ${data.vitals.bodyWeight.length} body weight observations.`,
  );
  logger.debug(
    `generateHealthSummary: ${data.vitals.heartRate.length} heart rate observations.`,
  );
  logger.debug(
    `generateHealthSummary: ${data.vitals.systolicBloodPressure.length} systolic blood pressure observations.`,
  );
  logger.debug(
    `generateHealthSummary: ${data.vitals.diastolicBloodPressure.length} diastolic blood pressure observations.`,
  );
  logger.debug(
    `generateHealthSummary: ${data.vitals.dryWeight !== undefined ? 1 : 0} dry weight observations.`,
  );
  logger.debug(
    `generateHealthSummary: ${data.symptomScores.length} symptom scores.`,
  );
  const generator = new HealthSummaryPdfGenerator(data, options);

  generator.addPageHeader();
  generator.addKeyPointsSection();
  generator.addCurrentMedicationSection();
  generator.addMedicationRecommendationsSection();
  generator.addSymptomScoresSummarySection();

  generator.newPage();
  generator.addSymptomScoresTableSection();
  generator.addVitalsSection();

  return generator.finish();
}

class HealthSummaryPdfGenerator extends PdfGenerator {
  // Properties

  data: HealthSummaryData;
  options: HealthSummaryOptions;

  texts: ReturnType<typeof healthSummaryLocalizations>;

  // Constructor

  constructor(data: HealthSummaryData, options: HealthSummaryOptions) {
    super();
    this.data = data;
    this.options = options;
    this.texts = healthSummaryLocalizations(options.languages);
  }

  // Methods

  addPageHeader() {
    this.addText(this.texts.header.title, this.textStyles.h2);
    this.addText(this.data.name ?? "---", this.textStyles.h1);
    this.addText(
      this.texts.header.dateOfBirthLine(this.data.dateOfBirth ?? null),
    );
    this.addText(this.texts.header.providerLine(this.data.providerName ?? null));
    this.addText(
      this.texts.header.nextAppointmentLine(this.data.nextAppointment ?? null),
    );

    const innerWidth = this.pageWidth - this.margins.left - this.margins.right;
    const pageNumberText = this.texts.header.pageNumberTitle(
      this.doc.getNumberOfPages(),
    );
    const pageNumberWidth = this.doc.getTextWidth(pageNumberText);
    this.cursor.x = this.margins.left + innerWidth - pageNumberWidth;
    this.cursor.y -= this.textStyles.body.fontSize;
    this.addText(pageNumberText, this.textStyles.body, pageNumberWidth);
    this.cursor.x = this.margins.left;

    this.addLine(
      {x: this.cursor.x, y: this.cursor.y},
      {x: this.cursor.x + innerWidth, y: this.cursor.y},
      this.colors.black,
      1,
    );
    this.moveDown(this.textStyles.body.fontSize / 2);
  }

  addKeyPointsSection() {
    this.addSectionTitle(this.texts.keyPointsSection.title);

    const texts = this.texts.keyPointsSection.text({
      recommendations: this.data.recommendationsCategory,
      symptomScore: this.data.symptomScoreCategory,
      dizziness: this.data.dizzinessCategory,
      weight: this.data.weightCategory,
    });
    if (texts !== null) {
      if (texts.length === 1) {
        this.addText(texts[0], this.textStyles.bodyColored);
      } else {
        this.addList(texts, this.textStyles.bodyColored);
      }
    } else {
      this.addText(
        this.texts.keyPointsSection.defaultText,
        this.textStyles.bodyItalic,
      );
    }
  }

  addCurrentMedicationSection() {
    // Medications have been removed
    return;
  }

  addMedicationRecommendationsSection() {
    // Medications have been removed
    return;
  }

  addSymptomScoresSummarySection() {
    if (this.data.symptomScores.length === 0) return;
    this.addSectionTitle(this.texts.symptomScoresSummarySection.title);

    this.splitTwoColumns(
      (columnWidth) => {
        this.addSpeedometer(columnWidth);
      },
      (columnWidth) => {
        this.addText(
          this.texts.symptomScoresSummarySection.description,
          this.textStyles.bodyItalic,
          columnWidth,
        );
        this.moveDown(this.textStyles.body.fontSize / 2);

        const personalSummaryText =
          this.texts.symptomScoresSummarySection.personalSummary({
            currentScore: this.data.latestSymptomScore,
            previousScore: this.data.secondLatestSymptomScore,
          });
        if (personalSummaryText !== undefined) {
          this.addText(
            personalSummaryText,
            this.textStyles.bodyColored,
            columnWidth,
          );
        }
      },
    );
  }

  addSymptomScoresTableSection() {
    if (this.data.symptomScores.length === 0) return;
    this.addSectionTitle(this.texts.symptomScoresTableSection.title);
    this.addText(
      this.texts.symptomScoresTableSection.description,
      this.textStyles.bodyItalic,
    );

    const tableContent: CellDef[][] = [
      [
        this.texts.symptomScoresTableSection.dateHeader,
        this.texts.symptomScoresTableSection.overallScoreHeader,
        this.texts.symptomScoresTableSection.physicalLimitsScoreHeader,
        this.texts.symptomScoresTableSection.socialLimitsScoreHeader,
        this.texts.symptomScoresTableSection.qualityOfLifeScoreHeader,
        this.texts.symptomScoresTableSection.symptomFrequencyScoreHeader,
        this.texts.symptomScoresTableSection.dizzinessScoreHeader,
      ].map((title) => this.cell(title)),
      ...this.data.symptomScores.map((score, index) => [
        this.cell(this.texts.symptomScoresTableSection.formatDate(score.date), {
          fontStyle: index === 0 ? "bold" : "normal",
        }),
        this.cell(score.overallScore.toFixed(0), {
          fontStyle: index === 0 ? "bold" : "normal",
        }),
        this.cell(score.physicalLimitsScore?.toFixed(0) ?? "---", {
          fontStyle: index === 0 ? "bold" : "normal",
        }),
        this.cell(score.socialLimitsScore?.toFixed(0) ?? "---", {
          fontStyle: index === 0 ? "bold" : "normal",
        }),
        this.cell(score.qualityOfLifeScore?.toFixed(0) ?? "---", {
          fontStyle: index === 0 ? "bold" : "normal",
        }),
        this.cell(score.symptomFrequencyScore?.toFixed(0) ?? "---", {
          fontStyle: index === 0 ? "bold" : "normal",
        }),
        this.cell(score.dizzinessScore.toFixed(0), {
          fontStyle: index === 0 ? "bold" : "normal",
        }),
      ]),
    ];
    this.addTable(tableContent);
    this.moveDown(this.textStyles.body.fontSize);
  }

  addVitalsSection() {
    this.addSectionTitle(this.texts.vitalsSection.title);

    this.addWeightAndHeartRateVitalsPart();
    this.addBloodPressureVitalsPart();
  }

  private addWeightAndHeartRateVitalsPart() {
    if (
      this.data.vitals.bodyWeight.length === 0 &&
      this.data.vitals.heartRate.length === 0
    ) {
      return;
    }
    this.splitTwoColumns(
      (columnWidth) => {
        if (this.data.vitals.bodyWeight.length === 0) return;
        this.addText(
          this.texts.vitalsSection.bodyWeightTitle,
          this.textStyles.bodyBold,
          columnWidth,
        );
        this.addChart(
          this.data.vitals.bodyWeight,
          columnWidth,
          this.data.vitals.dryWeight?.value,
        );
        this.addTable(
          [
            [
              this.texts.vitalsSection.bodyWeightTable.titleHeader,
              this.texts.vitalsSection.bodyWeightTable.currentHeader,
              this.texts.vitalsSection.bodyWeightTable.sevenDayAverageHeader,
              this.texts.vitalsSection.bodyWeightTable.rangeHeader,
            ].map((title) => this.cell(title)),
            [
              this.texts.vitalsSection.bodyWeightTable.rowTitle,
              this.data.latestBodyWeight?.toFixed(0) ?? "---",
              this.data.lastSevenDayAverageBodyWeight?.toFixed(0) ?? "---",
              this.data.bodyWeightRange?.toFixed(0) ?? "---",
            ].map((title) => this.cell(title)),
          ],
          columnWidth,
        );
      },
      (columnWidth) => {
        if (this.data.vitals.heartRate.length === 0) return;
        this.addText(
          this.texts.vitalsSection.heartRateTitle,
          this.textStyles.bodyBold,
          columnWidth,
        );
        this.addChart(this.data.vitals.heartRate, columnWidth);
        const values = [
          ...this.data.vitals.heartRate.map((observation) => observation.value),
        ].sort((a, b) => a - b);
        const upperMedian = presortedPercentile(values, 0.75);
        const lowerMedian = presortedPercentile(values, 0.25);
        this.addTable(
          [
            [
              this.texts.vitalsSection.heartRateTable.titleHeader,
              this.texts.vitalsSection.heartRateTable.medianHeader,
              this.texts.vitalsSection.heartRateTable.iqrHeader,
              this.texts.vitalsSection.heartRateTable.percentageUnder50Header,
              this.texts.vitalsSection.heartRateTable.percentageOver120Header,
            ].map((title) => this.cell(title)),
            [
              this.texts.vitalsSection.heartRateTable.rowTitle,
              presortedMedian(values)?.toFixed(0) ?? "---",
              upperMedian && lowerMedian ?
                (upperMedian - lowerMedian).toFixed(0) :
                "---",
              percentage(values, (value) => value < 50)?.toFixed(0) ?? "---",
              percentage(values, (value) => value > 120)?.toFixed(0) ?? "---",
            ].map((title) => this.cell(title)),
          ],
          columnWidth,
        );
      },
    );
    this.moveDown(this.textStyles.body.fontSize * 2);
  }

  private addBloodPressureVitalsPart() {
    const hasSystolic = this.data.vitals.systolicBloodPressure.length > 0;
    const hasDiastolic = this.data.vitals.diastolicBloodPressure.length > 0;
    if (!hasSystolic && !hasDiastolic) return;
    this.splitTwoColumns(
      (columnWidth) => {
        if (!hasSystolic) return;
        this.addText(
          this.texts.vitalsSection.systolicBloodPressureTitle,
          this.textStyles.bodyBold,
          columnWidth,
        );
        this.addChart(this.data.vitals.systolicBloodPressure, columnWidth);
      },
      (columnWidth) => {
        if (!hasDiastolic) return;
        this.addText(
          this.texts.vitalsSection.diastolicBloodPressureTitle,
          this.textStyles.bodyBold,
          columnWidth,
        );
        this.addChart(this.data.vitals.diastolicBloodPressure, columnWidth);
      },
    );

    const systolicValues = [
      ...this.data.vitals.systolicBloodPressure.map(
        (observation) => observation.value,
      ),
    ].sort((a, b) => a - b);
    const systolicUpperMedian = presortedPercentile(systolicValues, 0.75);
    const systolicLowerMedian = presortedPercentile(systolicValues, 0.25);

    const diastolicValues = [
      ...this.data.vitals.diastolicBloodPressure.map(
        (observation) => observation.value,
      ),
    ].sort((a, b) => a - b);
    const diastolicUpperMedian = presortedPercentile(diastolicValues, 0.75);
    const diastolicLowerMedian = presortedPercentile(diastolicValues, 0.25);

    this.addTable([
      [
        this.texts.vitalsSection.bloodPressureTable.titleHeader,
        this.texts.vitalsSection.bloodPressureTable.medianHeader,
        this.texts.vitalsSection.bloodPressureTable.iqrHeader,
        this.texts.vitalsSection.bloodPressureTable.percentageUnder90Header,
        this.texts.vitalsSection.bloodPressureTable.percentageOver180Header,
      ].map((title) => this.cell(title)),
      (hasSystolic ?
        [
          this.texts.vitalsSection.bloodPressureTable.systolicRowTitle,
          presortedMedian(systolicValues)?.toFixed(0) ?? "---",
          systolicUpperMedian && systolicLowerMedian ?
            (systolicUpperMedian - systolicLowerMedian).toFixed(0) :
            "---",
          percentage(systolicValues, (value) => value < 90)?.toFixed(0) ??
            "---",
          percentage(systolicValues, (value) => value > 180)?.toFixed(0) ??
            "---",
        ] :
        ["", "", "", "", ""]
      ).map((title) => this.cell(title)),
      (hasDiastolic ?
        [
          this.texts.vitalsSection.bloodPressureTable.diastolicRowTitle,
          presortedMedian(diastolicValues)?.toFixed(0) ?? "---",
          diastolicUpperMedian && diastolicLowerMedian ?
            (diastolicUpperMedian - diastolicLowerMedian).toFixed(0) :
            "---",
          "-",
          "-",
        ] :
        ["", "", "", "", ""]
      ).map((title) => this.cell(title)),
    ]);
    this.moveDown(this.textStyles.body.fontSize);
  }

  // Helpers

  private addChart(data: Observation[], maxWidth?: number, baseline?: number) {
    const width =
      maxWidth ?? this.pageWidth - this.cursor.x - this.margins.right;
    const height = width * (9 / 16);
    const svg = generateChartSvg(
      data,
      {width: width, height: height},
      {top: 10, right: 20, bottom: 40, left: 20},
      baseline,
    );
    this.addSvg(svg, width);
  }

  private addSpeedometer(maxWidth?: number) {
    const width =
      maxWidth ?? this.pageWidth - this.cursor.x - this.margins.right;
    const svg = generateSpeedometerSvg(this.data.symptomScores, width, {
      languages: this.options.languages,
    });
    this.addSvg(svg, width);
  }
}
