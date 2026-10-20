#!/usr/bin/env node

import { readFileSync } from "node:fs";
import process from "node:process";
import { parseArgs } from "node:util";
import { DEFAULT_APPROVAL_RATE, parseApprovalRate } from "./args.ts";
import { readAuditRecords } from "./audit.ts";
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
  --approval-rate <0-100>      Approval probability in percent (default: ${DEFAULT_APPROVAL_RATE})
  -r, --recursive              Required for directories
  -h, --help                   Show this help
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

const OPTIONS = {
  help: { type: "boolean", short: "h", default: false },
  version: { type: "boolean", default: false },
  "dry-run": { type: "boolean", default: false },
  force: { type: "boolean", short: "f", default: false },
  appeal: { type: "boolean", default: false },
  recursive: { type: "boolean", short: "r", default: false },
  "approval-rate": { type: "string" },
} as const;

/**
 * Explains `--opt -value`: parseArgs refuses a string option's value that starts with a dash,
 * so name the option and value from argv and suggest the `--opt=-value` form.
 */
function ambiguousValueMessage(args: string[]): string | undefined {
  const { tokens } = parseArgs({ args, options: OPTIONS, strict: false, tokens: true });
  for (const token of tokens) {
    // Without strict mode parseArgs takes the dash-led next argument as the value.
    if (token.kind !== "option" || token.inlineValue !== false) continue;
    const { value } = token;
    // A long flag in the value slot means the value was left out, not that it starts with a dash.
    if (value?.startsWith("--")) return `option '${token.rawName}' needs a value`;
    if (value?.startsWith("-")) {
      return `option '${token.rawName}' got '${value}', which looks like an option; write --${token.name}=${value}`;
    }
  }
  return undefined;
}

function parseCommandLine(args: string[]) {
  try {
    return parseArgs({ args, options: OPTIONS, allowPositionals: true });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ERR_PARSE_ARGS_INVALID_OPTION_VALUE") {
      const message = ambiguousValueMessage(args);
      if (message !== undefined) throw new Error(message);
    }
    // parseArgs messages run on over several lines with advice about `--`; keep the first sentence.
    if (code?.startsWith("ERR_PARSE_ARGS_")) {
      const [firstLine = ""] = (error as Error).message.split("\n");
      const [summary = ""] = firstLine.split(". ");
      throw new Error(`${summary.trim().replace(/\.+$/, "")}. Run 'nigel --help' for usage.`);
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
    const records = await readAuditRecords();
    console.log(records === "" ? "No audit records found." : records);
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
