import { createWinnerSelection, isRosterReadyToReveal } from "./game.js";

const STABLE_DELAY_MS = 1100;
const REVEAL_PULSE_MS = 2000;
const ELIMINATION_TRANSITION_MS = 400;
const HUES = [48, 336, 202, 268, 146, 20, 186, 310, 89, 235];

const elements = {
  playStage: document.querySelector("#playStage"),
  playersLayer: document.querySelector("#playersLayer"),
  touchCount: document.querySelector("#touchCount"),
  statusText: document.querySelector("#statusText"),
  liveStatus: document.querySelector("#liveStatus"),
  stageHint: document.querySelector("#stageHint"),
  gameTitle: document.querySelector("#gameTitle"),
  roundLabel: document.querySelector("#roundLabel"),
  meterFill: document.querySelector("#meterFill"),
  winnerBanner: document.querySelector("#winnerBanner"),
};

let state = "intro";
let activePlayers = new Map();
let lockedPlayers = [];
let releasedPlayerIds = new Set();
let stableTimer;
let cancellationToken = 0;

const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

function randomValue() {
  if (window.crypto?.getRandomValues) {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    return values[0] / 4294967296;
  }
  return Math.random();
}

function setStatus(text, liveText = text) {
  elements.statusText.textContent = text;
  elements.liveStatus.textContent = liveText;
}

function setTouchCount(count, label = "touches") {
  elements.touchCount.querySelector(".touch-count__number").textContent = count;
  elements.touchCount.querySelector(".touch-count__label").textContent = label;
}

function playerRecord(id, x, y) {
  const hue = HUES[activePlayers.size % HUES.length];
  return { id, x, y, hue, node: null };
}

function positionToStage(event) {
  const rect = elements.playStage.getBoundingClientRect();
  return {
    x: Math.max(46, Math.min(rect.width - 46, event.clientX - rect.left)),
    y: Math.max(58, Math.min(rect.height - 46, event.clientY - rect.top)),
  };
}

function renderPlayers(players = activePlayers.values()) {
  const playerList = Array.from(players);
  elements.playersLayer.replaceChildren(...playerList.map((player, index) => {
    const token = document.createElement("div");
    token.className = "player-token";
    token.style.setProperty("--hue", player.hue);
    token.style.left = `${player.x}px`;
    token.style.top = `${player.y}px`;
    token.dataset.playerId = player.id;
    token.innerHTML = `<span class="player-token__number">${index + 1}</span>`;
    player.node = token;
    return token;
  }));
}

function updateGatheringUI() {
  const count = activePlayers.size;
  setTouchCount(count);
  elements.meterFill.style.width = `${Math.min(100, count * 50)}%`;

  if (count === 0) {
    elements.roundLabel.textContent = "READY WHEN YOU ARE";
    elements.gameTitle.innerHTML = "Place your<br /><em>fingertips.</em>";
    elements.stageHint.textContent = "Everyone holds one finger on the screen. We’ll lock in once there are at least two.";
    setStatus("Waiting for at least two fingers.");
  } else if (count === 1) {
    elements.roundLabel.textContent = "ONE PLAYER READY";
    elements.gameTitle.innerHTML = "Invite one<br /><em>more player.</em>";
    elements.stageHint.textContent = "Keep holding. The round starts automatically when another finger joins.";
    setStatus("One finger is down. Waiting for one more player.");
  } else {
    elements.roundLabel.textContent = `${count} PLAYERS READY`;
    elements.gameTitle.innerHTML = "Hold<br /><em>steady…</em>";
    elements.stageHint.textContent = "Hands are in. Locking your spots now.";
    setStatus(`${count} players detected. Hold steady to lock the round.`);
  }
}

function resetStableTimer() {
  window.clearTimeout(stableTimer);
  if (state !== "gathering" || activePlayers.size < 2) return;

  const lockedCount = activePlayers.size;
  stableTimer = window.setTimeout(() => {
    if (state === "gathering" && activePlayers.size === lockedCount && lockedCount >= 2) {
      lockPlayers();
    }
  }, STABLE_DELAY_MS);
}

function addPointer(id, x, y) {
  if (state !== "gathering" || activePlayers.has(id)) return;
  activePlayers.set(id, playerRecord(id, x, y));
  renderPlayers();
  updateGatheringUI();
  resetStableTimer();
}

function removeGatheringPointer(id) {
  if (state !== "gathering" || !activePlayers.has(id)) return;
  activePlayers.delete(id);
  renderPlayers();
  updateGatheringUI();
  resetStableTimer();
}

function movePointer(id, x, y) {
  const player = activePlayers.get(id);
  if (state !== "gathering" || !player) return;
  player.x = x;
  player.y = y;
  if (player.node) {
    player.node.style.left = `${x}px`;
    player.node.style.top = `${y}px`;
  }
}

