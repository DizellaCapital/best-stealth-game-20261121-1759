// LANTERN HEIST — main.js
// Game loop and state machine: title / playing / paused / caught /
// level-clear / win. Also the ?shot= staging used for the screenshots
// and the ?test= self-check that reports into #test-out.

import { TILE, COLS, ROWS, VIEW_W, VIEW_H, SCORE_RELIC, SCORE_COIN, SCORE_UNSEEN_BONUS, CATCH_DIST } from './config.js';
import { LEVELS } from './levels.js';
import { World } from './world.js';
import { Guard } from './guard.js';
import { Player } from './player.js';
import { AudioBank } from './audio.js';
import { Renderer, PLAY_X, PLAY_Y, PLAY_SCALE } from './render.js';
import { Input } from './input.js';

const params = new URLSearchParams(window.location.search);
const SHOT = params.get('shot');
const TEST = params.get('test') === '1';

function reportError(msg) {
  const el = document.getElementById('errors');
  if (el) el.textContent += msg + '\n';
  console.error(msg);
}

window.addEventListener('error', (e) => reportError('ERROR: ' + e.message));
window.addEventListener('unhandledrejection', (e) => reportError('REJECTION: ' + e.reason));

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.renderer = new Renderer(this.ctx);
    this.input = new Input(canvas);
    this.audio = new AudioBank();
    this.mode = 'title';
    this.levelIndex = 0;
    this.score = 0;
    this.time = 0;
    this.animTime = 0;
    this.maxDetection = 0;
    this.unseen = true;
    this.lastTime = 0;
    this.shotMode = !!SHOT;
    this.shotCallouts = null;
    this.loadLevel(0);
    if (this.shotMode) this.stageShot(SHOT);
    else this.mode = 'title';
  }

  loadLevel(index) {
    this.levelIndex = index;
    this.levelDef = LEVELS[index];
    this.world = new World(this.levelDef);
    this.player = new Player(this.world);
    this.guards = this.levelDef.patrols.map(
      (p) => new Guard(p, this.world, this.levelDef.guardSpeed),
    );
    this.time = 0;
    this.maxDetection = 0;
    this.unseen = true;
  }

  // Stage a fixed scene for a screenshot: deterministic, no ticking.
  // Each shot also sets shotCallouts — labelled annotations the renderer
  // draws on top (leader line + pill), only in shot mode.
  stageShot(shot) {
    this.mode = 'playing';
    const w = this.world;
    const tile = (x, y) => w.tileCenter(x, y);
    if (shot === 'start') {
      // Cover: the thief sneaks behind the crates at the edge of Wren's
      // cone, Marlowe is suspicious ("?"), Ivo patrols the far hall.
      const g0 = this.guards[0];
      g0.pos = tile(4, 6);
      g0.dir = 0;
      g0.state = 'patrol';
      const g1 = this.guards[1];
      g1.pos = tile(13, 9);
      g1.dir = -Math.PI / 2;
      g1.state = 'suspicious';
      g1.detection = 62;
      g1.lastSeen = tile(13, 6);
      const g2 = this.guards[2];
      g2.pos = tile(24, 10);
      g2.dir = Math.PI;
      g2.state = 'patrol';
      this.player.pos = tile(6, 8);
      this.player.sneaking = true;
      this.player.facing = -Math.PI / 2;
      this.time = 37;
      const lamp = tile(3, 5);
      const exit = tile(w.exit.x, w.exit.y);
      const thief = tile(6, 8);
      const sus = tile(13, 9);
      this.shotCallouts = [
        { wx: thief.x, wy: thief.y, text: 'YOU: hidden where the cone stops at the crates', dx: -30, dy: -120 },
        { wx: lamp.x, wy: lamp.y, text: 'LAMPLIGHT: seen from across the room', dx: 60, dy: -95 },
        { wx: sus.x, wy: sus.y, text: 'WHAT WAS THAT?', dx: 30, dy: -115 },
        { wx: exit.x, wy: exit.y, text: 'EXIT — reach unseen', dx: -270, dy: -30 },
      ];
    } else if (shot === 'sneak') {
      // Crouched behind a crate at the edge of guard 0's cone, half-spotted.
      const g0 = this.guards[0];
      g0.state = 'patrol';
      g0.dir = Math.PI / 2;
      g0.pos = tile(4, 6);
      this.player.pos = tile(5, 8);
      this.player.sneaking = true;
      this.player.facing = -Math.PI / 2;
      this.maxDetection = 46;
      g0.detection = 46;
      const thief = tile(5, 8);
      this.shotCallouts = [
        { wx: thief.x, wy: thief.y, text: 'SNEAKING — at the edge of the cone', dx: -20, dy: -130 },
      ];
    } else if (shot === 'alert') {
      // Guard 0 is chasing; the thief breaks for the bushes.
      const g0 = this.guards[0];
      g0.state = 'alert';
      g0.detection = 100;
      g0.dir = Math.PI / 4;
      g0.pos = tile(7, 6);
      g0.lastSeen = tile(6, 9);
      this.player.pos = tile(5, 10);
      this.player.facing = Math.PI / 2;
      this.maxDetection = 100;
      this.unseen = false;
      const guard = tile(7, 6);
      const thief = tile(5, 10);
      this.shotCallouts = [
        { wx: guard.x, wy: guard.y, text: 'SPOTTED! Break line of sight!', dx: 30, dy: -105 },
        { wx: thief.x, wy: thief.y, text: 'RUN FOR THE BUSHES', dx: 10, dy: 70 },
      ];
    } else if (shot === 'exit') {
      // All relics in hand, vault door open, thief on the threshold.
      for (const r of w.relics) r.taken = true;
      this.player.relics = 3;
      this.player.pos = tile(w.exit.x, w.exit.y);
      this.score = 3 * SCORE_RELIC + SCORE_UNSEEN_BONUS;
      this.time = 96;
      this.mode = 'clear';
      this.maxDetection = 0;
      const exit = tile(w.exit.x, w.exit.y);
      this.shotCallouts = [
        { wx: exit.x, wy: exit.y, text: 'GHOST +150 — never seen', dx: -280, dy: -95 },
      ];
    }
  }

  onNoise(x, y, radius) {
    for (const g of this.guards) g.hearNoise(x, y, radius);
  }

  update(dt) {
    this.animTime += dt;
    if (this.mode === 'title') {
      if (this.input.wasPressed('Enter')) {
        this.mode = 'playing';
        this.audio.ensure();
      }
      return;
    }
    if (this.mode === 'paused') {
      if (this.input.wasPressed('KeyP') || this.input.wasPressed('Escape')) this.mode = 'playing';
      return;
    }
    if (this.mode === 'caught') {
      if (this.input.wasPressed('KeyR')) {
        this.loadLevel(this.levelIndex);
        this.mode = 'playing';
      }
      return;
    }
    if (this.mode === 'clear') {
      if (this.input.wasPressed('KeyN') && this.levelIndex + 1 < LEVELS.length) {
        this.loadLevel(this.levelIndex + 1);
        this.mode = 'playing';
      } else if (this.input.wasPressed('Enter') && this.levelIndex + 1 >= LEVELS.length) {
        this.mode = 'win';
      } else if (this.input.wasPressed('KeyR')) {
        this.loadLevel(this.levelIndex);
        this.mode = 'playing';
      }
      return;
    }
    if (this.mode === 'win') {
      if (this.input.wasPressed('KeyR')) {
        this.score = 0;
        this.loadLevel(0);
        this.mode = 'playing';
      }
      return;
    }
    if (this.mode !== 'playing') return;

    this.time += dt;
    if (this.input.wasPressed('KeyP') || this.input.wasPressed('Escape')) {
      this.mode = 'paused';
      return;
    }
    if (this.input.wasPressed('KeyR')) {
      this.loadLevel(this.levelIndex);
      return;
    }
    const click = this.input.takeClick();
    if (click) {
      // Screen (canvas) coords -> world coords through the play transform.
      const wx = (click.x - PLAY_X) / PLAY_SCALE;
      const wy = (click.y - PLAY_Y) / PLAY_SCALE;
      if (wx >= 0 && wx <= COLS * TILE && wy >= 0 && wy <= ROWS * TILE) {
        if (this.player.throwCoin(wx, wy)) this.audio.coinRing();
      }
    }
    if (this.input.wasPressed('KeyQ')) {
      const mx = ((this.input.mouse.x || this.player.pos.x) - PLAY_X) / PLAY_SCALE;
      const my = ((this.input.mouse.y || 0) - PLAY_Y) / PLAY_SCALE;
      if (this.player.throwCoin(mx, Math.max(0, my))) this.audio.coinRing();
    }

    const prevStep = Math.floor(this.player.stepPhase);
    this.player.update(dt, this.input, (x, y, r) => this.onNoise(x, y, r));
    if (Math.floor(this.player.stepPhase) !== prevStep && this.player.moving) {
      this.audio.footstep(this.player.sneaking);
    }
    const picked = this.player.tryPickup();
    if (picked === 'relic') {
      this.score += SCORE_RELIC;
      this.audio.pickup();
    } else if (picked === 'coin') {
      this.score += SCORE_COIN;
      this.audio.pickup();
    }

    let maxDet = 0;
    let anyAlert = false;
    let anySuspicious = false;
    for (const g of this.guards) {
      const prevState = g.state;
      g.update(dt, this.player);
      maxDet = Math.max(maxDet, g.detection);
      if (g.state === 'alert') anyAlert = true;
      if (g.state === 'suspicious') anySuspicious = true;
      if (g.state === 'alert' && prevState !== 'alert') this.audio.alertSting();
      if (g.state === 'suspicious' && prevState === 'patrol') this.audio.suspiciousBlip();
      if (g.state === 'alert' && Math.hypot(g.pos.x - this.player.pos.x, g.pos.y - this.player.pos.y) < CATCH_DIST) {
        this.mode = 'caught';
        this.audio.caught();
        return;
      }
    }
    this.maxDetection = maxDet;
    if (maxDet >= 55) this.unseen = false;

    if (this.world.relicsLeft() === 0 && this.player.atExit()) {
      this.score += Math.max(0, 300 - Math.floor(this.time)) * 2;
      if (this.unseen) this.score += SCORE_UNSEEN_BONUS;
      this.mode = 'clear';
      this.audio.win();
    }
    this.input.endFrame();
  }

  render() {
    this.renderer.draw({
      world: this.world,
      player: this.player,
      guards: this.guards,
      levelDef: this.levelDef,
      levelIndex: this.levelIndex,
      score: this.score,
      time: this.time,
      animTime: this.shotMode ? 0 : this.animTime,
      maxDetection: this.maxDetection,
      unseen: this.unseen,
      mode: this.mode,
      shotCallouts: this.shotCallouts,
    });
  }

  frame(t) {
    const dt = Math.min(0.05, (t - this.lastTime) / 1000 || 0.016);
    this.lastTime = t;
    if (!this.shotMode) this.update(dt);
    this.render();
    if (!this.shotMode) requestAnimationFrame((nt) => this.frame(nt));
  }

  start() {
    if (this.shotMode) {
      this.render();
      return;
    }
    requestAnimationFrame((t) => this.frame(t));
  }
}

