import assert from "node:assert/strict";
import { test } from "node:test";
import { lastTicketNumber, ticketSequence } from "../src/ticket.ts";

test("ticketSequence generates sequential IDs after the given number", () => {
  const next = ticketSequence(0);
  assert.equal(next(), "NGL-00001");
  assert.equal(next(), "NGL-00002");
  assert.equal(next(), "NGL-00003");
  assert.equal(ticketSequence(41)(), "NGL-00042");
});

test("ticket IDs are zero-padded to 5 digits", () => {
  const id = ticketSequence(0)();
  assert.equal(id.length, "NGL-00001".length);
  assert.equal(id.startsWith("NGL-"), true);
});

test("lastTicketNumber returns 0 for an empty log", () => {
  assert.equal(lastTicketNumber(""), 0);
});

test("lastTicketNumber takes the highest ticket ID, ignoring IDs in paths", () => {
  const log = [
    "[2026-01-01T00:00:00.000Z] NGL-00007 | APPROVED | a.txt | Ok.",
    "[2026-01-02T00:00:00.000Z] NGL-00012 | DENIED | NGL-99999.txt | No.",
    "[2026-01-03T00:00:00.000Z] NGL-00003 | FORCED | b.txt | Forced.",
    "",
  ].join("\n");
  assert.equal(lastTicketNumber(log), 12);
});
