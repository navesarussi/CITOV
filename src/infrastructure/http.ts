import { NextResponse } from "next/server";
import { DomainError } from "@/domain/errors";
import { getMessages } from "@/i18n";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/types";
import { recordAppEventSafe } from "@/infrastructure/db/app-events";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(
  error: unknown,
  locale: Locale = DEFAULT_LOCALE,
  ctx?: { route?: string; userId?: string; userEmail?: string },
) {
  if (error instanceof DomainError) {
    recordAppEventSafe({
      kind: "api_error",
      severity: "warn",
      route: ctx?.route,
      statusCode: 400,
      message: error.message,
      userId: ctx?.userId,
      userEmail: ctx?.userEmail,
    });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  console.error(error);
  const msg = error instanceof Error ? error.message : String(error);
  recordAppEventSafe({
    kind: "api_error",
    severity: "critical",
    route: ctx?.route,
    statusCode: 500,
    message: msg,
    stack: error instanceof Error ? error.stack : undefined,
    userId: ctx?.userId,
    userEmail: ctx?.userEmail,
  });
  return NextResponse.json({ error: getMessages(locale).api.internalError }, { status: 500 });
}
