const PREFIX = "NGL-";
const LOGGED_ID = /^\[[^\]]*\] NGL-(\d+) \|/gm;

function formatTicketId(n: number): string {
  return `${PREFIX}${String(n).padStart(5, "0")}`;
}

/** Highest ticket number recorded in the audit log text, or 0 if there is none. */
export function lastTicketNumber(auditLog: string): number {
  let last = 0;
  for (const match of auditLog.matchAll(LOGGED_ID)) {
    last = Math.max(last, Number(match[1]));
  }
  return last;
}

/** Returns a generator of ticket IDs numbered after `last`. */
export function ticketSequence(last: number): () => string {
  let counter = last;
  return () => formatTicketId(++counter);
}
