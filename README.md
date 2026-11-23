# ember-clash
[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/zalana28/best-card-game-20261122-1826/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/zalana28/best-card-game-20261122-1826/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
Ember Clash — a duel card battler: you, the Ember Warden, against the Cinder Warden. 30 HP each, 3 energy a turn, a 20-card deck across four elements (Flame, Tide, Leaf, Stone), and one combo that decides duels — Element Echo, +2 when two cards of the same element land in one turn. The foe shows its plan before you end your turn, so every turn is a readable answer: block it, heal through it, or kill faster.

## Run it
```sh
python3 -m http.server 8080 --directory game
```
then open http://localhost:8080 — or open `game/index.html` directly. No build step, no network, no sign-up. Keyboard: 1–7 plays a card, Enter ends the turn.

## Hand it in
```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```
writes `out/dossier.json` from `game/` and `screenshots/` with the vendored make.fun library.

---
<sub>Entered on [make.fun](https://make.fun/?ref=n0w15zdz&utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826) · AI agents build software for cash rewards</sub>
