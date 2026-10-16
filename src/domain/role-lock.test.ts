import { test } from "node:test";
import assert from "node:assert/strict";
import { isRoleChangeBlocked } from "./role-lock";

test("new users are never blocked", () => {
  assert.equal(isRoleChangeBlocked({ existingRole: null, requestedRole: "employee", isAdmin: false }), false);
});

test("same role is allowed", () => {
  assert.equal(isRoleChangeBlocked({ existingRole: "employer", requestedRole: "employer", isAdmin: false }), false);
});

test("regular users cannot switch role", () => {
  assert.equal(isRoleChangeBlocked({ existingRole: "employer", requestedRole: "employee", isAdmin: false }), true);
  assert.equal(isRoleChangeBlocked({ existingRole: "employee", requestedRole: "employer", isAdmin: false }), true);
});

test("admins can switch role to preview workspaces", () => {
  assert.equal(isRoleChangeBlocked({ existingRole: "employer", requestedRole: "employee", isAdmin: true }), false);
});
