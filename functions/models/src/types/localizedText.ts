//
// This source file is part of the MyHeartCounts project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { z } from "zod";
import { SchemaConverter } from "../helpers/schemaConverter.js";

export const localizedTextConverter = new SchemaConverter({
  schema: z
    .string()
    .or(z.record(z.string()))
    .transform((content) => LocalizedText.raw(content)),
  encode: (object) => object.content,
});

/**
 * Type-safe parameter extraction for localized text
 * This type extracts parameter types from a string template based on @N patterns
 */
export type LocalizedTextParams<S extends string, Acc extends unknown[] = []> =
  S extends `${string}@${infer N}${infer Rest}` ?
    N extends `${number}` ?
      LocalizedTextParams<Rest, [...Acc, string | LocalizedText]>
    : LocalizedTextParams<Rest, Acc>
  : Acc;

export class LocalizedText {
  // Properties

  readonly content: string | Record<string, string>;

  // Constructor

  private constructor(input: string | Record<string, string>) {
    this.content = input;
  }

  /**
   * Create a LocalizedText instance directly from a string or record
   */
  static raw(input: string | Record<string, string>): LocalizedText {
    return new LocalizedText(input);
  }

  /**
   * Create a LocalizedText with parameters
   * Uses TypeScript's type system to ensure the correct number and type of parameters
   * are provided based on the @N placeholders in the template
   */
  static create<L extends Record<string, string>>(
    input: L,
    ...params: LocalizedTextParams<L["en"]>
  ): LocalizedText {
    const copy: Record<string, string> = {};

    for (const language of Object.keys(input)) {
      copy[language] = params.reduce(
        (previousValue, currentValue, index) =>
          previousValue.replace(
            `@${index}`,
            (
              typeof currentValue === "object" &&
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                currentValue !== null && // Defensive check for typeof null === "object" quirk
                "localize" in currentValue &&
                typeof (currentValue as { localize: unknown }).localize ===
                  "function"
            ) ?
              (currentValue as LocalizedText).localize(language)
            : String(currentValue),
          ),
        input[language] || "",
      );
    }

    return new LocalizedText(copy);
  }

  // Methods

  /**
   * Get a localized string based on provided language preferences
   * @param languages Priority-ordered list of preferred languages
   * @returns The localized string for the most preferred available language
   */
  localize(...languages: string[]): string {
    if (typeof this.content === "string") return this.content;

    for (const language of [...languages, "en-US"]) {
      const exactMatch = this.content[language];
      if (exactMatch) return exactMatch;

      const languagePrefix = language.split(/-|_/).at(0);
      if (languagePrefix) {
        const prefixMatch = this.content[languagePrefix];
        if (prefixMatch) return prefixMatch;
      }
    }

    return Object.values(this.content).at(0) ?? "";
  }
}
