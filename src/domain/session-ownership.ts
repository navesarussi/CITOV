import { normalizeSessionEmail } from "@/domain/session-email";

export function sessionOwnsUser(params: {
  sessionEmail?: string | null;
  sessionGoogleId?: string | null;
  userEmail?: string | null;
  userGoogleId?: string | null;
}): boolean {
  const sessionEmail = normalizeSessionEmail(params.sessionEmail);
  const userEmail = normalizeSessionEmail(params.userEmail);
  if (sessionEmail && userEmail && sessionEmail === userEmail) return true;
  const sessionG = params.sessionGoogleId?.trim();
  const userG = params.userGoogleId?.trim();
  if (sessionG && userG && sessionG === userG) return true;
  return false;
}
