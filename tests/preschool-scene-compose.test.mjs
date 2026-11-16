import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (filePath) => fs.readFileSync(filePath, 'utf8');

const app = read(path.join(repoRoot, 'prj', 'app.js'));
const config = read(path.join(repoRoot, 'prj', 'config.js'));
const css56 = read(path.join(repoRoot, 'prj', 'css', 'preschool', '56-phone-landscape-focus.css'));
const css53 = read(path.join(repoRoot, 'prj', 'css', 'preschool', '53-high-resolution-landscape.css'));
const index = read(path.join(repoRoot, 'prj', 'preschool-workbench', 'index.html'));

function sliceFn(source, startText, nextText) {
  const start = source.indexOf(startText);
  const end = source.indexOf(nextText, start + startText.length);
  assert.ok(start >= 0 && end > start, 'missing function ' + startText);
  return source.slice(start, end);
}

test('literacy first screen is one focus card plus a three-character today queue', () => {
  const renderer = sliceFn(
    app,
    'function renderPreschoolLiteracyCardWall(course, session)',
    'function renderPreschoolMathOptions(session, item)'
  );

  assert.match(renderer, /is-scene-focus/);
  assert.match(app, /class="preschool-literacy-focus-card/);
  assert.match(app, /class="preschool-literacy-focus-glyph"/);
  assert.equal(app.includes('literacy-tianzige preschool-literacy-focus-glyph'), false);
  assert.match(app, /class="preschool-literacy-today-queue"/);
  assert.match(app, /session\.items\.slice\(0,\s*3\)/);
  assert.match(renderer, /renderPreschoolLiteracyFocusCard\(/);
  assert.match(app, /data-action="literacy-focus" data-index=/);
  assert.match(app, /if \(action === 'literacy-focus'\)/);
});

test('short Android landscape hides the eight-card wall and the writing pad', () => {
  assert.match(css56, /preschool-literacy-card-queue\s*\{[\s\S]{0,80}display:\s*none/);
  assert.match(css56, /preschool-literacy-writing-slot\s*\{[\s\S]{0,80}display:\s*none/);
  assert.match(css56, /preschool-literacy-focus-card/);
  assert.match(css56, /preschool-literacy-today-queue/);
  assert.match(css56, /preschool-literacy-study-grid[\s\S]{0,280}max-width:\s*min\(320px,\s*58%\)/);
});

test('high-resolution landscape keeps one floating literacy cluster', () => {
  assert.match(css53, /preschool-literacy-writing-slot[\s\S]{0,120}display:\s*none/);
  assert.match(css53, /preschool-literacy-study-grid[\s\S]{0,280}max-width:\s*min\(320px,\s*42%\)/);
  assert.match(css53, /preschool-literacy-card-queue[\s\S]{0,80}display:\s*none/);
  assert.match(css53, /preschool-course-tabs \{ display: none; \}[\s\S]{0,480}grid-template-rows:\s*minmax\(0,\s*1fr\)/);
});

test('home primary uses a compact status row, one 44px CTA, and an unboxed stage', () => {
  assert.match(css56, /home-primary[\s\S]{0,420}workbench-overview-header[\s\S]{0,180}height:\s*36px/);
  assert.match(css56, /home-primary[\s\S]{0,1800}preschool-home-hero-copy > span[\s\S]{0,160}min-height:\s*44px/);
  assert.match(css56, /home-primary[\s\S]{0,1600}preschool-home-hero-reward[\s\S]{0,80}display:\s*none/);
  assert.match(css56, /home-primary[\s\S]{0,2400}preschool-home-stage[\s\S]{0,220}border:\s*0/);
  assert.match(css56, /preschool-home-stage[\s\S]{0,220}align-items:\s*end/);
  assert.match(css53, /preschool-home-stage[\s\S]{0,220}align-items:\s*end/);
});

test('garden-game composition puts simple cards above plants on the lawn', () => {
  assert.match(css56, /is-scene-focus[\s\S]{0,180}grid-template-rows:\s*auto minmax\(110px,\s*1fr\)/);
  assert.match(css56, /preschool-literacy-focus-glyph[\s\S]{0,220}border:\s*0/);
  assert.match(css56, /preschool-literacy-writing-character[\s\S]{0,80}display:\s*none/);
  assert.match(css56, /is-scene-focus[\s\S]{0,80}>\s*\.preschool-learning-companion-rail[\s\S]{0,220}align-items:\s*end/);
  assert.match(css56, /companion-list[\s\S]{0,160}width:\s*100%[\s\S]{0,80}justify-content:\s*space-around/);
  assert.match(css53, /companion-list[\s\S]{0,160}width:\s*100%[\s\S]{0,80}justify-content:\s*space-around/);
  assert.match(css53, /preschool-literacy-writing-character[\s\S]{0,80}display:\s*none/);
  assert.match(css53, /preschool-literacy-writing-slot[\s\S]{0,120}display:\s*none/);
});

test('child landscape uses glass cards and hides workbench chrome', () => {
  assert.match(css56, /topbar-focus-button[\s\S]{0,80}topbar-workbench-switcher[\s\S]{0,80}display:\s*none/);
  assert.match(css56, /preschool-native-page-switch \{ display: none; \}/);
  assert.match(css56, /--preschool-app-rail:\s*0px/);
  assert.match(css56, /--child-nav-width:\s*0px/);
  assert.match(css56, /child-game-scene \{ inset: 0; \}/);
  assert.match(css56, /\.main-content \{[\s\S]{0,80}margin-left:\s*0/);
  assert.match(css56, /preschool-mobile-nav::before[\s\S]{0,120}display:\s*none/);
  assert.match(css56, /preschool-mobile-nav[\s\S]{0,480}flex-direction:\s*row/);
  assert.match(css56, /preschool-mobile-nav[\s\S]{0,480}bottom:\s*auto/);
  assert.match(css56, /preschool-literacy-focus-card[\s\S]{0,480}rgba\(255,\s*255,\s*255,\s*\.38\)/);
  assert.match(css56, /preschool-learning-companion\.is-speaking,[\s\S]{0,360}outline:\s*none/);
  assert.match(css56, /is-scene-focus \.preschool-literacy-wall-head \{ display: none; \}/);
  assert.match(css56, /topbar-context[\s\S]{0,80}display:\s*none/);
  assert.match(css53, /topbar-workbench-switcher[\s\S]{0,80}display:\s*none/);
  assert.match(css53, /topbar-context[\s\S]{0,80}display:\s*none/);
  assert.match(css53, /--preschool-app-rail:\s*0px/);
  assert.match(css53, /--child-nav-width:\s*0px/);
  assert.match(css53, /child-game-scene \{ inset: 0; \}/);
  assert.match(css53, /preschool-literacy-focus-card[\s\S]{0,480}rgba\(255,\s*255,\s*255,\s*\.38\)/);
});

test('child-facing Android landscape hides English eyebrows', () => {
  assert.match(css56, /home-primary[\s\S]{0,2200}\.eyebrow[\s\S]{0,60}display:\s*none/);
  assert.match(css56, /is-literacy[\s\S]{0,900}\.eyebrow[\s\S]{0,60}display:\s*none/);
});

test('math option picks emit the shared preschool answer feedback', () => {
  const pick = sliceFn(app, 'function pickMathFlashcard(index)', 'function commitPreschoolSubjectMark');
  assert.match(pick, /emitPreschoolAnswerFeedback\(correct,\s*'flashcard-math-pick'/);
});

test('subject flashcards and home cards float in the upper garden half', () => {
  const frame = sliceFn(app, 'function renderPreschoolCardFrame(', 'function renderPreschoolLiteracyFocusCard(');
  assert.match(frame, /is-scene-focus/);
  assert.match(frame, /preschool-flashcard-cluster/);
  assert.match(app, /preschool-flashcard-page is-scene-focus tone-/);
  assert.match(css56, /preschool-literacy-study-grid[\s\S]{0,280}justify-self:\s*center/);
  assert.match(css56, /preschool-home-top[\s\S]{0,160}justify-self:\s*center/);
  assert.match(css56, /preschool-flashcard-cluster/);
  assert.match(css56, /is-scene-focus \.preschool-flashcard-top,/);
  assert.match(css56, /is-scene-focus \.preschool-flashcard-foot \{ display: none; \}/);
  assert.match(css53, /preschool-flashcard-cluster/);
  assert.match(css53, /preschool-home-top[\s\S]{0,160}justify-self:\s*center/);
  assert.match(css53, /is-scene-focus[\s\S]{0,80}display:\s*grid/);
});

test('reward garden stage floats a compact card above lawn plants', () => {
  assert.match(css56, /\[data-native-kind="rewards-stage"\] \{[\s\S]{0,180}grid-template-rows:\s*auto minmax\(140px,\s*1fr\)/);
  assert.match(css56, /\[data-native-kind="rewards-stage"\] \.preschool-reward-progress[\s\S]{0,280}max-width:\s*min\(420px/);
  assert.match(css56, /\[data-native-kind="rewards-stage"\] \.preschool-reward-stage \{[\s\S]{0,400}border:\s*0/);
  assert.match(css56, /\[data-native-kind="rewards-stage"\] \.preschool-reward-stage-ground \{ display: none; \}/);
  assert.match(css53, /\[data-native-kind="rewards-stage"\] \{[\s\S]{0,180}grid-template-rows:\s*auto minmax\(140px,\s*1fr\)/);
  assert.match(css53, /\[data-native-kind="rewards-stage"\] \.preschool-reward-stage-ground \{ display: none; \}/);
});

test('home tasks and course portals sit as garden cards, not boxed walls', () => {
  assert.match(css56, /home-tasks[\s\S]{0,900}preschool-home-battlefield[\s\S]{0,280}border:\s*0/);
  assert.match(css56, /home-tasks[\s\S]{0,1800}preschool-home-lanes[\s\S]{0,220}justify-content:\s*space-around/);
  assert.match(css56, /courses-wall[\s\S]{0,900}rgba\(255,\s*255,\s*255,\s*\.38\)/);
  assert.match(css56, /courses-today[\s\S]{0,900}preschool-course-today-split[\s\S]{0,60}display:\s*none/);
  assert.match(css53, /home-tasks[\s\S]{0,900}preschool-home-battlefield[\s\S]{0,280}border:\s*0/);
  assert.match(css53, /home-tasks[\s\S]{0,1800}preschool-home-lanes[\s\S]{0,220}justify-content:\s*space-around/);
  assert.match(css53, /courses-today[\s\S]{0,900}preschool-course-today-split[\s\S]{0,60}display:\s*none/);
});

test('reward tiers, collection, and home world float as garden cards', () => {
  assert.match(css56, /\[data-native-kind="rewards-tiers"\] \.preschool-reward-tier,[\s\S]{0,360}display:\s*contents/);
  assert.match(css56, /\[data-native-kind="rewards-tiers"\] \.preschool-reward-tier-head \{ display: none; \}/);
  assert.match(css56, /\[data-native-kind="rewards-collection"\] \.preschool-collection-section[\s\S]{0,280}border:\s*0/);
  assert.match(css56, /\[data-native-kind="rewards-collection"\] \.preschool-collection-grid::before,[\s\S]{0,360}display:\s*none/);
  assert.match(css56, /\[data-native-kind="home-world"\] \.preschool-voxel-home \{[\s\S]{0,420}border:\s*0/);
  assert.match(css56, /\[data-native-kind="home-world"\] \.preschool-home-exits \{[\s\S]{0,80}position:\s*static/);
  assert.match(css53, /\[data-native-kind="rewards-tiers"\] \.preschool-reward-tier,[\s\S]{0,360}display:\s*contents/);
  assert.match(css53, /\[data-native-kind="rewards-collection"\] \.preschool-collection-grid::before,[\s\S]{0,360}display:\s*none/);
  assert.match(css53, /\[data-native-kind="home-world"\] \.preschool-voxel-home \{[\s\S]{0,420}border:\s*0/);
  assert.match(css53, /\[data-native-kind="home-world"\] \.preschool-home-exits \{[\s\S]{0,80}position:\s*static/);
});

test('garden and mario share floating composition; mario uses brick ground not lawn', () => {
  assert.match(css56, /variant-preschool:is\(\[data-world-theme="garden-defense"\], \[data-world-theme="platform-quest"\]\)/);
  assert.match(css53, /variant-preschool:is\(\[data-world-theme="garden-defense"\], \[data-world-theme="platform-quest"\]\)/);
  assert.match(css56, /\[data-world-theme="platform-quest"\] \.child-game-scene-ground/);
  assert.match(css53, /\[data-world-theme="platform-quest"\] \.child-game-scene-ground/);
  assert.match(css56, /\[data-world-theme="platform-quest"\] \.child-game-scene-sun/);
  assert.match(css53, /\[data-world-theme="platform-quest"\] \.child-game-scene-sun/);
  assert.match(css56, /\[data-world-theme="platform-quest"\] \.child-game-scene \{[\s\S]{0,80}background-image:\s*var\(--child-scene-image\)/);
});

test('mario landscape HUD uses gold coins, not garden glass seeds', () => {
  const theme = sliceFn(config, "id: 'platform-quest'", 'const variants =');
  assert.match(theme, /overview:\s*'sun-token'/);
  assert.match(theme, /battle:\s*'star-companion'/);
  assert.match(theme, /growth:\s*'quest-flag-pedestal'/);
  assert.match(theme, /courses:\s*'storybook-token'/);
  assert.match(theme, /rewards:\s*'treasure-chest'/);
  assert.match(css56, /\[data-world-theme="platform-quest"\] \.preschool-mobile-nav-item \{[\s\S]{0,280}radial-gradient/);
  assert.match(css56, /\[data-world-theme="platform-quest"\] \.preschool-mobile-nav-item \{[\s\S]{0,560}backdrop-filter:\s*none/);
  assert.match(css53, /\[data-world-theme="platform-quest"\] \.preschool-mobile-nav-item \{[\s\S]{0,280}radial-gradient/);
  assert.match(css56, /\[data-world-theme="platform-quest"\] \.preschool-mobile-nav-item\.is-active \{[\s\S]{0,220}#fff6c8/);
});

test('android landscape world launch floats as a glass card; Mario glass is honey', () => {
  assert.match(css56, /#page-content:has\(>\s*\.preschool-world-launch\)\s*>\s*\.preschool-page-intro \{ display: none; \}/);
  assert.match(css53, /#page-content:has\(>\s*\.preschool-world-launch\)\s*>\s*\.preschool-page-intro \{ display: none; \}/);
  assert.match(css56, /\.preschool-world-launch \{[\s\S]{0,420}border:\s*1px solid/);
  assert.match(css53, /\.preschool-world-launch \{[\s\S]{0,420}border:\s*1px solid/);
  assert.match(css56, /\.preschool-world-launch \{[\s\S]{0,520}--preschool-glass-fill|rgba\(255,\s*255,\s*255,\s*\.38\)/);
  assert.match(css56, /\[data-world-theme="platform-quest"\][\s\S]{0,280}--preschool-glass-fill:\s*rgba\(255,\s*248,\s*220/);
  assert.match(css53, /\[data-world-theme="platform-quest"\][\s\S]{0,280}--preschool-glass-fill:\s*rgba\(255,\s*248,\s*220/);
  assert.match(css56, /--preschool-glass-fill:\s*rgba\(255,\s*255,\s*255,\s*\.38\)/);
  assert.match(css53, /--preschool-glass-fill:\s*rgba\(255,\s*255,\s*255,\s*\.38\)/);
});

test('appends the scene-compose cache stamp without replacing existing versions', () => {
  assert.match(index, /app\.js\?[^"']*scene-compose=v3/);
  assert.match(index, /56-phone-landscape-focus\.css\?[^"']*scene-compose=v26/);
  assert.match(index, /53-high-resolution-landscape\.css\?[^"']*scene-compose=v31/);
  assert.match(index, /44-child-game-world\.css\?[^"']*scene-compose=v1/);
  assert.match(index, /config\.js\?[^"']*mario-hud=v1/);
});
