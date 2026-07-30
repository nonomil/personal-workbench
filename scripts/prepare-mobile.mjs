import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(root, '..');
const outputRoot = path.join(projectRoot, 'dist');
const files = [
  'index.html',
  'launcher.js',
  'config.js',
  'icons.js',
  'child-growth.js',
  'child-courses.js',
  'storage.js',
  'family-interaction.js',
  'api-adapter.js',
  'app.js',
  'preschool-garden.js',
  'styles.css'
];
const directories = ['成人成长工作台', '儿童学习工作台', '幼儿学习工作台', 'assets'];

await fs.rm(outputRoot, { recursive: true, force: true });
await fs.mkdir(outputRoot, { recursive: true });

for (const file of files) {
  await fs.copyFile(path.join(projectRoot, file), path.join(outputRoot, file));
}
for (const directory of directories) {
  await fs.cp(path.join(projectRoot, directory), path.join(outputRoot, directory), { recursive: true });
}

console.log(`[prepare-mobile] copied ${files.length} files and ${directories.length} directories to dist/`);
