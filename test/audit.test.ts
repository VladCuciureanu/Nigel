import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";
import { test } from "node:test";
import { appendAudit, readAuditRecords } from "../src/audit.ts";
import { withTempHome } from "./helpers.ts";

test("appendAudit and readAuditRecords round-trip", async () => {
  await withTempHome(async () => {
    await appendAudit({
      timestamp: "2026-01-01T00:00:00.000Z",
      ticketId: "NGL-00001",
      path: "/tmp/test.txt",
      verdict: "APPROVED",
      reason: "Deletion approved.",
    });

    const log = await readAuditRecords();
    assert.equal(log.includes("NGL-00001"), true);
    assert.equal(log.includes("APPROVED"), true);
    assert.equal(log.includes("/tmp/test.txt"), true);
  });
});

test("readAuditRecords returns an empty string when no log exists", async () => {
  await withTempHome(async () => {
    assert.equal(await readAuditRecords(), "");
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

test("appendAudit writes to .nigel/audit.log under the home directory", async () => {
  await withTempHome(async (home) => {
    await appendAudit({
      timestamp: "2026-01-01T00:00:00.000Z",
      ticketId: "NGL-00002",
      path: "a.txt",
      verdict: "DENIED",
      reason: "No.",
    });
    const raw = await readFile(join(home, ".nigel", "audit.log"), "utf8");
    assert.equal(raw, "[2026-01-01T00:00:00.000Z] NGL-00002 | DENIED | a.txt | No.\n");
  });
});
