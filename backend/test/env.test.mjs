import test from "node:test";
import assert from "node:assert/strict";
import { validateEnv } from "../src/config/env.js";

test("a missing JWT secret is fatal", () => {
  assert.equal(validateEnv({}).ok, false);
  assert.equal(validateEnv({ JWT_SECRET: "x".repeat(32) }).ok, true);
});
test("short secret / missing DB credentials only warn", () => {
  const r = validateEnv({ JWT_SECRET: "short" });
  assert.equal(r.ok, true);
  assert.equal(r.warnings.length, 2);
});
test("trusted connection needs no DB credentials", () => {
  assert.equal(validateEnv({ JWT_SECRET: "x".repeat(32), DB_TRUSTED_CONNECTION: "true" }).warnings.length, 0);
});
