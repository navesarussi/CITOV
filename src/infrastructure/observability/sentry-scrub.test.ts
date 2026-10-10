import assert from "node:assert/strict";
import type { ErrorEvent } from "@sentry/core";
import { describe, it } from "node:test";
import { scrubSentryEvent } from "./sentry-scrub";

describe("scrubSentryEvent", () => {
  it("redacts emails and long chat content", () => {
    const out = scrubSentryEvent({
      message: "fail for user@example.com",
      extra: { chatContent: "x".repeat(200), safe: "ok" },
    } as unknown as ErrorEvent);
    assert.ok(out);
    assert.match(out.message ?? "", /\[email\]/);
    assert.ok(String(out.extra?.chatContent).includes("[truncated]"));
    assert.equal(out.extra?.safe, "ok");
  });
});
