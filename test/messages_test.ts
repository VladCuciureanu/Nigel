import { assertEquals, assertNotEquals } from "jsr:@std/assert";
import {
  APPROVAL_MESSAGES,
  DENIAL_REASONS,
  FORCE_ESCALATION_MESSAGES,
  FORCE_MESSAGES,
  pickMultiple,
  pickRandom,
  REVIEW_STATUSES,
} from "../src/messages.ts";

Deno.test("pickRandom returns an element from the pool", () => {
  const pool = ["a", "b", "c"];
  const result = pickRandom(pool);
  assertEquals(pool.includes(result), true);
});

Deno.test("pickMultiple returns the requested count", () => {
  const pool = ["a", "b", "c", "d", "e"];
  const result = pickMultiple(pool, 3);
  assertEquals(result.length, 3);
});

Deno.test("pickMultiple does not exceed pool size", () => {
  const pool = ["a", "b"];
  const result = pickMultiple(pool, 5);
  assertEquals(result.length, 2);
});

Deno.test("pickMultiple returns unique elements", () => {
  const pool = ["a", "b", "c", "d", "e"];
  const result = pickMultiple(pool, 5);
  const unique = new Set(result);
  assertEquals(unique.size, result.length);
});

Deno.test("all message pools are non-empty", () => {
  assertNotEquals(REVIEW_STATUSES.length, 0);
  assertNotEquals(DENIAL_REASONS.length, 0);
  assertNotEquals(APPROVAL_MESSAGES.length, 0);
  assertNotEquals(FORCE_MESSAGES.length, 0);
  assertNotEquals(FORCE_ESCALATION_MESSAGES.length, 0);
});
