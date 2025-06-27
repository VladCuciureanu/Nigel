export async function exists(path: string): Promise<{ found: boolean; isDirectory: boolean }> {
  try {
    const stat = await Deno.stat(path);
    return { found: true, isDirectory: stat.isDirectory };
  } catch {
    return { found: false, isDirectory: false };
  }
}

export async function deleteFile(path: string): Promise<void> {
  await Deno.remove(path);
}

export async function deleteDirectory(path: string): Promise<void> {
  await Deno.remove(path, { recursive: true });
}
