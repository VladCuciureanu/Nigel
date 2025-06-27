import { assertEquals } from "jsr:@std/assert";
import { runReview } from "../src/review.ts";

Deno.test("runReview with 100% approval rate always approves", async () => {
  const result = await runReview("NGL-TEST", 100, false);
  assertEquals(result.approved, true);
  assertEquals(typeof result.message, "string");
});

Deno.test("runReview with 0% approval rate always denies", async () => {
  const result = await runReview("NGL-TEST", 0, false);
  assertEquals(result.approved, false);
  assertEquals(typeof result.message, "string");
});
