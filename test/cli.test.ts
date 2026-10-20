import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { withTempHome } from "./helpers.ts";

const MAIN = fileURLToPath(new URL("../src/main.ts", import.meta.url));
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
  version: string;
};

/** Runs the CLI with the current environment, so inside withTempHome it uses the temp home. */
function nigel(args: string[]) {
  const result = spawnSync(process.execPath, [MAIN, ...args], { encoding: "utf8" });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}

test("--version prints the version from package.json", () => {
  const { code, stdout } = nigel(["--version"]);
  assert.equal(code, 0);
  assert.equal(stdout.trim(), `nigel v${pkg.version}`);
});

test("--help prints usage and exits 0", () => {
  const { code, stdout } = nigel(["--help"]);
  assert.equal(code, 0);
  assert.match(stdout, /USAGE:/);
});

for (const args of [["frobnicate"], []]) {
  test(`${args.length ? "an unknown" : "no"} command prints usage to stderr and exits 1`, () => {
    const { code, stdout, stderr } = nigel(args);
    assert.equal(code, 1);
    assert.equal(stdout, "");
    assert.match(stderr, /USAGE:/);
  });
}

test("status prints the dashboard", () => {
  const { code, stdout } = nigel(["status"]);
  assert.equal(code, 0);
  assert.match(stdout, /Department Status Board/);
});

test("rm without files exits 1 with a usage hint", () => {
  const { code, stderr } = nigel(["rm"]);
  assert.equal(code, 1);
  assert.match(stderr, /no files specified/);
});

test("rm of a missing file exits 1", async () => {
  await withTempHome(async (home) => {
    const { code, stderr } = nigel(["rm", join(home, "missing.txt")]);
    assert.equal(code, 1);
    assert.match(stderr, /file not found/);
  });
});

test("audit reports an empty log, then shows rm --force --dry-run as DRY-RUN", async () => {
  await withTempHome(async (home) => {
    assert.equal(nigel(["audit"]).stdout.trim(), "No audit records found.");

    const file = join(home, "keep.txt");
    await writeFile(file, "x");
    const run = nigel(["rm", "--force", "--dry-run", file]);
    assert.equal(run.code, 0);
    assert.match(run.stdout, /NGL-00001 — .*dry run: file not actually deleted/s);
    assert.equal(readFileSync(file, "utf8"), "x");

    const audit = nigel(["audit"]);
    assert.match(audit.stdout, /NGL-00001 \| DRY-RUN \|/);
  });
});

for (const flag of ["--dry-run=true", "--dry-run=yes", "--dry-run=1", "--dry-run=false"]) {
  test(`rm --force ${flag} is rejected and never deletes`, async () => {
    await withTempHome(async (home) => {
      const file = join(home, "keep.txt");
      await writeFile(file, "x");
      const { code, stderr } = nigel(["rm", "--force", flag, file]);
      assert.equal(code, 1);
      assert.match(stderr, /^nigel: Option '--dry-run' does not take an argument/);
      assert.equal(readFileSync(file, "utf8"), "x");
    });
  });
}

for (const flag of ["--dryrun", "--no-dry-run", "--force=false", "-x"]) {
  test(`unknown or mistyped flag ${flag} is a usage error and deletes nothing`, async () => {
    await withTempHome(async (home) => {
      const file = join(home, "keep.txt");
      await writeFile(file, "x");
      const { code, stdout, stderr } = nigel(["rm", flag, "--force", file]);
      assert.equal(code, 1);
      assert.equal(stdout, "");
      assert.match(stderr, /^nigel: [^\n]+\. Run 'nigel --help' for usage\.\n$/);
      assert.equal(readFileSync(file, "utf8"), "x");
    });
  });
}

