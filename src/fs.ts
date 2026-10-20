import { stat as fsStat, rm } from "node:fs/promises";

export async function exists(path: string): Promise<{ found: boolean; isDirectory: boolean }> {
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
