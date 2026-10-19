export const DEFAULT_APPROVAL_RATE = 70;

export function parseApprovalRate(raw: string | undefined): number {
  const parsed = raw === undefined ? NaN : parseInt(raw, 10);
  const rate = Number.isNaN(parsed) ? DEFAULT_APPROVAL_RATE : parsed;
  return Math.max(0, Math.min(100, rate));
}
