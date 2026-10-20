import assert from "node:assert/strict";
import { test } from "node:test";
import { dryRunSet, flagSet, parseApprovalRate } from "../src/args.ts";

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

test('flagSet only accepts true or "true"', () => {
  assert.equal(flagSet(true), true);
  assert.equal(flagSet("true"), true);
  assert.equal(flagSet("false"), false);
  assert.equal(flagSet("yes"), false);
  assert.equal(flagSet(undefined), false);
  assert.equal(flagSet(false), false);
});

test('dryRunSet keeps dry run on for any explicit value except "false"', () => {
  assert.equal(dryRunSet(true), true);
  assert.equal(dryRunSet("true"), true);
  assert.equal(dryRunSet("1"), true);
  assert.equal(dryRunSet("false"), false);
  assert.equal(dryRunSet(false), false);
  assert.equal(dryRunSet(undefined), false);
});
