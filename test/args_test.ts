import { test } from "node:test";
import assert from "node:assert/strict";
import { parseApprovalRate } from "../src/args.ts";

test("parseApprovalRate honors 0", () => {
  assert.equal(parseApprovalRate("0"), 0);
});

test("parseApprovalRate defaults to 70 when absent", () => {
  assert.equal(parseApprovalRate(undefined), 70);
});

test("parseApprovalRate defaults to 70 when not a number", () => {
  assert.equal(parseApprovalRate("abc"), 70);
});

test("parseApprovalRate clamps to 0-100", () => {
  assert.equal(parseApprovalRate("150"), 100);
  assert.equal(parseApprovalRate("-5"), 0);
});
