// This source file is part of the MyHeart Counts project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

import { type DocumentSnapshot } from "firebase-admin/firestore";
import { type Change } from "firebase-functions";
import { z } from "zod";
import { dateConverter, SchemaConverter } from "../../models/index.js";

export const historyChangeItemConverter = new SchemaConverter({
  schema: z.object({
    path: z.string(),
    date: dateConverter.schema,
    data: z.unknown(),
    type: z.enum(["created", "updated", "deleted"]).optional(),
    before: z.unknown().optional(),
  }),
  encode: (object) => ({
    path: object.path,
    date: dateConverter.encode(object.date),
    data: object.data === undefined ? null : object.data,
    type: object.type ?? null,
    before: object.before === undefined ? null : object.before,
  }),
});
export type HistoryChangeItem = z.output<
  typeof historyChangeItemConverter.schema
>;

export interface HistoryService {
  isEmpty(): Promise<boolean>;
  recordChange(change: Change<DocumentSnapshot>): Promise<void>;
}
