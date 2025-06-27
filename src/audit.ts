import { exists } from "./fs.ts";

function getAuditDir(): string {
  const home = Deno.env.get("HOME") || Deno.env.get("USERPROFILE") || ".";
  return `${home}/.nigel`;
}

function getAuditPath(): string {
  return `${getAuditDir()}/audit.log`;
}

export interface AuditEntry {
  timestamp: string;
  ticketId: string;
  path: string;
  verdict: "APPROVED" | "DENIED" | "FORCED";
  reason: string;
}

function formatEntry(entry: AuditEntry): string {
  return `[${entry.timestamp}] ${entry.ticketId} | ${entry.verdict} | ${entry.path} | ${entry.reason}`;
}

export async function appendAudit(entry: AuditEntry): Promise<void> {
  const dir = getAuditDir();
  const { found } = await exists(dir);
  if (!found) {
    await Deno.mkdir(dir, { recursive: true });
  }
  const line = formatEntry(entry) + "\n";
  await Deno.writeTextFile(getAuditPath(), line, { append: true });
}

export async function readAuditLog(): Promise<string> {
  const path = getAuditPath();
  const { found } = await exists(path);
  if (!found) {
    return "No audit records found.";
  }
  return await Deno.readTextFile(path);
}
