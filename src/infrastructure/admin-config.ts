import { normalizeSessionEmail } from "@/domain/session-email";

const ADMIN_EMAILS = new Set([
  "navesarussi@gmail.com",
  "osherbaron1111@gmail.com",
]);

export function isAdminEmail(email: string | null | undefined): boolean {
  const normalized = normalizeSessionEmail(email);
  if (!normalized) return false;
  return ADMIN_EMAILS.has(normalized);
}
