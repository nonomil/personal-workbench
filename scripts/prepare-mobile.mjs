import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(root, '..');

// Runtime still copies 'games' from prj/; only drops unused intermediates.
const SKIP_DIR_NAMES = new Set([
  'raw',
  'keyed',
  'split',
  '_backup',
  'ref',
  'visual-tests'
]);

const SKIP_RELATIVE_PREFIXES = [
  'games/blocklegend/docs',
  'assets/generated/game-asset-pipeline-smoke',
  'assets/generated/world-rebuild-20260807',
  'assets/generated/blocklegend-mobs-4view',
  'assets/generated/preschool-pvz-skills',
  'assets/GPT生图'
];

const SKIP_EXTENSIONS = new Set(['.zip', '.bat', '.md']);

export function shouldCopyMobilePath(relativePath) {
  const rel = String(relativePath || '').split(path.sep).join('/');
  if (!rel || rel === '.') return true;
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
  console.log(`[prepare-mobile] copied prj/ runtime into ${dest} (skipped raw/ref/docs/zip)`);
}
