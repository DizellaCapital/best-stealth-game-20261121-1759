// LANTERN HEIST — world.js
// The tile grid: what blocks movement, what blocks sight, where the
// light falls, and whether a straight line between two points is open.

import { TILE, COLS, ROWS, LAMP_RADIUS } from './config.js';

const BLOCK_MOVE = new Set(['#', 'C', 'P']);
const BLOCK_SIGHT = new Set(['#', 'C', 'P', 'B']);

export class World {
  constructor(level) {
    this.level = level;
    this.grid = level.map.map((row) => row.split(''));
    this.lamps = [];
    this.relics = [];
    this.coins = [];
    this.exit = null;
    this.start = null;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const c = this.grid[y][x];
        if (c === 'L') this.lamps.push({ x, y });
        if (c === 'R') this.relics.push({ x, y, taken: false });
        if (c === 'o') this.coins.push({ x, y, taken: false });
        if (c === 'E') this.exit = { x, y };
        if (c === 'S') this.start = { x, y };
      }
    }
  }

  tileAt(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return '#';
    return this.grid[ty][tx];
  }

  tileAtPx(px, py) {
    return this.tileAt(Math.floor(px / TILE), Math.floor(py / TILE));
  }

  blocksMove(tx, ty) {
    return BLOCK_MOVE.has(this.tileAt(tx, ty));
  }

  blocksSight(tx, ty) {
    return BLOCK_SIGHT.has(this.tileAt(tx, ty));
  }

  // Circle (px, py, r) against blocked tiles. Returns true on overlap.
  circleHitsWall(px, py, r) {
    const x0 = Math.floor((px - r) / TILE);
    const x1 = Math.floor((px + r) / TILE);
    const y0 = Math.floor((py - r) / TILE);
    const y1 = Math.floor((py + r) / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (!this.blocksMove(tx, ty)) continue;
        const cx = Math.max(tx * TILE, Math.min(px, tx * TILE + TILE));
        const cy = Math.max(ty * TILE, Math.min(py, ty * TILE + TILE));
        const dx = px - cx;
        const dy = py - cy;
        if (dx * dx + dy * dy < r * r) return true;
      }
    }
    return false;
  }

  // Move a circle axis by axis so it slides along walls instead of sticking.
  moveCircle(pos, dx, dy, r) {
    let x = pos.x + dx;
    if (this.circleHitsWall(x, pos.y, r)) x = pos.x;
    let y = pos.y + dy;
    if (this.circleHitsWall(x, y, r)) y = pos.y;
    return { x, y };
  }

  // Line of sight between two pixel points, sampled every 3 px.
  hasLineOfSight(ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(dist / 3));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (this.blocksSight(Math.floor((ax + dx * t) / TILE), Math.floor((ay + dy * t) / TILE))) {
        return false;
      }
    }
    return true;
  }

  // Is a pixel point lit by a lamp?
  litAt(px, py) {
    for (const lamp of this.lamps) {
      const lx = lamp.x * TILE + TILE / 2;
      const ly = lamp.y * TILE + TILE / 2;
      if (Math.hypot(px - lx, py - ly) < LAMP_RADIUS) return true;
    }
    return false;
  }

  // Is a pixel point inside a bush (hidden from guards)?
  inBush(px, py) {
    return this.tileAtPx(px, py) === 'B';
  }

  relicsLeft() {
    return this.relics.filter((r) => !r.taken).length;
  }

  tileCenter(tx, ty) {
    return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
  }
}
