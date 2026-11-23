// ai.js — Ember Clash: the Cinder Warden's brain.
// One job: pick what the opponent does, and say what it plans, so the
// player can read the intent and answer it before the turn ends.

// Score one card for the side playing it. Damage counts most, more
// when it would finish the foe; block counts most when the foe hits
// hard; healing counts most when hurt; drawing is always a little good.
function scoreCard(card, energy, self, foe, threat) {
  if (card.cost > energy) return -1;
  let score = 0;
  if (card.dmg) {
    score += card.dmg * (card.hits || 1);
    if (foe.hp - card.dmg * (card.hits || 1) <= 0) score += 10;
  }
  if (card.block) score += card.block * (threat >= 6 ? 1.1 : 0.6);
  if (card.heal) score += card.heal * (self.hp <= self.maxHp * 0.5 ? 1.2 : 0.5);
  if (card.draw) score += 1.5;
  if (card.surge) score += 1;
  return score / card.cost;
}

// Pick the best affordable card from a hand, or null when nothing
// is worth playing. opts.aggression lifts damage, opts.caution lifts
// block and healing; the autopilot reuses this with its own settings.
function pickBestCard(hand, energy, self, foe, threat, opts) {
  const o = opts || {};
  let best = null;
  let bestScore = 0.5;
  for (const id of hand) {
    const card = CARDS[id];
    let score = scoreCard(card, energy, self, foe, threat);
    if (score < 0) continue;
    if (card.dmg) score *= (o.aggression || 1);
    if (card.block || card.heal) score *= (o.caution || 1);
    if (score > bestScore) { bestScore = score; best = id; }
  }
  return best;
}

// Plan the opponent's whole turn: up to two cards, chosen greedily,
// and the intent line the table shows the player in advance.
function planOpponentTurn(foe, player, rng) {
  const threat = player.hand.reduce((n, id) => n + (CARDS[id].dmg || 0), 0);
  const plays = [];
  let energy = 3;
  const hand = foe.hand.slice();
  for (let i = 0; i < 2; i += 1) {
    const id = pickBestCard(hand, energy, foe, player, threat, { aggression: 1, caution: 1 });
    if (!id) break;
    plays.push(id);
    hand.splice(hand.indexOf(id), 1);
    energy -= CARDS[id].cost;
  }
  const parts = [];
  let dmg = 0, block = 0, heal = 0;
  for (const id of plays) {
    const c = CARDS[id];
    dmg += (c.dmg || 0) * (c.hits || 1);
    block += c.block || 0;
    heal += c.heal || 0;
  }
  if (dmg > 0) parts.push("Strike " + dmg);
  if (block > 0) parts.push("Guard " + block);
  if (heal > 0) parts.push("Mend " + heal);
  return {
    plays,
    intent: parts.length ? parts.join(" · ") : "Gathers embers…",
    totalDamage: dmg,
  };
}
