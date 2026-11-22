// LANTERN HEIST — guard.js
// Guard AI: patrol waypoints, get suspicious at a noise or a glimpse,
// chase when the detection meter fills, give up and walk back.
// A guard sees you only inside its vision cone with a clear line of sight.

import {
  TILE,
  GUARD_RADIUS,
  GUARD_SPEED_PATROL,
  GUARD_SPEED_SUSPICIOUS,
  GUARD_SPEED_ALERT,
  GUARD_SPEED_RETURN,
  CONE_RANGE,
  CONE_HALF,
  CONE_HALF_CLOSE,
  CONE_CLOSE_DIST,
  CAM_RANGE,
  CAM_HALF,
  CAM_DETECT_BASE,
  DETECT_BASE,
  DETECT_DECAY,
  SUSPICIOUS_AT,
  ALERT_AT,
  LIT_MULT,
  SHADOW_MULT,
  SNEAK_MULT,
  RUN_MULT,
} from './config.js';

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export class Guard {
  constructor(patrol, world, speedMult) {
    this.world = world;
    this.waypoints = patrol.waypoints.map(([x, y]) => world.tileCenter(x, y));
    this.pauseTime = patrol.pause || 1;
    this.speedMult = speedMult || 1;
    this.pos = { ...this.waypoints[0] };
    this.wpIndex = 1 % this.waypoints.length;
    this.dir = 0;
    this.state = 'patrol';
    this.waitTimer = 0;
    this.stateTimer = 0;
    this.lastSeen = null;
    this.investigateAt = null;
    this.detection = 0;
    this.lostTimer = 0;
    this.rememberTimer = 0;
  }

  // Can this guard see the player right now? Returns { seen, rate }.
  seesPlayer(player) {
    const dx = player.pos.x - this.pos.x;
    const dy = player.pos.y - this.pos.y;
    const dist = Math.hypot(dx, dy);
    if (dist > CONE_RANGE) return { seen: false, rate: 0 };
    if (this.world.inBush(player.pos.x, player.pos.y)) return { seen: false, rate: 0 };
    // Round 4: smoke veil hides you; a shadow dash slips through cones.
    if (player.inSmoke && player.inSmoke(player.pos.x, player.pos.y)) return { seen: false, rate: 0 };
    if (player.dashTimer > 0) return { seen: false, rate: 0 };
    const half = dist < CONE_CLOSE_DIST ? CONE_HALF_CLOSE : CONE_HALF;
    if (Math.abs(angleDiff(Math.atan2(dy, dx), this.dir)) > half) return { seen: false, rate: 0 };
    if (!this.world.hasLineOfSight(this.pos.x, this.pos.y, player.pos.x, player.pos.y)) {
      return { seen: false, rate: 0 };
    }
    const distFactor = 1.6 - (dist / CONE_RANGE) * 1.0;
    const lightFactor = this.world.litAt(player.pos.x, player.pos.y) ? LIT_MULT : SHADOW_MULT;
    const stanceFactor = player.sneaking ? SNEAK_MULT : player.running ? RUN_MULT : 1;
    return { seen: true, rate: DETECT_BASE * distFactor * lightFactor * stanceFactor };
  }

  hearNoise(x, y, radius) {
    if (this.state === 'alert') return;
    const d = Math.hypot(x - this.pos.x, y - this.pos.y);
    if (d > radius) return;
    this.investigateAt = { x, y };
    if (this.state !== 'suspicious') {
      this.state = 'suspicious';
      this.stateTimer = 0;
    }
  }

  update(dt, player) {
    const seen = this.seesPlayer(player);
    if (seen.seen) {
      this.detection = Math.min(ALERT_AT, this.detection + seen.rate * dt);
      this.lastSeen = { x: player.pos.x, y: player.pos.y };
      this.lostTimer = 0;
      if (this.detection >= ALERT_AT && this.state !== 'alert') {
        this.state = 'alert';
        this.stateTimer = 0;
      } else if (this.detection >= SUSPICIOUS_AT && this.state === 'patrol') {
        this.state = 'suspicious';
        this.investigateAt = { ...this.lastSeen };
        this.stateTimer = 0;
      }
    } else {
      this.detection = Math.max(0, this.detection - DETECT_DECAY * dt);
      if (this.state === 'alert') {
        this.lostTimer += dt;
        if (this.lostTimer > 3) {
          this.state = 'suspicious';
          this.investigateAt = this.lastSeen ? { ...this.lastSeen } : { ...this.pos };
          this.stateTimer = 0;
        }
      }
    }

    if (this.state === 'patrol') this.stepPatrol(dt);
    else if (this.state === 'suspicious') this.stepSuspicious(dt);
    else if (this.state === 'alert') this.stepAlert(dt, player);
    else if (this.state === 'return') this.stepReturn(dt);
  }

  stepToward(target, speed, dt) {
    const dx = target.x - this.pos.x;
    const dy = target.y - this.pos.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 2) return true;
    const step = Math.min(dist, speed * this.speedMult * dt);
    const nx = this.pos.x + (dx / dist) * step;
    const ny = this.pos.y + (dy / dist) * step;
    this.dir = Math.atan2(dy, dx);
    const moved = this.world.moveCircle(this.pos, nx - this.pos.x, ny - this.pos.y, GUARD_RADIUS);
    this.pos = moved;
    return Math.hypot(target.x - this.pos.x, target.y - this.pos.y) < 6;
  }

  stepPatrol(dt) {
    if (this.waitTimer > 0) {
      this.waitTimer -= dt;
      this.dir += Math.sin(this.waitTimer * 2.2) * dt * 0.6;
      return;
    }
    const target = this.waypoints[this.wpIndex];
    if (this.stepToward(target, GUARD_SPEED_PATROL, dt)) {
      this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
      this.waitTimer = this.pauseTime;
    }
  }

  stepSuspicious(dt) {
    this.stateTimer += dt;
    const target = this.investigateAt || this.lastSeen || this.pos;
    if (this.stepToward(target, GUARD_SPEED_SUSPICIOUS, dt)) {
      if (this.stateTimer > 2.4) {
        this.state = 'return';
        this.stateTimer = 0;
      }
    }
    if (this.stateTimer > 6) {
      this.state = 'return';
      this.stateTimer = 0;
    }
  }

  stepAlert(dt, player) {
    this.rememberTimer += dt;
    const target = this.lastSeen || player.pos;
    this.stepToward(target, GUARD_SPEED_ALERT, dt);
    if (this.rememberTimer > 0.35 && this.seesPlayer(player).seen) {
      this.lastSeen = { x: player.pos.x, y: player.pos.y };
      this.rememberTimer = 0;
    }
  }

  stepReturn(dt) {
    let best = this.waypoints[0];
    let bestD = Infinity;
    for (const wp of this.waypoints) {
      const d = Math.hypot(wp.x - this.pos.x, wp.y - this.pos.y);
      if (d < bestD) {
        bestD = d;
        best = wp;
      }
    }
    if (this.stepToward(best, GUARD_SPEED_RETURN, dt)) {
      this.wpIndex = this.waypoints.indexOf(best);
      this.state = 'patrol';
      this.waitTimer = 0.6;
    }
  }

  // Vision cone polygon (for rendering) in the guard's current colour.
  conePoints() {
    const pts = [{ x: this.pos.x, y: this.pos.y }];
    const steps = 14;
    for (let i = 0; i <= steps; i++) {
      const a = this.dir - CONE_HALF + (2 * CONE_HALF * i) / steps;
      pts.push({
        x: this.pos.x + Math.cos(a) * CONE_RANGE,
        y: this.pos.y + Math.sin(a) * CONE_RANGE,
      });
    }
    return pts;
  }
}

