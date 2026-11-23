// cards.js — Ember Clash: elements, every card, and the deck.
// One job: data. The rules that use it live in game.js; the
// opponent's choices live in ai.js.

// Four elements. Each is told apart by colour AND shape AND name,
// so a card stays readable even shrunk to a thumbnail.
const ELEMENTS = {
  flame: { name: "Flame", glyph: "▲", color: "#ff6b35", dark: "#9a3412", light: "#fdba74" },
  tide: { name: "Tide", glyph: "●", color: "#38bdf8", dark: "#075985", light: "#bae6fd" },
  leaf: { name: "Leaf", glyph: "◆", color: "#4ade80", dark: "#166534", light: "#bbf7d0" },
  stone: { name: "Stone", glyph: "■", color: "#a8a29e", dark: "#44403c", light: "#e7e5e4" },
};

// A card: id, name, element, cost in energy, and its effect.
// dmg = damage to the foe, block = shield until your next turn,
// heal = HP back, draw = cards drawn, hits = how many times it lands,
// surge = bonus damage when a card of the same element was played first.
// text is the one line the card itself shows.
const CARDS = {
  "flame-lash": { name: "Flame Lash", element: "flame", cost: 2, dmg: 6, text: "Deal 6 damage." },
  "flame-burst": { name: "Flame Burst", element: "flame", cost: 3, dmg: 5, text: "Deal 5 damage." },
  "spark-surge": { name: "Spark Surge", element: "flame", cost: 2, dmg: 4, surge: 3, text: "Deal 4. +3 if a Flame card was played this turn." },
  "twin-flames": { name: "Twin Flames", element: "flame", cost: 3, dmg: 4, hits: 2, text: "Deal 4 damage, twice." },
  "ember-guard": { name: "Ember Guard", element: "flame", cost: 1, block: 5, text: "Gain 5 block." },
  "tide-cut": { name: "Tide Cut", element: "tide", cost: 1, dmg: 3, draw: 1, text: "Deal 3. Draw a card." },
  "tide-shield": { name: "Tide Shield", element: "tide", cost: 1, block: 4, draw: 1, text: "Gain 4 block. Draw a card." },
  "riptide": { name: "Riptide", element: "tide", cost: 2, dmg: 4, draw: 1, text: "Deal 4. Draw a card." },
  "thorn-whip": { name: "Thorn Whip", element: "leaf", cost: 1, dmg: 2, heal: 2, text: "Deal 2. Heal 2." },
  "mend": { name: "Mend", element: "leaf", cost: 2, heal: 6, text: "Heal 6." },
  "overgrowth": { name: "Overgrowth", element: "leaf", cost: 2, heal: 4, block: 4, text: "Heal 4. Gain 4 block." },
  "stone-slam": { name: "Stone Slam", element: "stone", cost: 3, dmg: 9, text: "Deal 9 damage." },
  "stone-wall": { name: "Stone Wall", element: "stone", cost: 2, block: 8, text: "Gain 8 block." },
  "quake": { name: "Quake", element: "stone", cost: 2, dmg: 3, block: 3, text: "Deal 3. Gain 3 block." },
  "inferno": { name: "Inferno", element: "flame", cost: 4, dmg: 12, text: "Deal 12 damage." },
  "cinder-rain": { name: "Cinder Rain", element: "flame", cost: 3, dmg: 2, hits: 3, text: "Deal 2 damage, three times." },
  "wildfire": { name: "Wildfire", element: "flame", cost: 2, dmg: 3, surge: 4, text: "Deal 3. +4 if a Flame card was played this turn." },
  "flood": { name: "Flood", element: "tide", cost: 3, dmg: 7, draw: 1, text: "Deal 7. Draw a card." },
  "mist-veil": { name: "Mist Veil", element: "tide", cost: 2, block: 6, draw: 1, text: "Gain 6 block. Draw a card." },
  "undertow": { name: "Undertow", element: "tide", cost: 2, dmg: 5, block: 2, text: "Deal 5. Gain 2 block." },
  "regrowth": { name: "Regrowth", element: "leaf", cost: 3, heal: 8, draw: 1, text: "Heal 8. Draw a card." },
  "thorn-storm": { name: "Thorn Storm", element: "leaf", cost: 2, dmg: 2, hits: 3, text: "Deal 2 damage, three times." },
  "root-snare": { name: "Root Snare", element: "leaf", cost: 1, dmg: 1, heal: 3, draw: 1, text: "Deal 1. Heal 3. Draw a card." },
  "boulder": { name: "Boulder", element: "stone", cost: 4, dmg: 13, text: "Deal 13 damage." },
  "fortress": { name: "Fortress", element: "stone", cost: 3, block: 12, text: "Gain 12 block." },
  "avalanche": { name: "Avalanche", element: "stone", cost: 3, dmg: 6, block: 4, text: "Deal 6. Gain 4 block." },
};

// How many copies of each card go into a 28-card deck (26 distinct).
const DECK_LIST = [
  ["flame-lash", 2], ["flame-burst", 1], ["spark-surge", 1],
  ["twin-flames", 1], ["ember-guard", 1], ["inferno", 1],
  ["cinder-rain", 1], ["wildfire", 1], ["tide-cut", 2],
  ["tide-shield", 1], ["riptide", 1], ["flood", 1],
  ["mist-veil", 1], ["undertow", 1], ["thorn-whip", 1],
  ["mend", 1], ["overgrowth", 1], ["regrowth", 1],
  ["thorn-storm", 1], ["root-snare", 1], ["stone-slam", 1],
  ["stone-wall", 1], ["quake", 1], ["boulder", 1],
  ["fortress", 1], ["avalanche", 1],
];

// Element Echo: playing two cards of the same element in one turn
// charges the second one — +2 to its damage, block or heal.
const ECHO_BONUS = 2;

// A shuffled 28-card deck from a random function rng() in [0, 1).
function buildDeck(rng) {
  const deck = [];
  for (const [id, count] of DECK_LIST) {
    for (let i = 0; i < count; i += 1) deck.push(id);
  }
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const t = deck[i]; deck[i] = deck[j]; deck[j] = t;
  }
  return deck;
}
