import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const prjRoot = path.join(repoRoot, 'prj');
const app = fs.readFileSync(path.join(prjRoot, 'app.js'), 'utf8');
const literacyCss = fs.readFileSync(path.join(prjRoot, 'css', 'preschool', '40-literacy-uplift.css'), 'utf8');
const childWorldCss = fs.readFileSync(path.join(prjRoot, 'css', 'preschool', '44-child-game-world.css'), 'utf8');
const manifest = fs.readFileSync(path.join(prjRoot, 'css', 'preschool-workbench.css'), 'utf8');
const shell = fs.readFileSync(path.join(prjRoot, 'preschool-workbench', 'index.html'), 'utf8');

await import('../prj/preschool-card-art.js?literacy-card-wall-android=20260824');
const cardArt = globalThis.PersonalWorkbenchPreschoolCardArt;

function sourceBetween(source, startText, endText) {
  const start = source.indexOf(startText);
  assert.ok(start >= 0, `missing source boundary: ${startText}`);
  const end = source.indexOf(endText, start + startText.length);
  assert.ok(end > start, `missing source boundary: ${endText}`);
  return source.slice(start, end);
}

test('literacy today renders its eight independent cards as one card wall', () => {
  const renderer = sourceBetween(
    app,
    'function renderPreschoolLiteracyCardWall(course, session)',
    'function renderPreschoolMathOptions(session, item)'
  );
  const route = sourceBetween(
    app,
    'function renderPreschoolCourseFlashcards(course)',
    'function renderPreschoolFlashcardComplete(course, session)'
  );

  assert.match(route, /course\.id === 'preschool-literacy'[\s\S]*renderPreschoolLiteracyCardWall\(course, session\)/);
  assert.match(renderer, /session\.items\.map\(function \(item, index\)/);
  assert.match(renderer, /class="preschool-literacy-card-wall"/);
  assert.match(renderer, /data-action="flashcard-reveal" data-index="\$\{index\}"/);
  assert.match(renderer, /data-action="flashcard-mark" data-known="0" data-index="\$\{index\}"/);
  assert.match(renderer, /data-action="flashcard-mark" data-known="1" data-index="\$\{index\}"/);
  assert.match(renderer, /data-action="literacy-speak"/);
  assert.match(renderer, /is-known|is-unknown/);
  assert.match(renderer, /复习/);
});

test('literacy reveal and self-check actions address the selected wall card', () => {
  const reveal = sourceBetween(
    app,
    'function revealPreschoolFlashcard(index)',
    'function renderPreschoolCardFrame(course, session, item, actionsMarkup)'
  );
  const mark = sourceBetween(
    app,
    'function markPreschoolFlashcard(known, index)',
    'function pickMathFlashcard(index)'
  );

  assert.match(reveal, /session\.items\[targetIndex\]/);
  assert.match(mark, /session\.items\[targetIndex\]/);
  assert.match(mark, /session\.marks\[item\.key\]/);
  assert.match(mark, /every\(function \(candidate\)/);
  assert.match(app, /if \(action === 'flashcard-reveal'\) revealPreschoolFlashcard\(target\.dataset\.index\)/);
  assert.match(app, /if \(action === 'flashcard-mark'\) \{\s*\n\s*const known = target\.dataset\.known === '1';[\s\S]*?markPreschoolFlashcard\(known, target\.dataset\.index\);[\s\S]*?awardSunlight\(next, awardId, 3\);[\s\S]*?suppressSceneCelebration = false;[\s\S]*?scenePeaCharge >= 3\)/);
});

test('literacy wall uses four columns normally and two columns on short web landscape', () => {
  assert.match(literacyCss, /\.preschool-literacy-card-wall\s*\{[\s\S]*?grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
  // 2026-08-28：短横屏网页版不再锁死视口高度（旧 calc(100dvh-67px) 合同会把四段
  // 学习布局压叠），改为 min-height + 自然文档流滚动。
  assert.match(literacyCss, /@media \(max-width:\s*860px\) and \(orientation:\s*landscape\)[\s\S]*?\.preschool-flashcard-page\.is-literacy\.is-card-wall\s*\{[^}]*min-height:\s*calc\(100dvh\s*-\s*67px\)/);
  assert.doesNotMatch(literacyCss, /@media \(max-width:\s*860px\) and \(orientation:\s*landscape\)[\s\S]*?\.preschool-flashcard-page\.is-literacy\.is-card-wall\s*\{[^}]*[^-]height:\s*calc\(100dvh\s*-\s*67px\)/);
  assert.match(literacyCss, /@media \(max-width:\s*860px\) and \(orientation:\s*landscape\)[\s\S]*?\.preschool-literacy-card-wall\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)[^}]*overflow-y:\s*auto/);
  assert.match(literacyCss, /@media \(max-width:\s*860px\) and \(orientation:\s*landscape\)[\s\S]*?\.preschool-literacy-wall-card\s*\{[^}]*min-height:\s*170px/);
  assert.match(literacyCss, /\.preschool-literacy-wall-tools\s*\{[^}]*gap:\s*8px/);
  assert.match(literacyCss, /\.preschool-literacy-wall-tool\s*\{[^}]*min-width:\s*44px[^}]*min-height:\s*44px/);
});

test('Android literacy wall is a viewport-bound four by two grid', () => {
  assert.match(childWorldCss, /html\.is-android-app body\.variant-preschool \.preschool-literacy-card-wall\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)[^}]*grid-template-rows:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)[^}]*overflow:\s*hidden/);
  assert.match(childWorldCss, /html\.is-android-app body\.variant-preschool \.preschool-literacy-wall-tool\s*\{[^}]*min-height:\s*44px/);
});

test('literacy number and person art avoid Android-unsupported emoji glyphs', () => {
  const one = cardArt.render({ kind: 'literacy', char: '一', text: '一' });
  const person = cardArt.render({ kind: 'literacy', char: '人', text: '人' });

  assert.match(one, /data-card-art="literacy-number"/);
  assert.match(person, /data-card-art="literacy-person"/);
  assert.doesNotMatch(one, /1️⃣/);
  assert.doesNotMatch(person, /🧑/);
});

test('literacy card-wall runtime assets have an explicit cache revision', () => {
  assert.match(manifest, /40-literacy-uplift\.css\?v=20260816-literacy-ui-v6&literacy-wall=v1/);
  assert.match(manifest, /44-child-game-world\.css\?v=20260824-learning-game-p0e&literacy-wall=v1/);
  assert.match(shell, /preschool-workbench\.css\?v=20260824-learning-game-p0f&literacy-wall=v1/);
  assert.match(shell, /44-child-game-world\.css\?v=20260824-learning-game-p0e&literacy-wall=v1/);
  assert.match(shell, /preschool-card-art\.js\?v=20260815-english-auto-v1&literacy-wall=v1/);
  // app.js 缓存戳允许中间插入其他并行参数（含 learning-game-p0 这类裸标志），但要求关键段依序出现。
  assert.match(shell, /app\.js\?v=20260826-review-export(?:&[\w-]+(?:=[\w.+%-]+)?)*&course-art=20260824-v5-two-row(?:&[\w-]+(?:=[\w.+%-]+)?)*&literacy-wall=v1/);
});
