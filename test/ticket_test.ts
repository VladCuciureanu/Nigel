import { assertEquals } from "jsr:@std/assert";
import { nextTicketId, resetCounter } from "../src/ticket.ts";

Deno.test("nextTicketId generates sequential IDs", () => {
  resetCounter();
  assertEquals(nextTicketId(), "NGL-00001");
  assertEquals(nextTicketId(), "NGL-00002");
  assertEquals(nextTicketId(), "NGL-00003");
});

Deno.test("resetCounter resets the sequence", () => {
  resetCounter();
  assertEquals(nextTicketId(), "NGL-00001");
});

Deno.test("ticket IDs are zero-padded to 5 digits", () => {
  resetCounter();
  const id = nextTicketId();
  assertEquals(id.length, "NGL-00001".length);
  assertEquals(id.startsWith("NGL-"), true);
});
