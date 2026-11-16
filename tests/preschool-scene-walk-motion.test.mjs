import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (filePath) => fs.readFileSync(filePath, 'utf8');

test('assigns walking roles only to the first and third home-stage companions', () => {
  const app = read(path.join(repoRoot, 'prj', 'app.js'));
  const stageStart = app.indexOf('function renderPreschoolHomeStage');
  const stageEnd = app.indexOf('\n    function renderPreschoolHomeHero', stageStart);
  assert.ok(stageStart >= 0 && stageEnd > stageStart, 'home stage renderer must exist');
  const stage = app.slice(stageStart, stageEnd);

  assert.match(stage, /const motionClass = index === 1 \? 'is-stage-idle' : 'is-walker'/);
  assert.match(stage, /class="preschool-learning-companion \$\{motionClass\}/);
  assert.match(stage, /data-stage-motion="\$\{motionClass\}"/);
});

test('adds zero-material home-stage walking, flipping, and click isolation', () => {
  const css56 = read(path.join(repoRoot, 'prj', 'css', 'preschool', '56-phone-landscape-focus.css'));
  const css53 = read(path.join(repoRoot, 'prj', 'css', 'preschool', '53-high-resolution-landscape.css'));

  for (const css of [css56, css53]) {
    assert.match(css, /preschool-home-stage-characters[\s\S]{0,500}preschool-learning-companion\.is-walker/);
    assert.match(css, /animation:\s*preschool-stage-walk/);
    assert.match(css, /@keyframes\s+preschool-stage-walk/);
    assert.match(css, /transform:\s*translateX/);
    assert.match(css, /preschool-learning-companion\.is-walker\.is-flipped[\s\S]{0,260}transform:\s*scaleX\(-1\)/);
    assert.match(css, /preschool-learning-companion\.is-walker\.is-clicked[\s\S]{0,260}animation-play-state:\s*paused/);
    assert.match(css, /@keyframes\s+preschool-stage-bob/);
    assert.match(css, /preschool-no-motion[\s\S]{0,700}preschool-home-stage-characters[\s\S]{0,320}is-walker[\s\S]{0,160}animation:\s*none/);
    assert.match(css, /prefers-reduced-motion:\s*reduce/);
  }
});

test('flips a walker only at its CSS walk iteration and respects motion preferences', () => {
  const app = read(path.join(repoRoot, 'prj', 'app.js'));

  assert.match(app, /function setupPreschoolHomeStageMotion\(/);
  assert.match(app, /event\.animationName\s*!==\s*['"]preschool-stage-walk['"]/);
  assert.match(app, /classList\.toggle\(['"]is-flipped['"]\)/);
  assert.match(app, /preschoolCompanionMotionAllowed\(\)/);
  assert.match(app, /setupPreschoolHomeStageMotion\(\)/);
});

test('appends the walk cache stamp without replacing prior versions', () => {
  const index = read(path.join(repoRoot, 'prj', 'preschool-workbench', 'index.html'));

  assert.match(index, /app\.js\?[^"']*scene-walk=v1/);
  assert.match(index, /53-high-resolution-landscape\.css\?[^"']*scene-walk=v1/);
  assert.match(index, /56-phone-landscape-focus\.css\?[^"']*scene-walk=v1/);
});
