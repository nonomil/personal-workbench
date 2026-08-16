import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(root, '..');
const contentRoot = path.join(projectRoot, 'prj');
const outputRoot = path.join(projectRoot, 'dist');

export async function assembleMobileDist(fromRoot = projectRoot) {
  const src = path.join(fromRoot, 'prj');
  const dest = path.join(fromRoot, 'dist');
  await fs.rm(dest, { recursive: true, force: true });
  await fs.cp(src, dest, { recursive: true });
  return dest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dest = await assembleMobileDist();
  console.log(`[prepare-mobile] copied prj/ including games to ${dest}`);
}
