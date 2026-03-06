// This source file is part of the MyHeart Counts project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

import fs from "fs";
import { expect } from "chai";

export const readCsv = (
  path: string,
  expectedLines: number,
  perform: (line: string[], index: number) => void,
) => {
  const fileContent = fs.readFileSync(path, "utf8");
  const lines = fileContent
    .replace(/"([\s\S]*?)"/g, (str) =>
      str
        .slice(1, -1)
        .split(",")
        .join("###COMMA###")
        .split("\n")
        .join("###NEWLINE###"),
    )
    .split("\n");
  expect(lines).to.have.length(expectedLines);
  lines.forEach((line, index) => {
    const values = line
      .split(",")
      .map((x) =>
        x
          .split("###COMMA###")
          .join(",")
          .split("###NEWLINE###")
          .join("\n")
          .trim(),
      );
    perform(values, index);
  });
};
