/**
 * Pure, deterministic selection helpers. Supplying an RNG makes the game logic
 * repeatable in tests while the UI can use a stronger browser RNG at runtime.
 */
export function selectEliminationIndex(players, rng = Math.random) {
  if (!Array.isArray(players) || players.length < 2) {
    throw new RangeError("At least two players are required to eliminate a player.");
  }

  const value = rng();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError("The random value must be a finite number from 0 (inclusive) to 1 (exclusive).");
  }

  return Math.floor(value * players.length);
}

export function createEliminationPlan(players, rng = Math.random) {
  if (!Array.isArray(players) || players.length < 2) {
    throw new RangeError("At least two players are required to choose who goes first.");
  }

  const remaining = [...players];
  const eliminated = [];

  while (remaining.length > 1) {
    const index = selectEliminationIndex(remaining, rng);
    eliminated.push(remaining.splice(index, 1)[0]);
  }

  return { eliminated, winner: remaining[0] };
}
