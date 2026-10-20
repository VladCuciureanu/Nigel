import { appendFile, mkdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

function getAuditDir(): string {
  return join(homedir(), ".nigel");
}

function getAuditPath(): string {
  return join(getAuditDir(), "audit.log");
}

export interface AuditEntry {
  /** ISO 8601; appendAudit uses the current time when omitted. */
  timestamp?: string;
  ticketId: string;
  path: string;
  verdict: "APPROVED" | "DENIED" | "FORCED" | "DRY-RUN";
  reason: string;
}

export async function appendAudit({
  timestamp = new Date().toISOString(),
  ticketId,
  path,
  verdict,
  reason,
}: AuditEntry): Promise<void> {
  await mkdir(getAuditDir(), { recursive: true });
  const line = `[${timestamp}] ${ticketId} | ${verdict} | ${path} | ${reason}\n`;
  await appendFile(getAuditPath(), line, "utf8");
}

/** Raw audit log contents, or "" when nothing has been logged yet. */
export async function readAuditRecords(): Promise<string> {
  try {
    return await readFile(getAuditPath(), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "";
    throw error;
  }
}
