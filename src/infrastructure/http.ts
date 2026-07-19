import { NextResponse } from "next/server";
import { DomainError } from "@/domain/errors";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(error: unknown) {
  if (error instanceof DomainError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  console.error(error);
  return NextResponse.json({ error: "שגיאה פנימית" }, { status: 500 });
}
