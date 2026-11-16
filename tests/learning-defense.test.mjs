import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const gameRoot = path.join(repoRoot, 'prj', 'games', 'learning-defense');
const bridgeFile = path.join(repoRoot, 'prj', 'games', 'shared', 'workbench-bridge.js');

function gameFile(relativePath) {
  return path.join(gameRoot, ...relativePath.split('/'));
}

function loadGlobalScript(relativePath, exportName) {
  const file = gameFile(relativePath);
  assert.equal(fs.existsSync(file), true, `${relativePath} missing`);
  const sandbox = { console, setTimeout, clearTimeout };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
  assert.ok(sandbox[exportName], `${exportName} missing`);
  return sandbox[exportName];
}

function loadWorkbenchBridge(initialState, search = '') {
  let stored = JSON.stringify(initialState);
  const localStorage = {
    getItem() { return stored; },
    setItem(_key, value) { stored = String(value); }
  };
  const sandbox = {
    console,
    localStorage,
    location: { search },
    URLSearchParams
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(fs.readFileSync(bridgeFile, 'utf8'), sandbox, { filename: bridgeFile });
  return {
    bridge: sandbox.WorkbenchGameBridge,
    state() { return JSON.parse(stored); }
  };
}

test('learning defense ships as an independent documented game project', () => {
  const required = [
    'index.html',
    'game.css',
    'game.js',
    'core/learning-gate.js',
    'data/cards.js',
    'docs/design.md',
    'docs/asset-plan.md',
    'assets/asset-manifest.json'
  ];
  required.forEach(relativePath => {
    assert.equal(fs.existsSync(gameFile(relativePath)), true, `${relativePath} missing`);
  });

  const design = fs.readFileSync(gameFile('docs/design.md'), 'utf8');
  assert.match(design, /10 张|10\/10/);
  assert.match(design, /横屏/);
  assert.match(design, /dailyPlans/);
});

test('learning gate freezes battle, corrects mistakes and unlocks the final wave at 10 cards', () => {
  const core = loadGlobalScript('core/learning-gate.js', 'LearningDefenseCore');
  const session = core.createSession({ cardsRequired: 10 });

  assert.equal(session.snapshot().phase, 'ready');
  assert.equal(session.canSimulate(), false);
  session.startBattle();
  assert.equal(session.canSimulate(), true);

  session.requestCard({ id: 'hanzi-mountain', answer: 'hill' });
  assert.equal(session.snapshot().phase, 'card-falling');
  assert.equal(session.canSimulate(), false);
  session.landCard();
  assert.equal(session.snapshot().phase, 'learning');

  const wrong = session.answer('river');
  assert.equal(wrong.completed, false);
  assert.equal(wrong.needsCorrection, true);
  assert.equal(session.snapshot().phase, 'correction');
  assert.equal(session.snapshot().cardsCompleted, 0);

  const corrected = session.completeCorrection();
  assert.equal(corrected.completed, true);
  assert.equal(corrected.firstTryCorrect, false);
  assert.equal(session.snapshot().cardsCompleted, 1);
  assert.equal(session.snapshot().wrongCount, 1);
  session.finishReward();
  session.finishResume();
  assert.equal(session.snapshot().phase, 'battle');

  for (let number = 2; number <= 10; number += 1) {
    session.requestCard({ id: `card-${number}`, answer: `answer-${number}` });
    session.landCard();
    const result = session.answer(`answer-${number}`);
    assert.equal(result.completed, true);
    session.finishReward();
    if (number < 10) session.finishResume();
  }

  const ready = session.snapshot();
  assert.equal(ready.cardsCompleted, 10);
  assert.equal(ready.correctCount, 9);
  assert.equal(ready.finalWaveUnlocked, true);
  assert.equal(ready.phase, 'final-wave-ready');
  assert.equal(session.canSimulate(), false);
  session.startFinalWave();
  assert.equal(session.snapshot().phase, 'final-wave');
  assert.equal(session.canSimulate(), true);
});

test('learning gate skip records an unknown card without a wrong answer', () => {
  const core = loadGlobalScript('core/learning-gate.js', 'LearningDefenseCore');
  const session = core.createSession({ cardsRequired: 1 });
  session.startBattle();
  session.requestCard({ id: 'hanzi-mountain', answer: 'hill' });
  session.landCard();
  const skipped = session.skipCard();
  assert.equal(skipped.completed, true);
  assert.equal(skipped.skipped, true);
  assert.equal(session.snapshot().cardsCompleted, 1);
  assert.equal(session.snapshot().unknownCount, 1);
  assert.equal(session.snapshot().correctCount, 0);
  assert.equal(session.snapshot().wrongCount, 0);
  assert.equal(session.snapshot().finalWaveUnlocked, true);
  assert.equal(session.snapshot().phase, 'card-reward');
  session.finishReward();
  assert.equal(session.snapshot().phase, 'final-wave-ready');
});

test('learning gate rejects illegal transitions and never counts one card twice', () => {
  const core = loadGlobalScript('core/learning-gate.js', 'LearningDefenseCore');
  const session = core.createSession({ cardsRequired: 2 });
  assert.throws(() => session.requestCard({ id: 'too-early', answer: 'x' }), /battle/);
  session.startBattle();
  session.requestCard({ id: 'one', answer: 'x' });
  assert.throws(() => session.requestCard({ id: 'duplicate', answer: 'y' }), /card-falling/);
  session.landCard();
  session.answer('x');
  assert.throws(() => session.answer('x'), /card-reward/);
  assert.equal(session.snapshot().cardsCompleted, 1);
});

test('learning gate cannot report a win before the unlocked final wave', () => {
  const core = loadGlobalScript('core/learning-gate.js', 'LearningDefenseCore');
  const session = core.createSession({ cardsRequired: 1 });
  session.startBattle();
  assert.throws(() => session.settle(true), /final-wave/);
  assert.equal(session.snapshot().phase, 'battle');
  assert.equal(session.settle(false).settled.won, false);
});

test('standalone bridge records hanzi and word attempts without workbench globals', () => {
  const original = {
    dailyPlans: [{ id: 'keep-me', done: false }],
    growth: { sunlight: 12, worldGames: { meta: {} } },
    courseProgress: {}
  };
  const loaded = loadWorkbenchBridge(original, '?from=..%2Freturn.html%23battle');

  const hanzi = loaded.bridge.recordSubjectAnswer('literacy', '山', true);
  const word = loaded.bridge.recordWordAnswer('mountain', false, { source: 'learning-defense' });
  const state = loaded.state();

  assert.ok(hanzi, 'hanzi attempt should persist');
  assert.ok(word, 'word attempt should persist');
  assert.equal(state.courseProgress.literacy.mastery['山'].attempts, 1);
  assert.equal(state.courseProgress.literacy.mastery['山'].correct, 1);
  assert.equal(state.courseProgress.minecraft.mastery.mountain.attempts, 1);
  assert.equal(state.courseProgress.minecraft.mastery.mountain.correct, 0);
  assert.equal(state.dailyPlans.length, 1);
  assert.equal(state.dailyPlans[0].id, 'keep-me');
  assert.equal(state.growth.sunlight, 12);
  assert.equal(loaded.bridge.backHref('garden-defense'), '../return.html#battle');
});

test('runtime clock freezes pending transitions and frame steps stop after phase changes', () => {
  const runtime = loadGlobalScript('core/runtime.js', 'LearningDefenseRuntime');
  const clock = runtime.createClock();
  let fired = 0;
  clock.schedule(() => { fired += 1; }, 1000);
  clock.tick(600);
  clock.setPaused(true);
  clock.tick(2000);
  assert.equal(fired, 0);
  clock.setPaused(false);
  clock.tick(399);
  assert.equal(fired, 0);
  clock.tick(1);
  assert.equal(fired, 1);

  let simulating = true;
  const steps = [];
  runtime.runSimulationSteps(() => simulating, [
    () => { steps.push('projectiles'); simulating = false; },
    () => { steps.push('enemies'); },
    () => { steps.push('particles'); }
  ], 16);
  assert.deepEqual(steps, ['projectiles']);
});

test('attempt recorder marks cards only after a successful persistent write', () => {
  const runtime = loadGlobalScript('core/runtime.js', 'LearningDefenseRuntime');
  let calls = 0;
  const recorder = runtime.createAttemptRecorder({
    recordSubjectAnswer() {
      calls += 1;
      return calls === 1 ? null : { attempts: 1 };
    }
  });
  const card = { id: 'hanzi-mountain', track: 'hanzi', key: '山' };

  assert.equal(recorder.record(card, true), false);
  assert.equal(recorder.snapshot().pending, 1);
  assert.equal(recorder.flush(), 1);
  assert.equal(recorder.snapshot().recorded, 1);
  assert.equal(recorder.record(card, true), true);
  assert.equal(calls, 2, 'a recorded card must not write twice');
});

test('card library contains 10 unique picture questions across hanzi and English', () => {
  const library = loadGlobalScript('data/cards.js', 'LearningDefenseCards');
  const cards = library.cards;
  assert.equal(cards.length, 10);
  assert.equal(new Set(cards.map(card => card.id)).size, 10);
  assert.deepEqual(new Set(cards.map(card => card.track)), new Set(['hanzi', 'word']));

  cards.forEach(card => {
    assert.ok(card.prompt);
    assert.ok(card.speech && card.speech.text);
    assert.ok(card.options.length >= 2 && card.options.length <= 3);
    assert.equal(card.options.some(option => option.id === card.answer), true, `${card.id} answer missing`);
    card.options.forEach(option => {
      assert.ok(option.image.startsWith('./assets/reused/learning/'));
      assert.equal(fs.existsSync(gameFile(option.image.replace(/^\.\//, ''))), true, `${option.image} missing`);
    });
  });
});

test('landscape shell is viewport bound and exposes the complete learning overlay', () => {
  const html = fs.readFileSync(gameFile('index.html'), 'utf8');
  const css = fs.readFileSync(gameFile('game.css'), 'utf8');

  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /rel="icon"/);
  assert.match(html, /id="battle-canvas"/);
  assert.match(html, /id="learning-card-layer"/);
  assert.match(html, /id="learning-progress"/);
  assert.match(html, /id="orientation-lock"/);
  assert.match(html, /preschool-speech\.js/);
  assert.match(html, /workbench-bridge\.js[^"']*learning-defense=review1/);
  assert.match(html, /core\/runtime\.js/);
  assert.match(html, /id="exit-link"/);
  assert.match(html, /id="settle-exit-link"/);
  assert.match(css, /html[\s\S]*height:\s*100(?:dvh|%)/);
  assert.match(css, /body[\s\S]*overflow:\s*hidden/);
  assert.match(css, /@media\s*\(orientation:\s*portrait\)/);
  assert.match(css, /min-height:\s*(?:44|48|52|56|60|64)px/);
  assert.match(css, /prefers-reduced-motion/);
  assert.doesNotMatch(html, /sidebar|侧边栏/i);
});

test('settlement exposes weak-card review without changing the battle shell', () => {
  const html = fs.readFileSync(gameFile('index.html'), 'utf8');
  const source = fs.readFileSync(gameFile('game.js'), 'utf8');
  assert.match(html, /id="review-round-button"/);
  assert.match(html, /id="settle-weak"/);
  assert.match(source, /openReviewRound/);
  assert.match(source, /reviewSession/);
  assert.match(source, /reviewCards/);
});

test('preschool workbench exposes the new learning defense entry without replacing the classic garden game', () => {
  const app = fs.readFileSync(path.join(repoRoot, 'prj', 'app.js'), 'utf8');
  const worldCss = fs.readFileSync(path.join(repoRoot, 'prj', 'css', 'preschool', '28-world-progress.css'), 'utf8');
  const workbenchHtml = fs.readFileSync(path.join(repoRoot, 'prj', 'preschool-workbench', 'index.html'), 'utf8');
  assert.match(app, /'learning-defense':\s*\{\s*href:\s*'\.\.\/games\/learning-defense\/index\.html'/);
  assert.match(app, /PRESCHOOL_WORLD_LAUNCH_IDS\s*=\s*\[[^\]]*'learning-defense'/);
  assert.match(app, /id === 'learning-defense'/);
  assert.match(app, /worldGames\[id\]/);
  assert.match(app, /data-action="open-world-game" data-theme-id="learning-defense"/);
  const setPageStart = app.indexOf('function setPage');
  const setPageEnd = app.indexOf('\n    function ', setPageStart + 10);
  const setPage = app.slice(setPageStart, setPageEnd);
  assert.doesNotMatch(setPage, /requested === 'battle' && openPreschoolWorldGame/);
  const syncNavStart = app.indexOf('function syncPreschoolGameNavLabels');
  const syncNavEnd = app.indexOf('\n    function ', syncNavStart + 10);
  const syncNav = app.slice(syncNavStart, syncNavEnd);
  assert.doesNotMatch(syncNav, /dataset\.action = 'open-world-game'/);
  assert.match(syncNav, /dataset\.action = 'navigate'/);
  assert.match(worldCss, /theme-learning-defense/);
  assert.match(workbenchHtml, /preschool-workbench\.css[^"']*learning-defense=mvp1/);
  assert.match(workbenchHtml, /workbench-bridge\.js[^"']*memory-v2/);
  assert.match(workbenchHtml, /app\.js[^"']*learning-defense=review2/);
  assert.match(app, /'garden-defense':\s*\{\s*href:\s*'\.\.\/games\/garden-defense\/index\.html'/);
});

test('game controller freezes simulation during learning and writes real attempts without daily plan mutation', () => {
  const source = fs.readFileSync(gameFile('game.js'), 'utf8');
  assert.match(source, /requestAnimationFrame/);
  assert.match(source, /session\.canSimulate\(\)/);
  assert.match(source, /PreschoolSpeech\.speak/);
  assert.match(source, /Runtime\.createClock/);
  assert.match(source, /Runtime\.runSimulationSteps/);
  assert.match(source, /attemptRecorder\.record/);
  assert.match(source, /attemptRecorder\.flush/);
  assert.match(source, /recordPlaySession/);
  assert.match(source, /bridge\.backHref/);
  assert.match(source, /startFinalWave/);
  assert.doesNotMatch(source, /global\.setTimeout/);
  assert.doesNotMatch(source, /dailyPlans/);
});

test('learning card choices expose a skip path that uses the unknown memory outcome', () => {
  const source = fs.readFileSync(gameFile('game.js'), 'utf8');
  assert.match(source, /dataset\.skip/);
  assert.match(source, /skipCard/);
  assert.match(source, /recordLearningOutcome/);
});

test('asset manifest records copied provenance and reserves generated asset structure', () => {
  const manifest = JSON.parse(fs.readFileSync(gameFile('assets/asset-manifest.json'), 'utf8'));
  assert.equal(manifest.project, 'learning-defense');
  assert.ok(Array.isArray(manifest.reused) && manifest.reused.length >= 10);
  manifest.reused.forEach(asset => {
    assert.ok(asset.source);
    assert.ok(asset.target);
    assert.match(asset.sha256, /^[a-f0-9]{64}$/);
    assert.equal(fs.existsSync(gameFile(asset.target.replace(/^\.\//, ''))), true, `${asset.target} missing`);
  });
  assert.equal(manifest.generated_root, 'assets/generated/<asset-id>');
});
