import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (filePath) => fs.readFileSync(filePath, 'utf8');

test('maps every themed companion to a learning destination', () => {
  const app = read(path.join(repoRoot, 'prj', 'app.js'));
  const railStart = app.indexOf('function renderPreschoolLearningCompanionRail');
  const railEnd = app.indexOf('\n    function getLiteracyWritingState', railStart);
  assert.ok(railStart >= 0 && railEnd > railStart, 'companion rail renderer must exist');
  const rail = app.slice(railStart, railEnd);
  for (const [asset, courseId] of [
    ['plant-sunflower', 'preschool-literacy'],
    ['plant-peashooter', 'preschool-pinyin'],
    ['plant-wallnut', 'preschool-math'],
    ['voxel-companion', 'preschool-literacy'],
    ['voxel-block-tree', 'preschool-pinyin'],
    ['voxel-purple-crystal', 'preschool-math'],
    ['platform-explorer', 'preschool-literacy'],
    ['platform-coin', 'preschool-pinyin'],
    ['platform-flag', 'preschool-math']
  ]) {
    assert.match(rail, new RegExp(`asset: '${asset}'[\\s\\S]{0,260}courseId: '${courseId}'`), `${asset} must route to ${courseId}`);
  }
  assert.match(rail, /data-course-id="\$\{escapeHtml\(target\.courseId/);
  assert.match(rail, /data-companion-label/);
  assert.match(rail, /去\$\{escapeHtml\(target\.label\)\}/);
});

test('rotates companion callouts and delays navigation only for motion-enabled clicks', () => {
  const app = read(path.join(repoRoot, 'prj', 'app.js'));
  assert.match(app, /function setupCompanionNavigationHints\(/);
  assert.match(app, /setInterval\([\s\S]{0,400}4000/);
  assert.match(app, /classList\.add\(['"]is-speaking['"]\)/);
  assert.match(app, /classList\.add\(['"]is-clicked['"]\)/);
  assert.match(app, /setTimeout\([\s\S]{0,500}600/);
  assert.match(app, /preschoolCompanionMotionAllowed\(\)/);
});

test('ships companion navigation motion and cache stamps for both landscape layers', () => {
  const css56 = read(path.join(repoRoot, 'prj', 'css', 'preschool', '56-phone-landscape-focus.css'));
  const css53 = read(path.join(repoRoot, 'prj', 'css', 'preschool', '53-high-resolution-landscape.css'));
  const index = read(path.join(repoRoot, 'prj', 'preschool-workbench', 'index.html'));
  for (const css of [css56, css53]) {
    assert.match(css, /preschool-learning-companion\.is-clicked/);
    assert.match(css, /preschool-learning-companion\.is-speaking/);
    assert.match(css, /@keyframes\s+preschool-companion-click/);
  }
  assert.match(index, /app\.js\?[^"']*scene-nav=v1/);
});
