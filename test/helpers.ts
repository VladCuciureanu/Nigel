import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";

const HOME_VARS = ["HOME", "USERPROFILE"] as const;

/** Runs `fn` with HOME/USERPROFILE pointing at a fresh temp dir, then restores both and removes it. */
export async function withTempHome<T>(fn: (home: string) => Promise<T>): Promise<T> {
  const home = await mkdtemp(join(tmpdir(), "nigel-home-"));
  const saved = HOME_VARS.map((name) => [name, process.env[name]] as const);
  for (const name of HOME_VARS) process.env[name] = home;
  try {
    return await fn(home);
  } finally {
    for (const [name, value] of saved) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    await rm(home, { recursive: true, force: true });
  }
}
