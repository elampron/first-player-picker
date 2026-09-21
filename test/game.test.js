import assert from "node:assert/strict";
import test from "node:test";
import { createEliminationPlan, selectEliminationIndex } from "../src/game.js";

test("selection uses an injected RNG across the full player range", () => {
  const players = ["A", "B", "C", "D"];
  assert.equal(selectEliminationIndex(players, () => 0), 0);
  assert.equal(selectEliminationIndex(players, () => 0.49), 1);
  assert.equal(selectEliminationIndex(players, () => 0.999999), 3);
});

test("a deterministic elimination plan chooses exactly one winner without mutating players", () => {
  const players = ["Ada", "Bea", "Cam", "Dee"];
  const values = [0.5, 0, 0.75];
  let cursor = 0;
  const plan = createEliminationPlan(players, () => values[cursor++]);

  assert.deepEqual(plan.eliminated, ["Cam", "Ada", "Dee"]);
  assert.equal(plan.winner, "Bea");
  assert.deepEqual(players, ["Ada", "Bea", "Cam", "Dee"]);
});

test("two players produce one elimination and one winner", () => {
  const plan = createEliminationPlan(["left", "right"], () => 0.99);
  assert.deepEqual(plan.eliminated, ["right"]);
  assert.equal(plan.winner, "left");
});

test("selection rejects fewer than two players and invalid random values", () => {
  assert.throws(() => selectEliminationIndex(["solo"], () => 0), RangeError);
  assert.throws(() => createEliminationPlan([], () => 0), RangeError);
  assert.throws(() => selectEliminationIndex(["A", "B"], () => 1), RangeError);
  assert.throws(() => selectEliminationIndex(["A", "B"], () => Number.NaN), RangeError);
});
