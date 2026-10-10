import type { Role } from "@/domain/types";

/** Whether the client should POST /api/session to refresh `shidukh_user`. */
export function shouldRefreshStoredUser(params: {
  googleAuth: boolean;
  signedIn: boolean;
  storedId?: string | null;
  workspaceId?: string | null;
  role: Role;
  workspaceRole?: Role | null;
}): boolean {
  if (!params.googleAuth || !params.signedIn) return false;
  if (!params.workspaceId || params.workspaceRole !== params.role) return true;
  return params.storedId !== params.workspaceId;
}
