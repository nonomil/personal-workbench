import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appPath = path.join(repoRoot, 'prj', 'app.js');
const indexPath = path.join(repoRoot, 'prj', 'preschool-workbench', 'index.html');
const sceneCssPath = path.join(repoRoot, 'prj', 'css', 'preschool', '51-learning-scene-v1.css');
const sceneCompositionCssPath = path.join(repoRoot, 'prj', 'css', 'preschool', '52-learning-scene-composition-v2.css');
const companionCssPath = path.join(repoRoot, 'prj', 'css', 'preschool', '50-learning-companion-writing.css');
const androidCssPath = path.join(repoRoot, 'prj', 'css', 'preschool', '44-child-game-world.css');

const read = (filePath) => fs.readFileSync(filePath, 'utf8');

test('gates the learning scene to the exact garden literacy today route', () => {
  const app = read(appPath);

  assert.match(app, /function isRequestedPreschoolLearningSceneV1\(\)/);
  assert.match(app, /params\.get\(['"]learning-scene['"]\)\s*===\s*['"]episode-v1['"]/);
  assert.match(app, /getPreschoolThemeId\(\)\s*===\s*['"]garden-defense['"]/);
  assert.match(app, /getPageFromHash\(\)\s*===\s*['"]courses['"]/);
  assert.match(app, /getCourseIdFromHash\(\)\s*===\s*['"]preschool-literacy['"]/);
  assert.match(app, /getCourseTabFromHash\(\)\s*===\s*['"]today['"]/);
});

test('adds the skin class only to the literacy card-wall root', () => {
  const app = read(appPath);
  const functionStart = app.indexOf('function renderPreschoolLiteracyCardWall');
  const functionEnd = app.indexOf('\n    function renderPreschoolMathOptions', functionStart);
  assert.ok(functionStart >= 0 && functionEnd > functionStart, 'literacy card-wall function must exist');
  const literacyFunction = app.slice(functionStart, functionEnd);

  assert.match(literacyFunction, /learning-scene-v1/);
  assert.match(literacyFunction, /isRequestedPreschoolLearningSceneV1\(\)/);
  assert.ok((literacyFunction.match(/learning-scene-v1/g) || []).length >= 1, 'root template must contain the gated class');
});

test('loads the isolated skin after the existing companion layer and keeps its hook', () => {
  const index = read(indexPath);
  const companionIndex = index.indexOf('50-learning-companion-writing.css');
  const sceneIndex = index.indexOf('51-learning-scene-v1.css');

  assert.ok(companionIndex >= 0, 'existing companion layer must remain');
  assert.ok(sceneIndex > companionIndex, 'scene skin must load after the companion layer');
  assert.match(index, /51-learning-scene-v1\.css\?[^"']*learning-scene-v1/);
  assert.match(index, /app\.js\?[^"']*learning-companion=writing-v1/);
});

test('loads the scene composition layer after v1 and removes the large panel shells', () => {
  const index = read(indexPath);
  assert.ok(fs.existsSync(sceneCompositionCssPath), 'scene composition layer must exist');
  const sceneIndex = index.indexOf('51-learning-scene-v1.css');
  const compositionIndex = index.indexOf('52-learning-scene-composition-v2.css');
  assert.ok(compositionIndex > sceneIndex, 'scene composition must load after v1');
  assert.match(index, /52-learning-scene-composition-v2\.css\?[^"']*scene-composition-v2/);

  const css = read(sceneCompositionCssPath);
  assert.match(css, /\.learning-scene-v1/);
  assert.match(css, /@media\s*\(min-width:\s*900px\)\s*and\s*\(min-height:\s*600px\)/);
  assert.match(css, /height:\s*min\(720px,\s*calc\(100dvh\s*-\s*158px\)\)/);
  assert.match(css, /html:not\(\.is-android-app\)/);
  assert.match(css, /preschool-literacy-handwriting[\s\S]*background:\s*transparent/);
  assert.match(css, /preschool-literacy-card-queue[\s\S]*box-shadow:\s*none/);
  assert.match(css, /preschool-learning-companion-rail[\s\S]*border:\s*0/);
  assert.match(css, /preschool-learning-companion-art[\s\S]*width:\s*88px[\s\S]*height:\s*100px/);
});

test('keeps every scene skin rule behind the root boundary and desktop guard', () => {
  const css = read(sceneCssPath);
  assert.match(css, /\.learning-scene-v1/);
  assert.match(css, /html:not\(\.is-android-app\)/);
  assert.match(css, /@media\s*\(min-width:\s*1024px\)/);
  assert.match(css, /--child-scene-image/);
  assert.match(css, /preschool-literacy-writing-surface/);
  assert.match(css, /preschool-literacy-card-queue/);
  assert.match(css, /preschool-learning-companion-rail/);
  assert.doesNotMatch(css, /@keyframes\s+learning-scene-v1/);

  const ruleFragments = css.split('}').filter((fragment) => fragment.includes('{'));
  for (const fragment of ruleFragments) {
    const selector = fragment.slice(0, fragment.lastIndexOf('{')).replace(/\/\*[\s\S]*?\*\//g, '').trim();
    if (!selector || selector.startsWith('@')) continue;
    assert.match(selector, /learning-scene-v1/, `unscoped scene rule: ${selector}`);
  }
});

test('does not widen the Android landscape layout or replace existing motion safeguards', () => {
  const sceneCss = read(sceneCssPath);
  const companionCss = read(companionCssPath);
  const androidCss = read(androidCssPath);

  assert.doesNotMatch(sceneCss, /html\.is-android-app[^{}]*learning-scene-v1/);
  assert.match(companionCss, /grid-template-rows:\s*44px\s+40px\s+minmax\(0,\s*1fr\)\s+52px/);
  assert.match(companionCss, /@keyframes\s+learning-companion-sway/);
  assert.match(companionCss, /animation-delay:\s*-1\.35s/);
  assert.match(companionCss, /preschool-no-motion/);
  assert.match(companionCss, /prefers-reduced-motion:\s*reduce/);
});

test('does not introduce a second controller, asset manifest, or storage integration', () => {
  assert.equal(fs.existsSync(path.join(repoRoot, 'prj', 'preschool-learning-scene-v1.js')), false);
  assert.equal(fs.existsSync(path.join(repoRoot, 'prj', 'assets', 'generated', 'preschool-learning-scenes-v1')), false);
  const app = read(appPath);
  assert.doesNotMatch(app, /learning-scene-v1\.js/);
  assert.doesNotMatch(app, /localStorage\.(setItem|getItem)\([^)]*learning-scene/);
});
