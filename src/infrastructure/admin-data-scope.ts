import type { AdminDataScope } from "@/domain/test-sandbox";

const COOKIE = "citov_admin_data_scope";

export function parseAdminDataScope(req: Request): AdminDataScope {
  const url = new URL(req.url);
  const q = url.searchParams.get("dataScope");
  if (q === "test" || q === "real") return q;
  const cookie = req.headers.get("cookie") ?? "";
  const hit = cookie
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${COOKIE}=`));
  const val = hit?.split("=")[1];
  return val === "test" ? "test" : "real";
}

export { COOKIE as ADMIN_DATA_SCOPE_COOKIE };
