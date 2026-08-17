import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(root, '..');

// Runtime games the workbench actually opens. Everything else under games/ stays local.
export const KEEP_GAME_DIRS = new Set([
  'shared',
  'garden-defense',
  'voxel-adventure',
  'voxel-craft',
  'platform-quest',
  'wordboss'
]);

const SKIP_DIR_NAMES = new Set([
  'raw',
  'raw-v2',
  'raw-v3',
  'keyed',
  'split',
  'parts',
  'clean',
  '_backup',
  'ref',
  'visual-tests'
]);

const SKIP_RELATIVE_PREFIXES = [
  'games/blocklegend/docs',
  'games/blocklegend/tools',
  'games/blocklegend/compare-four-view.html',
  'games/blocklegend/review-roster.html',
  'games/blocklegend/preview-mobs.html',
  'assets/generated/game-asset-pipeline-smoke',
  'assets/generated/world-rebuild-20260807',
  'assets/generated/blocklegend-mobs-4view',
  'assets/generated/blocklegend-roster',
  'assets/generated/blocklegend-tools',
  'assets/generated/blocklegend-art',
  'assets/generated/blocklegend-biomes',
  'assets/generated/preschool-pvz-skills',
  'assets/generated/garden-zombie-v4',
  'assets/generated/platform-hero',
  'assets/generated/voxel-paper-mc',
  'assets/GPT生图',
  'assets/vocab/wordquest-vocab-2026.08.15'
];

const SKIP_EXTENSIONS = new Set(['.zip', '.bat', '.md']);

function keptGamePath(rel) {
  if (rel === 'games' || !rel.startsWith('games/')) return true;
  const name = rel.slice('games/'.length).split('/')[0];
  return KEEP_GAME_DIRS.has(name);
}

export function shouldCopyMobilePath(relativePath) {
  const rel = String(relativePath || '').split(path.sep).join('/');
  if (!rel || rel === '.') return true;
  if (!keptGamePath(rel)) return false;
  const parts = rel.split('/');
  if (parts.some((part) => SKIP_DIR_NAMES.has(part))) return false;
  if (SKIP_RELATIVE_PREFIXES.some((prefix) => rel === prefix || rel.startsWith(`${prefix}/`))) {
    return false;
  }
  const ext = path.extname(rel).toLowerCase();
  return !SKIP_EXTENSIONS.has(ext);
}

export async function assembleMobileDist(fromRoot = projectRoot) {
  const src = path.join(fromRoot, 'prj');
  const dest = path.join(fromRoot, 'dist');
  await fs.rm(dest, { recursive: true, force: true });
  await fs.cp(src, dest, {
    recursive: true,
    filter(source) {
      return shouldCopyMobilePath(path.relative(src, source));
    }
  });
  return dest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dest = await assembleMobileDist();
  console.log(`[prepare-mobile] copied prj/ runtime into ${dest} (skipped unused games and intermediates)`);
}
