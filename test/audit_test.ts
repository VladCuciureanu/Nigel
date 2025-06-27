import { assertEquals } from "jsr:@std/assert";
import { appendAudit, readAuditLog } from "../src/audit.ts";

Deno.test("appendAudit and readAuditLog round-trip", async () => {
  // Use a temp HOME to avoid polluting real audit log
  const tmpHome = `/tmp/nigel-audit-test-${Date.now()}`;
  await Deno.mkdir(tmpHome);
  const originalHome = Deno.env.get("HOME");
  Deno.env.set("HOME", tmpHome);

  try {
    await appendAudit({
      timestamp: "2026-01-01T00:00:00.000Z",
      ticketId: "NGL-00001",
      path: "/tmp/test.txt",
      verdict: "APPROVED",
      reason: "Deletion approved.",
    });

    const log = await readAuditLog();
    assertEquals(log.includes("NGL-00001"), true);
    assertEquals(log.includes("APPROVED"), true);
    assertEquals(log.includes("/tmp/test.txt"), true);
  } finally {
    if (originalHome) {
      Deno.env.set("HOME", originalHome);
    }
    await Deno.remove(tmpHome, { recursive: true });
  }
});

Deno.test("readAuditLog returns message when no log exists", async () => {
  const tmpHome = `/tmp/nigel-audit-test-empty-${Date.now()}`;
  await Deno.mkdir(tmpHome);
  const originalHome = Deno.env.get("HOME");
  Deno.env.set("HOME", tmpHome);

  try {
    const log = await readAuditLog();
    assertEquals(log, "No audit records found.");
  } finally {
    if (originalHome) {
      Deno.env.set("HOME", originalHome);
    }
    await Deno.remove(tmpHome, { recursive: true });
  }
});
