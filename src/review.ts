import { writeSync } from "node:fs";
import process from "node:process";
import {
  APPROVAL_MESSAGES,
  DENIAL_REASONS,
  pickMultiple,
  pickRandom,
  RECURSIVE_STATUSES,
  REVIEW_STATUSES,
  type Rng,
} from "./messages.ts";

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const SPINNER_INTERVAL_MS = 80;

export interface ReviewResult {
  approved: boolean;
  message: string;
}

/** Side effects of a review, injectable so tests run instantly and deterministically. */
export interface ReviewDeps {
  rng?: Rng;
  sleep?: (ms: number) => Promise<void>;
  write?: (text: string) => void;
  /** Animate the spinner; defaults to whether stderr is a TTY. Otherwise each status is one line. */
  interactive?: boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function writeStderr(text: string): void {
  writeSync(process.stderr.fd, text);
}

async function showSpinner(
  text: string,
  durationMs: number,
  wait: (ms: number) => Promise<void>,
  write: (text: string) => void,
  interactive: boolean,
): Promise<void> {
  if (!interactive) {
    await wait(durationMs);
    write(`  ✓ ${text}
`);
    return;
  }

  let frame = 0;
  const steps = Math.floor(durationMs / SPINNER_INTERVAL_MS);

  for (let i = 0; i < steps; i++) {
    const line = `\r  ${SPINNER_FRAMES[frame % SPINNER_FRAMES.length]} ${text}`;
    write(line);
    frame++;
    await wait(SPINNER_INTERVAL_MS);
  }
  write(`\r  ✓ ${text}\n`);
}

export async function runReview(
  ticketId: string,
  approvalRate: number,
  recursive: boolean,
  deps: ReviewDeps = {},
): Promise<ReviewResult> {
  const rng = deps.rng ?? Math.random;
  const wait = deps.sleep ?? sleep;
  const write = deps.write ?? writeStderr;
  const interactive = deps.interactive ?? process.stderr.isTTY === true;

  const baseStatuses = pickMultiple(REVIEW_STATUSES, 3 + Math.floor(rng() * 2), rng);
  const statuses = recursive
    ? [...pickMultiple(RECURSIVE_STATUSES, 2, rng), ...baseStatuses]
    : baseStatuses;

  const totalDuration = 3000 + rng() * 2000; // 3-5 seconds
  const stepDuration = totalDuration / statuses.length;

  write(`\n  Request ${ticketId} submitted. Review in progress.\n\n`);

  for (const status of statuses) {
    await showSpinner(status, stepDuration, wait, write, interactive);
  }

  write("\n");

  const approved = rng() * 100 < approvalRate;

  return {
    approved,
    message: approved ? pickRandom(APPROVAL_MESSAGES, rng) : pickRandom(DENIAL_REASONS, rng),
  };
}
