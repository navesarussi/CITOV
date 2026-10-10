import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { eventFingerprint } from "./app-event";

describe("app-event", () => {
  it("builds stable fingerprint", () => {
    const a = eventFingerprint({ kind: "api_error", route: "/api/x", message: "boom" });
    const b = eventFingerprint({ kind: "api_error", route: "/api/x", message: "boom" });
    assert.equal(a, b);
  });
});
