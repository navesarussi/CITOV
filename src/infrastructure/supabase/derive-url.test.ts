import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deriveSupabaseUrlFromDatabaseUrl } from "./derive-url";

describe("deriveSupabaseUrlFromDatabaseUrl", () => {
  it("parses pooler username ref", () => {
    const url = deriveSupabaseUrlFromDatabaseUrl(
      "postgresql://postgres.abc123xyz:secret@aws-0-eu-central-1.pooler.supabase.com:6543/postgres",
    );
    assert.equal(url, "https://abc123xyz.supabase.co");
  });

  it("parses direct db host", () => {
    const url = deriveSupabaseUrlFromDatabaseUrl(
      "postgresql://postgres:secret@db.abc123xyz.supabase.co:5432/postgres",
    );
    assert.equal(url, "https://abc123xyz.supabase.co");
  });
});
