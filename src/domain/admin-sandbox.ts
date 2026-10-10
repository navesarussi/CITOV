/** Dedicated admin-owned profiles for interactive preview — excluded from live metrics. */
export const ADMIN_SANDBOX_EMPLOYEE_ID = "admin-sandbox-employee";
export const ADMIN_SANDBOX_EMPLOYER_ID = "admin-sandbox-employer";

export function isAdminSandboxUserId(userId: string): boolean {
  return userId === ADMIN_SANDBOX_EMPLOYEE_ID || userId === ADMIN_SANDBOX_EMPLOYER_ID;
}
