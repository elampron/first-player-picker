import { createEliminationPlan } from "./game.js";

const STABLE_DELAY_MS = 1100;
// Give every elimination round a full four seconds of suspense and reveal.
const ROUND_FLASH_MS = 3200;
const ELIMINATION_PAUSE_MS = 800;
const HUES = [48, 336, 202, 268, 146, 20, 186, 310, 89, 235];

const elements = {
  heroScreen: document.querySelector("#heroScreen"),
  gameScreen: document.querySelector("#gameScreen"),
  startButton: document.querySelector("#startButton"),
  resetButton: document.querySelector("#resetButton"),
  playAgainButton: document.querySelector("#playAgainButton"),
  clearButton: document.querySelector("#clearButton"),
  demoPlayerButton: document.querySelector("#demoPlayerButton"),
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
  controlActions: document.querySelector("#controlActions"),
};

let state = "intro";
let activePlayers = new Map();
let lockedPlayers = [];
let stableTimer;
let demoPlayerCount = 0;
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
  elements.touchCount.querySelector(".touch-count__number").textContent = count;
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

function removePointer(id) {
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
  if (activePlayers.size < 2) return;
  state = "eliminating";
  lockedPlayers = Array.from(activePlayers.values());
  renderPlayers(lockedPlayers);
  elements.playersLayer.querySelectorAll(".player-token").forEach((token) => token.classList.add("is-locked"));
  elements.controlActions.hidden = true;
  elements.roundLabel.textContent = "SPOTS LOCKED";
  elements.gameTitle.innerHTML = "Picking<br /><em>first up…</em>";
  elements.stageHint.textContent = "A fair elimination is about to begin.";
  elements.meterFill.style.width = "100%";
  setStatus(`${lockedPlayers.length} players locked. Choosing who goes first.`);
  runElimination(cancellationToken);
}

async function runElimination(token) {
  const plan = createEliminationPlan(lockedPlayers, randomValue);
  const active = [...lockedPlayers];

  for (let round = 0; round < plan.eliminated.length; round += 1) {
    if (token !== cancellationToken) return;
    const out = plan.eliminated[round];
    elements.roundLabel.textContent = `ROUND ${round + 1}`;
    elements.gameTitle.innerHTML = "Feeling<br /><em>lucky?</em>";
    elements.stageHint.textContent = `${active.length} players remain.`;
    setStatus(`Round ${round + 1}. ${active.length} players still in.`);
    active.forEach((player) => player.node?.classList.add("is-flashing"));
    await sleep(ROUND_FLASH_MS);
    if (token !== cancellationToken) return;
    active.forEach((player) => player.node?.classList.remove("is-flashing"));
    out.node?.classList.add("is-eliminated");
    active.splice(active.indexOf(out), 1);
    elements.stageHint.textContent = `${active.length} player${active.length === 1 ? "" : "s"} remain${active.length === 1 ? "s" : ""}.`;
    setStatus(`A player has been eliminated. ${active.length} player${active.length === 1 ? "" : "s"} remain.`);
    await sleep(ELIMINATION_PAUSE_MS);
  }

  if (token !== cancellationToken) return;
  announceWinner(plan.winner);
}

function announceWinner(winner) {
  state = "winner";
  elements.roundLabel.textContent = "THE TABLE HAS SPOKEN";
  elements.gameTitle.innerHTML = "You’re<br /><em>first up!</em>";
  elements.stageHint.textContent = "Deal the cards. Make the first move. Enjoy the power responsibly.";
  winner.node?.classList.add("is-winner");
  elements.winnerBanner.hidden = false;
  elements.playAgainButton.hidden = false;
  elements.touchCount.querySelector(".touch-count__number").textContent = "1";
  setStatus("Winner chosen! This player goes first.", "Winner chosen. The remaining player goes first.");
}

function startGame() {
  cancellationToken += 1;
  window.clearTimeout(stableTimer);
  state = "gathering";
  activePlayers = new Map();
  lockedPlayers = [];
  demoPlayerCount = 0;
  elements.heroScreen.hidden = true;
  elements.gameScreen.hidden = false;
  elements.playersLayer.replaceChildren();
  elements.winnerBanner.hidden = true;
  elements.playAgainButton.hidden = true;
  elements.controlActions.hidden = false;
  updateGatheringUI();
  window.setTimeout(() => elements.playStage.focus({ preventScroll: true }), 50);
}

function goHome() {
  cancellationToken += 1;
  window.clearTimeout(stableTimer);
  state = "intro";
  activePlayers = new Map();
  lockedPlayers = [];
  elements.gameScreen.hidden = true;
  elements.heroScreen.hidden = false;
  elements.startButton.focus({ preventScroll: true });
}

function addDemoPlayer() {
  if (state !== "gathering") return;
  const rect = elements.playStage.getBoundingClientRect();
  const slots = [
    [0.32, 0.63], [0.7, 0.5], [0.48, 0.76], [0.22, 0.38], [0.78, 0.75],
    [0.5, 0.34], [0.7, 0.28], [0.28, 0.82], [0.82, 0.38], [0.48, 0.53],
  ];
  const [xRatio, yRatio] = slots[demoPlayerCount % slots.length];
  demoPlayerCount += 1;
  addPointer(`demo-${demoPlayerCount}`, rect.width * xRatio, rect.height * yRatio);
}

elements.startButton.addEventListener("click", startGame);
elements.playAgainButton.addEventListener("click", startGame);
elements.resetButton.addEventListener("click", goHome);
elements.clearButton.addEventListener("click", () => {
  if (state !== "gathering") return;
  activePlayers.clear();
  demoPlayerCount = 0;
  window.clearTimeout(stableTimer);
  renderPlayers();
  updateGatheringUI();
  elements.playStage.focus({ preventScroll: true });
});
elements.demoPlayerButton.addEventListener("click", (event) => {
  event.stopPropagation();
  addDemoPlayer();
});

elements.playStage.addEventListener("pointerdown", (event) => {
  if (state !== "gathering") return;
  event.preventDefault();
  elements.playStage.setPointerCapture?.(event.pointerId);
  const { x, y } = positionToStage(event);
  addPointer(`pointer-${event.pointerId}`, x, y);
});
elements.playStage.addEventListener("pointermove", (event) => {
  if (state !== "gathering") return;
  const { x, y } = positionToStage(event);
  movePointer(`pointer-${event.pointerId}`, x, y);
});
for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"]) {
  elements.playStage.addEventListener(eventName, (event) => removePointer(`pointer-${event.pointerId}`));
}
window.addEventListener("blur", () => {
  if (state !== "gathering") return;
  activePlayers.clear();
  window.clearTimeout(stableTimer);
  renderPlayers();
  updateGatheringUI();
});
window.addEventListener("keydown", (event) => {
  if (state !== "gathering" || event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.key.toLowerCase() === "a") {
    event.preventDefault();
    addDemoPlayer();
  }
  if (event.key === "Escape") {
    event.preventDefault();
    activePlayers.clear();
    renderPlayers();
    updateGatheringUI();
    resetStableTimer();
  }
});
