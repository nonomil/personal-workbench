import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const projects = {
  voxel: path.join(repoRoot, 'prj', 'games', 'voxel-learning'),
  platform: path.join(repoRoot, 'prj', 'games', 'platform-learning')
};
const bridgeFile = path.join(repoRoot, 'prj', 'games', 'shared', 'workbench-bridge.js');

function projectFile(project, relativePath) {
  return path.join(projects[project], ...relativePath.split('/'));
}

function loadGlobalScript(project, relativePath, exportName) {
  const file = projectFile(project, relativePath);
  assert.equal(fs.existsSync(file), true, `${project}/${relativePath} missing`);
  const sandbox = { console, setTimeout, clearTimeout };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
  assert.ok(sandbox[exportName], `${exportName} missing`);
  return sandbox[exportName];
}

function loadBridge(initialState) {
  let stored = JSON.stringify(initialState);
  const localStorage = {
    getItem() { return stored; },
    setItem(_key, value) { stored = String(value); }
  };
  const sandbox = { console, localStorage, location: { search: '' }, URLSearchParams };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(fs.readFileSync(bridgeFile, 'utf8'), sandbox, { filename: bridgeFile });
  return { bridge: sandbox.WorkbenchGameBridge, state() { return JSON.parse(stored); } };
}

function assertProjectScaffold(project, exportName, title) {
  const required = [
    'index.html', 'game.css', 'game.js', 'data/cards.js',
    'core/learning-adapter.js', 'docs/design.md', 'docs/asset-plan.md',
    'docs/visual-review.md', 'assets/asset-manifest.json'
  ];
  required.forEach(relativePath => assert.equal(fs.existsSync(projectFile(project, relativePath)), true, `${project}/${relativePath} missing`));
  const html = fs.readFileSync(projectFile(project, 'index.html'), 'utf8');
  const css = fs.readFileSync(projectFile(project, 'game.css'), 'utf8');
  const source = fs.readFileSync(projectFile(project, 'game.js'), 'utf8');
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /id="learning-card-layer"/);
  assert.match(html, /id="orientation-lock"/);
  assert.match(html, /workbench-bridge\.js/);
  assert.match(html, /preschool-speech\.js/);
  assert.match(css, /body[\s\S]*overflow:\s*hidden/);
  assert.match(css, /@media\s*\(orientation:\s*portrait\)/);
  assert.match(css, /min-height:\s*(?:44|48|52|56|60|64)px/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(source, /session\.canSimulate\(\)/);
  assert.match(source, /recordSubjectAnswer|recordWordAnswer/);
  assert.match(source, /startFinal/);
  assert.match(fs.readFileSync(projectFile(project, 'docs/design.md'), 'utf8'), /10 张/);
  assert.match(fs.readFileSync(projectFile(project, 'docs/design.md'), 'utf8'), new RegExp(title));
  const cards = loadGlobalScript(project, 'data/cards.js', exportName === 'VoxelLearningCore' ? 'VoxelLearningCards' : 'PlatformLearningCards');
  assert.equal(cards.cards.length, 10);
  assert.equal(new Set(cards.cards.map(card => card.id)).size, 10);
  cards.cards.forEach(card => {
    assert.ok(card.prompt && card.speech && card.speech.text);
    assert.ok(card.options.length >= 2 && card.options.length <= 3);
    assert.equal(card.options.some(option => option.id === card.answer), true);
    card.options.forEach(option => assert.equal(fs.existsSync(projectFile(project, option.image.replace(/^\.\//, ''))), true, `${project}/${option.image} missing`));
  });
}

test('voxel learning project ships a self-contained landscape scaffold and ten cards', () => {
  assertProjectScaffold('voxel', 'VoxelLearningCore', '方块');
});

test('platform learning project ships a self-contained landscape scaffold and ten cards', () => {
  assertProjectScaffold('platform', 'PlatformLearningCore', '横版');
});

test('voxel learning gate requires ten cards before the portal can settle', () => {
  const core = loadGlobalScript('voxel', 'core/learning-adapter.js', 'VoxelLearningCore');
  const session = core.createSession({ cardsRequired: 10 });
  assert.equal(session.snapshot().phase, 'ready');
  session.startExpedition();
  assert.equal(session.canSimulate(), true);
  session.requestCard({ id: 'one', answer: 'x' }, 'mine');
  session.landCard();
  assert.equal(session.answer('wrong').needsCorrection, true);
  session.completeCorrection();
  session.finishReward();
  session.finishResume();
  for (let n = 2; n <= 10; n += 1) {
    session.requestCard({ id: `card-${n}`, answer: `a-${n}` }, 'place');
    session.landCard();
    session.answer(`a-${n}`);
    session.finishReward();
    if (n < 10) session.finishResume();
  }
  assert.equal(session.snapshot().finalPortalUnlocked, true);
  assert.equal(session.snapshot().phase, 'final-ready');
  assert.throws(() => session.settle(true), /final/);
  session.startFinalPortal();
  assert.equal(session.canSimulate(), true);
  assert.equal(session.settle(true).settled.won, true);
});

test('voxel learning skip completes the exposure without counting wrong or granting a correction', () => {
  const core = loadGlobalScript('voxel', 'core/learning-adapter.js', 'VoxelLearningCore');
  const session = core.createSession({ cardsRequired: 2 });
  session.startExpedition();
  session.requestCard({ id: 'one', answer: 'x' }, 'mine');
  session.landCard();
  const skipped = session.skipCard();
  assert.equal(skipped.completed, true);
  assert.equal(skipped.skipped, true);
  assert.equal(session.snapshot().cardsCompleted, 1);
  assert.equal(session.snapshot().unknownCount, 1);
  assert.equal(session.snapshot().correctCount, 0);
  assert.equal(session.snapshot().wrongCount, 0);
  assert.equal(session.snapshot().phase, 'card-reward');
  session.finishReward();
  session.finishResume();
  assert.equal(session.snapshot().phase, 'build');
});

test('voxel learning action meter triggers once per two successful build actions', () => {
  const core = loadGlobalScript('voxel', 'core/learning-adapter.js', 'VoxelLearningCore');
  const meter = core.createActionMeter({ actionsPerCard: 2 });
  assert.equal(meter.record('mine'), false);
  assert.equal(meter.record('place'), true);
  assert.equal(meter.record('mine'), false);
  assert.equal(meter.record('craft'), true);
  assert.equal(meter.snapshot().actions, 0);
});

test('platform learning gate freezes the run and requires ten cards before the flag', () => {
  const core = loadGlobalScript('platform', 'core/learning-adapter.js', 'PlatformLearningCore');
  const session = core.createSession({ cardsRequired: 10 });
  session.startRun();
  session.requestCard({ id: 'one', answer: 'x' }, 'checkpoint-1');
  assert.equal(session.canSimulate(), false);
  session.landCard();
  session.answer('x');
  session.finishReward();
  session.finishResume();
  for (let n = 2; n <= 10; n += 1) {
    session.requestCard({ id: `card-${n}`, answer: `a-${n}` }, `checkpoint-${n}`);
    session.landCard();
    session.answer(`a-${n}`);
    session.finishReward();
    if (n < 10) session.finishResume();
  }
  assert.equal(session.snapshot().flagUnlocked, true);
  assert.equal(session.snapshot().phase, 'flag-ready');
  assert.throws(() => session.settle(true), /flag/);
  session.startFinalFlag();
  assert.equal(session.settle(true).settled.won, true);
});

test('platform learning skip completes the exposure without counting wrong or correction', () => {
  const core = loadGlobalScript('platform', 'core/learning-adapter.js', 'PlatformLearningCore');
  const session = core.createSession({ cardsRequired: 1 });
  session.startRun();
  session.requestCard({ id: 'one', answer: 'x' }, 'checkpoint-1');
  session.landCard();
  const skipped = session.skipCard();
  assert.equal(skipped.completed, true);
  assert.equal(skipped.skipped, true);
  assert.equal(session.snapshot().cardsCompleted, 1);
  assert.equal(session.snapshot().unknownCount, 1);
  assert.equal(session.snapshot().wrongCount, 0);
  assert.equal(session.snapshot().flagUnlocked, true);
  assert.equal(session.snapshot().phase, 'card-reward');
  session.finishReward();
  assert.equal(session.snapshot().phase, 'flag-ready');
});

test('platform checkpoint meter ignores duplicate checkpoints', () => {
  const core = loadGlobalScript('platform', 'core/learning-adapter.js', 'PlatformLearningCore');
  const meter = core.createCheckpointMeter();
  assert.equal(meter.record('cp-1'), true);
  assert.equal(meter.record('cp-1'), false);
  assert.equal(meter.record('cp-2'), true);
  assert.equal(meter.snapshot().count, 2);
});

test('platform learning session can restore saved card progress before a refresh', () => {
  const core = loadGlobalScript('platform', 'core/learning-adapter.js', 'PlatformLearningCore');
  const session = core.createSession({ cardsRequired: 10, initialCardsCompleted: 4 });
  assert.equal(session.snapshot().cardsCompleted, 4);
  assert.equal(session.snapshot().phase, 'run');
  assert.equal(session.canSimulate(), true);
  const completed = core.createSession({ cardsRequired: 10, initialCardsCompleted: 10 });
  assert.equal(completed.snapshot().phase, 'flag-ready');
  assert.equal(completed.snapshot().flagUnlocked, true);
});

test('both learning games write subject attempts without mutating daily plans', () => {
  const original = {
    dailyPlans: [{ id: 'keep', done: false }],
    growth: { sunlight: 20, worldGames: { meta: {} } },
    courseProgress: {}
  };
  const loaded = loadBridge(original);
  assert.ok(loaded.bridge.recordSubjectAnswer('literacy', '山', true));
  assert.ok(loaded.bridge.recordWordAnswer('mountain', true, { source: 'voxel-learning' }));
  const state = loaded.state();
  assert.equal(state.dailyPlans.length, 1);
  assert.equal(state.dailyPlans[0].id, 'keep');
  assert.equal(state.courseProgress.literacy.mastery['山'].correct, 1);
  assert.equal(state.courseProgress.minecraft.mastery.mountain.correct, 1);
});

test('workbench preserves classic worlds and exposes both learning variants', () => {
  const app = fs.readFileSync(path.join(repoRoot, 'prj', 'app.js'), 'utf8');
  const prepare = fs.readFileSync(path.join(repoRoot, 'scripts', 'prepare-mobile.mjs'), 'utf8');
  assert.match(app, /voxel-learning/);
  assert.match(app, /platform-learning/);
  assert.match(app, /voxel-adventure/);
  assert.match(app, /platform-quest/);
  assert.match(prepare, /voxel-learning/);
  assert.match(prepare, /platform-learning/);
});

test('learning buttons reuse the complete voxel and platform game shells', () => {
  const app = fs.readFileSync(path.join(repoRoot, 'prj', 'app.js'), 'utf8');
  const voxelHtml = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'voxel-craft', 'index.html'), 'utf8');
  const voxelGame = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'voxel-craft', 'game.js'), 'utf8');
  const platformHtml = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'platform-quest', 'index.html'), 'utf8');
  const platformGame = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'platform-quest', 'game.js'), 'utf8');
  assert.match(app, /voxel-craft\/index\.html\?mode=learning/);
  assert.match(app, /platform-quest\/index\.html\?mode=learning/);
  assert.match(voxelHtml, /id="learning-card-layer"/);
  assert.match(voxelHtml, /data-learning-mode/);
  assert.match(voxelGame, /learningMode/);
  assert.match(voxelGame, /const GAME_ID = learningMode \? 'voxel-learning' : 'voxel-adventure';/);
  assert.match(voxelGame, /learningSession\.canSimulate\(\)/);
  assert.match(platformHtml, /id="learning-card-layer"/);
  assert.match(platformHtml, /data-learning-mode/);
  assert.match(platformGame, /learningMode/);
  assert.match(platformGame, /const GAME_ID = learningMode \? 'platform-learning' : 'platform-quest';/);
  assert.match(platformGame, /learningSession\.canSimulate\(\)/);
});
