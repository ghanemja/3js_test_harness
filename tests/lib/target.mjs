// Which game the harness tests: a local checkout of the art-heist repo.
// GAME_DIR=/path/to/art-heist, or by default a sibling folder: ../art-heist next to this repo.
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('../..', import.meta.url));
export const GAME_DIR = resolve(process.env.GAME_DIR || resolve(here, '..', 'art-heist'));
if (!existsSync(resolve(GAME_DIR, 'index.html')) || !existsSync(resolve(GAME_DIR, 'js'))) {
  console.error(`✗ no game at ${GAME_DIR} — clone ghanemja/art-heist next to this repo, or set GAME_DIR=/path/to/art-heist`);
  process.exit(2);
}
