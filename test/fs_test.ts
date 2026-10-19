import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { exists, deleteFile, deleteDirectory } from "../src/fs.ts";

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

test("deleteFile removes a file", async () => {
  const path = join(tmp, `nigel-test-del-${Date.now()}.txt`);
  await writeFile(path, "test");
  await deleteFile(path);
  const result = await exists(path);
  assert.equal(result.found, false);
});

test("deleteDirectory removes a directory recursively", async () => {
  const path = join(tmp, `nigel-test-dir-del-${Date.now()}`);
  await mkdir(path);
  await writeFile(join(path, "file.txt"), "test");
  await deleteDirectory(path);
  const result = await exists(path);
  assert.equal(result.found, false);
});
