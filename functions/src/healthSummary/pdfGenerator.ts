//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import fs from "fs";
import {Resvg, type ResvgRenderOptions} from "@resvg/resvg-js";
import {logger} from "firebase-functions";
import {jsPDF} from "jspdf";
import 'jspdf-autotable' /* eslint-disable-line */
import {
  type Styles,
  type CellDef,
  type UserOptions,
} from 'jspdf-autotable' /* eslint-disable-line */

enum FontStyle {
  normal = "normal",
  bold = "bold",
  italic = "italic",
  boldItalic = "bolditalic",
}

interface TextStyle {
  fontName: string
  fontStyle: FontStyle
  fontWeight?: string
  fontSize: number
  color?: [number, number, number]
}

export class PdfGenerator {
  // Properties

  doc: jsPDF;
  pageWidth = 612;
  pageHeight = 792;
  margins = {top: 50, bottom: 50, left: 40, right: 40};
  cursor = {x: this.margins.left, y: this.margins.top};

  colors = {
    black: [0, 0, 0] as [number, number, number],
    primary: [0, 117, 116] as [number, number, number],
    lightGray: [211, 211, 211] as [number, number, number],
  };

  fontName = "Open Sans";
  textStyles = {
    h1: {
      fontName: this.fontName,
      fontStyle: FontStyle.bold,
      fontSize: 18,
    } as TextStyle,
    h2: {
      fontName: this.fontName,
      fontStyle: FontStyle.normal,
      fontSize: 16,
      color: this.colors.primary,
    } as TextStyle,
    h3: {
      fontName: this.fontName,
      fontStyle: FontStyle.normal,
      fontSize: 15,
    } as TextStyle,
    body: {
      fontName: this.fontName,
      fontStyle: FontStyle.normal,
      fontSize: 10,
    } as TextStyle,
    bodyItalic: {
      fontName: this.fontName,
      fontStyle: FontStyle.italic,
      fontSize: 10,
    } as TextStyle,
    bodyColored: {
      fontName: this.fontName,
      fontStyle: FontStyle.normal,
      fontSize: 10,
      color: this.colors.primary,
    } as TextStyle,
    bodyColoredItalic: {
      fontName: this.fontName,
      fontStyle: FontStyle.italic,
      fontSize: 10,
      color: this.colors.primary,
    } as TextStyle,
    bodyColoredBold: {
      fontName: this.fontName,
      fontStyle: FontStyle.bold,
      fontSize: 10,
      color: this.colors.primary,
    } as TextStyle,
    bodyColoredBoldItalic: {
      fontName: this.fontName,
      fontStyle: FontStyle.boldItalic,
      fontSize: 10,
      color: this.colors.primary,
    } as TextStyle,
    bodyBold: {
      fontName: this.fontName,
      fontStyle: FontStyle.bold,
      fontSize: 10,
    } as TextStyle,
    bodyBoldItalic: {
      fontName: this.fontName,
      fontStyle: FontStyle.boldItalic,
      fontSize: 10,
    } as TextStyle,
  };

  // Constructor

  constructor() {
    this.doc = new jsPDF("p", "pt", [this.pageWidth, this.pageHeight], true);
    this.addFont(
      "resources/fonts/OpenSans-Regular.ttf",
      this.fontName,
      FontStyle.normal,
    );
    this.addFont(
      "resources/fonts/OpenSans-Bold.ttf",
      this.fontName,
      FontStyle.bold,
    );
    this.addFont(
      "resources/fonts/OpenSans-Italic.ttf",
      this.fontName,
      FontStyle.italic,
    );
    this.addFont(
      "resources/fonts/OpenSans-BoldItalic.ttf",
      this.fontName,
      FontStyle.boldItalic,
    );
  }

  // Methods

  finish(): Buffer {
    logger.debug(
      `HealthSummaryPDFGenerator.finish: ${this.doc.getNumberOfPages()} pages total.`,
    );
    return Buffer.from(this.doc.output("arraybuffer"));
  }

  newPage() {
    this.doc.addPage([this.pageWidth, this.pageHeight]);
    this.cursor = {x: this.margins.left, y: this.margins.top};
  }

  addSectionTitle(title: string) {
    this.moveDown(8);
    this.addText(title, this.textStyles.h3);
    this.moveDown(4);
  }

  addSvg(svg: string, maxWidth?: number) {
    const img = this.convertSvgToPng(svg);
    this.addPng(img, maxWidth);
  }

  private convertSvgToPng(svg: string): Buffer {
    const options: ResvgRenderOptions = {
      font: {
        loadSystemFonts: false,
        fontDirs: ["resources/fonts"],
        defaultFontFamily: this.fontName,
        serifFamily: this.fontName,
        sansSerifFamily: this.fontName,
        cursiveFamily: this.fontName,
        fantasyFamily: this.fontName,
        monospaceFamily: this.fontName,
      },
      shapeRendering: 2,
      textRendering: 1,
      imageRendering: 0,
      fitTo: {mode: "zoom", value: 3},
    };
    return new Resvg(svg, options).render().asPng();
  }

