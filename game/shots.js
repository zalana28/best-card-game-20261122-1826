// shots.js — Ember Clash: screenshot scenes and the autopilot.
// One job: drive the game to a chosen scene for ?shot=, so the four
// dossier screenshots are the same every run. The autopilot plays
// the player's hand with the same greedy picker the foe uses.

// The foe's turn, run synchronously (no sleeps) for screenshots.
function foeTurnSync() {
  state.foe.block = 0;
  state.playedElements = [];
  drawCards(state.foe, HAND_SIZE - state.foe.hand.length);
  for (const id of state.foePlan.plays) {
    const at = state.foe.hand.indexOf(id);
    if (at === -1) continue;
    state.foe.hand.splice(at, 1);
    state.foe.discard.push(id);
    const line = applyCardEffect("foe", id);
    if (line) logEvent(line);
    if (checkEnd()) return true;
  }
  state.turn += 1;
  startPlayerTurn();
  return false;
}

// Play the player's whole turn greedily. opts tune the picker;
// guardless skips pure block/heal cards (used for the loss scene).
function autopilotPlayer(opts) {
  const o = opts || {};
  for (let guard = 0; guard < 10; guard += 1) {
    if (state.screen !== "play") return;
    const threat = state.foePlan ? state.foePlan.totalDamage : 0;
    let id = pickBestCard(state.player.hand, state.energy, state.player, state.foe, threat, o);
    if (o.guardless && id && !CARDS[id].dmg) {
      id = state.player.hand.find((h) => CARDS[h].dmg && CARDS[h].cost <= state.energy) || null;
    }
    if (!id) return;
    playCard(state.player.hand.indexOf(id));
  }
}

// One full round: the player goes, then the foe answers.
function autopilotRound(playerOpts) {
  autopilotPlayer(playerOpts);
  if (state.screen !== "play") return;
  foeTurnSync();
}

function playScene(name) {
  state.fast = true;
  if (name === "title") {
    newGame(11);
    return;
  }
  if (name === "table") {
    newGame(7);
    startPlaying();
    for (let round = 0; round < 4; round += 1) {
      autopilotRound({ aggression: 1.4, caution: 0.7 });
      if (state.screen !== "play") break;
    }
    return;
  }
  if (name === "win") {
    newGame(3);
    startPlaying();
    for (let round = 0; round < 15; round += 1) {
      autopilotRound({ aggression: 1.6, caution: 0.5 });
      if (state.screen === "win") return;
      if (state.screen !== "play") return;
    }
    return;
  }
  if (name === "loss") {
    // Try seeds in order until one actually loses: the guardless
    // autopilot only plays damage, so with a stronger deck some seeds
    // win instead. The first losing seed is the screenshot, every run.
    const params = new URLSearchParams(location.search);
    const seeds = params.get("seeds")
      ? params.get("seeds").split(",").map((s) => Number(s))
      : [5, 9, 13, 17, 21, 25, 29, 33, 37, 41, 45, 49];
    for (const seed of seeds) {
      newGame(seed);
      startPlaying();
      for (let round = 0; round < 15; round += 1) {
        autopilotRound({ aggression: 0.7, caution: 0.2, guardless: true });
        if (state.screen === "loss") return;
        if (state.screen !== "play") break;
      }
    }
    return;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(location.search);
  const shot = params.get("shot");
  if (!shot) return;
  playScene(shot);
  render();
  setTimeout(() => { window.__ready = true; }, 300);
});
