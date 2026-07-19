import { auth } from "@/auth";
import { isAdminEmail } from "@/infrastructure/admin-config";

export async function assertAdmin(): Promise<
  { ok: true; email: string } | { ok: false; status: number; error: string }
> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return { ok: false, status: 401, error: "נדרשת התחברות עם Google" };
  }
  if (!isAdminEmail(email)) {
    return { ok: false, status: 403, error: "אין הרשאת מנהל" };
  }
  return { ok: true, email };
}
