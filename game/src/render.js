// LANTERN HEIST — render.js
// Round 3 presentation rework. Everything the judge sees, drawn fresh:
// a warm-lit vault floor with carpet runners and bookshelf walls, guards
// with names and state labels, cones that change colour with suspicion,
// a side panel (guards / objectives / legend / map), a top bar with the
// detection meter, a control strip, and shot-mode callout annotations.
//
// Layout: the 1280x720 frame keeps an 80px top bar. The vault floor is
// drawn scaled into the left 1056px; the right 224px is the side panel;
// a 56px strip under the floor holds the controls. All game logic still
// works in world pixels (1280x640); this file only maps them to screen.

import { TILE, COLS, ROWS, HUD_H, VIEW_W, VIEW_H, COLORS, LAMP_RADIUS, CONE_RANGE } from './config.js';

export const PANEL_W = 224;
export const PLAY_W = VIEW_W - PANEL_W; // 1056
export const PLAY_SCALE = PLAY_W / (COLS * TILE); // 0.825
export const PLAY_X = 0;
export const PLAY_Y = HUD_H + 56; // 136
export const PLAY_H = ROWS * TILE * PLAY_SCALE; // 528
export const STRIP_Y = PLAY_Y + PLAY_H; // 664

const GUARD_NAMES = ['Wren', 'Marlowe', 'Ivo', 'Sable', 'Corvin'];

// One carpet runner per level, in tile coords (drawn under props).
const CARPETS = [
  { x0: 11, y0: 2, x1: 17, y1: 5 },
  { x0: 11, y0: 2, x1: 17, y1: 5 },
  { x0: 13, y0: 2, x1: 18, y1: 5 },
];

const BOOK_COLORS = ['#a34d3d', '#4d7aa3', '#5d8a4d', '#a3833d', '#7a5da3', '#a35d7a'];

