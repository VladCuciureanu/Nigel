import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { type TestContext, test } from "node:test";
import { statPath } from "../src/fs.ts";
import { FORCE_ESCALATION_MESSAGES } from "../src/messages.ts";
import { handleRm, type RmDeps, type RmOptions } from "../src/rm.ts";
import { withTempHome } from "./helpers.ts";

const defaults: RmOptions = { dryRun: false, force: false, approvalRate: 70, recursive: false };

function fakeDeps(approved: boolean): RmDeps & { reviews: number } {
  const deps = {
    reviews: 0,
    review: async () => {
      deps.reviews++;
      return { approved, message: approved ? "Approved." : "Denied." };
    },
  };
  return deps;
}

/** Captures console.log and console.error for the rest of the test. */
function captureConsole(t: TestContext): { out: string[]; err: string[] } {
  const out: string[] = [];
  const err: string[] = [];
  t.mock.method(console, "log", (message: string) => out.push(message));
  t.mock.method(console, "error", (message: string) => err.push(message));
  return { out, err };
}

async function auditLines(home: string): Promise<string[]> {
  const raw = await readFile(join(home, ".nigel", "audit.log"), "utf8");
  return raw.trim().split("\n");
}

test("handleRm deletes an approved file and logs APPROVED", async () => {
  await withTempHome(async (home) => {
    const file = join(home, "a.txt");
    await writeFile(file, "x");
    const deps = fakeDeps(true);
    assert.equal(await handleRm([file], defaults, deps), 0);
    assert.equal((await statPath(file)).found, false);
    const [line] = await auditLines(home);
    assert.match(line, /\| APPROVED \|/);
    assert.ok(line.includes(file));
  });
});

test("handleRm keeps a denied file, exits 1 and logs DENIED", async () => {
  await withTempHome(async (home) => {
    const file = join(home, "a.txt");
    await writeFile(file, "x");
    const deps = fakeDeps(false);
    assert.equal(await handleRm([file], defaults, deps), 1);
    assert.equal((await statPath(file)).found, true);
    assert.match((await auditLines(home))[0], /\| DENIED \| .* \| Denied\.$/);
  });
});

test("handleRm reports a missing file without reviewing it", async (t) => {
  const output = captureConsole(t);
  await withTempHome(async (home) => {
    const deps = fakeDeps(true);
    assert.equal(await handleRm([join(home, "nope.txt")], defaults, deps), 1);
    assert.equal(deps.reviews, 0);
    assert.match(output.err[0], /file not found/);
  });
});

test("handleRm refuses a directory without --recursive and deletes it with it", async (t) => {
  const output = captureConsole(t);
  await withTempHome(async (home) => {
    const dir = join(home, "dir");
    await mkdir(dir);
    await writeFile(join(dir, "f.txt"), "x");
    const deps = fakeDeps(true);
    assert.equal(await handleRm([dir], defaults, deps), 1);
    assert.match(output.err[0], /is a directory/);
    assert.equal(await handleRm([dir], { ...defaults, recursive: true }, deps), 0);
    assert.equal((await statPath(dir)).found, false);
  });
});

test("handleRm --force skips review, escalates on repeat, and logs FORCED", async (t) => {
  const output = captureConsole(t);
  await withTempHome(async (home) => {
    const a = join(home, "a.txt");
    const b = join(home, "b.txt");
    await writeFile(a, "x");
    await writeFile(b, "x");
    const deps = fakeDeps(false);
    assert.equal(await handleRm([a, b], { ...defaults, force: true }, deps), 0);
    assert.equal(deps.reviews, 0);
    assert.equal((await statPath(a)).found, false);
    assert.equal((await statPath(b)).found, false);
    assert.ok(FORCE_ESCALATION_MESSAGES.some((msg) => output.out[1].includes(msg)));
    const lines = await auditLines(home);
    assert.equal(lines.length, 2);
    assert.ok(lines.every((line) => line.includes("| FORCED |")));
  });
});

test("handleRm --dry-run keeps an approved file", async (t) => {
  const output = captureConsole(t);
  await withTempHome(async (home) => {
    const file = join(home, "a.txt");
    await writeFile(file, "x");
    const deps = fakeDeps(true);
    assert.equal(await handleRm([file], { ...defaults, dryRun: true }, deps), 0);
    assert.equal((await statPath(file)).found, true);
    assert.ok(output.out.some((line) => line.includes("dry run")));
  });
});

test("handleRm --dry-run logs a DRY-RUN verdict, not APPROVED", async () => {
  await withTempHome(async (home) => {
    const file = join(home, "a.txt");
    await writeFile(file, "x");
    await handleRm([file], { ...defaults, dryRun: true }, fakeDeps(true));
    const [line] = await auditLines(home);
    assert.match(line, /\| DRY-RUN \|/);
  });
});

test("handleRm --force --dry-run keeps the file, prints the notice and logs DRY-RUN", async (t) => {
  const output = captureConsole(t);
  await withTempHome(async (home) => {
    const file = join(home, "a.txt");
    await writeFile(file, "x");
    const deps = fakeDeps(true);
    assert.equal(await handleRm([file], { ...defaults, force: true, dryRun: true }, deps), 0);
    assert.equal((await statPath(file)).found, true);
    assert.ok(output.out.some((line) => line.includes("dry run: file not actually deleted")));
    const [line] = await auditLines(home);
    assert.match(line, /\| DRY-RUN \|/);
  });
});

test("handleRm continues ticket numbering from the audit log across runs", async () => {
  await withTempHome(async (home) => {
    await mkdir(join(home, ".nigel"));
    await writeFile(
      join(home, ".nigel", "audit.log"),
      "[2026-01-01T00:00:00.000Z] NGL-00041 | DENIED | NGL-99999.txt | No.\n",
    );
    const a = join(home, "a.txt");
    const b = join(home, "b.txt");
    await writeFile(a, "x");
    await writeFile(b, "x");
    await handleRm([a, b], defaults, fakeDeps(true));
    const lines = await auditLines(home);
    assert.match(lines[1], /\] NGL-00042 \|/);
    assert.match(lines[2], /\] NGL-00043 \|/);
  });
});
