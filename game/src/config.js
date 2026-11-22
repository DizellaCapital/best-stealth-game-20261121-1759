// LANTERN HEIST — config.js
// Every tunable number for the game lives here, so balancing is one file.

export const TILE = 40;
export const COLS = 32;
export const ROWS = 16;
export const HUD_H = 80;
export const VIEW_W = 1280;
export const VIEW_H = 720;
export const PLAY_W = COLS * TILE;
export const PLAY_H = ROWS * TILE;

export const PLAYER_RADIUS = 13;
export const PLAYER_SPEED_WALK = 118;
export const PLAYER_SPEED_SNEAK = 64;
export const PLAYER_SPEED_RUN = 188;
export const GUARD_RADIUS = 14;
export const GUARD_SPEED_PATROL = 54;
export const GUARD_SPEED_SUSPICIOUS = 84;
export const GUARD_SPEED_ALERT = 122;
export const GUARD_SPEED_RETURN = 72;

export const CONE_RANGE = 205;
export const CONE_HALF = 0.62;
export const CONE_HALF_CLOSE = 1.15;
export const CONE_CLOSE_DIST = 62;

export const DETECT_BASE = 58;
export const DETECT_DECAY = 26;
export const SUSPICIOUS_AT = 55;
export const ALERT_AT = 100;
export const LIT_MULT = 1.55;
export const SHADOW_MULT = 0.72;
export const SNEAK_MULT = 0.55;
export const RUN_MULT = 1.28;

export const NOISE_RUN_RADIUS = 125;
export const NOISE_COIN_RADIUS = 175;
export const NOISE_STEP_TIME = 0.42;
export const CATCH_DIST = 26;
export const PICKUP_DIST = 26;
export const LAMP_RADIUS = 105;
export const COIN_COUNT = 5;

// Round 4 gadgets: smoke veil + shadow dash.
export const SMOKE_COUNT = 4;
export const DASH_COUNT = 3;
export const SMOKE_RADIUS = 95;
export const SMOKE_DURATION = 6;
export const DASH_DURATION = 0.6;
export const DASH_SPEED = 330;

// Round 4 CCTV cameras (levels 3-4).
export const CAM_RANGE = 190;
export const CAM_HALF = 0.5;
export const CAM_DETECT_BASE = 70;

export const SCORE_RELIC = 100;
export const SCORE_COIN = 15;
export const SCORE_UNSEEN_BONUS = 150;

export const COLORS = {
  floorA: '#2b2620',
  floorB: '#272219',
  floorEdge: '#1d1813',
  wall: '#4a4238',
  wallTop: '#6b5d4c',
  wallDark: '#33291f',
  crate: '#7a5230',
  crateEdge: '#5d3c22',
  pillar: '#8a7a66',
  pillarEdge: '#5f5344',
  bush: '#2e5230',
  bushLeaf: '#3d6b3a',
  lampGlow: 'rgba(255, 196, 90, 0.20)',
  lampCore: '#ffd27a',
  relic: '#ff7a2a',
  relicGlow: 'rgba(255, 122, 42, 0.35)',
  coin: '#ffd94d',
  exitClosed: '#8a2f2f',
  exitOpen: '#37c978',
  guardBody: '#3a5a8c',
  guardHelm: '#2c456e',
  guardConePatrol: 'rgba(255, 214, 90, 0.20)',
  guardConeSuspicious: 'rgba(255, 150, 50, 0.30)',
  guardConeAlert: 'rgba(255, 60, 60, 0.32)',
  playerBody: '#1f9d8a',
  playerHood: '#157a6c',
  lanternGlow: 'rgba(255, 210, 120, 0.16)',
  smoke: 'rgba(198, 202, 214, 0.30)',
  smokeEdge: 'rgba(220, 224, 235, 0.45)',
  camCone: 'rgba(120, 180, 255, 0.22)',
  camBody: '#4a6a9c',
  camLens: '#9fd0ff',
  hudBg: '#14100c',
  hudText: '#e8dcc4',
  hudDim: '#9a8c72',
  danger: '#ff5a4d',
  warn: '#ffb347',
  ok: '#37c978',
};
