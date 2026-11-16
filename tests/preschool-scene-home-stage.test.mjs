import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (filePath) => fs.readFileSync(filePath, 'utf8');

test('renders a landscape-only home stage with the learning companion navigation markup', () => {
  const app = read(path.join(repoRoot, 'prj', 'app.js'));
  const homeStart = app.indexOf('function renderPreschoolHomeOverview');
  const homeEnd = app.indexOf('\n    // ===================== 方块工坊', homeStart);
  assert.ok(homeStart >= 0 && homeEnd > homeStart, 'home renderer must exist');
  const home = app.slice(homeStart, homeEnd);

  assert.match(app, /function renderPreschoolHomeStage\(/);
  assert.match(home, /isPreschoolAndroidLandscape\(\)/);
  assert.match(home, /renderPreschoolHomeStage\(\)/);
  assert.match(app, /class="preschool-home-stage preschool-learning-companion-rail/);
  assert.match(app, /data-action="navigate" data-page="courses" data-course-id=/);
  assert.match(app, /data-companion-message/);
});

test('puts the stage on home-primary and keeps task and world exits on later pages', () => {
  const app = read(path.join(repoRoot, 'prj', 'app.js'));
  const pagerStart = app.indexOf('function setupAndroidLandscapePages');
  const pagerEnd = app.indexOf('\n    function render()', pagerStart);
  assert.ok(pagerStart >= 0 && pagerEnd > pagerStart, 'landscape pager setup must exist');
  const pager = app.slice(pagerStart, pagerEnd);

  assert.match(pager, /const stage = homeChildren\.find[\s\S]{0,180}preschool-home-stage/);
  assert.match(pager, /addPage\(\[header, top, stage\], '现在就做', 'home-primary'/);
  assert.match(pager, /addHomeTaskPages\(battlefield, remaining, null,/);
  assert.match(pager, /addPage\(\[world, exits\], '我的家园', 'home-world'/);
});

test('animates the scene background with transform and opacity only and honors no-motion', () => {
  const css = read(path.join(repoRoot, 'prj', 'css', 'preschool', '44-child-game-world.css'));

  assert.match(css, /@keyframes\s+child-game-scene-sun-pulse/);
  assert.match(css, /@keyframes\s+child-game-scene-cloud-drift/);
  assert.match(css, /@keyframes\s+child-game-scene-ground-breathe/);
  assert.match(css, /preschool-no-motion[\s\S]{0,500}\.child-game-scene-sun[\s\S]{0,240}animation:\s*none/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);

  const keyframes = css.match(/@keyframes[\s\S]*?\n\s*\}/g) || [];
  const sceneKeyframes = keyframes.filter((block) => /child-game-scene-(?:sun-pulse|cloud-drift|ground-breathe)/.test(block));
  assert.ok(sceneKeyframes.length >= 3, 'scene keyframes must be present');
  for (const block of sceneKeyframes) {
    assert.doesNotMatch(block, /(?:box-shadow|top|left|width|height)\s*:/, 'scene animation must not animate layout');
  }
});

test('sizes the home stage for short and high-resolution landscape viewports', () => {
  const focusCss = read(path.join(repoRoot, 'prj', 'css', 'preschool', '56-phone-landscape-focus.css'));
  const highResCss = read(path.join(repoRoot, 'prj', 'css', 'preschool', '53-high-resolution-landscape.css'));

  assert.match(focusCss, /preschool-home-stage[\s\S]{0,500}height:\s*clamp\(96px,\s*20vh,\s*110px\)/);
  assert.match(highResCss, /preschool-home-stage[\s\S]{0,500}height:\s*clamp\(120px,\s*18vh,\s*130px\)/);
});

test('appends the home-stage cache stamp without replacing existing runtime versions', () => {
  const index = read(path.join(repoRoot, 'prj', 'preschool-workbench', 'index.html'));

  assert.match(index, /app\.js\?[^"']*home-stage=v1/);
  assert.match(index, /44-child-game-world\.css\?[^"']*home-stage=v1/);
  assert.match(index, /53-high-resolution-landscape\.css\?[^"']*home-stage=v1/);
  assert.match(index, /56-phone-landscape-focus\.css\?[^"']*home-stage=v1/);
});
