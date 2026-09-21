import assert from "node:assert/strict";
import test from "node:test";
import { createWinnerSelection, isRosterReadyToReveal, selectWinnerIndex } from "../src/game.js";

test("winner selection uses an injected RNG across the full player range", () => {
  const players = ["Ada", "Bea", "Cam", "Dee"];
  assert.equal(selectWinnerIndex(players, () => 0), 0);
  assert.equal(selectWinnerIndex(players, () => 0.49), 1);
  assert.equal(selectWinnerIndex(players, () => 0.999999), 3);
});

test("a deterministic winner selection keeps exactly one winner and all other players as losers", () => {
  const players = ["Ada", "Bea", "Cam", "Dee"];
  const selection = createWinnerSelection(players, () => 0.5);

  assert.equal(selection.winner, "Cam");
  assert.deepEqual(selection.losers, ["Ada", "Bea", "Dee"]);
  assert.equal(selection.losers.length + 1, players.length);
  assert.equal(selection.losers.includes(selection.winner), false);
  assert.deepEqual(players, ["Ada", "Bea", "Cam", "Dee"]);
});

test("a locked roster waits until every original pointer has been released", () => {
  const lockedPlayers = [{ id: "pointer-1" }, { id: "pointer-8" }, { id: "pointer-23" }];

  assert.equal(isRosterReadyToReveal(lockedPlayers, new Set()), false);
  assert.equal(isRosterReadyToReveal(lockedPlayers, new Set(["pointer-1", "pointer-23"])), false);
  assert.equal(isRosterReadyToReveal(lockedPlayers, new Set(["pointer-1", "pointer-8", "pointer-23"])), true);
});

test("release readiness rejects incomplete rosters and unknown release trackers", () => {
  assert.equal(isRosterReadyToReveal([{ id: "pointer-1" }], new Set(["pointer-1"])), false);
  assert.equal(isRosterReadyToReveal([], new Set()), false);
  assert.equal(isRosterReadyToReveal([{ id: "pointer-1" }, { id: "pointer-2" }], ["pointer-1", "pointer-2"]), false);
});

test("winner selection rejects fewer than two players and invalid random values", () => {
  assert.throws(() => selectWinnerIndex(["solo"], () => 0), RangeError);
  assert.throws(() => createWinnerSelection([], () => 0), RangeError);
  assert.throws(() => selectWinnerIndex(["A", "B"], () => 1), RangeError);
  assert.throws(() => selectWinnerIndex(["A", "B"], () => Number.NaN), RangeError);
});
