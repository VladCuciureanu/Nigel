import { test } from "node:test";
import assert from "node:assert/strict";
import process from "node:process";
import { appendAudit, readAuditLog } from "../src/audit.ts";
import { withTempHome } from "./helpers.ts";

test("appendAudit and readAuditLog round-trip", async () => {
  await withTempHome(async () => {
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
  });
});

test("readAuditLog returns message when no log exists", async () => {
  await withTempHome(async () => {
    const log = await readAuditLog();
    assert.equal(log, "No audit records found.");
  });
});

test("withTempHome restores an unset HOME instead of leaking the temp dir", async () => {
  const saved = process.env.HOME;
  delete process.env.HOME;
  try {
    await withTempHome(async () => {});
    assert.equal(process.env.HOME, undefined);
  } finally {
    if (saved !== undefined) process.env.HOME = saved;
  }
});
