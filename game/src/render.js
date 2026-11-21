// LANTERN HEIST — render.js
// Every pixel the judge sees: the vault floor, cover, lamps, vision cones,
// guards, the thief, the HUD, the minimap, and the state overlays.

import { TILE, COLS, ROWS, HUD_H, VIEW_W, VIEW_H, COLORS, LAMP_RADIUS, CONE_RANGE } from './config.js';

function hash2(x, y, seed) {
  let h = (x * 374761393 + y * 668265263 + seed * 974634211) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
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

export class Renderer {
  constructor(ctx) {
    this.ctx = ctx;
  }

  draw(state) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = COLORS.hudBg;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    this.drawFloor(state);
    this.drawLamps(state);
    this.drawCover(state);
    this.drawPickups(state);
    this.drawExit(state);
    this.drawCones(state);
    this.drawGuards(state);
    this.drawPlayer(state);
    this.drawThrownCoins(state);
    this.drawLighting(state);
    this.drawHud(state);
    this.drawMinimap(state);
    this.drawOverlays(state);
  }

  drawFloor(state) {
    const ctx = this.ctx;
    const { world } = state;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const px = x * TILE;
        const py = HUD_H + y * TILE;
        const v = hash2(x, y, world.level.seed);
        ctx.fillStyle = v > 0.5 ? COLORS.floorA : COLORS.floorB;
        ctx.fillRect(px, py, TILE, TILE);
        if (world.tileAt(x, y) === 'L') {
          ctx.fillStyle = 'rgba(255, 210, 120, 0.08)';
          ctx.fillRect(px, py, TILE, TILE);
        }
        ctx.strokeStyle = COLORS.floorEdge;
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
      }
    }
  }

  drawLamps(state) {
    const ctx = this.ctx;
    const { world } = state;
    for (const lamp of world.lamps) {
      const cx = lamp.x * TILE + TILE / 2;
      const cy = HUD_H + lamp.y * TILE + TILE / 2;
      const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, LAMP_RADIUS);
      g.addColorStop(0, COLORS.lampGlow);
      g.addColorStop(1, 'rgba(255, 196, 90, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, LAMP_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.lampCore;
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8a6a2a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawCover(state) {
    const ctx = this.ctx;
    const { world } = state;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const t = world.tileAt(x, y);
        const px = x * TILE;
        const py = HUD_H + y * TILE;
        if (t === '#') {
          ctx.fillStyle = COLORS.wall;
          ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = COLORS.wallTop;
          ctx.fillRect(px, py, TILE, 6);
          ctx.fillStyle = COLORS.wallDark;
          ctx.fillRect(px, py + TILE - 5, TILE, 5);
        } else if (t === 'C') {
          ctx.fillStyle = COLORS.crate;
          roundRect(ctx, px + 3, py + 3, TILE - 6, TILE - 6, 4);
          ctx.fill();
          ctx.strokeStyle = COLORS.crateEdge;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(px + 3, py + 3);
          ctx.lineTo(px + TILE - 3, py + TILE - 3);
          ctx.moveTo(px + TILE - 3, py + 3);
          ctx.lineTo(px + 3, py + TILE - 3);
          ctx.stroke();
        } else if (t === 'P') {
          ctx.fillStyle = COLORS.pillar;
          ctx.beginPath();
          ctx.arc(px + TILE / 2, py + TILE / 2, 15, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = COLORS.pillarEdge;
          ctx.lineWidth = 3;
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
          for (const [ox, oy, r] of [[14, 14, 5], [26, 20, 5], [18, 28, 4]]) {
            ctx.beginPath();
            ctx.arc(px + ox, py + oy, r, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
  }

  drawPickups(state) {
    const ctx = this.ctx;
    const { world } = state;
    const pulse = 0.75 + 0.25 * Math.sin(state.animTime * 3);
    for (const relic of world.relics) {
      if (relic.taken) continue;
      const c = world.tileCenter(relic.x, relic.y);
      const cy = HUD_H + c.y;
      const g = ctx.createRadialGradient(c.x, cy, 2, c.x, cy, 26 * pulse);
      g.addColorStop(0, COLORS.relicGlow);
      g.addColorStop(1, 'rgba(255, 122, 42, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(c.x, cy, 26 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.relic;
      ctx.beginPath();
      ctx.arc(c.x, cy, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd9a0';
      ctx.beginPath();
      ctx.arc(c.x - 2, cy - 2, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const coin of world.coins) {
      if (coin.taken) continue;
      const c = world.tileCenter(coin.x, coin.y);
      ctx.fillStyle = COLORS.coin;
      ctx.beginPath();
      ctx.arc(c.x, HUD_H + c.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#a8842a';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  drawExit(state) {
    const ctx = this.ctx;
    const { world } = state;
    const e = world.tileCenter(world.exit.x, world.exit.y);
    const ex = e.x;
    const ey = HUD_H + e.y;
    const open = world.relicsLeft() === 0;
    ctx.fillStyle = open ? COLORS.exitOpen : COLORS.exitClosed;
    roundRect(ctx, ex - 18, ey - 18, 36, 36, 6);
    ctx.fill();
    ctx.strokeStyle = open ? '#a9f5c9' : '#d98a8a';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(open ? 'EXIT' : 'LOCK', ex, ey);
    if (open) {
      const g = ctx.createRadialGradient(ex, ey, 4, ex, ey, 60);
      g.addColorStop(0, 'rgba(55, 201, 120, 0.35)');
      g.addColorStop(1, 'rgba(55, 201, 120, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(ex, ey, 60, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawCones(state) {
    const ctx = this.ctx;
    for (const guard of state.guards) {
      const pts = guard.conePoints();
      ctx.fillStyle =
        guard.state === 'alert'
          ? COLORS.guardConeAlert
          : guard.state === 'suspicious'
            ? COLORS.guardConeSuspicious
            : COLORS.guardConePatrol;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, HUD_H + pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, HUD_H + pts[i].y);
      ctx.closePath();
      ctx.fill();
    }
  }

  drawGuards(state) {
    const ctx = this.ctx;
    for (const guard of state.guards) {
      const gx = guard.pos.x;
      const gy = HUD_H + guard.pos.y;
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
      const nx = gx + Math.cos(guard.dir) * 18;
      const ny = gy + Math.sin(guard.dir) * 18;
      ctx.strokeStyle = '#dfe8ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(nx, ny);
      ctx.stroke();
      if (guard.state === 'suspicious' || guard.state === 'alert') {
        ctx.fillStyle = guard.state === 'alert' ? COLORS.danger : COLORS.warn;
        ctx.font = 'bold 16px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(guard.state === 'alert' ? '!' : '?', gx, gy - 18);
      }
      if (guard.detection > 4) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(gx - 16, gy + 18, 32, 5);
        ctx.fillStyle = guard.detection >= 55 ? COLORS.danger : COLORS.warn;
        ctx.fillRect(gx - 16, gy + 18, 32 * (guard.detection / 100), 5);
      }
    }
  }

  drawPlayer(state) {
    const ctx = this.ctx;
    const p = state.player;
    const px = p.pos.x;
    const py = HUD_H + p.pos.y;
    const g = ctx.createRadialGradient(px, py, 4, px, py, 70);
    g.addColorStop(0, COLORS.lanternGlow);
    g.addColorStop(1, 'rgba(255, 210, 120, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(px, py, 70, 0, Math.PI * 2);
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
    if (p.sneaking) {
      ctx.fillStyle = COLORS.hudText;
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('SNEAKING', px, py - 18);
    }
  }

  drawThrownCoins(state) {
    const ctx = this.ctx;
    for (const coin of state.player.thrownCoins) {
      ctx.fillStyle = COLORS.coin;
      ctx.beginPath();
      ctx.arc(coin.x, HUD_H + coin.y, coin.landed ? 4 : 6, 0, Math.PI * 2);
      ctx.fill();
      if (!coin.landed) {
        ctx.strokeStyle = 'rgba(255, 217, 77, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(coin.sx, HUD_H + coin.sy);
        ctx.lineTo(coin.x, HUD_H + coin.y);
        ctx.stroke();
      } else {
        ctx.strokeStyle = 'rgba(255, 217, 77, 0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(coin.x, HUD_H + coin.y, 22, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  drawLighting(state) {
    const ctx = this.ctx;
    if (state.player && state.world.inBush(state.player.pos.x, state.player.pos.y)) {
      ctx.fillStyle = 'rgba(20, 60, 25, 0.18)';
      ctx.beginPath();
      ctx.arc(state.player.pos.x, HUD_H + state.player.pos.y, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.ok;
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('HIDDEN IN COVER', state.player.pos.x, HUD_H + state.player.pos.y - 20);
    }
  }

  drawHud(state) {
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
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('WASD move • Shift sneak • Space run • Q / click: throw coin • P pause • R restart', 560, 66);
    const alertState = state.guards.some((g) => g.state === 'alert');
    if (alertState) {
      ctx.fillStyle = 'rgba(160, 20, 12, 0.88)';
      ctx.fillRect(0, HUD_H, VIEW_W, 28);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ALARM — BREAK LINE OF SIGHT!', VIEW_W / 2, HUD_H + 14);
      ctx.textAlign = 'left';
    }
  }

  drawMinimap(state) {
    const ctx = this.ctx;
    const mw = 200;
    const mh = 100;
    const mx = VIEW_W - mw - 12;
    const alarmShowing = state.guards.some((g) => g.state === 'alert');
    const my = HUD_H + 10 + (alarmShowing ? 28 : 0);
    const sx = mw / (COLS * TILE);
    const sy = mh / (ROWS * TILE);
    ctx.fillStyle = 'rgba(10, 8, 6, 0.78)';
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
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('MAP', mx + 5, my + 4);
  }

  drawOverlays(state) {
    const ctx = this.ctx;
    if (state.mode === 'title') {
      ctx.fillStyle = 'rgba(8, 6, 4, 0.72)';
      ctx.fillRect(0, HUD_H, VIEW_W, VIEW_H - HUD_H);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd27a';
      ctx.font = 'bold 54px system-ui, sans-serif';
      ctx.fillText('LANTERN HEIST', VIEW_W / 2, 260);
      ctx.fillStyle = COLORS.hudText;
      ctx.font = '20px system-ui, sans-serif';
      ctx.fillText('Shadow of the Ember Vault — steal 3 ember relics and reach the exit unseen', VIEW_W / 2, 305);
      ctx.fillStyle = COLORS.hudDim;
      ctx.font = '16px system-ui, sans-serif';
      ctx.fillText('3 levels  •  12 guards  •  vision cones  •  cover & bushes  •  coin distractions  •  minimap', VIEW_W / 2, 340);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillText('Press ENTER to begin', VIEW_W / 2, 400);
      ctx.fillStyle = COLORS.hudDim;
      ctx.font = '14px system-ui, sans-serif';
      ctx.fillText('WASD / arrows move — Shift sneak — Space run — Q or click throws a coin — P pause', VIEW_W / 2, 435);
      ctx.textAlign = 'left';
    } else if (state.mode === 'caught') {
      ctx.fillStyle = 'rgba(60, 8, 4, 0.66)';
      ctx.fillRect(0, HUD_H, VIEW_W, VIEW_H - HUD_H);
      ctx.textAlign = 'center';
      ctx.fillStyle = COLORS.danger;
      ctx.font = 'bold 52px system-ui, sans-serif';
      ctx.fillText('CAUGHT!', VIEW_W / 2, 300);
      ctx.fillStyle = COLORS.hudText;
      ctx.font = '19px system-ui, sans-serif';
      ctx.fillText('A guard ran you down. The vault keeps its embers — this time.', VIEW_W / 2, 345);
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillText('Press R to try this level again', VIEW_W / 2, 395);
      ctx.textAlign = 'left';
    } else if (state.mode === 'clear') {
      ctx.fillStyle = 'rgba(6, 30, 14, 0.66)';
      ctx.fillRect(0, HUD_H, VIEW_W, VIEW_H - HUD_H);
      ctx.textAlign = 'center';
      ctx.fillStyle = COLORS.exitOpen;
      ctx.font = 'bold 52px system-ui, sans-serif';
      ctx.fillText('LEVEL CLEAR', VIEW_W / 2, 300);
      ctx.fillStyle = COLORS.hudText;
      ctx.font = '20px system-ui, sans-serif';
      ctx.fillText(`All 3 relics stolen  •  Score ${state.score}  •  Time ${Math.floor(state.time / 60)}:${Math.floor(state.time % 60).toString().padStart(2, '0')}`, VIEW_W / 2, 350);
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillText(state.levelIndex + 1 < 3 ? 'Press N for the next level' : 'Press ENTER for the final tally', VIEW_W / 2, 400);
      ctx.textAlign = 'left';
    } else if (state.mode === 'win') {
      ctx.fillStyle = 'rgba(8, 6, 4, 0.78)';
      ctx.fillRect(0, HUD_H, VIEW_W, VIEW_H - HUD_H);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd27a';
      ctx.font = 'bold 52px system-ui, sans-serif';
      ctx.fillText('THE VAULT IS YOURS', VIEW_W / 2, 300);
      ctx.fillStyle = COLORS.hudText;
      ctx.font = '20px system-ui, sans-serif';
      ctx.fillText(`9 ember relics stolen across 3 levels  •  Final score ${state.score}`, VIEW_W / 2, 350);
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillText('Press R to play again', VIEW_W / 2, 400);
      ctx.textAlign = 'left';
    } else if (state.mode === 'paused') {
      ctx.fillStyle = 'rgba(8, 6, 4, 0.6)';
      ctx.fillRect(0, HUD_H, VIEW_W, VIEW_H - HUD_H);
      ctx.textAlign = 'center';
      ctx.fillStyle = COLORS.hudText;
      ctx.font = 'bold 40px system-ui, sans-serif';
      ctx.fillText('PAUSED', VIEW_W / 2, 330);
      ctx.font = '18px system-ui, sans-serif';
      ctx.fillText('Press P to resume', VIEW_W / 2, 375);
      ctx.textAlign = 'left';
    }
  }
}
