import test from "node:test";
import assert from "node:assert/strict";
import { coalesceAsync } from "../src/core/utils/coalesceAsync.js";

test("burst of 5 calls → 2 runs (first + one trailing), all resolve after the last", async () => {
  let runs = 0;
  const load = coalesceAsync(async () => { runs++; await new Promise(r => setTimeout(r, 20)); });
  const ps = [load(), load(), load(), load(), load()];
  await Promise.all(ps);
  assert.equal(runs, 2);
});
test("sequential calls each run; errors in fn don't wedge it", async () => {
  let runs = 0;
  const load = coalesceAsync(async () => { runs++; if (runs === 1) throw new Error("x"); });
  await assert.rejects(load());
  await load();
  assert.equal(runs, 2);
});
test("runs never overlap", async () => {
  let active = 0, max = 0;
  const load = coalesceAsync(async () => { active++; max = Math.max(max, active); await new Promise(r => setTimeout(r, 5)); active--; });
  await Promise.all([load(), load(), load()]);
  assert.equal(max, 1);
});
