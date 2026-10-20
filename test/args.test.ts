import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_APPROVAL_RATE, parseApprovalRate } from "../src/args.ts";

test("parseApprovalRate accepts integers from 0 to 100", () => {
  assert.equal(parseApprovalRate("0"), 0);
  assert.equal(parseApprovalRate("55"), 55);
  assert.equal(parseApprovalRate("100"), 100);
});

test("parseApprovalRate defaults when absent", () => {
  assert.equal(parseApprovalRate(undefined), DEFAULT_APPROVAL_RATE);
});

for (const raw of ["abc", "50x", "", " 50", "1.5", "1e2", "-5", "101", "150"]) {
  test(`parseApprovalRate rejects ${JSON.stringify(raw)}`, () => {
    assert.throws(() => parseApprovalRate(raw), {
      message: `invalid --approval-rate '${raw}': expected an integer from 0 to 100`,
    });
  });
}
