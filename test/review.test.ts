import assert from "node:assert/strict";
import { test } from "node:test";
import { APPROVAL_MESSAGES, DENIAL_REASONS, RECURSIVE_STATUSES } from "../src/messages.ts";
import { type ReviewDeps, runReview } from "../src/review.ts";
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
  assert.equal(
    (
      await runReview(
        "NGL-TEST",
        50,
        false,
        fakeDeps(() => 0.49),
      )
    ).approved,
    true,
  );
  assert.equal(
    (
      await runReview(
        "NGL-TEST",
        50,
        false,
        fakeDeps(() => 0.5),
      )
    ).approved,
    false,
  );
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

test("runReview prints one plain line per status when stderr is not a TTY", async () => {
  const deps = { ...fakeDeps(), interactive: false };
  await runReview("NGL-TEST", 100, false, deps);
  const text = deps.output.join("");
  assert.ok(!text.includes("\r"), "no carriage returns");
  const statuses = text.split("\n").filter((line) => line.startsWith("  ✓ "));
  assert.ok(statuses.length >= 3);
  assert.equal(deps.output.length, statuses.length + 2); // header, statuses, trailing blank line
  const total = deps.slept.reduce((sum, ms) => sum + ms, 0);
  assert.ok(total >= 3000 && total <= 5000, `slept ${total}ms`);
});

test("runReview animates the spinner when stderr is a TTY", async () => {
  const deps = { ...fakeDeps(), interactive: true };
  await runReview("NGL-TEST", 100, false, deps);
  assert.ok(deps.output.filter((text) => text.startsWith("\r  ⠋ ")).length >= 3);
});
