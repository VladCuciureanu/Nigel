import { test } from "node:test";
import assert from "node:assert/strict";
import { APPROVAL_MESSAGES, DENIAL_REASONS, RECURSIVE_STATUSES } from "../src/messages.ts";
import { runReview, type ReviewDeps } from "../src/review.ts";
import { seededRng } from "./rng.ts";

function fakeDeps(rng = seededRng(1)): ReviewDeps & { output: string[]; slept: number[] } {
  const output: string[] = [];
  const slept: number[] = [];
  return {
    rng,
    output,
    slept,
    sleep: async (ms) => {
      slept.push(ms);
    },
    write: (text) => {
      output.push(text);
    },
  };
}

test("runReview with 100% approval rate always approves", async () => {
  const deps = fakeDeps();
  const result = await runReview("NGL-TEST", 100, false, deps);
  assert.equal(result.approved, true);
  assert.ok(APPROVAL_MESSAGES.includes(result.message));
});

test("runReview with 0% approval rate always denies", async () => {
  const deps = fakeDeps();
  const result = await runReview("NGL-TEST", 0, false, deps);
  assert.equal(result.approved, false);
  assert.ok(DENIAL_REASONS.includes(result.message));
});

test("runReview approves when the roll is under the approval rate", async () => {
  assert.equal((await runReview("NGL-TEST", 50, false, fakeDeps(() => 0.49))).approved, true);
  assert.equal((await runReview("NGL-TEST", 50, false, fakeDeps(() => 0.5))).approved, false);
});

test("runReview spends 3-5 simulated seconds on the injected clock", async () => {
  const deps = fakeDeps();
  await runReview("NGL-00042", 100, false, deps);
  const total = deps.slept.reduce((sum, ms) => sum + ms, 0);
  assert.ok(total >= 2500 && total <= 5000, `slept ${total}ms`);
  assert.ok(deps.output[0].includes("NGL-00042"));
});

test("runReview adds recursive statuses for directories", async () => {
  const deps = fakeDeps();
  await runReview("NGL-TEST", 100, true, deps);
  const text = deps.output.join("");
  assert.ok(RECURSIVE_STATUSES.some((status) => text.includes(status)));
});
