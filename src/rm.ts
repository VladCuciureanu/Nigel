import { type AuditEntry, appendAudit, readAuditRecords } from "./audit.ts";
import { exists, safeDelete } from "./fs.ts";
import { FORCE_ESCALATION_MESSAGES, FORCE_MESSAGES, pickRandom } from "./messages.ts";
import { type ReviewResult, runReview } from "./review.ts";
import { lastTicketNumber, ticketSequence } from "./ticket.ts";

export interface RmOptions {
  dryRun: boolean;
  force: boolean;
  approvalRate: number;
  recursive: boolean;
}

/** Collaborators of handleRm, injectable for tests. */
export interface RmDeps {
  review?: (ticketId: string, approvalRate: number, recursive: boolean) => Promise<ReviewResult>;
}

export async function handleRm(
  files: string[],
  options: RmOptions,
  deps: RmDeps = {},
): Promise<number> {
  const review = deps.review ?? runReview;

  // Deletes the file, or only announces it on a dry run; reports failures and returns false.
  const remove = async (ticketId: string, file: string, isDirectory: boolean): Promise<boolean> => {
    if (options.dryRun) {
      console.log(`  ${ticketId} — (dry run: file not actually deleted)`);
      return true;
    }
    return await safeDelete(file, isDirectory);
  };

  // Continue numbering from the audit log so IDs stay unique across runs.
  const nextTicketId = ticketSequence(lastTicketNumber(await readAuditRecords()));
  let exitCode = 0;
  let forceCount = 0;

  for (const file of files) {
    let found: boolean;
    let isDirectory: boolean;
    try {
      ({ found, isDirectory } = await exists(file));
    } catch (cause) {
      const reason = cause instanceof Error ? cause.message : String(cause);
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
    let verdict: AuditEntry["verdict"];
    let reason: string;

    if (options.force) {
      forceCount++;
      const msg =
        forceCount > 1 ? pickRandom(FORCE_ESCALATION_MESSAGES) : pickRandom(FORCE_MESSAGES);
      console.log(`  ${ticketId} — ${msg}`);
      verdict = "FORCED";
      reason = "Review bypassed via --force";
    } else {
      const result = await review(ticketId, options.approvalRate, isDirectory);
      if (!result.approved) {
        console.log(`  ${ticketId} — ✗ DENIED: ${result.message}`);
        exitCode = 1;
        await appendAudit({ ticketId, path: file, verdict: "DENIED", reason: result.message });
        continue;
      }
      console.log(`  ${ticketId} — ✓ ${result.message}`);
      verdict = "APPROVED";
      reason = result.message;
    }

    if (!(await remove(ticketId, file, isDirectory))) {
      exitCode = 1;
      continue;
    }

    await appendAudit({
      ticketId,
      path: file,
      verdict: options.dryRun ? "DRY-RUN" : verdict,
      reason,
    });
  }

  return exitCode;
}
