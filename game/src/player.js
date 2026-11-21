// LANTERN HEIST — player.js
// The lantern-thief: walk, sneak (quiet + hard to spot), run (fast + loud),
// throw a coin to pull a guard away, pick up relics and coins.

import {
  TILE,
  PLAYER_RADIUS,
  PLAYER_SPEED_WALK,
  PLAYER_SPEED_SNEAK,
  PLAYER_SPEED_RUN,
  NOISE_RUN_RADIUS,
  NOISE_COIN_RADIUS,
  NOISE_STEP_TIME,
  PICKUP_DIST,
  COIN_COUNT,
} from './config.js';

export class Player {
  constructor(world) {
    this.world = world;
    const s = world.tileCenter(world.start.x, world.start.y);
    this.pos = { x: s.x, y: s.y };
    this.facing = -Math.PI / 2;
    this.sneaking = false;
    this.running = false;
    this.moving = false;
    this.coins = COIN_COUNT;
    this.relics = 0;
    this.noiseTimer = 0;
    this.stepPhase = 0;
    this.thrownCoins = [];
  }

  reset(world) {
    this.world = world;
    const s = world.tileCenter(world.start.x, world.start.y);
    this.pos = { x: s.x, y: s.y };
    this.facing = -Math.PI / 2;
    this.sneaking = false;
    this.running = false;
    this.moving = false;
    this.coins = COIN_COUNT;
    this.relics = 0;
    this.thrownCoins = [];
  }

  update(dt, input, onNoise) {
    let dx = 0;
    let dy = 0;
    if (input.isDown('ArrowLeft') || input.isDown('KeyA')) dx -= 1;
    if (input.isDown('ArrowRight') || input.isDown('KeyD')) dx += 1;
    if (input.isDown('ArrowUp') || input.isDown('KeyW')) dy -= 1;
    if (input.isDown('ArrowDown') || input.isDown('KeyS')) dy += 1;
    this.sneaking = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
    this.running = !this.sneaking && (input.isDown('Space') || false);
    const len = Math.hypot(dx, dy);
    this.moving = len > 0;
    if (this.moving) {
      const speed = this.sneaking
        ? PLAYER_SPEED_SNEAK
        : this.running
          ? PLAYER_SPEED_RUN
          : PLAYER_SPEED_WALK;
      dx /= len;
      dy /= len;
      this.facing = Math.atan2(dy, dx);
      this.pos = this.world.moveCircle(this.pos, dx * speed * dt, dy * speed * dt, PLAYER_RADIUS);
      this.stepPhase += dt * (this.running ? 11 : this.sneaking ? 5 : 8);
      if (this.running) {
        this.noiseTimer -= dt;
        if (this.noiseTimer <= 0) {
          this.noiseTimer = NOISE_STEP_TIME;
          onNoise(this.pos.x, this.pos.y, NOISE_RUN_RADIUS);
        }
      }
    }
    // Thrown coins land and ring: guards in range come to look.
    for (const coin of this.thrownCoins) {
      if (!coin.landed) {
        coin.t += dt * 2.4;
        if (coin.t >= 1) {
          coin.landed = true;
          coin.x = coin.tx;
          coin.y = coin.ty;
          onNoise(coin.x, coin.y, NOISE_COIN_RADIUS);
        } else {
          coin.x = coin.sx + (coin.tx - coin.sx) * coin.t;
          coin.y = coin.sy + (coin.ty - coin.sy) * coin.t;
        }
      }
    }
  }

  throwCoin(tx, ty) {
    if (this.coins <= 0) return false;
    const dx = tx - this.pos.x;
    const dy = ty - this.pos.y;
    const dist = Math.hypot(dx, dy);
    const reach = Math.min(dist, 260);
    const nx = this.pos.x + (dx / (dist || 1)) * reach;
    const ny = this.pos.y + (dy / (dist || 1)) * reach;
    this.thrownCoins.push({ sx: this.pos.x, sy: this.pos.y, tx: nx, ty: ny, x: this.pos.x, y: this.pos.y, t: 0, landed: false });
    this.coins--;
    return true;
  }

  // Pick up whatever is underfoot. Returns 'relic' | 'coin' | null.
  tryPickup() {
    for (const relic of this.world.relics) {
      if (relic.taken) continue;
      const c = this.world.tileCenter(relic.x, relic.y);
      if (Math.hypot(c.x - this.pos.x, c.y - this.pos.y) < PICKUP_DIST) {
        relic.taken = true;
        this.relics++;
        return 'relic';
      }
    }
    for (const coin of this.world.coins) {
      if (coin.taken) continue;
      const c = this.world.tileCenter(coin.x, coin.y);
      if (Math.hypot(c.x - this.pos.x, c.y - this.pos.y) < PICKUP_DIST) {
        coin.taken = true;
        return 'coin';
      }
    }
    return null;
  }

  atExit() {
    const e = this.world.tileCenter(this.world.exit.x, this.world.exit.y);
    return Math.hypot(e.x - this.pos.x, e.y - this.pos.y) < TILE * 0.75;
  }
}
