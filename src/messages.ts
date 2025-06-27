export const REVIEW_STATUSES: string[] = [
  "Assigning reviewer...",
  "Under review...",
  "Cross-referencing with department policy...",
  "Checking file retention schedule...",
  "Consulting with the compliance team...",
  "Awaiting final sign-off...",
  "Verifying requestor credentials...",
  "Running impact assessment...",
  "Reviewing prior deletion history...",
  "Escalating to senior reviewer...",
];

export const DENIAL_REASONS: string[] = [
  "This file has been flagged for retention under Policy 4.7b.",
  "Deletion request conflicts with an ongoing audit.",
  "Insufficient justification provided. Please submit Form DX-7.",
  "The file falls under a 90-day preservation hold.",
  "A dependent process has registered a soft lock on this resource.",
  "Your department's deletion quota for this quarter has been exceeded.",
  "This file type requires dual sign-off. Second reviewer unavailable.",
  "Request denied per the Revised Data Lifecycle Framework (v3.2).",
  "The review board has determined this file may still hold business value.",
  "Unable to verify chain of custody. Request returned for clarification.",
];

export const APPROVAL_MESSAGES: string[] = [
  "Deletion approved. Proceeding with removal.",
  "Request granted. File scheduled for immediate disposal.",
  "Approved. The board has signed off on this action.",
  "Green-lit. Removing file per your request.",
  "Authorization confirmed. Deleting now.",
];

export const FORCE_MESSAGES: string[] = [
  "Fine. Escalated. Deleting without review. This has been noted.",
  "Acknowledged. Bypassing standard procedure. On your head be it.",
  "Review skipped per escalation. This will be in the report.",
];

export const FORCE_ESCALATION_MESSAGES: string[] = [
  "Another forced deletion. Your compliance score is suffering.",
  "You're developing a pattern here. HR has been CC'd.",
  "At this point, I'm just a formality to you, aren't I?",
  "Force count is climbing. I hope you have a good manager.",
  "I've stopped counting. Legal will sort this out eventually.",
];

export const RECURSIVE_STATUSES: string[] = [
  "Enumerating directory contents...",
  "Performing recursive impact analysis...",
  "This is a directory. Assembling a review panel...",
  "Checking for protected subdirectories...",
  "Calculating total affected file count...",
];

export function pickRandom<T>(pool: T[]): T {
  return pool[Math.floor(Math.random() * pool.length)];
}

export function pickMultiple<T>(pool: T[], count: number): T[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
