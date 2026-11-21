// LANTERN HEIST — main.ts
// Entrypoint for the make.fun bounty: copies game/ and screenshots/ into
// the output directory and writes dossier.json with buildDossier from the
// kit's vendor/makefun-game.ts. Node 22 standard library only.
//
// The grader runs this as `node /bot/main.ts` with MAKEFUN_OUTPUT_DIR=/output,
// where /output is a mount point: the directory itself must never be removed
// (removing a mount point fails with EPERM/EBUSY and exits 1), so only the
// directory's contents are cleared, one child at a time.

import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 48 * 1024 * 1024,
  game_path_max_bytes: 1000,
};

function copyTree(src: string, dest: string): void {
  if (!existsSync(src)) throw new Error(`missing input directory: ${src}`);
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
}

// Empty the output directory without removing the directory itself, so a
// mounted /output keeps working: create it when missing, replace it when it
// is a plain file, then remove each child inside it.
function clearDir(dir: string): void {
  if (existsSync(dir) && !lstatSync(dir).isDirectory()) rmSync(dir, { force: true });
  mkdirSync(dir, { recursive: true });
  for (const child of readdirSync(dir)) {
    rmSync(join(dir, child), { recursive: true, force: true });
  }
}

clearDir(outDir);
copyTree(join(here, 'game'), join(outDir, 'game'));
copyTree(join(here, 'screenshots'), join(outDir, 'screenshots'));

const dossier = buildDossier(outDir, caps);
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`LANTERN HEIST: wrote ${outDir} (dossier ${dossier.length} bytes)`);
