import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isAdminEmail } from "@/infrastructure/admin-config";

describe("admin-guard allowlist", () => {
  it("recognizes owner admin email case-insensitively", () => {
    assert.equal(isAdminEmail("NaveSarussi@gmail.com"), true);
    assert.equal(isAdminEmail("not-admin@example.com"), false);
  });
});