  addPng(data: Buffer, maxWidth?: number) {
    const width =
      maxWidth ?? this.pageWidth - this.margins.left - this.margins.right;
    const imgData = "data:image/png;base64," + data.toString("base64");
    const imgProperties = this.doc.getImageProperties(imgData);
    const height = width / (imgProperties.width / imgProperties.height);
    this.doc.addImage(
      imgData,
      this.cursor.x,
      this.cursor.y,
      width,
      height,
      undefined,
      "FAST",
    );
    this.moveDown(height);
  }

  addTable(rows: CellDef[][], maxWidth?: number) {
    const textStyle = this.textStyles.body;
    const options: UserOptions = {
      margin: {
        left: this.cursor.x,
        right:
          maxWidth !== undefined ?
            maxWidth - this.cursor.x :
            this.margins.right,
      },
      theme: "grid",
      startY: this.cursor.y,
      tableWidth: "wrap",
      body: rows,
      styles: {
        font: textStyle.fontName,
        fontStyle: textStyle.fontStyle,
        fontSize: textStyle.fontSize,
      },
    }
    ;(this.doc as any).autoTable(options) // eslint-disable-line
    this.cursor.y = (this.doc as any).lastAutoTable.finalY // eslint-disable-line
  }

  addText(
    text: string,
    textStyle: TextStyle = this.textStyles.body,
    maxWidth?: number,
  ) {
    this.doc.setFont(
      textStyle.fontName,
      textStyle.fontStyle,
      textStyle.fontWeight,
    );
    this.doc.setFontSize(textStyle.fontSize);
    const previousTextColor = this.doc.getTextColor();
    if (textStyle.color) {
      this.doc.setTextColor(...textStyle.color);
    }
    const textWidth =
      maxWidth ?? this.pageWidth - this.cursor.x - this.margins.right;
    const splitText = this.doc.splitTextToSize(text, textWidth) as string[];
    for (const textSegment of splitText) {
      this.doc.text(
        textSegment,
        this.cursor.x,
        this.cursor.y + textStyle.fontSize / 2,
        {
          lineHeightFactor: 1.5,
        },
      );
      this.cursor.y += textStyle.fontSize * 1.5;
    }
    if (textStyle.color) {
      this.doc.setTextColor(previousTextColor);
    }
  }

  addList(texts: string[], textStyle: TextStyle) {
    texts.forEach((text, index) => {
      this.indent(1, textStyle);
      this.addText(`${index + 1}.`, textStyle);
      this.moveDown(-textStyle.fontSize * 1.5);
      this.indent(1.5, textStyle);
      this.addText(text, textStyle);
      this.indent(-2.5, textStyle);
    });
  }

  addLine(
    start: { x: number; y: number },
    end: { x: number; y: number },
    color: [number, number, number],
    width: number,
  ) {
    this.doc.setLineWidth(width);
    this.doc.setDrawColor(color[0], color[1], color[2]);
    this.doc.line(start.x, start.y, end.x, end.y);
  }

  splitTwoColumns(
    firstColumn: (width: number) => void,
    secondColumn: (width: number) => void,
  ) {
    const cursorBeforeSplit = structuredClone(this.cursor);
    const splitMargin = 8;
    const innerWidth = this.pageWidth - this.margins.left - this.margins.right;
    const columnWidth = innerWidth / 2 - splitMargin;
    firstColumn(columnWidth);
    const firstColumnMaxY = this.cursor.y;
    this.cursor = structuredClone(cursorBeforeSplit);
    this.cursor.x += columnWidth + splitMargin;
    secondColumn(columnWidth);
    this.cursor = {
      x: cursorBeforeSplit.x,
      y: Math.max(firstColumnMaxY, this.cursor.y),
    };
  }

  moveDown(deltaY: number) {
    this.cursor.y += deltaY;
  }

  private addFont(file: string, name: string, style: FontStyle) {
    const fontFileContent = fs.readFileSync(file).toString("base64");
    const fileName = file.split("/").at(-1) ?? file;
    this.doc.addFileToVFS(fileName, fontFileContent);
    this.doc.addFont(fileName, name, style.toString());
  }

  cell(title: string, styles: Partial<Styles> = {}): CellDef {
    styles.cellPadding = styles.cellPadding ?? {vertical: 0, horizontal: 0};
    styles.cellPadding = styles.fontSize ?? 4;
    styles.lineWidth = styles.lineWidth ?? {
      top: 0.5,
      bottom: 0.5,
      left: 0.5,
      right: 0.5,
    };
    styles.textColor = styles.textColor ?? "black";
    styles.lineColor = styles.lineColor ?? this.colors.black;
    return {
      styles: styles,
      title: title,
    };
  }

  private indent(amount: number, textStyle: TextStyle) {
    this.cursor.x += amount * textStyle.fontSize;
  }
}
