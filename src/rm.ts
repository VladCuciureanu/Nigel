import { appendAudit, type AuditEntry } from "./audit.ts";
import { exists, safeDelete } from "./fs.ts";
import { FORCE_ESCALATION_MESSAGES, FORCE_MESSAGES, pickRandom } from "./messages.ts";
import { runReview, type ReviewResult } from "./review.ts";
import { nextTicketId } from "./ticket.ts";

export interface RmOptions {
  dryRun: boolean;
  force: boolean;
  approvalRate: number;
  recursive: boolean;
}

/** Collaborators of handleRm, injectable for tests. */
export interface RmDeps {
  review?: (ticketId: string, approvalRate: number, recursive: boolean) => Promise<ReviewResult>;
  log?: (message: string) => void;
  error?: (message: string) => void;
}

async function audit(
  ticketId: string,
  path: string,
  verdict: AuditEntry["verdict"],
  reason: string,
): Promise<void> {
  await appendAudit({ timestamp: new Date().toISOString(), ticketId, path, verdict, reason });
}

export async function handleRm(
  files: string[],
  options: RmOptions,
  deps: RmDeps = {},
): Promise<number> {
  const review = deps.review ?? runReview;
  const log = deps.log ?? console.log;
  const error = deps.error ?? console.error;

  // Deletes the file unless this is a dry run; reports failures and returns false.
  const remove = (file: string, isDirectory: boolean): Promise<boolean> =>
    options.dryRun ? Promise.resolve(true) : safeDelete(file, isDirectory, error);

  let exitCode = 0;
  let forceCount = 0;

  for (const file of files) {
    let found: boolean;
    let isDirectory: boolean;
    try {
      ({ found, isDirectory } = await exists(file));
    } catch (cause) {
      const reason = cause instanceof Error ? cause.message : String(cause);
      error(`  ✗ ${file}: cannot access — ${reason}`);
      exitCode = 1;
      continue;
    }

    if (!found) {
      error(`  ✗ ${file}: file not found — request closed.`);
      exitCode = 1;
      continue;
    }

    if (isDirectory && !options.recursive) {
      error(`  ✗ ${file}: is a directory. Use -r/--recursive to submit for review.`);
      exitCode = 1;
      continue;
    }

    const ticketId = nextTicketId();
    let verdict: AuditEntry["verdict"];
    let reason: string;

    if (options.force) {
      forceCount++;
      const msg = forceCount > 1
        ? pickRandom(FORCE_ESCALATION_MESSAGES)
        : pickRandom(FORCE_MESSAGES);
      log(`  ${ticketId} — ${msg}`);
      verdict = "FORCED";
      reason = "Review bypassed via --force";
    } else {
      const result = await review(ticketId, options.approvalRate, isDirectory);
      if (!result.approved) {
        log(`  ${ticketId} — ✗ DENIED: ${result.message}`);
        exitCode = 1;
        await audit(ticketId, file, "DENIED", result.message);
        continue;
      }
      log(`  ${ticketId} — ✓ ${result.message}`);
      if (options.dryRun) {
        log(`  ${ticketId} — (dry run: file not actually deleted)`);
      }
      verdict = "APPROVED";
      reason = result.message;
    }

    if (!(await remove(file, isDirectory))) {
      exitCode = 1;
      continue;
    }

    await audit(ticketId, file, verdict, reason);
  }

  return exitCode;
}
