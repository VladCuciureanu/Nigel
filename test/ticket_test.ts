import { test } from "node:test";
import assert from "node:assert/strict";
import { nextTicketId, resetCounter } from "../src/ticket.ts";

test("nextTicketId generates sequential IDs", () => {
  resetCounter();
  assert.equal(nextTicketId(), "NGL-00001");
  assert.equal(nextTicketId(), "NGL-00002");
  assert.equal(nextTicketId(), "NGL-00003");
});

test("resetCounter resets the sequence", () => {
  resetCounter();
  assert.equal(nextTicketId(), "NGL-00001");
});

test("ticket IDs are zero-padded to 5 digits", () => {
  resetCounter();
  const id = nextTicketId();
  assert.equal(id.length, "NGL-00001".length);
  assert.equal(id.startsWith("NGL-"), true);
});
