import { stat as fsStat, rm } from "node:fs/promises";

export interface PathInfo {
  found: boolean;
  isDirectory: boolean;
}

/** Stats `path`, reporting a missing path as not found instead of throwing. */
export async function statPath(path: string): Promise<PathInfo> {
  try {
    const stat = await fsStat(path);
    return { found: true, isDirectory: stat.isDirectory() };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { found: false, isDirectory: false };
    }
    throw error;
  }
}

export async function safeDelete(
  path: string,
  isDirectory: boolean,
  report: (message: string) => void = console.error,
): Promise<boolean> {
  try {
    await rm(path, { recursive: isDirectory });
    return true;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    report(`  ✗ ${path}: deletion failed — ${reason}`);
    return false;
  }
}
