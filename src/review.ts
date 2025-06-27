import {
  APPROVAL_MESSAGES,
  DENIAL_REASONS,
  pickMultiple,
  pickRandom,
  RECURSIVE_STATUSES,
  REVIEW_STATUSES,
} from "./messages.ts";

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export interface ReviewResult {
  approved: boolean;
  message: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function showSpinner(text: string, durationMs: number): Promise<void> {
  const encoder = new TextEncoder();
  let frame = 0;
  const interval = 80;
  const steps = Math.floor(durationMs / interval);

  for (let i = 0; i < steps; i++) {
    const line = `\r  ${SPINNER_FRAMES[frame % SPINNER_FRAMES.length]} ${text}`;
    Deno.stderr.writeSync(encoder.encode(line));
    frame++;
    await sleep(interval);
  }
  Deno.stderr.writeSync(encoder.encode(`\r  ✓ ${text}\n`));
}

export async function runReview(
  ticketId: string,
  approvalRate: number,
  recursive: boolean,
): Promise<ReviewResult> {
  const baseStatuses = pickMultiple(REVIEW_STATUSES, 3 + Math.floor(Math.random() * 2));
  const statuses = recursive
    ? [...pickMultiple(RECURSIVE_STATUSES, 2), ...baseStatuses]
    : baseStatuses;

  const totalDuration = 3000 + Math.random() * 2000; // 3-5 seconds
  const stepDuration = totalDuration / statuses.length;

  const encoder = new TextEncoder();
  Deno.stderr.writeSync(encoder.encode(`\n  Request ${ticketId} submitted. Review in progress.\n\n`));

  for (const status of statuses) {
    await showSpinner(status, stepDuration);
  }

  Deno.stderr.writeSync(encoder.encode("\n"));

  const approved = Math.random() * 100 < approvalRate;

  return {
    approved,
    message: approved
      ? pickRandom(APPROVAL_MESSAGES)
      : pickRandom(DENIAL_REASONS),
  };
}
