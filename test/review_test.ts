import { test } from "node:test";
import assert from "node:assert/strict";
import { runReview } from "../src/review.ts";

test("runReview with 100% approval rate always approves", async () => {
  const result = await runReview("NGL-TEST", 100, false);
  assert.equal(result.approved, true);
  assert.equal(typeof result.message, "string");
});

test("runReview with 0% approval rate always denies", async () => {
  const result = await runReview("NGL-TEST", 0, false);
  assert.equal(result.approved, false);
  assert.equal(typeof result.message, "string");
});
