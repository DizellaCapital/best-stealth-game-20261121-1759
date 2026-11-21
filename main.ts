// LANTERN HEIST — main.ts
// Entrypoint for the make.fun bounty: copies game/ and screenshots/ into
// the output directory and writes dossier.json with buildDossier from the
// kit's vendor/makefun-game.ts. Node 22 standard library only.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
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

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
copyTree(join(here, 'game'), join(outDir, 'game'));
copyTree(join(here, 'screenshots'), join(outDir, 'screenshots'));

const dossier = buildDossier(outDir, caps);
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`LANTERN HEIST: wrote ${outDir} (dossier ${dossier.length} bytes)`);
