import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildDatabaseUrl,
  parseDatabaseUrl,
  poolerConnectionCandidates,
  toPoolerConnectionString,
} from "./connection-string";

describe("connection-string", () => {
  it("parses passwords with reserved characters", () => {
    const parsed = parseDatabaseUrl(
      "postgresql://postgres:p%40ss%2Fword@db.abc123xyz.supabase.co:5432/postgres",
    );
    assert.equal(parsed.password, "p@ss/word");
    assert.equal(parsed.ref, "abc123xyz");
  });

  it("rewrites direct supabase db host to pooler", () => {
    const input =
      "postgresql://postgres:secret@db.abc123xyz.supabase.co:5432/postgres";
    const out = toPoolerConnectionString(input, "us-east-1", "aws-0");
    assert.match(out, /aws-0-us-east-1\.pooler\.supabase\.com:6543/);
  });

  it("builds a small pooler candidate set (region env, not full sweep)", () => {
    const input =
      "postgresql://postgres:secret@db.abc123xyz.supabase.co:5432/postgres";
    const candidates = poolerConnectionCandidates(input);
    assert.ok(candidates.length >= 2 && candidates.length <= 6);
    assert.match(candidates[0]!, /aws-0-ap-southeast-1\.pooler\.supabase\.com:6543/);
  });

  it("returns single candidate when DATABASE_URL is already pooler", () => {
    const input =
      "postgresql://postgres.abc123xyz:secret@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";
    const candidates = poolerConnectionCandidates(input);
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0], input);
  });

  it("round-trips buildDatabaseUrl", () => {
    const url = buildDatabaseUrl({
      user: "postgres.ref",
      password: "a@b/c",
      host: "aws-0-us-east-1.pooler.supabase.com",
      port: 6543,
      database: "postgres",
    });
    const parsed = parseDatabaseUrl(url);
    assert.equal(parsed.password, "a@b/c");
  });
});