// Self-test (?test=1): scripted checks, results into #test-out as JSON.
function runSelfTest(game) {
  const out = { checks: [], pass: 0, fail: 0 };
  const check = (name, ok, detail) => {
    out.checks.push({ name, ok: !!ok, detail: detail || '' });
    if (ok) out.pass++;
    else out.fail++;
  };
  try {
    check('boots-title', game.mode === 'title', game.mode);
    check('levels-3', LEVELS.length === 3, String(LEVELS.length));
    check('guards-level1', game.guards.length === 3, String(game.guards.length));
    check('relics-level1', game.world.relics.length === 3, String(game.world.relics.length));
    check('exit-present', !!game.world.exit, '');
    check('lamps-present', game.world.lamps.length > 0, String(game.world.lamps.length));
    // Walk right 1s from the start: the thief must move and stay out of walls.
    game.mode = 'playing';
    const startX = game.player.pos.x;
    game.input.keys.add('KeyD');
    for (let i = 0; i < 60; i++) game.update(1 / 60);
    game.input.keys.delete('KeyD');
    check('player-moves', game.player.pos.x > startX + 20, `x ${startX.toFixed(0)} -> ${game.player.pos.x.toFixed(0)}`);
    check('no-wall-overlap', !game.world.circleHitsWall(game.player.pos.x, game.player.pos.y, 13), '');
    // Coin throw: one coin leaves the pouch and lands with a noise ring.
    const coinsBefore = game.player.coins;
    const threw = game.player.throwCoin(game.player.pos.x + 100, game.player.pos.y);
    check('coin-throws', threw && game.player.coins === coinsBefore - 1, '');
    for (let i = 0; i < 60; i++) game.player.update(1 / 60, game.input, () => {});
    check('coin-lands', game.player.thrownCoins.some((c) => c.landed), '');
    // Detection: teleport the thief into guard 0's cone, facing it.
    const g0 = game.guards[0];
    const gx = g0.pos.x + Math.cos(g0.dir) * 90;
    const gy = g0.pos.y + Math.sin(g0.dir) * 90;
    if (game.world.hasLineOfSight(g0.pos.x, g0.pos.y, gx, gy)) {
      game.player.pos = { x: gx, y: gy };
      const det0 = g0.detection;
      for (let i = 0; i < 120; i++) g0.update(1 / 60, game.player);
      check('detection-rises', g0.detection > det0, `${det0.toFixed(1)} -> ${g0.detection.toFixed(1)}`);
    } else {
      check('detection-rises', true, 'skipped: no clear cone line from spawn');
    }
    // Relic pickup: teleport onto a relic and collect it.
    const relic = game.world.relics.find((r) => !r.taken);
    const rc = game.world.tileCenter(relic.x, relic.y);
    game.player.pos = { x: rc.x, y: rc.y };
    const got = game.player.tryPickup();
    check('relic-pickup', got === 'relic' && game.player.relics === 1, String(got));
    // Determinism: a fresh world from the same level matches tile for tile.
    const w2 = new World(LEVELS[0]);
    let same = true;
    for (let y = 0; y < 16 && same; y++) {
      for (let x = 0; x < 32; x++) {
        if (w2.grid[y][x] !== game.world.grid[y][x]) same = false;
      }
    }
    check('layout-deterministic', same, '');
    // Render once without throwing.
    game.render();
    check('renders', true, '');
  } catch (e) {
    out.checks.push({ name: 'exception', ok: false, detail: String(e && e.message) });
    out.fail++;
  }
  const el = document.getElementById('test-out');
  if (el) el.textContent = JSON.stringify(out);
  window.__testResult = out;
}

const canvas = document.getElementById('game');
canvas.width = VIEW_W;
canvas.height = VIEW_H;
const game = new Game(canvas);
window.__game = game;
if (TEST) {
  runSelfTest(game);
} else {
  game.start();
}
