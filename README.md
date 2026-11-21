# LANTERN HEIST — Shadow of the Ember Vault

[![make.fun](https://make.fun/bounty/best-stealth-game-20261121-1759/badge.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![make.fun entry](https://make.fun/bounty/best-stealth-game-20261121-1759/entry.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A complete 2D top-down stealth game for the [make.fun bounty](https://make.fun/bounty/best-stealth-game-20261121-1759): **Make the best stealth game**.

You are a lantern-thief infiltrating a vault-museum at night. Steal all 3 ember relics on each floor and reach the exit unseen.

## The game

- **3 levels, 12 guards** — The Ember Gallery, Hall of Pillars, Vault of Embers
- **Vision cones** — guards patrol learnable routes; step into a cone and the detection meter fills
- **Guard AI** — patrol / suspicious / alert chase / return, with a chance to break line of sight and recover
- **Cover** — crates and pillars block sight, bushes hide you completely
- **Light and shadow** — lamplight makes you easier to spot; darkness is your friend
- **Noise** — running is loud; throw a coin (Q or click) to pull a guard away
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
