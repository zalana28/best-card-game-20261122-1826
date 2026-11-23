# Ember Clash — v2 notes (in-window rebuild of the v1 entry)

## What v2 changed vs v1
- **Cards: 14 → 26 distinct, deck 20 → 28.** Twelve new cards across all four
  elements, all using the engine's existing effects (damage, block, heal,
  draw, multi-hit, surge): Inferno (12), Cinder Rain (2×3), Wildfire
  (surge 4), Flood (7 + draw), Mist Veil (6 block + draw), Undertow
  (5 + 2 block), Regrowth (8 heal + draw), Thorn Storm (2×3), Root Snare
  (1 + heal 3 + draw), Boulder (13), Fortress (12 block), Avalanche
  (6 + 4 block). The big finishers (Boulder, Inferno) give a hand a real
  decision: spend 4 energy now, or Echo-chain cheaper cards instead.
- **Smarter foe.** The Cinder Warden now adapts: finisher mode (damage ×1.5)
  when the player drops to 35% HP, cautious mode (block/heal ×1.6) when it
  is hurt itself, and it plays up to 3 cards a turn, favouring the element
  of the card it already chose so its Echo fires on purpose. Its intent
  line now names the mood: "Finisher!" or "Cornered:".
- **Clearer feedback.** Turn log 4 → 6 lines, so a full exchange stays
  visible. Best score (localStorage) shows on the title screen and the
  victory screen. A soft two-note chime marks the start of your turn.
- **Screenshots re-taken** from the v2 build (title, table, win, loss).

## Playtest (headless Playwright Chromium, 1280×720)
- All four `?shot=` scenes reach their screen: title, table (turn 5),
  win (turn 13, score 69), loss (turn 6, DEFEAT).
- Zero console errors, zero page errors. AudioContext warnings only
  (autoplay policy in headless; sounds start after a user gesture).
- Fix after the first run: the loss scene's seed 5 now won in 8 turns
  (the new finishers made the guardless autopilot too strong), so the
  loss scene tries seeds in order until one loses (seed 9 loses, turn 6).
  The seed list lives in game/shots.js, so the loss screenshot is the
  same every run.
- Dossier: `main.ts` builds cleanly, dossier.json 543,080 bytes.

## Submission status
Built in-session after the competition opened; parent handles repo push,
bundle, check and submit. v1 (submission 01a20667) stands until v2
supersedes it.
