// LANTERN HEIST — levels.js
// Three hand-designed vault floors. Legend:
//   # wall   . floor   C crate (blocks sight + movement)
//   P pillar (blocks sight + movement)   B bush (blocks sight, hides you)
//   L lamp floor (lit, riskier)   R ember relic   o coin
//   E exit   S player start   + doorway floor
// Guard patrols are tile waypoints; the map itself never holds guards,
// so a patrol can never be drawn onto a wall by mistake.

export const LEVELS = [
  {
    name: 'Level 1 — The Ember Gallery',
    sub: 'Learn the patrols. 3 relics, 3 guards.',
    seed: 101,
    guardSpeed: 1.0,
    map: [
      '################################',
      '#S...L......C...........R......#',
      '#..........#.......#...........#',
      '#..C.......#...B...#......E....#',
      '#..........#.......#...........#',
      '#..L....P..#.......#..C........#',
      '#..........#.......#...........#',
      '#.....C..........C.......L.....#',
      '#..........#.......#...........#',
      '#..B....R..#...P...#....C......#',
      '#..........#.......#...........#',
      '#......C...#.......#..B........#',
      '#..........#..L....#...........#',
      '#...o......#.......#.....o.....#',
      '#..........#.......#.....R.....#',
      '################################',
    ],
    patrols: [
      { waypoints: [[4, 2], [4, 13]], pause: 1.2 },
      { waypoints: [[13, 2], [13, 13]], pause: 1.0 },
      { waypoints: [[21, 10], [29, 10]], pause: 1.4 },
    ],
  },
  {
    name: 'Level 2 — Hall of Pillars',
    sub: 'Four guards, tighter cover. 3 relics, 4 guards.',
    seed: 202,
    guardSpeed: 1.12,
    map: [
      '################################',
      '#R......C......L......C........#',
      '#..............................#',
      '#..P.......#.......#.......P...#',
      '#..........#..B....#...........#',
      '#..C.......#.......#....C......#',
      '#..........+......+............#',
      '#.....L....#.......#.....R.....#',
      '#..........#.......#...........#',
      '#..B....C..#..P....#..L....C...#',
      '#..........#.......#...........#',
      '#......P...#.......#......P....#',
      '#..........+......+............#',
      '#..o.......#..C....#.....o.....#',
      '#......R...#.......#..E....S...#',
      '################################',
    ],
    patrols: [
      { waypoints: [[2, 2], [9, 2]], pause: 1.0 },
      { waypoints: [[15, 3], [15, 11]], pause: 1.2 },
      { waypoints: [[21, 7], [29, 7]], pause: 0.9 },
      { waypoints: [[5, 8], [5, 13]], pause: 1.3 },
    ],
  },
  {
    name: 'Level 3 — Vault of Embers',
    sub: 'The vault itself. 3 relics, 5 guards.',
    seed: 303,
    guardSpeed: 1.25,
    map: [
      '################################',
      '#..R....C....#....L....#C..R...#',
      '#...........#..........#.......#',
      '#..P....B...#....P.....#..C....#',
      '#...........#..........#.......#',
      '#....C......#....C.....#.......#',
      '#...........#..........#.......#',
      '#..L....+...#....B.....#+...L..#',
      '#...........#..........#.......#',
      '#....P......#....P.....#..B....#',
      '#...........#..........#.......#',
      '#..C....B...#....C.....#.......#',
      '#...........#..........#.......#',
      '#....o......#....o.....#..o....#',
      '#S..........#....R.....#..E....#',
      '################################',
    ],
    patrols: [
      { waypoints: [[7, 2], [7, 12]], pause: 1.0 },
      { waypoints: [[16, 2], [16, 12]], pause: 1.1 },
      { waypoints: [[28, 2], [28, 12]], pause: 0.9 },
      { waypoints: [[2, 10], [11, 10]], pause: 1.2 },
      { waypoints: [[15, 4], [21, 4]], pause: 1.0 },
    ],
    cameras: [
      { x: 16, y: 1, base: 0.6, sweep: 0.9, speed: 0.5 },
      { x: 24, y: 13, base: 2.2, sweep: 0.8, speed: 0.45 },
    ],
  },
  {
    name: "Level 4 — The Clockmaker's Vault",
    sub: 'The tower top. 3 relics, 5 guards, 2 cameras.',
    seed: 404,
    guardSpeed: 1.38,
    map: [
      '################################',
      '#S..L....C..........R..........#',
      '#..........#.......#...........#',
      '#..C.......#...B...#.....C.....#',
      '#..........#.......#...........#',
      '#..L....P..#...R...#..L........#',
      '#..........#.......#...........#',
      '#.....C..........C.......L.....#',
      '#..........#.......#...........#',
      '#..B....R..#...P...#....C......#',
      '#..........#.......#...........#',
      '#......C...#.......#..B........#',
      '#..........#..L....#...........#',
      '#...o......#.......#.....o.....#',
      '#..........#.......#.....E.....#',
      '################################',
    ],
    patrols: [
      { waypoints: [[4, 2], [4, 13]], pause: 1.0 },
      { waypoints: [[13, 2], [13, 13]], pause: 1.1 },
      { waypoints: [[21, 10], [29, 10]], pause: 0.9 },
      { waypoints: [[2, 8], [10, 8]], pause: 1.2 },
      { waypoints: [[24, 4], [24, 12]], pause: 1.0 },
    ],
    cameras: [
      { x: 16, y: 1, base: 0.5, sweep: 0.9, speed: 0.5 },
      { x: 8, y: 14, base: -1.2, sweep: 0.8, speed: 0.4 },
    ],
  },
];

// Validate a level map: every row COLS wide, exactly 3 relics, one exit,
// one start, and every patrol waypoint on a walkable tile.
export function validateLevel(level, cols, rows) {
  const problems = [];
  if (level.map.length !== rows) problems.push(`rows ${level.map.length} != ${rows}`);
  let relics = 0;
  let exits = 0;
  let starts = 0;
  level.map.forEach((row, y) => {
    if (row.length !== cols) problems.push(`row ${y} length ${row.length} != ${cols}`);
    for (let x = 0; x < row.length; x++) {
      if (row[x] === 'R') relics++;
      if (row[x] === 'E') exits++;
      if (row[x] === 'S') starts++;
    }
  });
  if (relics !== 3) problems.push(`relics ${relics} != 3`);
  if (exits !== 1) problems.push(`exits ${exits} != 1`);
  if (starts !== 1) problems.push(`starts ${starts} != 1`);
  const walkable = (x, y) => {
    const c = level.map[y] && level.map[y][x];
    return c !== undefined && c !== '#' && c !== 'C' && c !== 'P';
  };
  level.patrols.forEach((p, i) => {
    p.waypoints.forEach(([x, y]) => {
      if (!walkable(x, y)) problems.push(`patrol ${i} waypoint (${x},${y}) on '${level.map[y][x]}'`);
    });
  });
  return problems;
}
