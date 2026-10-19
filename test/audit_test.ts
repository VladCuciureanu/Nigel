import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { appendAudit, readAuditLog } from "../src/audit.ts";

test("appendAudit and readAuditLog round-trip", async () => {
  // Use a temp HOME to avoid polluting real audit log
  const tmpHome = join(tmpdir(), `nigel-audit-test-${Date.now()}`);
  await mkdir(tmpHome);
  const originalHome = process.env.HOME;
  process.env.HOME = tmpHome;

  try {
    await appendAudit({
      timestamp: "2026-01-01T00:00:00.000Z",
      ticketId: "NGL-00001",
      path: "/tmp/test.txt",
      verdict: "APPROVED",
      reason: "Deletion approved.",
    });

    const log = await readAuditLog();
    assert.equal(log.includes("NGL-00001"), true);
    assert.equal(log.includes("APPROVED"), true);
    assert.equal(log.includes("/tmp/test.txt"), true);
  } finally {
    if (originalHome) {
      process.env.HOME = originalHome;
    }
    await rm(tmpHome, { recursive: true });
  }
});

test("readAuditLog returns message when no log exists", async () => {
  const tmpHome = join(tmpdir(), `nigel-audit-test-empty-${Date.now()}`);
  await mkdir(tmpHome);
  const originalHome = process.env.HOME;
  process.env.HOME = tmpHome;

  try {
    const log = await readAuditLog();
    assert.equal(log, "No audit records found.");
  } finally {
    if (originalHome) {
      process.env.HOME = originalHome;
    }
    await rm(tmpHome, { recursive: true });
  }
});
