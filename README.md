# THE CLOCKMAKER'S VAULT — a lantern heist in four floors

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/DizellaCapital/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/DizellaCapital/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A complete 2D top-down stealth game for the [make.fun bounty](https://make.fun/bounty/best-stealth-game-20261121-1759): **Make the best stealth game**.

You are a lantern-thief infiltrating a clockmaker's tower-vault at night. Steal all 3 ember relics on each floor and reach the exit unseen.

## The game

- **4 levels, 17 guards, 2 CCTV cameras** — The Ember Gallery, Hall of Pillars, Vault of Embers, The Clockmaker's Vault
- **Vision cones** — guards patrol learnable routes; step into a cone and the detection meter fills
- **Guard AI** — patrol / suspicious / alert chase / return, with a chance to break line of sight and recover
- **CCTV cameras** — sweeping cones that tip off the nearest guard when they spot you
- **Cover** — crates and pillars block sight, bushes hide you completely
- **Light and shadow** — lamplight makes you easier to spot; darkness is your friend
- **Noise** — running is loud; sound rings show it. Throw a coin (1/Q or click) to pull a guard away
- **3 gadgets** — coin lure (1), smoke veil (2) that blinds cones for ~6 s, shadow dash (3) for a silent burst
- **GHOST / SHADOW / DETECTED rank** — the final tally grades your whole run
- **HUD + minimap** — objective, detection meter, alert state, timer, score, live minimap
- **Synthesized sound** — footsteps, coin ring, pickup chime, alert sting (WebAudio, no files)
- **Deterministic** — seeded layouts, same seed → same level

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move |
| Shift | Sneak (slow, quiet, hard to spot) |
| Space | Run (fast, loud) |
| Q / click | Throw a coin to distract |
| P | Pause |
| R | Restart level |
| Enter | Start / next |

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network — the game is static files under `game/`.

## Hand-in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with `buildDossier` from `vendor/makefun-game.ts`.

## Screenshots

Real renders of the game's own code (`?shot=` mode, 1280×720):

1. `1-start.jpg` — level 1 overview: HUD, minimap, cones, cover, exit
2. `2-sneak.jpg` — sneaking past a guard's vision cone
3. `3-alert.jpg` — alarm moment, guard chasing
4. `4-exit.jpg` — level clear at the open vault exit

## License

MIT — see [LICENSE](LICENSE).
