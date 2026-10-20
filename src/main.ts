#!/usr/bin/env node

import { readFileSync } from "node:fs";
import process from "node:process";
import { parseArgs } from "node:util";
import { parseApprovalRate } from "./args.ts";
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
  -f, --force                  Skip review (escalated)
  --appeal                     Re-submit a request (same as rm)
  --approval-rate <0-100>      Override approval probability (default: 70)
  -r, --recursive              Required for directories
  -h, --help                   Show this help
  -v, --version                Show version
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

function parseCommandLine(args: string[]) {
  try {
    return parseArgs({
      args,
      options: {
        help: { type: "boolean", short: "h", default: false },
        version: { type: "boolean", short: "v", default: false },
        "dry-run": { type: "boolean", default: false },
        force: { type: "boolean", short: "f", default: false },
        appeal: { type: "boolean", default: false },
        recursive: { type: "boolean", short: "r", default: false },
        "approval-rate": { type: "string", default: "70" },
      },
      allowPositionals: true,
    });
  } catch (error) {
    // parseArgs messages run on with advice about `--`; keep the first sentence.
    if ((error as NodeJS.ErrnoException).code?.startsWith("ERR_PARSE_ARGS_")) {
      const [summary] = (error as Error).message.split(". ");
      throw new Error(`${summary}. Run 'nigel --help' for usage.`);
    }
    throw error;
  }
}

async function main(): Promise<void> {
  const { values: args, positionals } = parseCommandLine(process.argv.slice(2));

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

    const approvalRate = parseApprovalRate(args["approval-rate"]);

    const exitCode = await handleRm(files, {
      dryRun: args["dry-run"],
      force: args.force,
      approvalRate,
      recursive: args.recursive,
    });

    process.exitCode = exitCode;
    return;
  }

  console.error(HELP);
  process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(`nigel: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