test("-rf deletes a directory without review, like rm", async () => {
  await withTempHome(async (home) => {
    const dir = join(home, "dir");
    await mkdir(dir);
    await writeFile(join(dir, "f.txt"), "x");
    const { code } = nigel(["rm", "-rf", dir]);
    assert.equal(code, 0);
    assert.throws(() => readFileSync(join(dir, "f.txt")), { code: "ENOENT" });
  });
});

test("-h and -v are short for --help and --version", () => {
  assert.match(nigel(["-h"]).stdout, /USAGE:/);
  assert.equal(nigel(["-v"]).stdout.trim(), `nigel v${pkg.version}`);
});

test("--appeal re-submits files given without the rm command", async () => {
  await withTempHome(async (home) => {
    const file = join(home, "gone.txt");
    await writeFile(file, "x");
    const { code } = nigel(["--appeal", "--force", file]);
    assert.equal(code, 0);
    assert.throws(() => readFileSync(file), { code: "ENOENT" });
    assert.match(nigel(["audit"]).stdout, /NGL-00001 \| FORCED \|/);
  });
});

test("an unwritable audit log is reported on one line, exit 1, without a stack", async () => {
  await withTempHome(async (home) => {
    // A directory where the log file should be makes every read and append fail.
    await mkdir(join(home, ".nigel", "audit.log"), { recursive: true });
    const file = join(home, "keep.txt");
    await writeFile(file, "x");
    for (const args of [["audit"], ["rm", "--force", file]]) {
      const { code, stderr } = nigel(args);
      assert.equal(code, 1);
      assert.match(stderr, /^nigel: .+\n$/);
    }
  });
});

for (const rate of ["abc", "50x", "150", "-5"]) {
  test(`--approval-rate=${rate} is rejected before any review`, async () => {
    await withTempHome(async (home) => {
      const file = join(home, "keep.txt");
      await writeFile(file, "x");
      const { code, stdout, stderr } = nigel(["rm", "--force", `--approval-rate=${rate}`, file]);
      assert.equal(code, 1);
      assert.equal(stdout, "");
      assert.equal(
        stderr,
        `nigel: invalid --approval-rate '${rate}': expected an integer from 0 to 100\n`,
      );
      assert.equal(readFileSync(file, "utf8"), "x");
    });
  });
}

test("--approval-rate -5 (space form) is one usage line suggesting the = form", async () => {
  await withTempHome(async (home) => {
    const file = join(home, "keep.txt");
    await writeFile(file, "x");
    const { code, stdout, stderr } = nigel(["rm", "--approval-rate", "-5", file]);
    assert.equal(code, 1);
    assert.equal(stdout, "");
    assert.equal(
      stderr,
      "nigel: option '--approval-rate' got '-5', which looks like an option; write --approval-rate=-5\n",
    );
    assert.equal(readFileSync(file, "utf8"), "x");
  });
});

test("--approval-rate=-value is accepted by the parser and reaches range validation", () => {
  const { code, stderr } = nigel(["rm", "--approval-rate=-5", "f"]);
  assert.equal(code, 1);
  assert.equal(stderr, "nigel: invalid --approval-rate '-5': expected an integer from 0 to 100\n");
});

test("--approval-rate with no value is a one-line usage error", () => {
  const { code, stderr } = nigel(["rm", "--approval-rate"]);
  assert.equal(code, 1);
  assert.match(stderr, /^nigel: [^\n]+\. Run 'nigel --help' for usage\.\n$/);
  assert.doesNotMatch(stderr, /\.\./);
});

test("--approval-rate followed by a long flag reports the missing value on one line", async () => {
  await withTempHome(async (home) => {
    const file = join(home, "keep.txt");
    await writeFile(file, "x");
    const { code, stdout, stderr } = nigel(["rm", "--approval-rate", "--force", file]);
    assert.equal(code, 1);
    assert.equal(stdout, "");
    assert.equal(stderr, "nigel: option '--approval-rate' needs a value\n");
    assert.equal(readFileSync(file, "utf8"), "x");
  });
});
