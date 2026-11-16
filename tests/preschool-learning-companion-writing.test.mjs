import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const indexHtml = fs.readFileSync(path.join(repoRoot, 'prj', 'preschool-workbench', 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(repoRoot, 'prj', 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(repoRoot, 'prj', 'css', 'preschool', '50-learning-companion-writing.css'), 'utf8');

test('loads the learning companion and handwriting layer last', () => {
  assert.match(indexHtml, /49-reference-density-companion\.css/);
  assert.match(indexHtml, /50-learning-companion-writing\.css\?[^"']*learning-companion-writing-v1/);
  assert.match(indexHtml, /app\.js\?[^"']*learning-companion=writing-v1/);
});

test('learning routes render a themed companion rail below the content', () => {
  assert.match(app, /function renderPreschoolLearningCompanionRail\(course\)/);
  assert.match(app, /preschool-learning-companion-rail/);
  assert.match(app, /renderPreschoolCardFrame\(course, session, item, actionsMarkup\)[\s\S]*renderPreschoolLearningCompanionRail\(course\)/);
  assert.match(app, /renderPreschoolPoetryToday\(course\)[\s\S]*renderPreschoolLearningCompanionRail\(course\)/);
  assert.match(app, /renderPreschoolBrowseCards\(course\)[\s\S]*renderPreschoolLearningCompanionRail\(course\)/);
  assert.match(app, /renderPreschoolSummerToday\(course\)[\s\S]*renderPreschoolLearningCompanionRail\(course\)/);
});

test('literacy study stage exposes handwriting, stroke guides and card queue', () => {
  assert.match(app, /getStrokeData\(item\.char\)/);
  assert.match(app, /function renderLiteracyHandwritingPad\(item\)/);
  assert.match(app, /data-literacy-writing-canvas/);
  assert.match(app, /data-action="literacy-writing-undo"/);
  assert.match(app, /data-action="literacy-writing-clear"/);
  assert.match(app, /data-action="literacy-writing-done"/);
  assert.match(app, /preschool-literacy-study-grid/);
  assert.match(app, /preschool-literacy-card-queue/);
});

test('handwriting controls support pointer drawing without persistence changes', () => {
  assert.match(app, /let literacyWritingPointer = null/);
  assert.match(app, /document\.addEventListener\('pointerdown'[\s\S]*data-literacy-writing-canvas/);
  assert.match(app, /document\.addEventListener\('pointermove'[\s\S]*literacyWritingCanvasPoint/);
  assert.match(app, /document\.addEventListener\('pointerup'[\s\S]*releasePointerCapture/);
  assert.match(app, /syncLiteracyWritingCanvas\(\);/);
  assert.match(css, /touch-action:\s*none/);
});

test('companion motion is subtle, theme-specific and respects reduced motion', () => {
  for (const theme of ['garden-defense', 'voxel-adventure', 'platform-quest']) {
    assert.match(css, new RegExp(`theme-${theme}`));
  }
  assert.match(css, /@keyframes\s+learning-companion-sway/);
  assert.match(css, /translate3d\(3px, -3px, 0\).*scale\(1\.035\)/);
  assert.match(css, /body\.variant-preschool\.preschool-no-motion[\s\S]*animation:\s*none/);
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)/);
});

test('native landscape keeps the companion and writing stage inside one page', () => {
  assert.match(css, /html\.is-android-app[\s\S]*preschool-flashcard-page\.is-literacy\.is-card-wall[\s\S]*grid-template-rows:\s*44px 40px minmax\(0, 1fr\) 52px/);
  assert.match(css, /html\.is-android-app[\s\S]*preschool-literacy-study-grid[\s\S]*overflow:\s*hidden/);
  assert.match(css, /html\.is-android-app[\s\S]*preschool-learning-companion-rail[\s\S]*min-height:\s*44px/);
});
