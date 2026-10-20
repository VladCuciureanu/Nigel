export const DEFAULT_APPROVAL_RATE = 70;

export function parseApprovalRate(raw: string | undefined): number {
  const parsed = raw === undefined ? NaN : parseInt(raw, 10);
  const rate = Number.isNaN(parsed) ? DEFAULT_APPROVAL_RATE : parsed;
  return Math.max(0, Math.min(100, rate));
}

/**
 * Reads a boolean flag from non-strict parseArgs, which yields the raw string
 * for `--flag=value`. Only `true` or `"true"` count as set.
 */
export function flagSet(value: unknown): boolean {
  return value === true || value === "true";
}

/**
 * Like flagSet, but fails safe for --dry-run: any explicit value other than
 * "false" keeps the dry run on, so a typo never turns it into a real delete.
 */
export function dryRunSet(value: unknown): boolean {
  return value === true || (typeof value === "string" && value !== "false");
}
