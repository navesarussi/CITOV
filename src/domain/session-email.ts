/** Normalize OAuth / session email for comparisons. */
export function normalizeSessionEmail(email: string | null | undefined): string | null {
  if (!email?.trim()) return null;
  return email.trim().toLowerCase();
}
