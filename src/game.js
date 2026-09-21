/**
 * Pure, deterministic selection helpers. Supplying an RNG makes the game logic
 * repeatable in tests while the UI can use a stronger browser RNG at runtime.
 */
export function selectWinnerIndex(players, rng = Math.random) {
  if (!Array.isArray(players) || players.length < 2) {
    throw new RangeError("At least two players are required to choose a winner.");
  }

  const value = rng();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError("The random value must be a finite number from 0 (inclusive) to 1 (exclusive).");
  }

  return Math.floor(value * players.length);
}

export function createWinnerSelection(players, rng = Math.random) {
  if (!Array.isArray(players) || players.length < 2) {
    throw new RangeError("At least two players are required to choose who goes first.");
  }

  const winnerIndex = selectWinnerIndex(players, rng);
  const winner = players[winnerIndex];

  return {
    winner,
    losers: players.filter((_, index) => index !== winnerIndex),
  };
}

/**
 * Locked spots are ready only when every original pointer has been released.
 * Keeping this separate from DOM events makes the release gate testable.
 */
export function isRosterReadyToReveal(lockedPlayers, releasedPlayerIds) {
  if (!Array.isArray(lockedPlayers) || lockedPlayers.length < 2) return false;
  if (!releasedPlayerIds || typeof releasedPlayerIds.has !== "function") return false;

  return lockedPlayers.every((player) => releasedPlayerIds.has(player.id));
}
