import { assertEquals } from "jsr:@std/assert";
import { exists, deleteFile, deleteDirectory } from "../src/fs.ts";

Deno.test("exists returns false for non-existent path", async () => {
  const result = await exists("/tmp/nigel-test-nonexistent-" + Date.now());
  assertEquals(result.found, false);
  assertEquals(result.isDirectory, false);
});

Deno.test("exists returns true for existing file", async () => {
  const path = `/tmp/nigel-test-${Date.now()}.txt`;
  await Deno.writeTextFile(path, "test");
  const result = await exists(path);
  assertEquals(result.found, true);
  assertEquals(result.isDirectory, false);
  await Deno.remove(path);
});

Deno.test("exists returns isDirectory true for directories", async () => {
  const path = `/tmp/nigel-test-dir-${Date.now()}`;
  await Deno.mkdir(path);
  const result = await exists(path);
  assertEquals(result.found, true);
  assertEquals(result.isDirectory, true);
  await Deno.remove(path);
});

Deno.test("deleteFile removes a file", async () => {
  const path = `/tmp/nigel-test-del-${Date.now()}.txt`;
  await Deno.writeTextFile(path, "test");
  await deleteFile(path);
  const result = await exists(path);
  assertEquals(result.found, false);
});

Deno.test("deleteDirectory removes a directory recursively", async () => {
  const path = `/tmp/nigel-test-dir-del-${Date.now()}`;
  await Deno.mkdir(path);
  await Deno.writeTextFile(`${path}/file.txt`, "test");
  await deleteDirectory(path);
  const result = await exists(path);
  assertEquals(result.found, false);
});
