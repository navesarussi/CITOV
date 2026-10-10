import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

describe("ensureSchema", () => {
  it("always applies idempotent ALTERS even when base schema exists", () => {
    const src = readFileSync(join(process.cwd(), "src/infrastructure/db/schema.ts"), "utf8");
    assert.match(src, /ALTERS\.split\(";"\)/);
    assert.match(src, /Idempotent patches/);
    assert.match(src, /labeler_role/);
    assert.match(src, /match_queue_threshold/);
  });
});
