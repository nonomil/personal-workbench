import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const prjRoot = path.join(repoRoot, 'prj');
const app = fs.readFileSync(path.join(prjRoot, 'app.js'), 'utf8');
const shell = fs.readFileSync(path.join(prjRoot, 'preschool-workbench', 'index.html'), 'utf8');
const sceneCss = fs.readFileSync(path.join(prjRoot, 'css', 'preschool', '56-phone-landscape-focus.css'), 'utf8');

function sourceBetween(source, startText, endText) {
  const start = source.indexOf(startText);
  assert.ok(start >= 0, `missing source boundary: ${startText}`);
  const end = source.indexOf(endText, start + startText.length);
  assert.ok(end > start, `missing source boundary: ${endText}`);
  return source.slice(start, end);
}

test('S1 zombie rail derives review progress from the card session', () => {
  const rail = sourceBetween(app, 'function renderPreschoolSceneZombieRail', 'function getLiteracyWritingState');
  assert.match(rail, /renderPreschoolSceneZombieRail\(course, session\)/);
  // 复习卡驱动数量与击退数
  assert.match(rail, /item && item\.review/);
  assert.match(rail, /marks\[item\.key\] === 'known'/);
  assert.match(rail, /is-defeated/);
  // 无复习卡的场次退化为 3 只装饰
  assert.match(rail, /Math\.min\(3, /);
});

test('S1 known review card defeats a zombie and clears award scene-clear sun once', () => {
  const markBranch = sourceBetween(app, "if (action === 'flashcard-mark') {", 'if (action === \'flashcard-prev\')');
  assert.match(markBranch, /markItem\.review/);
  assert.match(markBranch, /firePreschoolScenePea\(true\)/);
  assert.match(markBranch, /scenePeaCharge = \(ui\.scenePeaCharge \|\| 0\) \+ 1/);
  assert.match(markBranch, /ui\.scenePeaCharge >= 3/);
  assert.match(markBranch, /suppressSceneCelebration = true/);
  assert.match(markBranch, /scene-clear:/);
  assert.match(markBranch, /awardSunlight\(next, clearAwardId, 5\)/);
  // 不会不击退不扣
  assert.doesNotMatch(markBranch, /known === '0'[\s\S]{0,200}defeat/i);
});

test('S1 defeated zombie falls and stays down in scene css', () => {
  assert.match(sceneCss, /\.preschool-scene-zombie\.is-defeated/);
  assert.match(sceneCss, /preschool-zombie-defeat/);
});

test('S2 home renders a daily sun goal banner derived from literacy mastery dates', () => {
  assert.match(app, /function todayLiteracyKnownCount\(/);
  assert.match(app, /dates\.indexOf\(today\)/);
  assert.match(app, /renderPreschoolTodaySunGoal/);
  assert.match(app, /今日目标完成/);
  assert.match(app, /data-page="battle"/);
});

test('S3 mistake invasion activates garden invader and clears once per day', () => {
  assert.match(app, /function syncPreschoolMistakeInvasion\(/);
  assert.match(app, /buildMistakeReviewQueue/);
  assert.match(app, /mistake-invasion:/);
  assert.match(app, /mistake-clear:/);
  assert.match(app, /awardSunlight\((?:next|state), clearId, 10\)/);
  assert.match(app, /错题入侵/);
});

test('S4 battlefield sounds are synthesized and muted under no-motion', () => {
  const sound = sourceBetween(app, 'const preschoolSceneSound', 'function firePreschoolScenePea');
  assert.match(sound, /AudioContext/);
  assert.match(sound, /preschool-no-motion/);
  assert.match(sound, /pea:/);
  assert.match(sound, /hit:/);
  assert.match(sound, /sun:/);
  const pea = sourceBetween(app, 'function firePreschoolScenePea', 'function setupPreschoolHomeStageMotion');
  assert.match(pea, /preschoolSceneSound\.pea\(\)/);
});

test('runtime assets carry the learning-loop cache revision', () => {
  assert.match(shell, /app\.js\?v=[^"']*learning-loop=v3/);
  assert.match(shell, /56-phone-landscape-focus\.css\?v=[^"']*learning-loop=v3/);
});