function lockPlayers() {
  window.clearTimeout(stableTimer);
  if (activePlayers.size < 2 || state !== "gathering") return;

  state = "waitingForRelease";
  lockedPlayers = Array.from(activePlayers.values(), ({ id, x, y, hue }) => ({ id, x, y, hue, node: null }));
  releasedPlayerIds = new Set();
  activePlayers.clear();
  renderPlayers(lockedPlayers);
  elements.playersLayer.querySelectorAll(".player-token").forEach((token) => token.classList.add("is-locked"));
  setTouchCount(lockedPlayers.length, "players");
  elements.roundLabel.textContent = "SPOTS LOCKED";
  elements.gameTitle.innerHTML = "Lift<br /><em>together.</em>";
  elements.stageHint.textContent = "Lift every finger to reveal the winner.";
  elements.meterFill.style.width = "100%";
  setStatus(
    `${lockedPlayers.length} players locked. Lift every finger to reveal the winner.`,
    `${lockedPlayers.length} players locked. Lift every finger to reveal the winner.`,
  );
}

function updateReleaseProgress() {
  const releasedCount = releasedPlayerIds.size;
  const remainingCount = lockedPlayers.length - releasedCount;
  const fingerWord = remainingCount === 1 ? "finger" : "fingers";

  if (remainingCount > 0) {
    elements.stageHint.textContent = `${releasedCount} of ${lockedPlayers.length} lifted. Lift ${remainingCount} more ${fingerWord} to reveal the winner.`;
    setStatus(`${releasedCount} of ${lockedPlayers.length} fingers lifted. Waiting for ${remainingCount} more.`);
    return;
  }

  elements.stageHint.textContent = "All fingers lifted. Revealing the winner…";
  setStatus("All fingers lifted. Revealing the winner.");
  startReveal();
}

function releaseLockedPlayers(ids) {
  if (state !== "waitingForRelease") return;
  let changed = false;
  for (const id of ids) {
    if (lockedPlayers.some((player) => player.id === id) && !releasedPlayerIds.has(id)) {
      releasedPlayerIds.add(id);
      changed = true;
    }
  }
  if (!changed) return;
  updateReleaseProgress();
}

function releaseLockedPointer(id) {
  releaseLockedPlayers([id]);
}

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

function startReveal() {
  if (state !== "waitingForRelease" || !isRosterReadyToReveal(lockedPlayers, releasedPlayerIds)) return;
  state = "revealing";
  elements.roundLabel.textContent = "THE REVEAL";
  elements.gameTitle.innerHTML = "Who goes<br /><em>first?</em>";
  runWinnerReveal(cancellationToken);
}

async function runWinnerReveal(token) {
  const selection = createWinnerSelection(lockedPlayers, randomValue);
  const pulseDuration = prefersReducedMotion() ? 0 : REVEAL_PULSE_MS;
  const eliminationDuration = prefersReducedMotion() ? 0 : ELIMINATION_TRANSITION_MS;

  lockedPlayers.forEach((player) => player.node?.classList.add("is-revealing"));
  await sleep(pulseDuration);
  if (token !== cancellationToken || state !== "revealing") return;

  lockedPlayers.forEach((player) => player.node?.classList.remove("is-revealing"));
  selection.losers.forEach((player) => player.node?.classList.add("is-eliminated"));
  await sleep(eliminationDuration);
  if (token !== cancellationToken || state !== "revealing") return;

  announceWinner(selection.winner);
}

function announceWinner(winner) {
  state = "winner";
  elements.roundLabel.textContent = "THE TABLE HAS SPOKEN";
  elements.gameTitle.innerHTML = "You go<br /><em>first!</em>";
  elements.stageHint.textContent = "Deal the cards. Make the first move. Enjoy the power responsibly.";
  winner.node?.classList.add("is-winner");
  elements.winnerBanner.hidden = false;
  setTouchCount(1, "winner");
  setStatus("Winner chosen! This player goes first.", "Winner chosen. The remaining player goes first.");
}

function startGame() {
  cancellationToken += 1;
  window.clearTimeout(stableTimer);
  state = "gathering";
  activePlayers = new Map();
  lockedPlayers = [];
  releasedPlayerIds = new Set();
  elements.playersLayer.replaceChildren();
  elements.winnerBanner.hidden = true;
  updateGatheringUI();
  window.setTimeout(() => elements.playStage.focus({ preventScroll: true }), 50);
}

elements.playStage.addEventListener("pointerdown", (event) => {
  if (state !== "gathering") return;
  event.preventDefault();
  if (event.isTrusted) {
    try {
      elements.playStage.setPointerCapture?.(event.pointerId);
    } catch {
      // A browser may cancel the pointer before capture is available; its later
      // cancel/lost-capture event is still handled by the release gate.
    }
  }
  const { x, y } = positionToStage(event);
  addPointer(`pointer-${event.pointerId}`, x, y);
});
elements.playStage.addEventListener("pointermove", (event) => {
  if (state !== "gathering") return;
  const { x, y } = positionToStage(event);
  movePointer(`pointer-${event.pointerId}`, x, y);
});
for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"]) {
  elements.playStage.addEventListener(eventName, (event) => {
    const id = `pointer-${event.pointerId}`;
    if (state === "gathering") removeGatheringPointer(id);
    if (state === "waitingForRelease") releaseLockedPointer(id);
  });
}
window.addEventListener("blur", () => {
  if (state === "gathering") {
    activePlayers.clear();
    window.clearTimeout(stableTimer);
    renderPlayers();
    updateGatheringUI();
    return;
  }
  if (state === "waitingForRelease") {
    releaseLockedPlayers(lockedPlayers.map((player) => player.id));
  }
});

startGame();
