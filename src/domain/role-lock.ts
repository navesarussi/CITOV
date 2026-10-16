import type { Role } from "@/domain/types";

/**
 * Roles are immutable after signup for regular users (security C1).
 * Admins may switch between candidate/employer so they can preview both
 * workspaces from the admin panel.
 */
export function isRoleChangeBlocked(params: {
  existingRole?: Role | null;
  requestedRole: Role;
  isAdmin: boolean;
}): boolean {
  if (!params.existingRole) return false;
  if (params.existingRole === params.requestedRole) return false;
  return !params.isAdmin;
}
