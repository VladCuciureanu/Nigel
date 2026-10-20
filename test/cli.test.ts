import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { test } from "node:test";

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

async function withHome(fn: (home: string) => Promise<void>): Promise<void> {
  const home = await mkdtemp(join(tmpdir(), "nigel-cli-"));
  try {
    await fn(home);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
}

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
  await withHome(async (home) => {
    const { code, stderr } = nigel(["rm", join(home, "missing.txt")], home);
    assert.equal(code, 1);
    assert.match(stderr, /file not found/);
  });
});

test("audit reports an empty log, then shows rm --force --dry-run as DRY-RUN", async () => {
  await withHome(async (home) => {
    assert.equal(nigel(["audit"], home).stdout.trim(), "No audit records found.");

    const file = join(home, "keep.txt");
    await writeFile(file, "x");
    const run = nigel(["rm", "--force", "--dry-run", file], home);
    assert.equal(run.code, 0);
    assert.match(run.stdout, /NGL-00001 — .*dry run: file not actually deleted/s);
    assert.equal(readFileSync(file, "utf8"), "x");

    const audit = nigel(["audit"], home);
    assert.match(audit.stdout, /NGL-00001 | DRY-RUN |/);
  });
});

for (const flag of ["--dry-run=true", "--dry-run=yes", "--dry-run=1", "--dry-run=false"]) {
  test(`rm --force ${flag} is rejected and never deletes`, async () => {
    await withHome(async (home) => {
      const file = join(home, "keep.txt");
      await writeFile(file, "x");
      const { code, stderr } = nigel(["rm", "--force", flag, file], home);
      assert.equal(code, 1);
      assert.match(stderr, /^nigel: Option '--dry-run' does not take an argument/);
      assert.equal(readFileSync(file, "utf8"), "x");
    });
  });
}

for (const flag of ["--dryrun", "--no-dry-run", "--force=false", "-x"]) {
  test(`unknown or mistyped flag ${flag} is a usage error and deletes nothing`, async () => {
    await withHome(async (home) => {
      const file = join(home, "keep.txt");
      await writeFile(file, "x");
      const { code, stdout, stderr } = nigel(["rm", flag, "--force", file], home);
      assert.equal(code, 1);
      assert.equal(stdout, "");
      assert.match(stderr, /^nigel: [^\n]+\. Run 'nigel --help' for usage\.\n$/);
      assert.equal(readFileSync(file, "utf8"), "x");
    });
  });
}

test("-rf deletes a directory without review, like rm", async () => {
  await withHome(async (home) => {
    const dir = join(home, "dir");
    await mkdir(dir);
    await writeFile(join(dir, "f.txt"), "x");
    const { code } = nigel(["rm", "-rf", dir], home);
    assert.equal(code, 0);
    assert.throws(() => readFileSync(join(dir, "f.txt")), { code: "ENOENT" });
  });
});

test("-h and -v are short for --help and --version", () => {
  assert.match(nigel(["-h"]).stdout, /USAGE:/);
  assert.equal(nigel(["-v"]).stdout.trim(), `nigel v${pkg.version}`);
});

test("--appeal re-submits files given without the rm command", async () => {
  await withHome(async (home) => {
    const file = join(home, "gone.txt");
    await writeFile(file, "x");
    const { code } = nigel(["--appeal", "--force", file], home);
    assert.equal(code, 0);
    assert.throws(() => readFileSync(file), { code: "ENOENT" });
    assert.match(nigel(["audit"], home).stdout, /NGL-00001 | FORCED |/);
  });
});

test("an unwritable audit log is reported on one line, exit 1, without a stack", async () => {
  await withHome(async (home) => {
    // A directory where the log file should be makes every read and append fail.
    await mkdir(join(home, ".nigel", "audit.log"), { recursive: true });
    const file = join(home, "keep.txt");
    await writeFile(file, "x");
    for (const args of [["audit"], ["rm", "--force", file]]) {
      const { code, stderr } = nigel(args, home);
      assert.equal(code, 1);
      assert.match(stderr, /^nigel: .+\n$/);
    }
  });
});
