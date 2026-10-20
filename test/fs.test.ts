import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { exists, safeDelete } from "../src/fs.ts";

const tmp = tmpdir();

test("exists returns false for non-existent path", async () => {
  const result = await exists(join(tmp, "nigel-test-nonexistent-" + Date.now()));
  assert.equal(result.found, false);
  assert.equal(result.isDirectory, false);
});

test("exists returns true for existing file", async () => {
  const path = join(tmp, `nigel-test-${Date.now()}.txt`);
  await writeFile(path, "test");
  const result = await exists(path);
  assert.equal(result.found, true);
  assert.equal(result.isDirectory, false);
  await rm(path);
});

test("exists returns isDirectory true for directories", async () => {
  const path = join(tmp, `nigel-test-dir-${Date.now()}`);
  await mkdir(path);
  const result = await exists(path);
  assert.equal(result.found, true);
  assert.equal(result.isDirectory, true);
  await rm(path, { recursive: true });
});

test("safeDelete removes a directory recursively", async () => {
  const path = join(tmp, `nigel-test-dir-del-${Date.now()}`);
  await mkdir(path);
  await writeFile(join(path, "file.txt"), "test");
  const ok = await safeDelete(path, true, () => {});
  assert.equal(ok, true);
  assert.equal((await exists(path)).found, false);
});

test("safeDelete reports a failing deletion instead of throwing", async () => {
  const path = join(tmp, `nigel-test-missing-${Date.now()}.txt`);
  const reports: string[] = [];
  const ok = await safeDelete(path, false, (message) => reports.push(message));
  assert.equal(ok, false);
  assert.equal(reports.length, 1);
  assert.match(reports[0], /deletion failed/);
  assert.ok(reports[0].includes(path));
});

test("safeDelete removes a file and reports nothing", async () => {
  const path = join(tmp, `nigel-test-safedel-${Date.now()}.txt`);
  await writeFile(path, "test");
  const reports: string[] = [];
  const ok = await safeDelete(path, false, (message) => reports.push(message));
  assert.equal(ok, true);
  assert.deepEqual(reports, []);
  assert.equal((await exists(path)).found, false);
});

test("exists rethrows errors other than ENOENT", async () => {
  // A NUL byte is rejected by the OS layer on every platform, so stat fails with a non-ENOENT error.
  await assert.rejects(exists(join(tmp, "nigel\0invalid")), (error: NodeJS.ErrnoException) => {
    return error.code !== "ENOENT";
  });
});
