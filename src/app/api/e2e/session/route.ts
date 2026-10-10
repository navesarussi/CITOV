import { randomUUID } from "crypto";
import type { Role, User } from "@/domain/types";
import { upsertSessionRole } from "@/infrastructure/db/normalized-store";
import { e2eSessionCookie, isE2eAuthEnabled } from "@/infrastructure/e2e-auth";
import { ok } from "@/infrastructure/http";
import { NextResponse } from "next/server";

function authorized(req: Request): boolean {
  return req.headers.get("x-e2e-secret") === process.env.E2E_SECRET?.trim();
}

export async function POST(req: Request) {
  if (!isE2eAuthEnabled() || !authorized(req)) {
    return ok({ error: "E2E auth disabled" }, { status: 403 });
  }
  const body = (await req.json()) as { role?: Role; label?: string };
  const role: Role = body.role === "employer" ? "employer" : "employee";
  const id = `e2e-${randomUUID()}`;
  const user: User = {
    id,
    name: body.label?.trim() || (role === "employee" ? "E2E מועמד" : "E2E מעסיק"),
    role,
    email: `${id}@citov.test`,
    createdAt: new Date().toISOString(),
  };
  const saved = await upsertSessionRole(user, role);
  const res = NextResponse.json({ user: saved });
  res.headers.append("Set-Cookie", e2eSessionCookie(saved.id));
  return res;
}
