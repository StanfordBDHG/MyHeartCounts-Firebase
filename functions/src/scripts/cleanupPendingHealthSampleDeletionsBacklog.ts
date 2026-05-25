// This source file is part of the MyHeart Counts project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

// One-shot maintenance script. Drains the legacy backlog from
// `pendingHealthSampleDeletions` (and optionally `failedHealthSampleDeletions`)
// after the deterministic-id / NOT_FOUND-terminal fixes were deployed.
//
// Default mode is DRY-RUN. Pass --apply to actually delete.
//
// Usage:
//   npm run build
//   GCLOUD_PROJECT=<project-id> \
//     node lib/scripts/cleanupPendingHealthSampleDeletionsBacklog.js \
//     [--collection=pending|failed|both] \
//     [--olderThanHours=N] \
//     [--reason=NOT_FOUND|TRANSIENT_ERROR] \
//     [--pageSize=N] \
//     [--apply]
//
// Credentials: Application Default Credentials. Either set
// GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json or run
// `gcloud auth application-default login` first.

import admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

type CollectionTarget = "pending" | "failed" | "both";
type Reason = "NOT_FOUND" | "TRANSIENT_ERROR";

interface Options {
  collection: CollectionTarget;
  olderThanHours: number;
  reason: Reason | null;
  pageSize: number;
  apply: boolean;
}

const PENDING = "pendingHealthSampleDeletions";
const FAILED = "failedHealthSampleDeletions";

const parseArgs = (argv: string[]): Options => {
  const opts: Options = {
    collection: "pending",
    olderThanHours: 0,
    reason: null,
    pageSize: 2000,
    apply: false,
  };

  for (const arg of argv.slice(2)) {
    if (arg === "--apply") {
      opts.apply = true;
    } else if (arg.startsWith("--collection=")) {
      const v = arg.slice("--collection=".length);
      if (v !== "pending" && v !== "failed" && v !== "both") {
        throw new Error(
          `--collection must be one of pending|failed|both, got '${v}'`,
        );
      }
      opts.collection = v;
    } else if (arg.startsWith("--olderThanHours=")) {
      const v = Number(arg.slice("--olderThanHours=".length));
      if (!Number.isFinite(v) || v < 0) {
        throw new Error(`--olderThanHours must be a non-negative number`);
      }
      opts.olderThanHours = v;
    } else if (arg.startsWith("--reason=")) {
      const v = arg.slice("--reason=".length);
      if (v !== "NOT_FOUND" && v !== "TRANSIENT_ERROR") {
        throw new Error(
          `--reason must be NOT_FOUND or TRANSIENT_ERROR, got '${v}'`,
        );
      }
      opts.reason = v;
    } else if (arg.startsWith("--pageSize=")) {
      const v = Number(arg.slice("--pageSize=".length));
      if (!Number.isInteger(v) || v < 1 || v > 10000) {
        throw new Error(`--pageSize must be an integer in [1, 10000]`);
      }
      opts.pageSize = v;
    } else {
      throw new Error(`Unknown argument: '${arg}'`);
    }
  }

  return opts;
};

const drain = async (
  firestore: admin.firestore.Firestore,
  collectionId: string,
  opts: Options,
): Promise<number> => {
  const cutoff =
    opts.olderThanHours > 0 ?
      Timestamp.fromMillis(Date.now() - opts.olderThanHours * 3_600_000)
    : null;

  const writer = opts.apply ? firestore.bulkWriter() : null;
  let total = 0;
  let pageCount = 0;
  const startedAt = Date.now();

  for (;;) {
    let query: admin.firestore.Query = firestore
      .collectionGroup(collectionId)
      .limit(opts.pageSize);
    if (cutoff !== null) query = query.where("createdAt", "<", cutoff);
    if (opts.reason !== null) query = query.where("reason", "==", opts.reason);

    const snap = await query.get();
    if (snap.empty) break;

    for (const doc of snap.docs) {
      if (writer !== null) {
        // BulkWriter swallows individual rejections via its onError handler;
        // the default retries transient errors. We attach a logging handler
        // for non-retryable failures so we don't silently lose docs.
        writer.delete(doc.ref).catch((err: unknown) => {
          console.error(`delete failed for ${doc.ref.path}:`, err);
        });
      }
    }
    total += snap.size;
    pageCount++;

    if (writer !== null) {
      await writer.flush();
    }

    const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.log(
      `[${collectionId}] page ${pageCount}: ${snap.size} docs (running total: ${total}, ${elapsedSec}s elapsed)`,
    );

    // Dry-run only walks one page so we don't churn read quota for a count.
    // The operator can re-run with --apply to actually drain.
    if (writer === null) {
      console.log(
        `[${collectionId}] dry-run: stopping after first page; pass --apply to drain`,
      );
      break;
    }
  }

  if (writer !== null) await writer.close();
  return total;
};

const main = async (): Promise<void> => {
  const opts = parseArgs(process.argv);

  const projectId =
    process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT;
  if (projectId === undefined || projectId === "") {
    console.error(
      "GCLOUD_PROJECT (or GOOGLE_CLOUD_PROJECT) must be set so we don't accidentally run against the wrong Firebase project.",
    );
    process.exit(1);
  }

  console.log(`Project:    ${projectId}`);
  console.log(
    `Mode:       ${opts.apply ? "APPLY (will delete)" : "DRY-RUN (no writes)"}`,
  );
  console.log(`Collection: ${opts.collection}`);
  console.log(
    `Filter:     olderThanHours=${opts.olderThanHours}, reason=${opts.reason ?? "(any)"}`,
  );
  console.log(`Page size:  ${opts.pageSize}`);
  console.log("");

  admin.initializeApp();
  const firestore = admin.firestore();

  const targets: string[] =
    opts.collection === "both" ? [PENDING, FAILED]
    : opts.collection === "pending" ? [PENDING]
    : [FAILED];

  let grandTotal = 0;
  for (const collectionId of targets) {
    const count = await drain(firestore, collectionId, opts);
    console.log(
      `[${collectionId}] done: ${count} docs ${opts.apply ? "deleted" : "matched (dry-run)"}`,
    );
    grandTotal += count;
  }

  console.log("");
  console.log(
    `Grand total: ${grandTotal} docs ${opts.apply ? "deleted" : "matched (dry-run)"}`,
  );
};

main().catch((err: unknown) => {
  console.error("Cleanup script failed:", err);
  process.exit(1);
});
