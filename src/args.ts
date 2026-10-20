export const DEFAULT_APPROVAL_RATE = 70;

/** Parses `--approval-rate`: an integer percentage from 0 to 100, or the default when absent. */
export function parseApprovalRate(raw: string | undefined): number {
  if (raw === undefined) return DEFAULT_APPROVAL_RATE;
  const rate = Number(raw);
  if (!/^\d+$/.test(raw) || rate > 100) {
    throw new Error(`invalid --approval-rate '${raw}': expected an integer from 0 to 100`);
  }
  return rate;
}
