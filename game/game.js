// game.js — Ember Clash: rules, the table, and input.
// One job: run the duel and draw it. Card data lives in cards.js,
// the opponent's brain in ai.js, sounds in audio.js, the screenshot
// scenes in shots.js.

// Seeded random (mulberry32); free play uses Math.random instead.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MAX_HP = 30;
const HAND_SIZE = 5;
const ENERGY_MAX = 3;

const state = {
  screen: "title",
  turn: 1,
  energy: ENERGY_MAX,
  busy: false,
  fast: false,
  rng: Math.random,
  player: null,
  foe: null,
  playedElements: [],
  lastPlay: null,
  log: [],
  damageDealt: 0,
  cardsPlayed: 0,
  intent: "",
  foePlan: null,
  score: 0,
};

function freshSide() {
  return { hp: MAX_HP, maxHp: MAX_HP, block: 0, deck: [], hand: [], discard: [] };
}

function sleep(ms) {
  if (state.fast || ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function newGame(seed) {
  const rng = seed == null ? Math.random : mulberry32(seed);
  state.rng = rng;
  state.turn = 1;
  state.energy = ENERGY_MAX;
  state.busy = false;
  state.playedElements = [];
  state.lastPlay = null;
  state.log = [];
  state.damageDealt = 0;
  state.cardsPlayed = 0;
  state.score = 0;
  state.player = freshSide();
  state.foe = freshSide();
  state.player.deck = buildDeck(rng);
  state.foe.deck = buildDeck(rng);
  drawCards(state.player, HAND_SIZE);
  drawCards(state.foe, HAND_SIZE);
  startPlayerTurn();
  setScreen("title");
  render();
}

function drawCards(side, n) {
  for (let i = 0; i < n; i += 1) {
    if (side.deck.length === 0) {
      if (side.discard.length === 0) return;
      side.deck = side.discard;
      side.discard = [];
      for (let j = side.deck.length - 1; j > 0; j -= 1) {
        const k = Math.floor(state.rng() * (j + 1));
        const t = side.deck[j]; side.deck[j] = side.deck[k]; side.deck[k] = t;
      }
    }
    side.hand.push(side.deck.pop());
  }
}

// A fresh player turn: block fades, energy refills, hand tops up to
// five, and the foe's plan for its next turn is fixed and shown.
function startPlayerTurn() {
  state.player.block = 0;
  state.energy = ENERGY_MAX;
  drawCards(state.player, HAND_SIZE - state.player.hand.length);
  state.playedElements = [];
  state.foePlan = planOpponentTurn(state.foe, state.player, state.rng);
  state.intent = state.foePlan.intent;
}

function logEvent(text) {
  state.log.push(text);
  if (state.log.length > 4) state.log.shift();
}

function dealDamage(target, amount, by) {
  const absorbed = Math.min(target.block, amount);
  target.block -= absorbed;
  const hurt = amount - absorbed;
  target.hp = Math.max(0, target.hp - hurt);
  if (by === "player") state.damageDealt += hurt;
  return { absorbed, hurt };
}

// Play one card for a side. Echo charges a card whose element matches
// one already played this turn; Spark Surge pays extra when a Flame
// card came first. Returns the log line, or null when unplayable.
function applyCardEffect(by, id) {
  const card = CARDS[id];
  const side = by === "player" ? state.player : state.foe;
  const target = by === "player" ? state.foe : state.player;
  const echo = state.playedElements.includes(card.element);
  const surge = card.surge && state.playedElements.includes("flame") ? card.surge : 0;
  const who = by === "player" ? "You" : "Cinder";
  const bits = [];
  let dmg = 0, block = 0, heal = 0;
  if (card.dmg) {
    dmg = card.dmg * (card.hits || 1) + (echo ? ECHO_BONUS : 0) + surge;
    const r = dealDamage(target, dmg, by);
    bits.push(r.hurt + " damage" + (r.absorbed > 0 ? " (" + r.absorbed + " blocked)" : ""));
    floatText(target === state.foe ? "foe" : "player", "-" + r.hurt, "dmg");
    if (r.hurt > 0) AudioFX.hit();
  }
  if (card.block) {
    block = card.block + (echo ? ECHO_BONUS : 0);
    side.block += block;
    bits.push("+" + block + " block");
    AudioFX.block();
  }
  if (card.heal) {
    heal = card.heal + (echo ? ECHO_BONUS : 0);
    side.hp = Math.min(side.maxHp, side.hp + heal);
    bits.push("heal " + heal);
    floatText(by === "player" ? "player" : "foe", "+" + heal, "heal");
    AudioFX.heal();
  }
  if (card.draw) {
    drawCards(side, card.draw);
    bits.push("draw " + card.draw);
    AudioFX.draw();
  }
  if (echo) {
    bits.push("ECHO +2!");
    AudioFX.echo();
  }
  if (surge) bits.push("Surge +" + surge + "!");
  state.playedElements.push(card.element);
  state.lastPlay = { by, id, echo };
  return who + " played " + card.name + " — " + bits.join(", ");
}

function playCard(index) {
  if (state.screen !== "play" || state.busy) return;
  const id = state.player.hand[index];
  if (!id) return;
  const card = CARDS[id];
  if (card.cost > state.energy) {
    logEvent("Not enough energy for " + card.name + ".");
    AudioFX.click();
    render();
    return;
  }
  state.energy -= card.cost;
  state.player.hand.splice(index, 1);
  state.player.discard.push(id);
  state.cardsPlayed += 1;
  AudioFX.playCard();
  const line = applyCardEffect("player", id);
  if (line) logEvent(line);
  render();
  checkEnd();
}

async function endTurn() {
  if (state.screen !== "play" || state.busy) return;
  state.busy = true;
  AudioFX.click();
  render();
  await sleep(350);
  // The foe's turn: its block fades, it draws up, then it runs the
  // plan the table already showed you.
  state.foe.block = 0;
  state.playedElements = [];
  drawCards(state.foe, HAND_SIZE - state.foe.hand.length);
  for (const id of state.foePlan.plays) {
    const at = state.foe.hand.indexOf(id);
    if (at === -1) continue;
    state.foe.hand.splice(at, 1);
    state.foe.discard.push(id);
    AudioFX.playCard();
    const line = applyCardEffect("foe", id);
    if (line) logEvent(line);
    render();
    await sleep(650);
    if (checkEnd()) { state.busy = false; return; }
  }
  state.turn += 1;
  startPlayerTurn();
  state.busy = false;
  render();
}

// Returns true when the duel is over.
function checkEnd() {
  if (state.foe.hp <= 0) {
    state.score = state.damageDealt + state.player.hp * 2 + Math.max(0, 12 - state.turn) * 3;
    setScreen("win");
    AudioFX.win();
    render();
    return true;
  }
  if (state.player.hp <= 0) {
    state.score = state.damageDealt;
    setScreen("loss");
    AudioFX.lose();
    render();
    return true;
  }
  return false;
}

function setScreen(name) {
  state.screen = name;
  for (const n of ["title", "win", "loss"]) {
    const el = document.getElementById("overlay-" + n);
    if (el) el.classList.toggle("hidden", n !== name);
  }
  if (name === "win") {
    document.getElementById("win-stats").textContent =
      "Turns " + state.turn + " · Damage dealt " + state.damageDealt +
      " · Cards played " + state.cardsPlayed + " · HP left " + state.player.hp +
      " · Score " + state.score;
    launchConfetti();
  }
  if (name === "loss") {
    document.getElementById("loss-stats").textContent =
      "Turns " + state.turn + " · Damage dealt " + state.damageDealt +
      " · Cards played " + state.cardsPlayed + " · Score " + state.score;
  }
}

function launchConfetti() {
  const layer = document.getElementById("confetti");
  if (!layer) return;
  layer.innerHTML = "";
  const colors = ["#ff6b35", "#facc15", "#4ade80", "#38bdf8", "#f472b6"];
  for (let i = 0; i < 48; i += 1) {
    const p = document.createElement("div");
    p.className = "confetti-piece";
    p.style.left = Math.floor(state.rng() * 100) + "%";
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = (state.rng() * 1.2).toFixed(2) + "s";
    p.style.animationDuration = (1.6 + state.rng() * 1.4).toFixed(2) + "s";
    layer.appendChild(p);
  }
}

// A floating number over a side's portrait: damage in red, healing green.
function floatText(zone, text, kind) {
  if (state.fast) return;
  const layer = document.getElementById("float-layer");
  if (!layer) return;
  const span = document.createElement("span");
  span.className = "float-text " + kind + " " + zone;
  span.textContent = text;
  layer.appendChild(span);
  setTimeout(() => span.remove(), 1300);
}

function powerOf(card) {
  if (card.dmg) return { n: card.dmg * (card.hits || 1), label: (card.hits || 1) > 1 ? "DMG ×" + card.hits : "DMG" };
  if (card.block) return { n: card.block, label: "BLOCK" };
  if (card.heal) return { n: card.heal, label: "HEAL" };
  return { n: "•", label: "" };
}

function cardHtml(id, opts) {
  const o = opts || {};
  const card = CARDS[id];
  const el = ELEMENTS[card.element];
  const power = powerOf(card);
  const echo = !!o.echo;
  return (
    '<div class="card ' + card.element + (o.playable === false ? " dim" : "") + (echo ? " echo" : "") + '"' +
    (o.index != null ? ' data-index="' + o.index + '"' : "") + ">" +
    '<div class="cost">' + card.cost + "</div>" +
    '<div class="element"><span class="glyph">' + el.glyph + "</span> " + el.name.toUpperCase() + "</div>" +
    '<div class="power">' + power.n + '</div><div class="power-label">' + power.label + "</div>" +
    '<div class="card-name">' + card.name + "</div>" +
    '<div class="card-text">' + card.text + "</div>" +
    (echo ? '<div class="echo-badge">ECHO +2</div>' : "") +
    "</div>"
  );
}

function hpBarHtml(side) {
  const pct = Math.max(0, Math.round((side.hp / side.maxHp) * 100));
  return (
    '<div class="hpbar"><div class="hpfill" style="width:' + pct + '%"></div>' +
    '<span class="hptext">' + side.hp + " / " + side.maxHp + " HP</span></div>" +
    (side.block > 0 ? '<span class="block-badge">▣ ' + side.block + " block</span>" : "")
  );
}

function render() {
  const p = state.player, f = state.foe;
  if (!p || !f) return;
  document.getElementById("turn-label").textContent = "TURN " + state.turn;
  document.getElementById("score-label").textContent = "SCORE " + (state.screen === "play" || state.screen === "title" ? state.damageDealt : state.score);
  document.getElementById("foe-hp").innerHTML = hpBarHtml(f);
  document.getElementById("player-hp").innerHTML = hpBarHtml(p);
  document.getElementById("foe-intent").textContent = state.screen === "play" ? "Cinder plans: " + state.intent : "";
  document.getElementById("foe-hand").innerHTML =
    f.hand.slice(0, 5).map(() => '<div class="card-back">▲</div>').join("") +
    '<span class="hand-count">' + f.hand.length + " cards</span>";
  document.getElementById("energy-pips").innerHTML =
    Array.from({ length: ENERGY_MAX }, (_, i) =>
      '<span class="pip' + (i < state.energy ? " on" : "") + '">●</span>').join("") +
    '<span class="energy-label">' + state.energy + " / " + ENERGY_MAX + " energy</span>";
  document.getElementById("deck-counts").textContent =
    "Deck " + p.deck.length + " · Discard " + p.discard.length;
  const handEl = document.getElementById("player-hand");
  const n = p.hand.length;
  handEl.innerHTML = p.hand.map((id, i) => {
    const card = CARDS[id];
    const center = (n - 1) / 2;
    const rot = (i - center) * 4;
    const lift = Math.abs(i - center) * 6;
    const echo = state.playedElements.includes(card.element);
    const html = cardHtml(id, { index: i, playable: card.cost <= state.energy, echo });
    return '<div class="hand-card dealt" style="--rot:' + rot + "deg;--lift:" + lift + "px;--delay:" + (i * 0.07) + 's">' + html + "</div>";
  }).join("");
  handEl.querySelectorAll(".hand-card").forEach((el) => {
    el.addEventListener("click", () => playCard(Number(el.querySelector(".card").dataset.index)));
  });
  const last = state.lastPlay;
  document.getElementById("center-play").innerHTML = last
    ? '<div class="last-play"><div class="last-play-label">' +
      (last.by === "player" ? "You played" : "Cinder played") +
      (last.echo ? " — ECHO!" : "") + "</div>" + cardHtml(last.id, {}) + "</div>"
    : '<div class="center-hint">Play a card from your hand.<br>Match elements in one turn for Echo +2.</div>';
  document.getElementById("log").innerHTML =
    state.log.map((line) => "<div>" + line + "</div>").join("");
  const endBtn = document.getElementById("end-turn");
  endBtn.disabled = state.screen !== "play" || state.busy;
  endBtn.textContent = state.busy ? "Cinder plays…" : "END TURN";
  window.__ready = true;
}

function startPlaying() {
  AudioFX.ensure();
  AudioFX.click();
  setScreen("play");
  render();
}

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(location.search);
  const seed = params.get("seed");
  newGame(seed == null ? null : Number(seed));
  document.getElementById("play-button").addEventListener("click", startPlaying);
  document.getElementById("again-win").addEventListener("click", () => { AudioFX.click(); newGame(null); startPlaying(); });
  document.getElementById("again-loss").addEventListener("click", () => { AudioFX.click(); newGame(null); startPlaying(); });
  document.getElementById("end-turn").addEventListener("click", endTurn);
  document.getElementById("sound-toggle").addEventListener("click", (e) => {
    AudioFX.enabled = !AudioFX.enabled;
    e.target.textContent = AudioFX.enabled ? "SOUND ON" : "SOUND OFF";
  });
  document.getElementById("restart-button").addEventListener("click", () => { AudioFX.click(); newGame(null); });
  document.addEventListener("keydown", (e) => {
    if (state.screen === "title" && (e.key === "Enter" || e.key === " ")) { startPlaying(); return; }
    if ((state.screen === "win" || state.screen === "loss") && e.key === "Enter") {
      newGame(null); startPlaying(); return;
    }
    if (state.screen !== "play" || state.busy) return;
    if (e.key >= "1" && e.key <= "9") playCard(Number(e.key) - 1);
    if (e.key === "Enter" || e.key.toLowerCase() === "e") endTurn();
  });
  setTimeout(() => { window.__ready = true; }, 400);
});
