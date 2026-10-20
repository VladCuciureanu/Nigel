#!/usr/bin/env node

import { readFileSync } from "node:fs";
import process from "node:process";
import { parseArgs } from "node:util";
import { dryRunSet, flagSet, parseApprovalRate } from "./args.ts";
import { readAuditLog } from "./audit.ts";
import { handleRm } from "./rm.ts";

const { version: VERSION } = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { version: string };

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
      dryRun: dryRunSet(args["dry-run"]),
      force: flagSet(args.force),
      approvalRate,
      recursive: flagSet(args.recursive),
    });

    process.exitCode = exitCode;
    return;
  }

  console.log(HELP);
  process.exitCode = 1;
}

main();
