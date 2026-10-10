import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkUserRateLimit } from "./user-rate-limit";
import { readMaxChatMessageChars, trimMessageTooLong } from "./request-limits";

describe("checkUserRateLimit (memory)", () => {
  it("allows under limit then blocks", () => {
    const userId = `u-${Date.now()}`;
    const opts = { limit: 2, windowMs: 60_000 };
    assert.equal(checkUserRateLimit(userId, opts).allowed, true);
    assert.equal(checkUserRateLimit(userId, opts).allowed, true);
    const blocked = checkUserRateLimit(userId, opts);
    assert.equal(blocked.allowed, false);
    assert.ok((blocked.retryAfterSec ?? 0) > 0);
  });
});

describe("request message caps", () => {
  it("trims and rejects over max chars", () => {
    const max = readMaxChatMessageChars();
    const ok = trimMessageTooLong("  hello  ", max);
    assert.equal(ok.ok, true);
    if (ok.ok) assert.equal(ok.message, "hello");
    const bad = trimMessageTooLong("x".repeat(max + 1), max);
    assert.equal(bad.ok, false);
  });
});