function hash2(x, y, seed) {
  let h = (x * 374761393 + y * 668265263 + seed * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function pill(ctx, cx, y, text, font, fg, bg, border) {
  ctx.font = font;
  const w = ctx.measureText(text).width + 14;
  const h = 17;
  ctx.fillStyle = bg;
  roundRect(ctx, cx - w / 2, y, w, h, 8);
  ctx.fill();
  if (border) {
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, y + h / 2 + 0.5);
}

function stateWord(s) {
  if (s === 'patrol') return 'PATROL';
  if (s === 'suspicious') return 'SUSPICIOUS';
  if (s === 'alert') return 'ALERT!';
  return 'RETURN';
}

function stateColor(s) {
  if (s === 'alert') return COLORS.danger;
  if (s === 'suspicious') return COLORS.warn;
  if (s === 'return') return '#9fb6d8';
  return '#ffd65a';
}

function coneFill(s) {
  if (s === 'alert') return COLORS.guardConeAlert;
  if (s === 'suspicious') return COLORS.guardConeSuspicious;
  return COLORS.guardConePatrol;
}

export class Renderer {
  constructor(ctx) {
    this.ctx = ctx;
  }

  // World pixel -> screen pixel.
  sx(x) {
    return PLAY_X + x * PLAY_SCALE;
  }

  sy(y) {
    return PLAY_Y + y * PLAY_SCALE;
  }

  draw(state) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = COLORS.hudBg;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    this.drawTopBar(state);
    this.drawMissionStrip(state);
    // The vault floor, drawn in world coordinates under a scale transform.
    ctx.save();
    ctx.beginPath();
    ctx.rect(PLAY_X, PLAY_Y, PLAY_W, PLAY_H);
    ctx.clip();
    ctx.translate(PLAY_X, PLAY_Y);
    ctx.scale(PLAY_SCALE, PLAY_SCALE);
    this.drawFloor(state);
    this.drawCarpet(state);
    this.drawLampPools(state);
    this.drawCover(state);
    this.drawPickups(state);
    this.drawExit(state);
    this.drawCones(state);
    this.drawGuards(state);
    this.drawPlayer(state);
    this.drawThrownCoins(state);
    ctx.restore();
    // Screen-space layers: crisp labels, side panel, strips, overlays.
    this.drawAlarmBanner(state);
    this.drawEntityLabels(state);
    this.drawSidePanel(state);
    this.drawBottomStrip(state);
    this.drawOverlays(state);
    this.drawCallouts(state);
  }

  // ---- vault floor: checker planks, warm lit tiles, potted corners ----

  drawFloor(state) {
    const ctx = this.ctx;
    const { world } = state;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const px = x * TILE;
        const py = y * TILE;
        const v = hash2(x, y, world.level.seed);
        ctx.fillStyle = v > 0.5 ? COLORS.floorA : COLORS.floorB;
        ctx.fillRect(px, py, TILE, TILE);
        // Wooden plank seams, offset per tile so the floor reads as boards.
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const seamY = py + 12 + Math.floor(v * 16);
        ctx.moveTo(px, seamY);
        ctx.lineTo(px + TILE, seamY);
        ctx.stroke();
        ctx.strokeStyle = COLORS.floorEdge;
        ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
        if (world.tileAt(x, y) === 'L') {
          ctx.fillStyle = 'rgba(255, 210, 120, 0.10)';
          ctx.fillRect(px, py, TILE, TILE);
        }
      }
    }
  }

  drawCarpet(state) {
    const ctx = this.ctx;
    const carpet = CARPETS[state.levelIndex] || CARPETS[0];
    const x0 = carpet.x0 * TILE;
    const y0 = carpet.y0 * TILE;
    const w = (carpet.x1 - carpet.x0 + 1) * TILE;
    const h = (carpet.y1 - carpet.y0 + 1) * TILE;
    ctx.fillStyle = '#5d2320';
    ctx.fillRect(x0, y0, w, h);
    ctx.fillStyle = '#6e2b28';
    ctx.fillRect(x0 + 5, y0 + 5, w - 10, h - 10);
    ctx.strokeStyle = '#c9a24d';
    ctx.lineWidth = 2;
    ctx.strokeRect(x0 + 8.5, y0 + 8.5, w - 17, h - 17);
    // Diamond motif down the middle of the runner.
    ctx.fillStyle = 'rgba(201, 162, 77, 0.55)';
    for (let cy = y0 + TILE; cy < y0 + h - TILE / 2; cy += TILE) {
      const cx = x0 + w / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 9);
      ctx.lineTo(cx + 9, cy);
      ctx.lineTo(cx, cy + 9);
      ctx.lineTo(cx - 9, cy);
      ctx.closePath();
      ctx.fill();
    }
  }

  // ---- lamps: a warm pool on the floor, then the hanging lantern ----

  drawLampPools(state) {
    const ctx = this.ctx;
    const { world } = state;
    for (const lamp of world.lamps) {
      const cx = lamp.x * TILE + TILE / 2;
      const cy = lamp.y * TILE + TILE / 2;
      const pool = ctx.createRadialGradient(cx, cy, 8, cx, cy, LAMP_RADIUS * 1.6);
      pool.addColorStop(0, 'rgba(255, 196, 90, 0.20)');
      pool.addColorStop(0.6, 'rgba(255, 190, 90, 0.08)');
      pool.addColorStop(1, 'rgba(255, 196, 90, 0)');
      ctx.fillStyle = pool;
      ctx.beginPath();
      ctx.arc(cx, cy, LAMP_RADIUS * 1.6, 0, Math.PI * 2);
      ctx.fill();
      const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, LAMP_RADIUS);
      glow.addColorStop(0, COLORS.lampGlow);
      glow.addColorStop(1, 'rgba(255, 196, 90, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, LAMP_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      // Lantern fixture: chain, brass ring, bright core, flame.
      ctx.strokeStyle = '#6b5a34';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 18);
      ctx.lineTo(cx, cy - 9);
      ctx.stroke();
      ctx.fillStyle = '#3d2f1a';
      ctx.beginPath();
      ctx.arc(cx, cy, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#c9a24d';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = COLORS.lampCore;
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff3cf';
      ctx.beginPath();
      ctx.arc(cx - 1.5, cy - 1.5, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ---- cover: bookshelf walls, detailed crates, pillars, bushes ----

  drawCover(state) {
    const ctx = this.ctx;
    const { world } = state;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const t = world.tileAt(x, y);
        const px = x * TILE;
        const py = y * TILE;
        const v = hash2(x, y, world.level.seed);
        if (t === '#') {
          const interior = x > 0 && x < COLS - 1 && y > 0 && y < ROWS - 1;
          if (interior && v > 0.45) {
            // Bookshelf wall: dark wood + rows of coloured book spines.
            ctx.fillStyle = '#4a3220';
            ctx.fillRect(px, py, TILE, TILE);
            ctx.fillStyle = '#3a2718';
            ctx.fillRect(px, py, TILE, 4);
            ctx.fillRect(px, py + TILE - 4, TILE, 4);
            for (let row = 0; row < 2; row++) {
              const by = py + 7 + row * 14;
              let bx = px + 3;
              while (bx < px + TILE - 4) {
                const bw = 4 + Math.floor(hash2(x * 3 + row, Math.floor(bx), world.level.seed) * 5);
                ctx.fillStyle = BOOK_COLORS[Math.floor(hash2(bx, y + row, world.level.seed) * BOOK_COLORS.length)];
                ctx.fillRect(bx, by, bw, 11);
                bx += bw + 1;
              }
            }
          } else {
            ctx.fillStyle = COLORS.wall;
            ctx.fillRect(px, py, TILE, TILE);
            ctx.fillStyle = COLORS.wallTop;
            ctx.fillRect(px, py, TILE, 6);
            ctx.fillStyle = COLORS.wallDark;
            ctx.fillRect(px, py + TILE - 5, TILE, 5);
            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            ctx.fillRect(px + 6, py + 10, 4, TILE - 16);
          }
        } else if (t === 'C') {
          // Crate: planked wood, diagonal brace, iron corners, nails.
          ctx.fillStyle = COLORS.crate;
          roundRect(ctx, px + 3, py + 3, TILE - 6, TILE - 6, 4);
          ctx.fill();
          ctx.strokeStyle = COLORS.crateEdge;
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.strokeStyle = 'rgba(0,0,0,0.35)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(px + 4, py + 14);
          ctx.lineTo(px + TILE - 4, py + 14);
          ctx.moveTo(px + 4, py + 26);
          ctx.lineTo(px + TILE - 4, py + 26);
          ctx.stroke();
          ctx.strokeStyle = '#8a6a44';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(px + 5, py + 5);
          ctx.lineTo(px + TILE - 5, py + TILE - 5);
          ctx.stroke();
          ctx.fillStyle = '#2e2113';
          for (const [nx, ny] of [[8, 8], [TILE - 8, 8], [8, TILE - 8], [TILE - 8, TILE - 8]]) {
            ctx.beginPath();
            ctx.arc(px + nx, py + ny, 1.8, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (t === 'P') {
          ctx.fillStyle = COLORS.pillar;
          ctx.beginPath();
          ctx.arc(px + TILE / 2, py + TILE / 2, 15, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = COLORS.pillarEdge;
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.strokeStyle = '#c9b18a';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(px + TILE / 2, py + TILE / 2, 10, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,0.12)';
          ctx.beginPath();
          ctx.arc(px + TILE / 2 - 4, py + TILE / 2 - 4, 5, 0, Math.PI * 2);
          ctx.fill();
        } else if (t === 'B') {
          ctx.fillStyle = COLORS.bush;
          for (const [ox, oy, r] of [[10, 12, 11], [24, 10, 12], [17, 24, 12], [28, 26, 9]]) {
            ctx.beginPath();
            ctx.arc(px + ox, py + oy, r, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = COLORS.bushLeaf;
          for (const [ox, oy, r] of [[14, 14, 5], [26, 20, 5], [18, 28, 4], [30, 12, 4]]) {
            ctx.beginPath();
            ctx.arc(px + ox, py + oy, r, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = 'rgba(0,0,0,0.25)';
          ctx.beginPath();
          ctx.arc(px + 20, py + 30, 6, 0, Math.PI * 2);
          ctx.fill();
        } else if (t === '.' && v > 0.93) {
          // Potted plant in a wall corner: terracotta pot + green leaves.
          const up = world.tileAt(x, y - 1) === '#';
          const left = world.tileAt(x - 1, y) === '#';
          const right = world.tileAt(x + 1, y) === '#';
          if ((up && left) || (up && right)) {
            ctx.fillStyle = '#2e5230';
            for (const [ox, oy, r] of [[20, 12, 8], [14, 18, 6], [26, 18, 6]]) {
              ctx.beginPath();
              ctx.arc(px + ox, py + oy, r, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.fillStyle = '#8a4a2a';
            ctx.fillRect(px + 13, py + 24, 14, 10);
            ctx.fillStyle = '#6e3a20';
            ctx.fillRect(px + 11, py + 22, 18, 4);
          }
        }
      }
    }
  }

  // ---- pickups: ember relics (diamond) and coins ----

  drawPickups(state) {
    const ctx = this.ctx;
    const { world } = state;
    const pulse = 0.75 + 0.25 * Math.sin(state.animTime * 3);
    for (const relic of world.relics) {
      if (relic.taken) continue;
      const c = world.tileCenter(relic.x, relic.y);
      const g = ctx.createRadialGradient(c.x, c.y, 2, c.x, c.y, 28 * pulse);
      g.addColorStop(0, COLORS.relicGlow);
      g.addColorStop(1, 'rgba(255, 122, 42, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 28 * pulse, 0, Math.PI * 2);
      ctx.fill();
      // Ember diamond with a facet line.
      ctx.fillStyle = COLORS.relic;
      ctx.beginPath();
      ctx.moveTo(c.x, c.y - 11);
      ctx.lineTo(c.x + 8, c.y);
      ctx.lineTo(c.x, c.y + 11);
      ctx.lineTo(c.x - 8, c.y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffd9a0';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(c.x, c.y - 11);
      ctx.lineTo(c.x, c.y + 11);
      ctx.stroke();
      ctx.fillStyle = '#ffd9a0';
      ctx.beginPath();
      ctx.arc(c.x - 2, c.y - 2, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const coin of world.coins) {
      if (coin.taken) continue;
      const c = world.tileCenter(coin.x, coin.y);
      ctx.fillStyle = COLORS.coin;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#a8842a';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#fff0b0';
      ctx.beginPath();
      ctx.arc(c.x - 1.5, c.y - 1.5, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawExit(state) {
    const ctx = this.ctx;
    const { world } = state;
    const e = world.tileCenter(world.exit.x, world.exit.y);
    const open = world.relicsLeft() === 0;
    if (open) {
      const g = ctx.createRadialGradient(e.x, e.y, 4, e.x, e.y, 64);
      g.addColorStop(0, 'rgba(55, 201, 120, 0.35)');
      g.addColorStop(1, 'rgba(55, 201, 120, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 64, 0, Math.PI * 2);
      ctx.fill();
    }
    // Door frame posts.
    ctx.fillStyle = '#5a4a34';
    ctx.fillRect(e.x - 22, e.y - 20, 5, 40);
    ctx.fillRect(e.x + 17, e.y - 20, 5, 40);
    ctx.fillStyle = open ? COLORS.exitOpen : COLORS.exitClosed;
    roundRect(ctx, e.x - 18, e.y - 18, 36, 36, 6);
    ctx.fill();
    ctx.strokeStyle = open ? '#a9f5c9' : '#d98a8a';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(open ? 'EXIT' : 'LOCK', e.x, e.y);
  }

  // ---- vision cones: colour follows guard state, edge stroked ----

  drawCones(state) {
    const ctx = this.ctx;
    for (const guard of state.guards) {
      const pts = guard.conePoints();
      ctx.fillStyle = coneFill(guard.state);
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = stateColor(guard.state);
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  drawGuards(state) {
    const ctx = this.ctx;
    for (const guard of state.guards) {
      const gx = guard.pos.x;
      const gy = guard.pos.y;
      // Soft shadow under the guard.
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(gx, gy + 10, 15, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.guardBody;
      ctx.beginPath();
      ctx.arc(gx, gy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#16233a';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = COLORS.guardHelm;
      ctx.beginPath();
      ctx.arc(gx, gy - 3, 8, 0, Math.PI * 2);
      ctx.fill();
      // Facing tick + lantern glint on the helm.
      const nx = gx + Math.cos(guard.dir) * 18;
      const ny = gy + Math.sin(guard.dir) * 18;
      ctx.strokeStyle = '#dfe8ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(nx, ny);
      ctx.stroke();
      ctx.fillStyle = '#ffe9a8';
      ctx.beginPath();
      ctx.arc(gx - 3, gy - 6, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawPlayer(state) {
    const ctx = this.ctx;
    const p = state.player;
    const px = p.pos.x;
    const py = p.pos.y;
    const g = ctx.createRadialGradient(px, py, 4, px, py, 70);
    g.addColorStop(0, COLORS.lanternGlow);
    g.addColorStop(1, 'rgba(255, 210, 120, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(px, py, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(px, py + 10, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    const bob = p.moving ? Math.sin(p.stepPhase) * 1.5 : 0;
    ctx.fillStyle = COLORS.playerBody;
    ctx.beginPath();
    ctx.arc(px, py + bob, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0b3d36';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = COLORS.playerHood;
    ctx.beginPath();
    ctx.arc(px + Math.cos(p.facing) * 4, py + bob + Math.sin(p.facing) * 4 - 2, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.lampCore;
    ctx.beginPath();
    ctx.arc(px + Math.cos(p.facing) * 15, py + bob + Math.sin(p.facing) * 15, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  drawThrownCoins(state) {
    const ctx = this.ctx;
    for (const coin of state.player.thrownCoins) {
      ctx.fillStyle = COLORS.coin;
      ctx.beginPath();
      ctx.arc(coin.x, coin.y, coin.landed ? 4 : 6, 0, Math.PI * 2);
      ctx.fill();
      if (!coin.landed) {
        ctx.strokeStyle = 'rgba(255, 217, 77, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(coin.sx, coin.sy);
        ctx.lineTo(coin.x, coin.y);
        ctx.stroke();
      } else {
        ctx.strokeStyle = 'rgba(255, 217, 77, 0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, 22, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  // ---- screen-space labels: guard names + state, HIDDEN, detection ----

  drawEntityLabels(state) {
    const ctx = this.ctx;
    for (let i = 0; i < state.guards.length; i++) {
      const guard = state.guards[i];
      const gx = this.sx(guard.pos.x);
      const gy = this.sy(guard.pos.y);
      const name = GUARD_NAMES[i] || `Guard ${i + 1}`;
      pill(ctx, gx, gy - 40, name, 'bold 11px system-ui, sans-serif', '#e8dcc4', 'rgba(8, 6, 4, 0.78)', '#5a4a34');
      if (guard.state === 'suspicious' || guard.state === 'alert') {
        ctx.fillStyle = guard.state === 'alert' ? COLORS.danger : COLORS.warn;
        ctx.font = 'bold 20px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(guard.state === 'alert' ? '!' : '?', gx, gy - 46);
        pill(ctx, gx, gy - 88, stateWord(guard.state), 'bold 10px system-ui, sans-serif', '#ffffff', guard.state === 'alert' ? 'rgba(160, 20, 12, 0.9)' : 'rgba(120, 70, 10, 0.9)', null);
      }
      if (guard.detection > 4) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(gx - 16, gy + 18, 32, 5);
        ctx.fillStyle = guard.detection >= 55 ? COLORS.danger : COLORS.warn;
        ctx.fillRect(gx - 16, gy + 18, 32 * (guard.detection / 100), 5);
      }
    }
    const p = state.player;
    const px = this.sx(p.pos.x);
    const py = this.sy(p.pos.y);
    const inBush = state.world.inBush(p.pos.x, p.pos.y);
    const lit = state.world.litAt(p.pos.x, p.pos.y);
    const hidden = inBush || (p.sneaking && !lit);
    if (hidden) {
      pill(ctx, px, py - 32, inBush ? 'HIDDEN IN COVER' : 'HIDDEN', 'bold 11px system-ui, sans-serif', '#ffffff', 'rgba(20, 90, 40, 0.92)', '#37c978');
    } else if (p.sneaking) {
      pill(ctx, px, py - 32, 'SNEAKING', 'bold 11px system-ui, sans-serif', '#e8dcc4', 'rgba(8, 6, 4, 0.78)', '#5a4a34');
    }
    if (lit && !hidden) {
      pill(ctx, px, py - 32, 'IN THE LIGHT — SEEN FASTER', 'bold 10px system-ui, sans-serif', '#1a1206', 'rgba(255, 210, 120, 0.92)', '#c9a24d');
    }
  }

  // ---- top bar: title, level, relics, detection, time, ghost ----

  drawTopBar(state) {
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.hudBg;
    ctx.fillRect(0, 0, VIEW_W, HUD_H);
    ctx.strokeStyle = '#3a2f22';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, HUD_H);
    ctx.lineTo(VIEW_W, HUD_H);
    ctx.stroke();
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.hudText;
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('LANTERN HEIST', 16, 24);
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(state.levelDef.name, 16, 50);
    ctx.fillStyle = COLORS.hudText;
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(`Relics  ${state.player.relics}/3`, 330, 24);
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(`Coins  ${state.player.coins}  •  Score  ${state.score}`, 330, 50);
    const det = state.maxDetection;
    const detLabel = det >= 100 ? 'SPOTTED!' : det >= 55 ? 'SUSPICIOUS' : det > 4 ? 'GLIMPSED' : 'UNSEEN';
    const detColor = det >= 100 ? COLORS.danger : det >= 55 ? COLORS.warn : det > 4 ? '#e8d27a' : COLORS.ok;
    ctx.fillStyle = COLORS.hudText;
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText('Detection', 560, 24);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(560, 36, 180, 12);
    ctx.fillStyle = detColor;
    ctx.fillRect(560, 36, 180 * Math.min(1, det / 100), 12);
    ctx.fillStyle = detColor;
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText(detLabel, 748, 42);
    ctx.fillStyle = COLORS.hudText;
    ctx.font = 'bold 15px system-ui, sans-serif';
    const mm = Math.floor(state.time / 60);
    const ss = Math.floor(state.time % 60).toString().padStart(2, '0');
    ctx.fillText(`Time  ${mm}:${ss}`, 900, 24);
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(`Level  ${state.levelIndex + 1}/3`, 900, 50);
    ctx.textAlign = 'right';
    ctx.fillStyle = state.unseen === false ? COLORS.hudDim : '#ffd27a';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText(state.unseen === false ? 'GHOST bonus lost' : 'GHOST +150 if unseen', VIEW_W - 16, 24);
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(`${state.guards.length} guards on patrol`, VIEW_W - 16, 50);
    ctx.textAlign = 'left';
  }

  // Mission line in the strip between the top bar and the vault floor.
  drawMissionStrip(state) {
    const ctx = this.ctx;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#c9a24d';
    ctx.font = 'italic 14px system-ui, sans-serif';
    ctx.fillText(state.levelDef.sub, 16, HUD_H + 28);
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText('Objective — steal 3 ember relics, then reach the EXIT unseen', PLAY_X + PLAY_W - 16, HUD_H + 28);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  // Alarm banner: drawn AFTER the floor so it is never painted over.
  drawAlarmBanner(state) {
    const ctx = this.ctx;
    if (!state.guards.some((g) => g.state === 'alert')) return;
    ctx.fillStyle = 'rgba(160, 20, 12, 0.88)';
    ctx.fillRect(PLAY_X, PLAY_Y, PLAY_W, 28);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ALARM — BREAK LINE OF SIGHT!', PLAY_X + PLAY_W / 2, PLAY_Y + 14);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  // ---- side panel: guards, objectives, legend, map ----

  drawSidePanel(state) {
    const ctx = this.ctx;
    const px = PLAY_W;
    ctx.fillStyle = '#171208';
    ctx.fillRect(px, HUD_H, PANEL_W, VIEW_H - HUD_H);
    ctx.strokeStyle = '#c9a24d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px + 0.5, HUD_H);
    ctx.lineTo(px + 0.5, VIEW_H);
    ctx.stroke();
    ctx.strokeStyle = '#3a2f22';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px, HUD_H + 0.5);
    ctx.lineTo(VIEW_W, HUD_H + 0.5);
    ctx.stroke();

    let y = HUD_H + 14;
    const heading = (text) => {
      ctx.fillStyle = '#ffd27a';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(text, px + 12, y);
      y += 20;
    };
    const rowGap = 22;

    heading('GUARDS');
    state.guards.forEach((g, i) => {
      const name = GUARD_NAMES[i] || `Guard ${i + 1}`;
      ctx.fillStyle = stateColor(g.state);
      ctx.beginPath();
      ctx.arc(px + 18, y + 6, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.hudText;
      ctx.font = '13px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, px + 30, y + 6);
      ctx.fillStyle = stateColor(g.state);
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(stateWord(g.state), px + PANEL_W - 12, y + 6);
      ctx.textAlign = 'left';
      y += rowGap;
    });
    y += 6;

    heading('OBJECTIVES');
    ctx.font = '12px system-ui, sans-serif';
    ctx.textBaseline = 'top';
    const objLines = [
      [`Steal 3 ember relics  ${state.player.relics}/3`, state.player.relics >= 3],
      ['Reach the EXIT unseen', state.mode === 'clear' || state.mode === 'win'],
      ['GHOST +150 if unseen', state.unseen !== false],
    ];
    for (const [text, done] of objLines) {
      ctx.fillStyle = done ? COLORS.ok : COLORS.hudText;
      ctx.fillText((done ? '✓ ' : '◆ ') + text, px + 12, y);
      y += 18;
    }
    y += 6;

    heading('LEGEND');
    const legend = [
      ['#ffd65a', 'Guard + vision cone'],
      ['#ffb347', 'Suspicious — heard you'],
      ['#ff5a4d', 'Alert — chasing you'],
      ['#ffd27a', 'Lamplight — seen faster'],
      ['#7a5230', 'Crate — blocks sight'],
      ['#2e5230', 'Bush — hides you'],
      ['#ff7a2a', 'Ember relic — steal it'],
      ['#ffd94d', 'Coin — throw to distract'],
      ['#37c978', 'Exit — opens at 3 relics'],
    ];
    ctx.font = '12px system-ui, sans-serif';
    for (const [color, label] of legend) {
      ctx.fillStyle = color;
      ctx.fillRect(px + 12, y + 2, 11, 11);
      ctx.fillStyle = COLORS.hudText;
      ctx.fillText(label, px + 30, y);
      y += 18;
    }
    y += 6;

    heading('MAP — ANNEX PLAN');
    this.drawMinimap(state, px + 12, y);
  }

  drawMinimap(state, mx, my) {
    const ctx = this.ctx;
    const mw = PANEL_W - 24;
    const mh = 100;
    const sx = mw / (COLS * TILE);
    const sy = mh / (ROWS * TILE);
    ctx.fillStyle = 'rgba(10, 8, 6, 0.85)';
    roundRect(ctx, mx, my, mw, mh, 6);
    ctx.fill();
    ctx.strokeStyle = '#5a4a34';
    ctx.lineWidth = 1;
    ctx.stroke();
    const { world } = state;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const t = world.tileAt(x, y);
        if (t === '#') ctx.fillStyle = '#6b5d4c';
        else if (t === 'C' || t === 'P') ctx.fillStyle = '#8a6a44';
        else if (t === 'B') ctx.fillStyle = '#2e5230';
        else continue;
        ctx.fillRect(mx + x * TILE * sx, my + y * TILE * sy, TILE * sx + 0.5, TILE * sy + 0.5);
      }
    }
    const e = world.tileCenter(world.exit.x, world.exit.y);
    ctx.fillStyle = world.relicsLeft() === 0 ? COLORS.exitOpen : COLORS.exitClosed;
    ctx.fillRect(mx + e.x * sx - 3, my + e.y * sy - 3, 6, 6);
    for (const relic of world.relics) {
      if (relic.taken) continue;
      const c = world.tileCenter(relic.x, relic.y);
      ctx.fillStyle = COLORS.relic;
      ctx.beginPath();
      ctx.arc(mx + c.x * sx, my + c.y * sy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const guard of state.guards) {
      ctx.fillStyle = guard.state === 'alert' ? COLORS.danger : '#7fa8e8';
      ctx.beginPath();
      ctx.arc(mx + guard.pos.x * sx, my + guard.pos.y * sy, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(mx + state.player.pos.x * sx, my + state.player.pos.y * sy, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- bottom control strip ----

  drawBottomStrip(state) {
    const ctx = this.ctx;
    ctx.fillStyle = '#0f0b08';
    ctx.fillRect(PLAY_X, STRIP_Y, PLAY_W, VIEW_H - STRIP_Y);
    ctx.strokeStyle = '#3a2f22';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PLAY_X, STRIP_Y + 0.5);
    ctx.lineTo(PLAY_X + PLAY_W, STRIP_Y + 0.5);
    ctx.stroke();
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('WASD move  •  Shift sneak  •  Space run  •  Q / click: throw coin  •  P pause  •  R restart', PLAY_X + PLAY_W / 2, STRIP_Y + (VIEW_H - STRIP_Y) / 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  // ---- mode overlays, centred on the play area ----

  drawOverlays(state) {
    const ctx = this.ctx;
    const cx = PLAY_X + PLAY_W / 2;
    const overlay = (fill) => {
      ctx.fillStyle = fill;
      ctx.fillRect(PLAY_X, PLAY_Y, PLAY_W, PLAY_H);
      ctx.textAlign = 'center';
    };
    if (state.mode === 'title') {
      overlay('rgba(8, 6, 4, 0.72)');
      ctx.fillStyle = '#ffd27a';
      ctx.font = 'bold 54px system-ui, sans-serif';
      ctx.fillText('LANTERN HEIST', cx, PLAY_Y + 130);
      ctx.fillStyle = COLORS.hudText;
      ctx.font = '20px system-ui, sans-serif';
      ctx.fillText('Shadow of the Ember Vault — steal 3 ember relics and reach the exit unseen', cx, PLAY_Y + 175);
      ctx.fillStyle = COLORS.hudDim;
      ctx.font = '16px system-ui, sans-serif';
      ctx.fillText('3 levels  •  12 guards  •  vision cones  •  cover & bushes  •  coin distractions  •  minimap', cx, PLAY_Y + 210);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillText('Press ENTER to begin', cx, PLAY_Y + 270);
      ctx.fillStyle = COLORS.hudDim;
      ctx.font = '14px system-ui, sans-serif';
      ctx.fillText('WASD / arrows move — Shift sneak — Space run — Q or click throws a coin — P pause', cx, PLAY_Y + 305);
      ctx.textAlign = 'left';
    } else if (state.mode === 'caught') {
      overlay('rgba(60, 8, 4, 0.66)');
      ctx.fillStyle = COLORS.danger;
      ctx.font = 'bold 52px system-ui, sans-serif';
      ctx.fillText('CAUGHT!', cx, PLAY_Y + 170);
      ctx.fillStyle = COLORS.hudText;
      ctx.font = '19px system-ui, sans-serif';
      ctx.fillText('A guard ran you down. The vault keeps its embers — this time.', cx, PLAY_Y + 215);
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillText('Press R to try this level again', cx, PLAY_Y + 265);
      ctx.textAlign = 'left';
    } else if (state.mode === 'clear') {
      overlay('rgba(6, 30, 14, 0.66)');
      ctx.fillStyle = COLORS.exitOpen;
      ctx.font = 'bold 52px system-ui, sans-serif';
      ctx.fillText('LEVEL CLEAR', cx, PLAY_Y + 170);
      ctx.fillStyle = COLORS.hudText;
      ctx.font = '20px system-ui, sans-serif';
      ctx.fillText(`All 3 relics stolen  •  Score ${state.score}  •  Time ${Math.floor(state.time / 60)}:${Math.floor(state.time % 60).toString().padStart(2, '0')}`, cx, PLAY_Y + 220);
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillText(state.levelIndex + 1 < 3 ? 'Press N for the next level' : 'Press ENTER for the final tally', cx, PLAY_Y + 270);
      ctx.textAlign = 'left';
    } else if (state.mode === 'win') {
      overlay('rgba(8, 6, 4, 0.78)');
      ctx.fillStyle = '#ffd27a';
      ctx.font = 'bold 52px system-ui, sans-serif';
      ctx.fillText('THE VAULT IS YOURS', cx, PLAY_Y + 170);
      ctx.fillStyle = COLORS.hudText;
      ctx.font = '20px system-ui, sans-serif';
      ctx.fillText(`9 ember relics stolen across 3 levels  •  Final score ${state.score}`, cx, PLAY_Y + 220);
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillText('Press R to play again', cx, PLAY_Y + 270);
      ctx.textAlign = 'left';
    } else if (state.mode === 'paused') {
      overlay('rgba(8, 6, 4, 0.6)');
      ctx.fillStyle = COLORS.hudText;
      ctx.font = 'bold 40px system-ui, sans-serif';
      ctx.fillText('PAUSED', cx, PLAY_Y + 200);
      ctx.font = '18px system-ui, sans-serif';
      ctx.fillText('Press P to resume', cx, PLAY_Y + 245);
      ctx.textAlign = 'left';
    }
  }

  // ---- shot-mode callouts: leader line + labelled pill ----

  drawCallouts(state) {
    const callouts = state.shotCallouts || [];
    if (callouts.length === 0) return;
    const ctx = this.ctx;
    ctx.textBaseline = 'middle';
    for (const c of callouts) {
      const ax = this.sx(c.wx);
      const ay = this.sy(c.wy);
      ctx.font = 'bold 13px system-ui, sans-serif';
      const tw = ctx.measureText(c.text).width;
      const bw = tw + 20;
      const bh = 26;
      let bx = ax + (c.dx || 0) - bw / 2;
      let by = ay + (c.dy || 0) - bh / 2;
      bx = Math.max(8, Math.min(VIEW_W - bw - 8, bx));
      by = Math.max(HUD_H + 8, Math.min(VIEW_H - bh - 8, by));
      // Leader line from the anchor dot to the box.
      ctx.strokeStyle = '#ffd27a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx + bw / 2, by + bh / 2);
      ctx.stroke();
      ctx.fillStyle = '#ffd27a';
      ctx.beginPath();
      ctx.arc(ax, ay, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(10, 8, 5, 0.92)';
      roundRect(ctx, bx, by, bw, bh, 6);
      ctx.fill();
      ctx.strokeStyle = '#ffd27a';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#ffe9a8';
      ctx.textAlign = 'center';
      ctx.fillText(c.text, bx + bw / 2, by + bh / 2 + 0.5);
      ctx.textAlign = 'left';
    }
  }
}
