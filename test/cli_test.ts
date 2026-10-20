import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import process from "node:process";

const MAIN = new URL("../src/main.ts", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
  version: string;
};

function nigel(args: string[], home?: string) {
  const env = { ...process.env };
  if (home) {
    env.HOME = home;
    env.USERPROFILE = home;
  }
  const result = spawnSync(process.execPath, [MAIN, ...args], { encoding: "utf8", env });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}

test("--version prints the version from package.json", () => {
  const { code, stdout } = nigel(["--version"]);
  assert.equal(code, 0);
  assert.equal(stdout.trim(), `nigel v${pkg.version}`);
});
