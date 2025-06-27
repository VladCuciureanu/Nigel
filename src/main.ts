#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env

import { parseArgs } from "jsr:@std/cli/parse-args";
import { exists, deleteFile, deleteDirectory } from "./fs.ts";
import { runReview } from "./review.ts";
import { nextTicketId } from "./ticket.ts";
import { appendAudit, readAuditLog } from "./audit.ts";
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
    const { found, isDirectory } = await exists(file);

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

      if (!options.dryRun) {
        if (isDirectory) {
          await deleteDirectory(file);
        } else {
          await deleteFile(file);
        }
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
        if (isDirectory) {
          await deleteDirectory(file);
        } else {
          await deleteFile(file);
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
  const args = parseArgs(Deno.args, {
    boolean: ["help", "version", "dry-run", "force", "appeal", "recursive"],
    string: ["approval-rate"],
    alias: { r: "recursive" },
    default: { "approval-rate": "70" },
  });

  if (args.help) {
    console.log(HELP);
    Deno.exit(0);
  }

  if (args.version) {
    console.log(`nigel v${VERSION}`);
    Deno.exit(0);
  }

  const command = args._[0]?.toString();

  if (command === "status") {
    console.log(STATUS_DASHBOARD);
    Deno.exit(0);
  }

  if (command === "audit") {
    const log = await readAuditLog();
    console.log(log);
    Deno.exit(0);
  }

  if (command === "rm" || args.appeal) {
    const files = args._.slice(command === "rm" ? 1 : 0).map(String);

    if (files.length === 0) {
      console.error("Error: no files specified.");
      console.error("Usage: nigel rm <file> [files...]");
      Deno.exit(1);
    }

    const approvalRate = Math.max(0, Math.min(100, parseInt(args["approval-rate"] as string, 10) || 70));

    const exitCode = await handleRm(files, {
      dryRun: args["dry-run"],
      force: args.force,
      approvalRate,
      recursive: args.recursive,
    });

    Deno.exit(exitCode);
  }

  console.log(HELP);
  Deno.exit(1);
}

main();