// Round 4 — CCTV camera: a wall/ceiling mount that sweeps a vision cone.
// It never moves, but when its cone fills it tips off the nearest guard.
export class Camera {
  constructor(def, world) {
    this.world = world;
    const c = world.tileCenter(def.x, def.y);
    this.pos = { x: c.x, y: c.y };
    this.base = def.base || 0;
    this.sweep = def.sweep || 0.9;
    this.speed = def.speed || 0.5;
    this.phase = 0;
    this.dir = this.base;
    this.detection = 0;
    this.state = 'patrol';
    this.spotted = false;
  }

  seesPlayer(player) {
    const dx = player.pos.x - this.pos.x;
    const dy = player.pos.y - this.pos.y;
    const dist = Math.hypot(dx, dy);
    if (dist > CAM_RANGE) return false;
    if (this.world.inBush(player.pos.x, player.pos.y)) return false;
    if (player.inSmoke && player.inSmoke(player.pos.x, player.pos.y)) return false;
    if (player.dashTimer > 0) return false;
    if (Math.abs(angleDiff(Math.atan2(dy, dx), this.dir)) > CAM_HALF) return false;
    return this.world.hasLineOfSight(this.pos.x, this.pos.y, player.pos.x, player.pos.y);
  }

  update(dt, player) {
    this.phase += dt * this.speed;
    this.dir = this.base + Math.sin(this.phase) * this.sweep;
    if (this.seesPlayer(player)) {
      this.detection = Math.min(ALERT_AT, this.detection + CAM_DETECT_BASE * dt);
      this.spotted = this.detection >= ALERT_AT;
      if (this.detection >= SUSPICIOUS_AT) this.state = this.spotted ? 'alert' : 'suspicious';
    } else {
      this.detection = Math.max(0, this.detection - DETECT_DECAY * dt);
      if (this.detection < SUSPICIOUS_AT) this.state = 'patrol';
      this.spotted = false;
    }
    return this.spotted;
  }

  conePoints() {
    const pts = [{ x: this.pos.x, y: this.pos.y }];
    const steps = 12;
    for (let i = 0; i <= steps; i++) {
      const a = this.dir - CAM_HALF + (2 * CAM_HALF * i) / steps;
      pts.push({
        x: this.pos.x + Math.cos(a) * CAM_RANGE,
        y: this.pos.y + Math.sin(a) * CAM_RANGE,
      });
    }
    return pts;
  }
}
