#!/usr/bin/env node

import process from "node:process";
import { parseArgs } from "node:util";
import { exists, safeDelete } from "./fs.ts";
import { runReview } from "./review.ts";
import { nextTicketId } from "./ticket.ts";
import { appendAudit, readAuditLog } from "./audit.ts";
import { parseApprovalRate } from "./args.ts";
import {
  FORCE_MESSAGES,
  FORCE_ESCALATION_MESSAGES,
  pickRandom,
} from "./messages.ts";

const VERSION = "0.1.0";

const HELP = `
Nigel v${VERSION} — File Deletion Review Board

USAGE:
  nigel rm <file> [files...]   Submit a deletion request
  nigel status                 View department status dashboard
  nigel audit                  View deletion audit log

OPTIONS:
  --dry-run                    Run review but never actually delete
  --force                      Skip review (escalated)
  --appeal                     Re-submit a request (same as rm)
  --approval-rate <0-100>      Override approval probability (default: 70)
  -r, --recursive              Required for directories
  --help                       Show this help
  --version                    Show version
`.trim();

const STATUS_DASHBOARD = `
┌─────────────────────────────────────────────┐
│        NIGEL — Department Status Board      │
├─────────────────────────────────────────────┤
│  Queue depth:        ██████░░░░  3 pending  │
│  Avg review time:    4.2 business seconds   │
│  Reviewer mood:      Indifferent            │
│  Policy version:     4.7b (rev. 12)         │
│  Uptime:             ∞                      │
│  Deletion quota:     72% consumed           │
└─────────────────────────────────────────────┘
`.trim();

let forceCount = 0;

async function handleRm(
  files: string[],
  options: {
    dryRun: boolean;
    force: boolean;
    approvalRate: number;
    recursive: boolean;
  },
): Promise<number> {
  let exitCode = 0;

  for (const file of files) {
    let found: boolean;
    let isDirectory: boolean;
    try {
      ({ found, isDirectory } = await exists(file));
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.error(`  ✗ ${file}: cannot access — ${reason}`);
      exitCode = 1;
      continue;
    }

    if (!found) {
      console.error(`  ✗ ${file}: file not found — request closed.`);
      exitCode = 1;
      continue;
    }

    if (isDirectory && !options.recursive) {
      console.error(`  ✗ ${file}: is a directory. Use -r/--recursive to submit for review.`);
      exitCode = 1;
      continue;
    }

    const ticketId = nextTicketId();

    if (options.force) {
      forceCount++;
      const msg = forceCount > 1
        ? pickRandom(FORCE_ESCALATION_MESSAGES)
        : pickRandom(FORCE_MESSAGES);

      console.log(`  ${ticketId} — ${msg}`);

      if (!options.dryRun && !(await safeDelete(file, isDirectory))) {
        exitCode = 1;
        continue;
      }

      await appendAudit({
        timestamp: new Date().toISOString(),
        ticketId,
        path: file,
        verdict: "FORCED",
        reason: "Review bypassed via --force",
      });

      continue;
    }

    const result = await runReview(ticketId, options.approvalRate, isDirectory);

    if (result.approved) {
      console.log(`  ${ticketId} — ✓ ${result.message}`);

      if (!options.dryRun) {
        if (!(await safeDelete(file, isDirectory))) {
          exitCode = 1;
          continue;
        }
      } else {
        console.log(`  ${ticketId} — (dry run: file not actually deleted)`);
      }

      await appendAudit({
        timestamp: new Date().toISOString(),
        ticketId,
        path: file,
        verdict: "APPROVED",
        reason: result.message,
      });
    } else {
      console.log(`  ${ticketId} — ✗ DENIED: ${result.message}`);
      exitCode = 1;

      await appendAudit({
        timestamp: new Date().toISOString(),
        ticketId,
        path: file,
        verdict: "DENIED",
        reason: result.message,
      });
    }
  }

  return exitCode;
}

async function main(): Promise<void> {
  // Non-strict to match @std/cli parseArgs: unknown flags are ignored, --no-<flag> negates.
  const { values: args, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      help: { type: "boolean", default: false },
      version: { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
      force: { type: "boolean", default: false },
      appeal: { type: "boolean", default: false },
      recursive: { type: "boolean", short: "r", default: false },
      "approval-rate": { type: "string", default: "70" },
    },
    strict: false,
    allowPositionals: true,
    allowNegative: true,
  });

  if (args.help) {
    console.log(HELP);
    process.exitCode = 0;
    return;
  }

  if (args.version) {
    console.log(`nigel v${VERSION}`);
    process.exitCode = 0;
    return;
  }

  const command = positionals[0];

  if (command === "status") {
    console.log(STATUS_DASHBOARD);
    process.exitCode = 0;
    return;
  }

  if (command === "audit") {
    const log = await readAuditLog();
    console.log(log);
    process.exitCode = 0;
    return;
  }

  if (command === "rm" || args.appeal) {
    const files = positionals.slice(command === "rm" ? 1 : 0);

    if (files.length === 0) {
      console.error("Error: no files specified.");
      console.error("Usage: nigel rm <file> [files...]");
      process.exitCode = 1;
      return;
    }

    const approvalRate = parseApprovalRate(args["approval-rate"] as string | undefined);

    const exitCode = await handleRm(files, {
      dryRun: args["dry-run"] === true,
      force: args.force === true,
      approvalRate,
      recursive: args.recursive === true,
    });

    process.exitCode = exitCode;
    return;
  }

  console.log(HELP);
  process.exitCode = 1;
}

main();
