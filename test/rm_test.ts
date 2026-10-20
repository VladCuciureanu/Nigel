import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { exists } from "../src/fs.ts";
import { FORCE_ESCALATION_MESSAGES } from "../src/messages.ts";
import { handleRm, type RmDeps, type RmOptions } from "../src/rm.ts";
import { withTempHome } from "./helpers.ts";

const defaults: RmOptions = { dryRun: false, force: false, approvalRate: 70, recursive: false };

function fakeDeps(approved: boolean): RmDeps & { out: string[]; err: string[]; reviews: number } {
  const deps = {
    out: [] as string[],
    err: [] as string[],
    reviews: 0,
    review: async () => {
      deps.reviews++;
      return { approved, message: approved ? "Approved." : "Denied." };
    },
    log: (message: string) => {
      deps.out.push(message);
    },
    error: (message: string) => {
      deps.err.push(message);
    },
  };
  return deps;
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
    assert.equal((await exists(file)).found, false);
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
    assert.equal((await exists(file)).found, true);
    assert.match((await auditLines(home))[0], /\| DENIED \| .* \| Denied\.$/);
  });
});

test("handleRm reports a missing file without reviewing it", async () => {
  await withTempHome(async (home) => {
    const deps = fakeDeps(true);
    assert.equal(await handleRm([join(home, "nope.txt")], defaults, deps), 1);
    assert.equal(deps.reviews, 0);
    assert.match(deps.err[0], /file not found/);
  });
});

test("handleRm refuses a directory without --recursive and deletes it with it", async () => {
  await withTempHome(async (home) => {
    const dir = join(home, "dir");
    await mkdir(dir);
    await writeFile(join(dir, "f.txt"), "x");
    const deps = fakeDeps(true);
    assert.equal(await handleRm([dir], defaults, deps), 1);
    assert.match(deps.err[0], /is a directory/);
    assert.equal(await handleRm([dir], { ...defaults, recursive: true }, deps), 0);
    assert.equal((await exists(dir)).found, false);
  });
});

test("handleRm --force skips review, escalates on repeat, and logs FORCED", async () => {
  await withTempHome(async (home) => {
    const a = join(home, "a.txt");
    const b = join(home, "b.txt");
    await writeFile(a, "x");
    await writeFile(b, "x");
    const deps = fakeDeps(false);
    assert.equal(await handleRm([a, b], { ...defaults, force: true }, deps), 0);
    assert.equal(deps.reviews, 0);
    assert.equal((await exists(a)).found, false);
    assert.equal((await exists(b)).found, false);
    assert.ok(FORCE_ESCALATION_MESSAGES.some((msg) => deps.out[1].includes(msg)));
    const lines = await auditLines(home);
    assert.equal(lines.length, 2);
    assert.ok(lines.every((line) => line.includes("| FORCED |")));
  });
});

test("handleRm --dry-run keeps an approved file", async () => {
  await withTempHome(async (home) => {
    const file = join(home, "a.txt");
    await writeFile(file, "x");
    const deps = fakeDeps(true);
    assert.equal(await handleRm([file], { ...defaults, dryRun: true }, deps), 0);
    assert.equal((await exists(file)).found, true);
    assert.ok(deps.out.some((line) => line.includes("dry run")));
  });
});
