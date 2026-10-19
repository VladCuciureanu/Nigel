import { test } from "node:test";
import assert from "node:assert/strict";
import {
  APPROVAL_MESSAGES,
  DENIAL_REASONS,
  FORCE_ESCALATION_MESSAGES,
  FORCE_MESSAGES,
  pickMultiple,
  pickRandom,
  REVIEW_STATUSES,
} from "../src/messages.ts";

test("pickRandom returns an element from the pool", () => {
  const pool = ["a", "b", "c"];
  const result = pickRandom(pool);
  assert.equal(pool.includes(result), true);
});

test("pickMultiple returns the requested count", () => {
  const pool = ["a", "b", "c", "d", "e"];
  const result = pickMultiple(pool, 3);
  assert.equal(result.length, 3);
});

test("pickMultiple does not exceed pool size", () => {
  const pool = ["a", "b"];
  const result = pickMultiple(pool, 5);
  assert.equal(result.length, 2);
});

test("pickMultiple returns unique elements", () => {
  const pool = ["a", "b", "c", "d", "e"];
  const result = pickMultiple(pool, 5);
  const unique = new Set(result);
  assert.equal(unique.size, result.length);
});

test("all message pools are non-empty", () => {
  assert.notEqual(REVIEW_STATUSES.length, 0);
  assert.notEqual(DENIAL_REASONS.length, 0);
  assert.notEqual(APPROVAL_MESSAGES.length, 0);
  assert.notEqual(FORCE_MESSAGES.length, 0);
  assert.notEqual(FORCE_ESCALATION_MESSAGES.length, 0);
});
