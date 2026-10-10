/** Isolated match-quality dataset — never mixed into production metrics or candidate UX. */
export const TEST_SANDBOX_DATASET_ID = "quality-sandbox-v1";

export type AdminDataScope = "real" | "test";

export function isSandboxUserId(userId: string): boolean {
  return userId.startsWith("sandbox-");
}

/** Production paths: demo/seed/e2e/sandbox are excluded from real-user flows. */
export function isNonProductionUserId(userId: string): boolean {
  return (
    userId === "demo-employee" ||
    userId === "demo-employer" ||
    userId.startsWith("seed-") ||
    userId.startsWith("e2e-") ||
    isSandboxUserId(userId)
  );
}

export function userIsTestRow(user: { id: string; isTest?: boolean }): boolean {
  return Boolean(user.isTest) || isSandboxUserId(user.id);
}

export function matchIsTestRow(m: { isTest?: boolean; candidateId: string; jobOwnerId: string }): boolean {
  return (
    Boolean(m.isTest) ||
    isSandboxUserId(m.candidateId) ||
    isSandboxUserId(m.jobOwnerId)
  );
}
