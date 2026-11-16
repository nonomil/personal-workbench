import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appPath = path.join(repoRoot, 'prj', 'app.js');
const indexPath = path.join(repoRoot, 'prj', 'preschool-workbench', 'index.html');
const cssPath = path.join(repoRoot, 'prj', 'css', 'preschool', '56-phone-landscape-focus.css');

const read = (filePath) => fs.readFileSync(filePath, 'utf8');

test('publishes one preschool answer event with result metadata', () => {
  const app = read(appPath);

  assert.match(app, /function emitPreschoolAnswerFeedback\(/);
  assert.match(app, /new CustomEvent\(['"]preschool:answer['"]/);
  assert.match(app, /detail:\s*\{[\s\S]{0,500}correct[\s\S]{0,500}streak[\s\S]{0,500}source[\s\S]{0,500}courseId/);
  assert.match(app, /preschool:answer/);
});

test('routes real card marks through feedback but keeps the first hint tap silent', () => {
  const app = read(appPath);
  const markStart = app.indexOf('function markPreschoolFlashcard');
  const markEnd = app.indexOf('\n    function ', markStart + 1);
  assert.ok(markStart >= 0 && markEnd > markStart, 'flashcard mark function must exist');

  const markFunction = app.slice(markStart, markEnd);
  const revealAt = markFunction.indexOf('if (!known && !session.revealed[item.key])');
  const feedbackAt = markFunction.indexOf('emitPreschoolAnswerFeedback(');

  assert.ok(revealAt >= 0, 'first unknown tap must keep the reveal branch');
  assert.ok(feedbackAt > revealAt, 'feedback must happen after the reveal-only branch');
  assert.match(markFunction, /emitPreschoolAnswerFeedback\(/);
});

test('covers every answerLesson mode without replacing the existing answer branches', () => {
  const app = read(appPath);
  const answerStart = app.indexOf('function answerLesson');
  const answerEnd = app.indexOf('\n    function finishLesson', answerStart);
  assert.ok(answerStart >= 0 && answerEnd > answerStart, 'answerLesson function must exist');

  const answerFunction = app.slice(answerStart, answerEnd);
  for (const branch of ['answerAssess', 'answerLiteracyDrill', 'literacy.run', 'literacy.loop', 'bankQuiz']) {
    assert.match(answerFunction, new RegExp(branch.replace('.', '\\.')), 'missing answer branch: ' + branch);
  }
  assert.match(answerFunction, /emitPreschoolAnswerFeedback\(/);
  assert.match(answerFunction, /correct/);
});

test('renders companion feedback states with motion fallbacks', () => {
  const css = read(cssPath);

  assert.match(css, /\.preschool-learning-companion-rail\.is-cheer/);
  assert.match(css, /\.preschool-learning-companion-rail\.is-comfort/);
  assert.match(css, /\.preschool-learning-companion-rail\.is-sunrain/);
  assert.match(css, /@keyframes\s+preschool-companion/);
  assert.match(css, /preschool-no-motion[\s\S]{0,800}animation:\s*none/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});

test('keeps the compact literacy wall rows scrollable instead of overlapping card actions', () => {
  const css = read(cssPath);

  assert.match(css, /preschool-literacy-card-queue[\s\S]{0,260}preschool-literacy-card-wall[\s\S]{0,260}grid-template-rows:\s*none/);
});

test('appends the S1 cache stamp without replacing existing runtime versions', () => {
  const index = read(indexPath);

  assert.match(index, /app\.js\?[^"']*scene-fb=v1/);
  assert.match(index, /56-phone-landscape-focus\.css\?[^"']*scene-fb=v1/);
});
