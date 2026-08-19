import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { readCssGraph } from './helpers/css-graph.mjs';

globalThis.PersonalWorkbenchConfig = {
  variant: 'preschool',
  current: { storageKey: 'petbank_huchuliang_preschool_workbench_state_v1' }
};
globalThis.localStorage = {
  getItem() { return null; },
  setItem() {},
  removeItem() {}
};

await import('../prj/preschool-garden.js?refresh=20260731');
await import('../prj/child-growth.js?refresh=20260731');
await import('../prj/storage.js?refresh=20260731');

const storage = globalThis.PersonalWorkbenchStorage;
const root = path.join(fileURLToPath(new URL('..', import.meta.url)), 'prj');

test('seeds six preschool workbench quests across learning and life lanes', () => {
  const state = storage.createSeedState();
  assert.equal(state.preschoolDayPlanVersion, 4);
  assert.equal(state.dailyPlans.length, 9);
  assert.deepEqual(state.dailyPlans.map(item => item.title), ['完成今日识字', '朗读一首古诗', '数学闯关一关', '学习今日英语', '做一项运动', '专注力训练一题', '绘本阅读', '动画时光', '英语熏听']);
  assert.deepEqual(state.dailyPlans.map(item => item.practiceLessonId), [
    'preschool-chinese-1',
    'preschool-poetry-1',
    'preschool-math-1',
    'preschool-english-words-1',
    'preschool-exercise-1',
    'preschool-focus-1',
    '',
    '',
    ''
  ]);
  assert.equal(state.dailyPlans.find(item => item.id === 'preschool-plan-picturebook').checkinMode, 'timed');
  assert.equal(state.dailyPlans.find(item => item.id === 'preschool-plan-cartoon').checkinMode, 'timed');
  assert.equal(state.dailyPlans.find(item => item.id === 'preschool-plan-listen').checkinMode, 'timed');
  assert.equal(state.tasks.length, 9);
});

test('migrates an old three-quest preschool snapshot once without changing completed state', () => {
  const today = storage.localDate();
  const old = storage.normalizeState({
    schemaVersion: 5,
    profileId: 'local-default',
    revision: 4,
    tasks: [
      { id: 'preschool-task-story', title: '完成今日识字', category: '识字', status: 'done', progress: 100 },
      { id: 'preschool-task-count', title: '朗读一首古诗', category: '古诗', status: 'todo', progress: 0 },
      { id: 'preschool-task-hello', title: '数学闯关一关', category: '数学', status: 'todo', progress: 0 }
    ],
    dailyPlans: [
      { id: 'preschool-plan-story', date: today, title: '完成今日识字', category: '识字', done: true, order: 1 },
      { id: 'preschool-plan-count', date: today, title: '朗读一首古诗', category: '古诗', done: false, order: 2 },
      { id: 'preschool-plan-hello', date: today, title: '数学闯关一关', category: '数学', done: false, order: 3 }
    ],
    growth: { sunlight: 40, totalSunlightEarned: 40 }
  });
  const again = storage.normalizeState(old);
  assert.equal(old.preschoolDayPlanVersion, 4);
  assert.equal(old.dailyPlans.length, 9);
  assert.equal(old.dailyPlans.find(item => item.title === '完成今日识字').done, true);
  assert.equal(again.dailyPlans.length, 9);
  assert.deepEqual(again.dailyPlans.map(item => item.id), old.dailyPlans.map(item => item.id));
  assert.equal(old.dailyPlans.find(item => item.id === 'preschool-plan-story').practiceLessonId, 'preschool-chinese-1');
  assert.equal(old.dailyPlans.find(item => item.id === 'preschool-plan-count').practiceLessonId, 'preschool-poetry-1');
});

test('exposes a sibling practice action for mapped preschool plans without nesting buttons', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const homeStart = app.indexOf('function renderPreschoolHomeBattlefield');
  const homeEnd = app.indexOf('function renderPreschoolHomeOverview', homeStart);
  const homeTemplate = app.slice(homeStart, homeEnd);
  assert.match(homeTemplate, /open-plan-course/);
  assert.match(homeTemplate, /preschoolHomeLanePracticeButton/);
  assert.match(homeTemplate, /preschool-home-review/);
  assert.match(homeTemplate, /open-review-practice/);
  assert.match(homeTemplate, /今天复习/);
  assert.match(homeTemplate, /preschool-home-lane-main/);
  assert.match(app, /class="preschool-home-lane-practice"/);
  assert.match(app, /data-action="open-plan-practice"/);
  assert.match(homeTemplate, /preschool-home-lane-check/);
  const homeSimple = fs.readFileSync(path.join(root, 'css', 'preschool', '37-home-simple.css'), 'utf8');
  assert.match(homeSimple, /\.preschool-home-lane-check \.preschool-generated-art/);
  assert.match(homeSimple, /width:\s*18px/);
  assert.match(app, /ui\.lessonSession = \{ id: match\.lesson\.id, courseId: match\.course\.id, selectedIndex: null, correct: false, planId:/);
});

test('keeps quick-add task action beside the preschool battlefield heading', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const battlefieldStart = app.indexOf('function renderPreschoolHomeBattlefield');
  const overviewStart = app.indexOf('function renderPreschoolHomeOverview', battlefieldStart);
  const battlefieldTemplate = app.slice(battlefieldStart, overviewStart);
  assert.match(battlefieldTemplate, /data-action="navigate"/);
  assert.match(battlefieldTemplate, /data-page="plans"/);
  assert.match(battlefieldTemplate, /管理任务/);
  assert.match(battlefieldTemplate, /preschool-home-battlefield-add/);
});

test('keeps preschool plans in one editable list instead of a fixed core and collapsed optional split', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const start = app.indexOf('function renderPreschoolPlans');
  const end = app.indexOf('function renderPreschoolCalendar', start);
  const plansRenderer = app.slice(start, end);
  const rowRenderer = app.slice(app.indexOf('function renderPreschoolPlanRows'), start);
  assert.match(plansRenderer, /const plans = derived\.todayPlans/);
  assert.match(plansRenderer, /renderPreschoolPlanRows\(plans, \{ editable: true \}\)/);
  assert.doesNotMatch(plansRenderer, /todayCorePlans|todayOptionalPlans|preschool-optional-plans/);
  assert.doesNotMatch(app, /preschoolOptionalPlansOpen/);
  assert.match(rowRenderer, /preschool-home-lane-main/);
  assert.match(rowRenderer, /preschool-plan-manage/);
  assert.match(rowRenderer, /data-action="edit-plan"/);
  assert.match(rowRenderer, /data-action="delete-plan"/);
  assert.doesNotMatch(rowRenderer, /preschool-checkin-card-main/);
});

test('bumps preschool runtime assets when the editable plan interaction changes', () => {
  const html = fs.readFileSync(path.join(root, 'preschool-workbench', 'index.html'), 'utf8');
  assert.match(html, /preschool-workbench\.css\?v=20260816-loop-v1/);
  assert.match(html, /config\.js\?v=20260816-literacy-uplift-v1/);
  assert.match(html, /storage\.js\?v=20260816-english-uplift-v2/);
  assert.match(html, /app\.js\?v=20260819-v074/);
  assert.match(html, /workbench-bridge\.js\?v=20260816-pass-v2/);
});

test('updates from the visible preschool snapshot when persistence is one revision behind', () => {
  const visibleState = storage.createSeedState();
  const visiblePlan = visibleState.dailyPlans.find(item => item.id === 'preschool-plan-count');
  visiblePlan.title = '页面中刚改名的古诗任务';
  visiblePlan.done = false;

  const staleState = storage.createSeedState();
  staleState.dailyPlans = staleState.dailyPlans.filter(item => item.id !== visiblePlan.id);
  let raw = JSON.stringify(staleState);
  const originalStorage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem() { return raw; },
    setItem(_key, value) { raw = value; },
    removeItem() {}
  };

  try {
    const result = storage.repository.update(next => {
      const item = next.dailyPlans.find(entry => entry.id === visiblePlan.id);
      assert.ok(item, 'the visible plan must remain addressable during the update');
      item.done = true;
    }, visibleState);
    const savedPlan = result.state.dailyPlans.find(item => item.id === visiblePlan.id);
    assert.equal(savedPlan.title, '页面中刚改名的古诗任务');
    assert.equal(savedPlan.done, true);
  } finally {
    globalThis.localStorage = originalStorage;
  }
});

test('scopes preschool plan actions by date when daily seed ids repeat', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.match(app, /function findDailyPlan\(/);
  assert.match(app, /data-action="toggle-plan" data-id="\$\{escapeHtml\(item\.id\)\}" data-date="\$\{escapeHtml\(item\.date\)\}"/);
  assert.match(app, /findDailyPlan\(state\.dailyPlans, target\.dataset\.id, target\.dataset\.date\)/);
  assert.match(app, /findDailyPlan\(next\.dailyPlans, target\.dataset\.id, target\.dataset\.date\)/);
  assert.match(app, /storage\.getPreschoolPlanRewardId\(item\)/);
});

test('preschool template normalization preserves renamed and custom daily plans', () => {
  const today = storage.localDate();
  const state = storage.normalizeState({
    schemaVersion: 5,
    preschoolDayPlanVersion: 3,
    preschoolPlanSeedDates: [today],
    tasks: [],
    dailyPlans: [
      { id: 'preschool-plan-story', date: today, title: '我自己的识字任务', category: '我的安排', required: true, done: true, order: 9 },
      { id: 'custom-plan', date: today, title: '新建的数学游戏', category: '家庭活动', required: false, done: false, order: 10 }
    ]
  });
  const renamed = state.dailyPlans.find(item => item.id === 'preschool-plan-story');
  assert.equal(renamed.title, '我自己的识字任务');
  assert.equal(renamed.category, '我的安排');
  assert.equal(renamed.done, true);
  assert.equal(state.dailyPlans.find(item => item.id === 'custom-plan').title, '新建的数学游戏');
});

test('guards plan rewards across practice, cancel and direct check-in paths', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.match(app, /storage\.getPreschoolPlanRewardId\(item\)/);
  assert.match(app, /item\.completionRewardId\s*=\s*item\.completionRewardId\s*\|\|\s*rewardId/);
  assert.match(app, /if \(!item\.completionRewardId\)\s*\{[\s\S]{0,500}awardSunlight\(next, rewardId, 10\)/);
  assert.match(app, /sourcePlan\.completionRewardId\s*=\s*lessonRewardId/);
});

test('synchronizes an already completed lesson into an unfinished source plan', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const completeStart = app.indexOf('function completeCourseLesson');
  const completeEnd = app.indexOf('function claimStreakReward', completeStart);
  const completeTemplate = app.slice(completeStart, completeEnd);
  assert.match(completeTemplate, /if \(!result\.changed\)[\s\S]*sourcePlan/);
  assert.match(completeTemplate, /sourcePlan\.done\s*=\s*true/);
  assert.match(completeTemplate, /sourcePlan\.completionSource\s*=\s*'practice'/);
  assert.match(completeTemplate, /sourcePlan\.completionRewardId\s*=\s*lessonRewardId/);
  assert.match(app, /if \(completedIds\.includes\(match\.lesson\.id\)\)[\s\S]*completeCourseLesson\(match\.lesson\.id, sourcePlan\.id, sourcePlan\.date\)/);
});

test('turns the preschool garden base into a progress, achievement and collection dashboard', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const preschoolStyles = readCssGraph(path.join(root, 'css', 'preschool-workbench.css'));
  assert.match(app, /preschool-growth-dashboard/);
  assert.match(app, /preschool-growth-progress/);
  assert.match(app, /toggle-badge-box/);
  assert.match(app, /renderCollectionBox/);
  assert.match(app, /已完成任务/);
  assert.match(app, /防守波次/);
  assert.match(app, /击退僵尸/);
  assert.match(app, /renderPreschoolCollection\(garden\)/);
  assert.doesNotMatch(app, /renderPreschoolGardenBoard\(growth, false\)/);
  assert.doesNotMatch(app, /<section class="preschool-growth-hero"/);
  assert.match(preschoolStyles, /22-growth-dashboard\.css/);
  assert.match(preschoolStyles, /preschool-badge-collection/);
  assert.match(preschoolStyles, /preschool-growth-progress-bar/);
});

test('merges reference learning zones into preschool resource cards', () => {
  const config = fs.readFileSync(path.join(root, 'config.js'), 'utf8');
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.match(config, /id: 'preschool-literacy'/);
  assert.match(config, /title: '识字专区'/);
  assert.match(config, /title: '拼音专区'/);
  assert.match(config, /title: '古诗专区'/);
  assert.match(config, /title: '数学专区'/);
  assert.match(config, /title: '专注力训练'/);
  assert.match(config, /title: '英语专区'/);
  assert.match(config, /title: '自然拼读'/);
  assert.match(config, /id: 'preschool-phonics'/);
  assert.match(config, /title: '每日运动'/);
  assert.match(config, /1500 字生活字库/);
  assert.match(config, /63 项拼音/);
  assert.match(config, /一关一首/);
  assert.match(config, /500 词口语/);
  assert.match(config, /10 个动作/);
  assert.match(app, /preschool-course-badges/);
  assert.match(app, /preschool-course-samples/);
  assert.match(app, /preschool-course-note/);
});

test('uses point-lighting copy for preschool calendar metadata', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.match(app, /const PRESCHOOL_COPY = \{[\s\S]*calendarTitle: '日历点亮'/);
});

test('exposes the reference workbench learning lanes as separate preschool navigation entries', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const preschoolIndex = fs.readFileSync(path.join(root, 'preschool-workbench', 'index.html'), 'utf8');
  for (const item of [
    ['calendar', '日历点亮'],
    ['growth', '花园基地'],
    ['preschool-literacy', '识字专区'],
    ['preschool-pinyin', '拼音专区'],
    ['preschool-poetry', '古诗专区'],
    ['preschool-math', '数学专区'],
    ['preschool-focus', '专注力训练'],
    ['preschool-english', '英语专区'],
    ['preschool-phonics', '自然拼读'],
    ['preschool-exercise', '每日运动'],
    ['mistakes', '错题本'],
    ['rewards', '奖励商城']
  ]) {
    const [courseId, label] = item;
    if (courseId === 'calendar') {
      assert.match(app, /const PRESCHOOL_NAV_LABELS = \{[\s\S]*calendar: '日历点亮'/);
    } else {
      assert.match(preschoolIndex, new RegExp(`data-page="${courseId === 'growth' || courseId === 'mistakes' || courseId === 'rewards' ? courseId : 'courses'}"[^>]*>(?:[\\s\\S]*?)<span>${label}<\\/span>`));
    }
  }
  assert.match(app, /getCourseIdFromHash/);
  assert.match(app, /target\.dataset\.courseId/);
  assert.match(app, /courseId === ui\.courseId/);
  assert.match(app, /renderPreschoolCalendar/);
});

test('keeps preschool course content spacious and supports a focused learning lane', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const styles = readCssGraph(path.join(root, 'css', 'preschool-workbench.css'));
  const workbenchCss = fs.readFileSync(path.join(root, 'css', 'preschool-workbench.css'), 'utf8');
  assert.match(app, /renderPreschoolCourseWallCard/);
  assert.match(app, /renderPreschoolCoursesTodayCard/);
  assert.match(workbenchCss, /34-course-wall\.css\?v=20260815-b3-adventure-v1/);
  assert.match(app, /preschool-course-wall/);
  assert.match(app, /preschool-course-today/);
  assert.match(app, /preschool-course-layout/);
  assert.match(app, /activeCourse/);
  assert.match(styles, /preschool-course-wall/);
  assert.match(styles, /preschool-course-today/);
  assert.match(styles, /grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(styles, /preschool-course-card\.is-focused/);
  assert.doesNotMatch(app, /renderPreschoolCourseDirectory/);
});

test('renders preschool courses as visual learning routes with clear step states', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const styles = readCssGraph(path.join(root, 'styles.css'));
  assert.match(app, /preschool-course-progress/);
  assert.match(app, /preschool-route-step/);
  assert.match(app, /preschool-route-step-art/);
  assert.match(app, /data-route-state/);
  assert.match(app, /preschool-course-status/);
  assert.match(styles, /preschool-course-progress-track/);
  assert.match(styles, /preschool-route-step-art/);
  assert.match(styles, /preschool-route-step\.is-current/);
  assert.match(styles, /preschool-route-step\.is-done/);
  assert.match(styles, /preschool-route-step\.is-next/);
});

test('keeps the refreshed reward tiers and five-lane defense contract in the preschool UI', () => {
  const config = fs.readFileSync(path.join(root, 'config.js'), 'utf8');
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const preschoolIndex = fs.readFileSync(path.join(root, 'preschool-workbench', 'index.html'), 'utf8');
  const styles = readCssGraph(path.join(root, 'styles.css'));
  const tiers = Array.from(config.matchAll(/tier: '([^']+)'/g), match => match[1]);
  assert.equal(new Set(tiers).size, 4);
  assert.match(config, /name: '阳光成长工作台'/);
  assert.match(config, /englishName: 'SUN GARDEN ADVENTURE'/);
  assert.match(config, /tier: '小奖励'/);
  assert.match(config, /tier: '特别奖励'/);
  assert.match(app, /preschool-reward-tier/);
  assert.match(app, /preschool-reward-tier-grid/);
  assert.match(app, /pixel-battle-lanes/);
  assert.match(app, /pixel-battle-lane-row/);
  assert.match(app, /pixel-map-landmarks/);
  assert.match(app, /task-book-icon/);
  assert.match(app, /player-energy-bars/);
  assert.match(app, /growth\.collection/);
  assert.equal((app.match(/pixel-battle-slot/g) || []).length >= 1, true);
  assert.match(app, /preschool-pea-fired/);
  assert.match(app, /renderPixelStats/);
  assert.match(app, /pixel-stat-card/);
  assert.match(app, /function renderPreschoolWorldGameLaunch\(/);
  assert.match(app, /function renderPreschoolBattle\(\)/);
  assert.match(app, /function renderPreschoolBattleRewards\(growth, defense\)/);
  assert.match(app, /pixel-battle-reward-panel/);
  assert.match(app, /function renderPreschoolDailyChallenge\(plans, defense\)/);
  assert.match(app, /pixel-daily-challenge/);
  assert.match(app, /if \(ui\.page === 'battle'\) return renderPreschoolBattle\(\)/);
  assert.doesNotMatch(app, /if \(ui\.page === 'battle'\) return renderPreschoolDefenseGame\(\)/);
  assert.doesNotMatch(app, /if \(ui\.page === 'battle'\) ensurePreschoolDefenseLoop\(\);/);
  assert.match(app, /Array\.from\(\{ length: 5 \}/);
  assert.match(app, /laneIndex === 2/);
  const homePosition = app.indexOf('function renderPreschoolHomeOverview(derived)');
  const homeGameActionPosition = app.indexOf('data-page="battle"', homePosition);
  const homeRewardActionPosition = app.indexOf('data-page="rewards"', homePosition);
  assert.equal(homePosition >= 0 && homeGameActionPosition > homePosition && homeRewardActionPosition > homeGameActionPosition, true);
  assert.match(styles, /pixel-battle-lane-row/);
  assert.match(styles, /pixel-pea-projectile/);
  assert.match(styles, /--pixel-route:\s*#5420b8/);
  assert.match(styles, /pixel-page-enter/);
  assert.match(styles, /pixel-map-panel\.is-compact/);
  assert.match(styles, /pixel-map-landmarks/);
  assert.match(styles, /pixel-battle-reward-grid/);
  assert.match(styles, /pixel-daily-challenge/);
  assert.match(app, /preschool-home-battlefield/);
  assert.match(styles, /--pixel-canvas:\s*#f4f1ff/);
  assert.match(styles, /--pixel-route:\s*#5420b8/);
  assert.match(styles, /pixel-daily-note/);
  assert.match(styles, /@media \(max-width: 860px\)[\s\S]*--sidebar-width: 152px/);
  assert.match(styles, /@media \(max-width: 860px\)[\s\S]*pixel-stat-strip \{ min-width: 0; overflow: hidden/);
  assert.match(styles, /@media \(min-width: 421px\) and \(max-width: 560px\)[\s\S]*pixel-quest-grid \{ grid-template-columns: repeat\(2/);
  assert.match(styles, /@media \(max-width: 560px\)[\s\S]*pixel-header-actions \{\s*display: grid/);
  assert.match(styles, /@media \(max-width: 560px\)[\s\S]*pixel-header-actions \{ grid-template-columns: repeat\(3, minmax\(0, 1fr\)\); \}/);
  assert.match(styles, /@media \(max-width: 560px\)[\s\S]*pixel-settings-button \{ display: none; \}/);
  assert.match(styles, /@media \(max-width: 560px\)[\s\S]*main-content \{ width: 100%; margin-left: 0; \}/);
  assert.match(app, /grass-platform\.png/);
  assert.match(styles, /pixel-quest-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2/);
  assert.match(styles, /pixel-world-grid\s*\{\s*grid-template-areas:\s*"map side" "quest side"/);
  assert.match(styles, /pixel-map-panel\s*\{\s*grid-area:\s*map/);
  assert.match(styles, /pixel-quest-board\s*\{\s*grid-area:\s*quest/);
  assert.match(styles, /pixel-side-stack\s*\{\s*grid-area:\s*side/);
  assert.match(styles, /@media \(max-width: 860px\)[\s\S]*?grid-template-areas:\s*"map" "quest" "side"/);
  for (const asset of ['pvz-sun-token.png', 'pvz-peashooter.png', 'pvz-sunflower.png', 'pvz-wallnut.png', 'pvz-iceflower.png', 'pvz-wallnut-blue.png']) {
    assert.match(preschoolIndex, new RegExp(asset.replace('.', '\\.') ));
    assert.equal(fs.existsSync(path.join(root, 'assets', 'generated', 'preschool-pvz-2d', 'published', asset)), true, asset);
  }
  assert.match(app, /'sun-token': '\.\.\/assets\/generated\/preschool-pvz-2d\/published\/pvz-sun-token\.png'/);
  assert.doesNotMatch(app, /PRESCHOOL_PVZ_ASSET_BASE\}\$\{PRESCHOOL_PVZ_ASSETS/);
  assert.match(config, /rewards: 'treasure-chest'/);
  assert.match(preschoolIndex, /data-page="account"[^>]*>[\s\S]*data-lucide="settings-2"/);
  assert.match(config, /account: 'settings-2'/);
  assert.equal(fs.existsSync(path.join(root, 'assets', 'generated', 'preschool-pixel', 'refresh-20260731', 'published', 'treasure-chest.png')), true);
  assert.match(preschoolIndex, /阳光成长工作台/);
  assert.match(preschoolIndex, /data-page="battle"[^>]*>[\s\S]*<span>花园保卫战<\/span>/);
  assert.match(preschoolIndex, /data-page="rewards"[^>]*>[\s\S]*<span>奖励商城<\/span>/);
});

test('keeps preschool check-in cards visual and reward-led', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const preschoolStyles = fs.readFileSync(path.join(root, 'css', 'preschool-workbench.css'), 'utf8');
  const styles = readCssGraph(path.join(root, 'styles.css'));
  assert.match(app, /preschool-plan-lanes/);
  assert.match(app, /preschool-home-lane-main/);
  assert.match(app, /preschool-plan-manage/);
  assert.match(app, /创建任务/);
  assert.match(app, /preschool-reward-progress/);
  assert.match(app, /preschool-reward-next/);
  assert.match(app, /sun-progress-bar/);
  assert.match(styles, /preschool-checkin-grid/);
  assert.match(styles, /preschool-checkin-card/);
  assert.match(preschoolStyles, /23-plan-editor\.css/);
  assert.match(styles, /preschool-checkin-card-main/);
  assert.match(styles, /preschool-checkin-card-main\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/);
  assert.match(styles, /preschool-checkin-card-actions/);
  assert.match(styles, /preschool-checkin-card-check \{[^}]*top:\s*9px/);
  assert.match(styles, /preschool-checkin-card-top \{[^}]*padding-right:\s*31px/);
  assert.match(styles, /preschool-reward-progress/);
  assert.match(styles, /@media \(max-width: 560px\)[\s\S]*preschool-checkin-grid/);
});

test('uses transparent PVZ plants and zombie variants across the preschool defense UI', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const styles = readCssGraph(path.join(root, 'styles.css'));
  const config = fs.readFileSync(path.join(root, 'config.js'), 'utf8');
  assert.match(app, /function preschoolPlantAsset\(plant\)/);
  assert.match(app, /'plant-sunflower': 'plant-sunflower'/);
  assert.match(app, /'plant-peashooter': 'plant-peashooter'/);
  assert.match(app, /'plant-wallnut': 'plant-wallnut'/);
  assert.match(app, /'zombie-basic': '\.\.\/\.\.\/pvz\/zombie-basic\.webp'/);
  assert.match(app, /function preschoolInvaderProfile\(invader\)/);
  assert.match(app, /preschoolAsset\(invaderProfile\.asset/);
  assert.match(app, /preschoolAsset\(preschoolPlantAsset\(activePlant\), activePlant\.title\)/);
  assert.match(app, /const plantAsset = preschoolPlantAsset\(activePlant\)/);
  assert.match(app, /pixel-hud-defense-art/);
  assert.match(app, /asset: 'player-energy-bars'/);
  assert.match(config, /selected\.id === 'preschool' \? 'v0\.7\.4 · 幼儿版'/);
  assert.doesNotMatch(config, /v0\.2\.4 · 幼儿版/);
  assert.match(styles, /pixel-hud-defense-art/);
   assert.match(styles, /preschool-pvz-art/);
   assert.match(styles, /PVZ garden correction/);
   for (const asset of ['plant-sunflower.png', 'plant-peashooter.png', 'plant-wallnut.png', 'plant-snowpea.png', 'plant-cherrybomb.webp', 'zombie-basic.webp', 'zombie-conehead.webp', 'zombie-buckethead.webp', 'zombie-flag.webp', 'zombie-football.webp']) {
     assert.equal(fs.existsSync(path.join(root, 'assets', 'generated', 'preschool-pixel', 'pvz', asset)), true, asset);
   }
});

test('cycles through recognizable zombie variants as defense waves advance', () => {
  const garden = globalThis.PersonalWorkbenchPreschoolGarden;
  const first = garden.spawnInvader({ garden: { invader: { wave: 0 } } }, '2026-07-31');
  assert.equal(first.growth.garden.invader.kind, 'zombie-basic');
  const next = garden.spawnInvader({ garden: { invader: { wave: 1 } } }, '2026-07-31');
  assert.equal(next.growth.garden.invader.kind, 'zombie-conehead');
  assert.equal(garden.ZOMBIE_CATALOG.length >= 5, true);
});

test('keeps the 2026-07-31 visual refresh versioned and alpha-safe', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const styles = readCssGraph(path.join(root, 'styles.css'));
  const manifestPath = path.join(root, 'assets', 'generated', 'preschool-pixel', 'refresh-20260731', 'published', 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.match(app, /PIXEL_REFRESH_ASSET_BASE/);
  assert.match(app, /refresh-20260731\/published/);
  assert.match(styles, /refresh-20260731\/published\/garden-map-gpt\.webp/);
  assert.equal(manifest.sources.length, 2);
  assert.equal(manifest.transparentPolicy.cornersMustBeTransparent, true);
  for (const asset of manifest.assets.filter(name => name.endsWith('.png'))) {
    const filePath = path.join(root, 'assets', 'generated', 'preschool-pixel', 'refresh-20260731', 'published', asset);
    assert.equal(fs.existsSync(filePath), true, asset);
    const header = fs.readFileSync(filePath).subarray(0, 8).toString('hex');
    assert.equal(header, '89504e470d0a1a0a', asset);
  }
  assert.equal(fs.existsSync(path.join(root, 'assets', 'generated', 'preschool-pixel', 'refresh-20260731', 'published', 'garden-map-gpt.webp')), true);
});

test('keeps the preschool defense preview visible and readable before an invasion starts', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const styles = readCssGraph(path.join(root, 'styles.css'));
  assert.match(app, /const showInvader = Boolean\(isTarget \|\| \(laneIndex === 2 && !invader\.active && !invader\.wave\) \|\| isDefeated\)/);
  assert.match(app, /pixel-battle-invader \$\{isDefeated \? 'is-defeated' : isTarget \? '' : 'is-preview'\}/);
  assert.match(styles, /Preschool 2\.5 readability/);
  assert.match(styles, /pixel-quest-copy strong \{ font-size: 20px; \}/);
  assert.match(styles, /pixel-battle-invader\.is-preview/);
  assert.match(styles, /pixel-battle-invader\.is-defeated/);
});

test('keeps a defeated zombie in a temporary fall state before removing it', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const styles = readCssGraph(path.join(root, 'styles.css'));
  assert.match(app, /function usePreschoolPlantSkill\(\)[\s\S]*preschoolGarden\.usePlantSkill/);
  assert.match(app, /function firePreschoolPea\(\)[\s\S]*usePreschoolPlantSkill/);
  assert.match(app, /ui\.battleEffect = \{ defeated: result\.defeated, effect: result\.effect \}/);
  assert.match(app, /preschoolBattleEffectTimer = window\.setTimeout/);
  assert.match(app, /ui\.battleEffect = null/);
  assert.match(styles, /pixel-battle-invader\.is-defeated/);
  assert.match(styles, /@keyframes preschool-zombie-fall/);
});

test('makes the preschool defense primary action state explicit', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const styles = readCssGraph(path.join(root, 'styles.css'));
  assert.match(app, /data-defense-state="\$\{invader\.active \? 'active' : 'ready'\}"/);
  assert.match(app, /class="pixel-defense-state \$\{invader\.active \? 'is-active' : 'is-ready'\}"/);
  assert.match(styles, /pixel-defense-state/);
  assert.match(styles, /points-chip \.preschool-generated-art \{ display: block; flex: 0 0 24px; width: 24px; height: 24px;/);
});

test('keeps preschool reward feedback visible in the flat first-screen contract', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const styles = readCssGraph(path.join(root, 'styles.css'));
  const preschoolStyles = readCssGraph(path.join(root, 'css', 'preschool-workbench.css'));
  assert.match(app, /preschool-home-lane-status/);
  assert.match(app, /preschool-home-battlefield-foot/);
  assert.match(app, /preschool-celebration-resources/);
  assert.match(app, /defenseEnergyGranted/);
  assert.match(app, /pixel-hud-sun/);
  assert.match(app, /is-bumped/);
  assert.match(preschoolStyles, /preschool-home-lane-status/);
  assert.match(preschoolStyles, /preschool-home-battlefield-foot/);
  assert.match(styles, /preschool-celebration-resources/);
  assert.match(styles, /preschool-hud-bump/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
});

test('uses a flat preschool battlefield overview while keeping the battle route separate', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const styles = readCssGraph(path.join(root, 'styles.css'));
  const preschoolStyles = fs.readFileSync(path.join(root, 'css', 'preschool-workbench.css'), 'utf8');
  const preschoolStyleGraph = readCssGraph(path.join(root, 'css', 'preschool-workbench.css'));
  assert.match(app, /workbench-overview/);
  assert.match(app, /preschool-home-overview/);
  assert.match(app, /preschool-home-battlefield/);
  assert.match(app, /preschool-home-lane/);
  assert.match(app, /data-action="toggle-plan"/);
  assert.doesNotMatch(app, /renderPreschoolActionPath\(derived, growth, defense\)/);
  assert.doesNotMatch(app, /workbench-home-quest-panel/);
  assert.match(app, /data-page="battle"/);
  assert.match(app, /data-page="rewards"/);
  assert.match(app, /function renderPreschoolDefenseGame\(\)/);
  assert.match(preschoolStyles, /15-workbuddy-overview\.css/);
  assert.match(preschoolStyles, /19-home-battlefield\.css/);
  assert.match(styles, /workbench-overview/);
  assert.match(styles, /@media \(max-width: 760px\)[\s\S]*workbench-overview/);
});

test('organizes the preschool home tasks as a responsive reference task wall', () => {
  const styles = readCssGraph(path.join(root, 'css', 'preschool-workbench.css'));
  assert.match(styles, /preschool-home-lanes\s*\{[\s\S]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(styles, /@media \(min-width: 1181px\)[\s\S]*preschool-home-lanes\s*\{[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(styles, /@media \(min-width: 761px\) and \(max-width: 1180px\)[\s\S]*preschool-home-lanes\s*\{[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(styles, /@media \(max-width: 760px\)[\s\S]*preschool-home-lanes\s*\{[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(styles, /preschool-home-lane-main\s*\{[\s\S]*grid-template-rows:\s*auto auto/);
  assert.match(styles, /preschool-home-lane-status\s*\{[\s\S]*grid-column:\s*3/);
  assert.match(styles, /preschool-home-lane-practice\s*\{[\s\S]*grid-column:\s*1 \/ -1/);
  assert.match(styles, /preschool-home-review\s*\{/);
});

test('translates the reference dashboard rhythm into existing preschool state', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const preschoolStyles = fs.readFileSync(path.join(root, 'css', 'preschool-workbench.css'), 'utf8');
  const preschoolStyleGraph = readCssGraph(path.join(root, 'css', 'preschool-workbench.css'));
  const homeStart = app.indexOf('function renderPreschoolHomeOverview');
  const homeEnd = app.indexOf('function renderPreschoolPage', homeStart);
  const homeTemplate = app.slice(homeStart, homeEnd);
  const identityStart = app.indexOf('function renderPreschoolHomeIdentity');
  const identityEnd = app.indexOf('function renderPreschoolHomeRhythm', identityStart);
  const identityTemplate = app.slice(identityStart, identityEnd);
  assert.match(app, /function renderPreschoolHomeRhythm\(derived\)/);
  assert.match(app, /function getPreschoolPlanMinutes\(item\)/);
  assert.match(app, /preschool-home-task-overview/);
  assert.match(app, /必做任务/);
  assert.match(app, /选做挑战/);
  assert.match(app, /计划用时/);
  assert.match(app, /preschool-home-date/);
  assert.doesNotMatch(homeTemplate, /renderPreschoolHomeRhythm\(derived\)/);
  assert.match(identityTemplate, /preschool-home-companion-tile/);
  assert.match(identityTemplate, /data-page="growth"/);
  assert.doesNotMatch(identityTemplate, /<small>阳光<\/small>/);
  assert.doesNotMatch(identityTemplate, /<small>豌豆能量<\/small>/);
  assert.match(preschoolStyles, /25-reference-dashboard\.css/);
  assert.match(preschoolStyleGraph, /preschool-home-rhythm/);
  assert.match(preschoolStyleGraph, /preschool-home-task-overview/);
  assert.match(preschoolStyleGraph, /@media \(max-width: 760px\)[\s\S]*preschool-home-rhythm/);
});

test('keeps world progress and weekly rhythm off the preschool home', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const homeStart = app.indexOf('function renderPreschoolHomeOverview(derived)');
  const homeEnd = app.indexOf('function renderPreschoolPage(derived)', homeStart);
  const homeTemplate = app.slice(homeStart, homeEnd);
  const growthStart = app.indexOf('function renderPreschoolGrowth()');
  const growthEnd = app.indexOf('function renderPreschoolPlans', growthStart);
  const growthTemplate = app.slice(growthStart, growthEnd);
  assert.doesNotMatch(homeTemplate, /renderPreschoolHomeWorldProgress\(/);
  assert.doesNotMatch(homeTemplate, /renderPreschoolHomeRhythm\(/);
  assert.match(growthTemplate, /renderPreschoolHomeWorldProgress\(/);
  assert.match(growthTemplate, /renderPreschoolHomeRhythm\(derived\)/);
});

test('puts a single real-work workflow card above preschool home check-in lanes', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const styles = fs.readFileSync(path.join(root, 'css', 'preschool', '37-home-simple.css'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'preschool-workbench', 'index.html'), 'utf8');
  const workflowStart = app.indexOf('function getPreschoolHomeWorkflow');
  const heroStart = app.indexOf('function renderPreschoolHomeHero');
  const heroEnd = app.indexOf('function renderPreschoolHomeRhythm', heroStart);
  const homeStart = app.indexOf('function renderPreschoolHomeOverview(derived)');
  const homeEnd = app.indexOf('function renderPreschoolPage(derived)', homeStart);
  const homeTemplate = app.slice(homeStart, homeEnd);
  const heroRender = heroStart === -1 || heroEnd === -1 ? '' : app.slice(heroStart, heroEnd);
  assert.notEqual(workflowStart, -1);
  assert.notEqual(heroStart, -1);
  assert.match(homeTemplate, /renderPreschoolHomeHero\(/);
  assert.match(heroRender, /preschoolWorkflowActionAttrs/);
  assert.match(heroRender, /已完成练习/);
  assert.match(app, /function preschoolWorkflowActionAttrs[\s\S]*open-plan-practice/);
  assert.match(app, /function preschoolWorkflowActionAttrs[\s\S]*open-world-game/);
  assert.doesNotMatch(heroRender, /toggle-plan/);
  assert.doesNotMatch(heroRender, /再完成\s*\d+\s*项打卡/);
  assert.match(app, /item\.done && item\.completionSource === 'practice'/);
  assert.match(styles, /preschool-home-hero/);
  assert.match(html, /app\.js\?v=20260819-v074/);
  assert.doesNotMatch(app, /首页只负责打卡/);
});

test('connects the preschool home to the game-study loop without nesting the lesson engine', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const styles = readCssGraph(path.join(root, 'styles.css'));
  const preschoolStyles = fs.readFileSync(path.join(root, 'css', 'preschool-workbench.css'), 'utf8');
  const preschoolStyleGraph = readCssGraph(path.join(root, 'css', 'preschool-workbench.css'));
  const preschoolIndex = fs.readFileSync(path.join(root, 'preschool-workbench', 'index.html'), 'utf8');
  const homeStart = app.indexOf('function renderPreschoolHomeOverview(derived)');
  const homeEnd = app.indexOf('function renderPreschoolPage(derived)', homeStart);
  const homeTemplate = app.slice(homeStart, homeEnd);
  assert.match(homeTemplate, /renderPreschoolHomeIdentity/);
  assert.match(homeTemplate, /renderPreschoolHomeHero/);
  assert.doesNotMatch(homeTemplate, /renderPreschoolHomeEvidence/);
  assert.match(app, /pixel-settings-button[\s\S]*icon\('settings-2'\)/);
  assert.doesNotMatch(app, /pixel-settings-button[\s\S]*icon\('settings'\)/);
  assert.match(app, /function renderPreschoolHomeIdentity[\s\S]*data-page="growth"/);
  assert.match(app, /function renderPreschoolHomeEvidence[\s\S]*data-action="navigate" data-page="courses"/);
  assert.doesNotMatch(homeTemplate, /data-action="open-lesson"/);
  assert.match(app, /preschool-home-identity/);
  assert.match(app, /preschool-home-evidence/);
  assert.match(preschoolStyles, /24-game-study-loop\.css/);
  assert.match(preschoolStyles, /37-home-simple\.css/);
  assert.match(preschoolStyleGraph, /preschool-home-identity/);
  assert.match(preschoolStyleGraph, /preschool-home-evidence/);
  assert.match(preschoolStyleGraph, /preschool-home-hero/);
  assert.match(preschoolIndex, /v0\.7\.4 · 幼儿版/);
  assert.doesNotMatch(preschoolIndex, /v0\.4\.2 · 幼儿版/);
});

test('keeps the preschool workbench on the garden-green shell', () => {
  const preschoolStyles = fs.readFileSync(path.join(root, 'css', 'preschool-workbench.css'), 'utf8');
  const greenTheme = fs.readFileSync(path.join(root, 'css', 'preschool', '18-green-theme-restore.css'), 'utf8');
  const preschoolIndex = fs.readFileSync(path.join(root, 'preschool-workbench', 'index.html'), 'utf8');
  assert.match(preschoolStyles, /18-green-theme-restore\.css/);
  assert.match(greenTheme, /background:\s*linear-gradient\(180deg,\s*#22734a,\s*#145238\)/);
  assert.match(greenTheme, /background:\s*#eff9eb/);
  assert.match(preschoolIndex, /theme-color" content="#2d8748"/);
  assert.match(preschoolIndex, /data-workbench-variant="preschool"/);
});

test('keeps three preschool visual themes on one persisted workbench contract', () => {
  const config = fs.readFileSync(path.join(root, 'config.js'), 'utf8');
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const preschoolStyles = fs.readFileSync(path.join(root, 'css', 'preschool-workbench.css'), 'utf8');
  const themeStyles = readCssGraph(path.join(root, 'css', 'preschool-workbench.css'));
  const preschoolIndex = fs.readFileSync(path.join(root, 'preschool-workbench', 'index.html'), 'utf8');
  assert.match(config, /garden-defense/);
  assert.match(config, /voxel-adventure/);
  assert.match(config, /platform-quest/);
  assert.match(config, /name: '植物僵尸工作台'/);
  assert.match(config, /name: '我的世界工作台'/);
  assert.match(config, /name: '马里奥工作台'/);
  assert.match(app, /function applyPreschoolTheme\(\)/);
  assert.match(app, /function selectPreschoolTheme\(themeId\)/);
  assert.match(app, /next\.preschoolTheme = themeId/);
  assert.match(preschoolStyles, /26-theme-skins\.css/);
  assert.match(themeStyles, /data-preschool-theme='voxel-adventure'/);
  assert.match(themeStyles, /data-preschool-theme='platform-quest'/);
  assert.match(themeStyles, /voxel-v2\/reference\/voxel-hero\.png/);
  assert.match(themeStyles, /platform-v2\/reference\/platform-hero\.png/);
  assert.match(preschoolIndex, /data-preschool-nav-art="brand"/);
  const voxelState = storage.normalizeState({ tasks: [], dailyPlans: [], preschoolTheme: 'voxel-adventure' });
  assert.equal(voxelState.preschoolTheme, 'voxel-adventure');
  const invalidState = storage.normalizeState({ tasks: [], dailyPlans: [], preschoolTheme: 'not-a-theme' });
  assert.equal(invalidState.preschoolTheme, 'garden-defense');
});

test('keeps the themed topbar switcher above paper-glow page content', () => {
  const glow = fs.readFileSync(path.join(root, 'css', 'preschool', '38-paper-glow.css'), 'utf8');
  const flatten = glow.indexOf('.main-content > *');
  assert.ok(flatten >= 0);
  assert.ok(glow.indexOf('z-index: 1', flatten) > flatten);
  const topbar = glow.indexOf('[data-preschool-theme] .topbar');
  assert.ok(topbar > flatten);
  assert.match(glow.slice(topbar, topbar + 160), /z-index:\s*(?:[2-9]\d|[1-9]\d{2,})/);
});

test('keeps the voxel home sidebar offset and uses the generated block-world frame', () => {
  const workshop = fs.readFileSync(path.join(root, 'css', 'preschool', '31-voxel-workshop.css'), 'utf8');
  const home = fs.readFileSync(path.join(root, 'css', 'preschool', '37-home-simple.css'), 'utf8');
  const asset = path.join(root, 'assets', 'generated', 'preschool-theme-assets', 'voxel-v2', 'reference', 'voxel-page-bg.webp');
  const platformAsset = path.join(root, 'assets', 'generated', 'preschool-theme-assets', 'platform-v2', 'reference', 'platform-page-bg.webp');
  assert.match(workshop, /:has\(\.voxel-workshop\) \.main-content/);
  assert.doesNotMatch(workshop, /data-preschool-theme='voxel-adventure'\] \.main-content \{\s*margin:\s*0;/);
  assert.match(home, /data-preschool-theme='voxel-adventure'\] \.preschool-home-hero-card/);
  assert.match(home, /voxel-v2\/reference\/voxel-page-bg\.webp/);
  assert.match(home, /data-preschool-theme='platform-quest'\] \.preschool-home-hero-card/);
  assert.match(home, /platform-v2\/reference\/platform-page-bg\.webp/);
  assert.match(home, /margin-left:\s*var\(--sidebar-width\)/);
  assert.equal(fs.existsSync(asset), true);
  assert.equal(fs.existsSync(platformAsset), true);
});

test('accepts the launcher theme query before the preschool page renders', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.match(app, /function getRequestedPreschoolTheme\(\)/);
  assert.match(app, /new URLSearchParams\(location\.search/);
  assert.match(app, /state = Object\.assign\(\{\}, state, \{ preschoolTheme: requestedPreschoolTheme \}\)/);
});

test('in-app switcher exposes five entries including three preschool themes', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const config = fs.readFileSync(path.join(root, 'config.js'), 'utf8');
  const styles = fs.readFileSync(path.join(root, 'css', 'child.css'), 'utf8');
  assert.match(app, /function getWorkbenchSwitchEntries\(\)/);
  assert.match(app, /getWorkbenchSwitchEntries\(\)/);
  assert.match(app, /data-workbench-theme="\$\{escapeHtml\(entry\.theme\)\}"|data-workbench-theme="\$\{escapeHtml\(themeId\)\}"/);
  assert.match(app, /theme=garden-defense/);
  assert.match(app, /theme=voxel-adventure/);
  assert.match(app, /theme=platform-quest/);
  assert.match(app, /五个入口/);
  assert.match(config, /data-workbench-theme/);
  assert.match(styles, /workbench-switch-grid[\s\S]*repeat\(auto-fit|repeat\(2|repeat\(3|minmax\(0, 1fr\)/);
});

test('voxel and platform themes use their own game-like home and battle playbooks', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.match(app, /function getPreschoolThemePlaybook\(\)/);
  assert.match(app, /voxel-adventure[\s\S]*方块|我的世界|晶体|基地/);
  assert.match(app, /platform-quest[\s\S]*闯关|金币|平台|旗/);
  assert.match(app, /getPreschoolThemePlaybook\(\)/);
  assert.match(app, /playbook\.homeTitle|playbook\.homeKicker|homeTitle:/);
  assert.match(app, /playbook\.battleTitle|battleTitle:/);
  assert.match(app, /voxel-grass-block|voxel-block-tree|voxel-purple-crystal/);
  assert.match(app, /platform-grass-platform|platform-brick|platform-coin|platform-flag/);
});

test('keeps preschool mobile status cards readable at reference widths', () => {
  const styles = readCssGraph(path.join(root, 'styles.css'));
  assert.match(styles, /Preschool 2\.4 mobile fidelity/);
  assert.match(styles, /@media \(max-width: 560px\)[\s\S]*?pixel-stat-strip \{[^}]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)/);
  assert.match(styles, /@media \(max-width: 560px\)[\s\S]*?pixel-stat-card \{[^}]*min-height:\s*56px/);
  assert.match(styles, /@media \(max-width: 560px\)[\s\S]*?pixel-stat-copy \{[^}]*min-width:\s*0/);
  assert.match(styles, /@media \(max-width: 560px\)[\s\S]*?pixel-stat-copy \{[^}]*flex:\s*1 1 0/);
  assert.match(styles, /@media \(max-width: 560px\)[\s\S]*?pixel-stat-copy strong \{[^}]*font-size:\s*11px/);
  assert.match(styles, /@media \(max-width: 560px\)[\s\S]*?pixel-stat-card[^}]*min-width:\s*0/);
  assert.match(styles, /pixel-pea-button \{[^}]*min-height:\s*44px/);
  assert.match(styles, /@media \(max-width: 560px\)[\s\S]*?\.brand strong \{[^}]*white-space:\s*normal/);
  assert.match(styles, /@media \(max-width: 360px\)[\s\S]*?html,\s*body \{[^}]*min-width:\s*0/);
  assert.match(styles, /@media \(max-width: 360px\)[\s\S]*?overflow-x:\s*clip/);
  assert.match(styles, /Preschool 2\.4 320px status cards[\s\S]*?pixel-stat-strip \{[^}]*grid-template-columns:\s*repeat\(2/);
});

test('resets the page scroll position when switching workbench routes', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.match(app, /function setPage\([\s\S]*?window\.scrollTo\(0, 0\)/);
  assert.match(app, /hashchange[\s\S]*?window\.scrollTo\(0, 0\)/);
});

test('gives preschool PVZ characters a gentle game idle animation with a reduced-motion fallback', () => {
  const styles = readCssGraph(path.join(root, 'css', 'preschool-workbench.css'));
  assert.match(styles, /@keyframes preschool-pvz-plant-sway/);
  assert.match(styles, /pixel-battle-plant-column \.preschool-pvz-art[\s\S]*animation: preschool-pvz-plant-sway/);
  assert.match(styles, /@keyframes preschool-pvz-zombie-wobble/);
  assert.match(styles, /pixel-battle-invader[\s\S]*animation: preschool-pvz-zombie-wobble/);
  assert.match(styles, /@keyframes preschool-pvz-sun-pulse/);
  assert.match(styles, /pvz-seed-art \.preschool-pvz-art[\s\S]*animation: preschool-pvz-sun-pulse/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*pixel-battle-plant-column \.preschool-pvz-art[\s\S]*animation: none/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*pixel-battle-invader[\s\S]*animation: none/);
});

test('keeps the approved WorkBuddy finish layer and mobile shortcut contract', () => {
  const preschoolStyles = fs.readFileSync(path.join(root, 'css', 'preschool-workbench.css'), 'utf8');
  const compatibilityStyles = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
  const styles = readCssGraph(path.join(root, 'styles.css'));
  const preschoolIndex = fs.readFileSync(path.join(root, 'preschool-workbench', 'index.html'), 'utf8');
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.match(preschoolStyles, /16-workbuddy-finish\.css/);
  assert.match(compatibilityStyles, /16-workbuddy-finish\.css/);
  assert.match(styles, /--wb-brand:\s*#ff8c42/);
  assert.match(styles, /--wb-mint:\s*#4ecdc4/);
  assert.match(styles, /\.wb-glass-card/);
  assert.match(styles, /\.wb-soft-button/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  for (const item of [
    ['overview', '首页'],
    ['courses', '学习'],
    ['battle', '花园保卫战'],
    ['rewards', '奖励'],
    ['more', '更多']
  ]) {
    const [action, label] = item;
    assert.match(preschoolIndex, new RegExp(`data-mobile-nav="${action}"`));
    assert.match(preschoolIndex, new RegExp(`aria-label="${label}"`));
  }
  assert.match(preschoolIndex, /class="preschool-mobile-nav"/);
  assert.match(preschoolIndex, /<span>花园保卫战<\/span>/);
  assert.match(styles, /safe-area-inset-bottom/);
  assert.match(styles, /preschool-mobile-nav-item \{ min-width: 44px; touch-action: manipulation; \}/);
  assert.match(app, /querySelectorAll\('\[data-mobile-nav\]'\)[\s\S]*classList\.toggle\('is-active'/);
});

test('defines answerable activities for every preschool lesson', () => {
  const config = fs.readFileSync(path.join(root, 'config.js'), 'utf8');
  const preschoolCourses = config.split("id: 'preschool-literacy'")[1].split("actions: { 'add-plan'")[0];
  const activities = preschoolCourses.match(/activity:\s*\{/g) || [];
  assert.equal(activities.length, 31);
  assert.equal((preschoolCourses.match(/optionIcons:\s*\[/g) || []).length, 31);
  assert.match(preschoolCourses, /prompt: '/);
  assert.match(preschoolCourses, /options: \[/);
  assert.match(preschoolCourses, /answer: \d/);
  assert.match(preschoolCourses, /success: '/);
});

test('keeps preschool option art aligned with its answer choices', () => {
  const config = fs.readFileSync(path.join(root, 'config.js'), 'utf8');
  const iconsSource = fs.readFileSync(path.join(root, 'icons.js'), 'utf8');
  const preschoolCourses = config.split("id: 'preschool-literacy'")[1].split("actions: { 'add-plan'")[0];
  const iconNames = new Set(Array.from(iconsSource.matchAll(/(?:'([^']+)'|([a-z][a-z0-9-]*)):\s*'/g), function (match) {
    return match[1] || match[2];
  }));
  const activities = Array.from(preschoolCourses.matchAll(/activity:\s*\{([\s\S]*?)\}/g), function (match) {
    const options = match[1].match(/options:\s*\[([^\]]*)\]/);
    const optionIcons = match[1].match(/optionIcons:\s*\[([^\]]*)\]/);
    return {
      options: options ? (options[1].match(/'[^']*'/g) || []) : [],
      optionIcons: optionIcons ? (optionIcons[1].match(/'[^']*'/g) || []) : []
    };
  });
  assert.equal(activities.length, 31);
  for (const activity of activities) {
    assert.equal(activity.optionIcons.length, activity.options.length);
    for (const item of activity.optionIcons) {
      assert.ok(iconNames.has(item.slice(1, -1)), `unknown preschool option icon: ${item}`);
    }
  }
});

test('keeps every literal runtime icon reference backed by the offline icon registry', () => {
  const iconsSource = fs.readFileSync(path.join(root, 'icons.js'), 'utf8');
  const iconNames = new Set(Array.from(iconsSource.matchAll(/(?:'([^']+)'|([a-z][a-z0-9-]*)):\s*'/g), function (match) {
    return match[1] || match[2];
  }));
  const runtimeSources = fs.readdirSync(root, { withFileTypes: true })
    .filter(item => item.isFile() && item.name.endsWith('.js') && item.name !== 'icons.js')
    .map(item => fs.readFileSync(path.join(root, item.name), 'utf8'));
  const htmlSources = [
    'index.html',
    '成人成长工作台/index.html',
    '儿童学习工作台/index.html',
    'preschool-workbench/index.html'
  ].filter(file => fs.existsSync(path.join(root, file)))
    .map(file => fs.readFileSync(path.join(root, file), 'utf8'));
  const references = new Set();
  const nonIconLiterals = new Set(['done', 'mastered', 'steady']);
  runtimeSources.forEach(function (source) {
    Array.from(source.matchAll(/icon\(([^)]*)\)/g)).forEach(function (match) {
      Array.from(match[1].matchAll(/['"]([a-z][a-z0-9-]*)['"]/g)).forEach(function (item) {
        if (!nonIconLiterals.has(item[1])) references.add(item[1]);
      });
    });
    Array.from(source.matchAll(/\b(?:icon|switchIcon):\s*['"]([a-z][a-z0-9-]*)['"]/g)).forEach(item => references.add(item[1]));
  });
  htmlSources.forEach(function (source) {
    Array.from(source.matchAll(/data-lucide=["']([a-z][a-z0-9-]*)["']/g)).forEach(item => references.add(item[1]));
  });
  const missing = Array.from(references).filter(name => !iconNames.has(name)).sort();
  assert.deepEqual(missing, []);
});

test('exposes the preschool lesson activity dialog contract', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const styles = fs.readFileSync(path.join(root, 'css', 'preschool', '16-workbuddy-finish.css'), 'utf8');
  const preschoolIndex = fs.readFileSync(path.join(root, 'preschool-workbench', 'index.html'), 'utf8');
  assert.match(preschoolIndex, /id="lesson-dialog"/);
  assert.match(preschoolIndex, /id="lesson-dialog-content"/);
  assert.match(preschoolIndex, /data-action="close-lesson"/);
  assert.match(app, /lessonSession/);
  assert.match(app, /data-action="open-lesson"/);
  assert.match(app, /lesson-answer/);
  assert.match(app, /lesson-finish/);
  assert.match(app, /lesson-dialog-option-art/);
  assert.match(app, /lesson-dialog-progress/);
  assert.match(styles, /lesson-dialog-option-art/);
  assert.match(styles, /lesson-dialog-progress-track/);
});

test('keeps quick tests in the learning area instead of nesting them on the home page', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.match(app, /getNextPreschoolLesson/);
  assert.match(app, /data-action="open-lesson" data-id=/);
  const homePosition = app.indexOf('function renderPreschoolHomeOverview(derived)');
  const homeEnd = app.indexOf('function renderPreschoolPage(derived)', homePosition);
  const homeTemplate = app.slice(homePosition, homeEnd);
  assert.doesNotMatch(homeTemplate, /open-lesson/);
});

test('removes the duplicated preschool action path from the home page', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const styles = readCssGraph(path.join(root, 'styles.css'));
  assert.doesNotMatch(app, /function renderPreschoolActionPath\(/);
  assert.doesNotMatch(app, /preschool-action-path/);
  assert.doesNotMatch(styles, /preschool-action-path/);
});

test('shows progress and current state on the preschool course wall', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const styles = readCssGraph(path.join(root, 'css', 'preschool-workbench.css'));
  assert.match(app, /preschool-course-wall-dots/);
  assert.match(app, /preschool-course-wall-state/);
  assert.match(app, /preschool-course-wall-preview/);
  assert.match(app, /function getPreschoolCourseTodayPreview\(course\)/);
  assert.match(app, /getPreschoolCourseTodayPreview\(course\)/);
  assert.match(app, /role="progressbar"/);
  assert.match(app, /data-route-state="\$\{status\}"/);
  assert.match(styles, /preschool-course-wall-dots/);
  assert.match(styles, /preschool-course-wall-state/);
  assert.match(styles, /preschool-course-wall-preview/);
});

test('keeps sidebar course lanes as the persistent navigation on focused course pages', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const styles = readCssGraph(path.join(root, 'styles.css'));
  const preschoolIndex = fs.readFileSync(path.join(root, 'preschool-workbench', 'index.html'), 'utf8');
  assert.doesNotMatch(app, /renderPreschoolCourseDirectory/);
  assert.match(preschoolIndex, /data-sidebar-section="course-lanes"/);
  assert.match(styles, /preschool-course-layout\.is-focused[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.doesNotMatch(styles, /preschool-courses-page[\s\S]*preschool-course-sidebar-section/);
});

test('keeps the preschool sidebar visible in landscape and manually collapsible in portrait', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const styles = readCssGraph(path.join(root, 'styles.css'));
  const preschoolStyles = fs.readFileSync(path.join(root, 'css', 'preschool-workbench.css'), 'utf8');
  assert.match(app, /function shouldAutoCloseSidebar\(\)/);
  assert.match(app, /matchMedia\('\(max-aspect-ratio: 1 \/ 1\)'\)/);
  assert.match(app, /if \(shouldAutoCloseSidebar\(\)\) closeSidebar\(\)/);
  assert.match(preschoolStyles, /20-sidebar-orientation\.css/);
  assert.match(styles, /@media \(min-aspect-ratio: 1 \/ 1\) and \(max-width: 860px\)[\s\S]*\.sidebar \{[^}]*transform:\s*translateX\(0\)/);
  assert.match(styles, /@media \(max-aspect-ratio: 1 \/ 1\) and \(max-width: 760px\)[\s\S]*\.sidebar \{[^}]*transform:\s*translateX\(-100%\)/);
  assert.match(styles, /@media \(min-aspect-ratio: 1 \/ 1\) and \(max-width: 860px\)[\s\S]*\.sidebar-scrim,[\s\S]*\.menu-toggle,[\s\S]*display:\s*none/);
  assert.match(styles, /@media \(max-aspect-ratio: 1 \/ 1\) and \(max-width: 760px\)[\s\S]*\.menu-toggle,[\s\S]*\.sidebar-close \{[^}]*display:\s*inline-grid/);
  assert.match(styles, /sidebar-scrim\.is-visible[\s\S]*display:\s*block !important/);
});

test('restores the summer learning lane without loading the full library into the home page', () => {
  const config = fs.readFileSync(path.join(root, 'config.js'), 'utf8');
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const preschoolIndex = fs.readFileSync(path.join(root, 'preschool-workbench', 'index.html'), 'utf8');
  const compatibilityStyles = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
  const styles = readCssGraph(path.join(root, 'styles.css'));
  assert.match(config, /id: 'preschool-summer'/);
  assert.match(config, /今日精选 · 6 张 \+ 完整资料库/);
  assert.equal((config.match(/id: 'summer-[^']+'/g) || []).length, 6);
  assert.match(config, /id: 'preschool-summer-4'/);
  const summerBlock = config.split("id: 'preschool-summer'")[1].split("id: 'preschool-literacy'")[0];
  assert.match(summerBlock, /id: 'preschool-summer-1'[\s\S]*mode: 'choice'/);
  assert.match(summerBlock, /id: 'preschool-summer-2'[\s\S]*mode: 'literacy-flash'/);
  assert.match(summerBlock, /id: 'preschool-summer-3'[\s\S]*mode: 'poetry-line'[\s\S]*preferred: 'poem-yong-e'/);
  assert.match(summerBlock, /id: 'preschool-summer-4'[\s\S]*mode: 'literacy-flash'/);
  assert.doesNotMatch(summerBlock, /哪个是植物/);
  assert.doesNotMatch(summerBlock, /白毛浮在哪里/);
  assert.match(app, /function renderPreschoolCourseResources\(course\)/);
  assert.match(app, /function renderPreschoolSummerLibrary\(course\)/);
  assert.match(app, /renderPreschoolCourseResources\(course\)/);
  assert.match(app, /renderPreschoolSummerLibrary\(course\)/);
  assert.match(app, /data-action="summer-library-category"/);
  assert.match(app, /action === 'summer-library-step'/);
  assert.match(app, /target\.dataset\.action === 'summer-library-item'/);
  assert.match(preschoolIndex, /preschool-summer-learning-data\.js/);
  assert.match(preschoolIndex, /data-action="open-course-wall"/);
  assert.match(preschoolIndex, /sidebar-section-toggle-meta">卡片墙/);
  assert.doesNotMatch(preschoolIndex, /data-course-id="preschool-summer"/);
  assert.match(app, /action === 'open-course-wall'/);
  assert.match(app, /setPage\('courses'\)/);
  assert.match(compatibilityStyles, /21-summer-library\.css/);
  assert.match(styles, /preschool-course-resource-list/);
  assert.match(styles, /preschool-summer-library-categories/);
});

test('exposes one interactive 5x6 planting board and a drag-capable seed tray', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const garden = fs.readFileSync(path.join(root, 'games', 'garden-defense', 'game.js'), 'utf8');
  assert.match(app, /worldGameHref:\s*'\.\.\/games\/garden-defense\/index\.html'/);
  assert.match(app, /open-world-game/);
  assert.match(garden, /BOARD_COLUMNS/);
  assert.match(garden, /seed|plant/i);
});

test('routes plant skills by effect instead of animating every plant as a pea shooter', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.match(app, /function animatePreschoolPea\(effect\)/);
  assert.match(app, /\['pea', 'ice-pea', 'blast'\]\.includes\(skill\)/);
  assert.match(app, /if \(skill === 'blast'\)/);
  assert.match(app, /result\.effect/);
});

test('turns flashcard subjects into a flip-card page with known/unknown marking', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const styles = readCssGraph(path.join(root, 'css', 'preschool-workbench.css'));
  const workbenchCss = fs.readFileSync(path.join(root, 'css', 'preschool-workbench.css'), 'utf8');
  assert.match(app, /PRESCHOOL_FLASHCARD_COURSES = new Set\(\['preschool-literacy', 'preschool-english', 'preschool-minecraft', 'preschool-pinyin', 'preschool-phonics', 'preschool-math'\]\)/);
  assert.match(app, /PRESCHOOL_TODAY_PAGE_COURSES = new Set\(\['preschool-summer', 'preschool-literacy', 'preschool-pinyin', 'preschool-poetry', 'preschool-math', 'preschool-focus', 'preschool-english', 'preschool-minecraft', 'preschool-phonics', 'preschool-exercise'\]\)/);
  assert.match(app, /PRESCHOOL_FLASHCARD_MARK_LABELS = \{ 'preschool-math': \['再练练', '答对了'\] \}/);
  assert.match(app, /function buildPreschoolCourseCardItems\(course\)/);
  assert.match(app, /buildFlashBatch/);
  assert.match(app, /buildSpeakBatch/);
  assert.match(app, /markFlash\(current, item\.key/);
  assert.match(app, /markKnown\(current, item\.key/);
  assert.match(app, /saveMinecraft/);
  assert.match(app, /label: '讲解'/);
  assert.match(app, /label: '同音'/);
  assert.match(app, /label: '近音'/);
  assert.match(app, /label: '读音'/);
  assert.match(app, /data-action="set-minecraft-band"/);
  assert.match(app, /Minecraft 英语/);
  assert.match(app, /commitPreschoolSubjectMark\(trackName, \[item\.key\], known\)/);
  assert.match(app, /markSubjectReady\(current, keys/);
  assert.match(app, /function renderPreschoolCourseFlashcards\(course\)/);
  assert.match(app, /function renderPreschoolFlashcardComplete\(course, session\)/);
  assert.match(app, /data-action="flashcard-mark" data-known="0"/);
  assert.match(app, /data-action="flashcard-classic"/);
  assert.match(app, /if \(action === 'flashcard-mark'\) markPreschoolFlashcard/);
  // 五科今日页：古诗/运动浏览卡 + 专注启动页 + 暑假今日资料
  assert.match(app, /function renderPreschoolSubjectTodayPage\(course\)/);
  assert.match(app, /function getPreschoolBrowseCardSession\(course\)/);
  assert.match(app, /function renderPreschoolBrowseCards\(course\)/);
  assert.match(app, /function renderPreschoolPoetryToday\(course\)/);
  assert.match(app, /function renderPreschoolMotionComplete\(course, session\)/);
  assert.match(app, /function renderPreschoolFocusToday\(course\)/);
  assert.match(app, /function renderPreschoolSummerToday\(course\)/);
  assert.match(app, /function commitPreschoolSubjectMark\(trackName, keys, known\)/);
  assert.match(app, /data-action="flashcard-prev"/);
  assert.match(app, /data-action="flashcard-next"/);
  assert.match(app, /data-action="flashcard-poem-mark"/);
  assert.match(app, /data-action="flashcard-motion-done"/);
  assert.match(app, /data-action="flashcard-summer-open"/);
  assert.match(app, /暑假 · 今日资料/);
  assert.doesNotMatch(app, /暑假 · 今日任务/);
  assert.match(app, /今天看一看，点开就能读/);
  assert.match(app, /open-timed-checkin/);
  assert.match(app, /function isPreschoolTimedCheckin/);
  assert.match(app, /timed-checkin/);
  assert.match(app, /if \(action === 'flashcard-prev'\)/);
  assert.match(app, /if \(action === 'flashcard-next'\)/);
  assert.match(app, /if \(action === 'flashcard-poem-mark'\) markPreschoolPoem/);
  assert.match(app, /if \(action === 'flashcard-motion-done'\) markPreschoolMotionDone/);
  assert.match(app, /if \(action === 'flashcard-summer-open'\)/);
  assert.match(app, /buildQuiz\(engine\.getRuntimeBank\(\)/);
  // 古诗今日一首：全文 + 讲解一页展示，不再逐句翻卡
  assert.match(app, /function getPreschoolPoetryTodaySession\(course\)/);
  assert.match(app, /preschool-poem-today/);
  assert.match(app, /preschool-poem-meaning/);
  assert.match(app, /听整首/);
  assert.doesNotMatch(app, /renderPreschoolPoetryComplete/);
  const poetryEngine = fs.readFileSync(path.join(root, 'preschool-poetry.js'), 'utf8');
  assert.match(poetryEngine, /meaning: String\(source\.meaning \|\| ''\)\.trim\(\)/);
  const poemBank = JSON.parse(fs.readFileSync(path.join(root, 'data', 'preschool', '古诗', 'poem-bank.json'), 'utf8'));
  assert.ok(poemBank.length >= 30);
  assert.ok(poemBank.every(poem => typeof poem.meaning === 'string' && poem.meaning.length >= 8));
  const html = fs.readFileSync(path.join(root, 'preschool-workbench', 'index.html'), 'utf8');
  assert.match(html, /preschool-poetry-data\.js\?v=20260815-poem-meaning-v1/);
  assert.match(html, /preschool-poetry\.js\?v=20260815-poem-meaning-v1/);
  assert.match(workbenchCss, /35-course-flashcards\.css\?v=20260818-phonics-zh-v1/);
  assert.match(styles, /preschool-card-art/);
  assert.match(styles, /preschool-flashcard-cover/);
  assert.match(app, /data-action="flashcard-reveal"/);
  assert.match(app, /if \(!known && !session\.revealed\[item\.key\]\)/);
  assert.match(styles, /preschool-flashcard-actions/);
  assert.match(styles, /preschool-flashcard-mark\.is-known/);
  assert.match(styles, /preschool-flashcard-mark\.is-nav/);
  assert.match(styles, /preschool-flashcard-complete-lessons/);
  assert.match(app, /preschool-focus-game-wall/);
  assert.match(app, /PRESCHOOL_FOCUS_GAME_ASSETS/);
  assert.match(app, /focus-schulte\.png/);
  assert.match(app, /function isFocusInlineSession\(\)/);
  assert.match(app, /preschool-focus-play-host/);
  assert.match(app, /if \(isFocusInlineSession\(\)\)/);
  assert.doesNotMatch(app, /isFocusInlineSession\(\)[\s\S]{0,80}showModal/);
  assert.match(app, /data-action="focus-start-level" data-level=/);
  assert.match(app, /play-level-pick/);
  assert.match(app, /focus-arcade-idle/);
  assert.match(app, /focus-arcade-hero/);
  assert.match(app, /play-win-banner/);
  assert.match(app, /data-focus-skin/);
  assert.match(app, /focus-arcade-row/);
  assert.match(styles, /preschool-focus-game-card/);
  assert.match(styles, /preschool-focus-play-host/);
  assert.match(styles, /play-flip-inner/);
  assert.match(styles, /play-win-banner/);
  assert.match(styles, /focus-arcade-card/);
  assert.match(styles, /play-level-card|focus-arcade-row/);
  assert.match(styles, /--fg-deep/);
  assert.match(styles, /focus-arcade-hero/);
  assert.doesNotMatch(styles, /is-focus-arcade \.sidebar[\s\S]{0,40}display:\s*none/);
  assert.match(styles, /preschool-summer-task/);
  assert.match(styles, /preschool-poem-today/);
  assert.match(styles, /preschool-poem-lines/);
  assert.match(styles, /preschool-poem-meaning/);
});

test('adds a today preview on the course wall and splits classic into a child menu', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'preschool-workbench', 'index.html'), 'utf8');
  const workbenchCss = fs.readFileSync(path.join(root, 'css', 'preschool-workbench.css'), 'utf8');
  const styles = readCssGraph(path.join(root, 'css', 'preschool-workbench.css'));
  const previewStart = app.indexOf('function getPreschoolCourseTodayPreview(course)');
  const previewEnd = app.indexOf('\n    function ', previewStart + 1);
  const previewFn = previewStart >= 0 ? app.slice(previewStart, previewEnd > previewStart ? previewEnd : previewStart + 1800) : '';
  const deriveStart = app.indexOf('function derivePreschoolPoetryTodayPoem(');
  const deriveEnd = app.indexOf('\n    function ', deriveStart + 1);
  const deriveFn = deriveStart >= 0 ? app.slice(deriveStart, deriveEnd > deriveStart ? deriveEnd : deriveStart + 1200) : '';
  assert.match(app, /function getPreschoolCourseTodayPreview\(course\)/);
  assert.match(app, /preschool-course-wall-preview/);
  assert.match(previewFn, /今天做完啦 ✓/);
  assert.match(previewFn, /PRESCHOOL_FLASHCARD_SIZE/);
  assert.match(previewFn, /derivePreschoolPoetryTodayPoem/);
  assert.doesNotMatch(previewFn, /ui\.courseCards\s*=/);
  assert.doesNotMatch(previewFn, /getPreschoolPoetryTodaySession/);
  assert.match(app, /function derivePreschoolPoetryTodayPoem\(/);
  assert.doesNotMatch(deriveFn, /ui\.courseCards\s*=/);
  assert.match(app, /function renderPreschoolCourseMenu\(course\)/);
  assert.match(app, /preschool-course-menu/);
  assert.match(app, /preschool-course-parent-detail/);
  assert.match(app, /<details class="preschool-course-parent-detail">/);
  assert.match(app, /<summary>家长看详情<\/summary>/);
  assert.match(app, /renderPreschoolCourseMenu\(activeCourse\)/);
  const menuStart = app.indexOf('function renderPreschoolCourseMenu(course)');
  const menuEnd = app.indexOf('\n    function ', menuStart + 1);
  const menuFn = menuStart >= 0 ? app.slice(menuStart, menuEnd > menuStart ? menuEnd : menuStart + 2500) : '';
  assert.match(menuFn, /renderPreschoolCourseCard\(course, true\)/);
  assert.match(app, /function isPreschoolMenuCoreLesson\(lesson\)/);
  assert.match(menuFn, /preschool-course-menu-grid/);
  assert.match(menuFn, /isPreschoolMenuCoreLesson/);
  assert.match(menuFn, /data-action="open-lesson"/);
  assert.match(menuFn, /Minecraft 英语/);
  assert.match(menuFn, /去改错本/);
  assert.match(menuFn, /data-page="mistakes"/);
  assert.doesNotMatch(app, /preschool-course-library-note/);
  assert.doesNotMatch(app, /看看资料和其他练习/);
  assert.match(app, /更多练习/);
  assert.match(app, /更多资料/);
  assert.doesNotMatch(app, /浏览完整资料库/);
  assert.match(html, /preschool-workbench\.css\?v=20260816-loop-v1/);
  assert.match(html, /app\.js\?v=20260819-v074/);
  assert.match(html, /preschool-card-art\.js\?v=20260815-english-auto-v1/);
  assert.match(workbenchCss, /36-course-menu\.css\?v=20260815-menu-cards-v2/);
  assert.match(styles, /preschool-course-menu/);
  assert.match(styles, /preschool-course-parent-detail/);
  assert.match(styles, /min-height:\s*44px/);
});

test('adds media wall cards and in-course tabs for every preschool subject', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const styles = readCssGraph(path.join(root, 'css', 'preschool-workbench.css'));
  assert.match(app, /function renderPreschoolCourseMediaWallCard\(course\)/);
  assert.match(app, /preschool-course-wall-extras/);
  assert.match(app, /function renderPreschoolCourseTabs\(course\)/);
  assert.match(app, /data-action="course-tab"/);
  assert.match(app, /data-tab="today"/);
  assert.match(app, /data-tab="media"/);
  assert.match(app, /data-tab="menu"/);
  assert.match(app, /function renderPreschoolCourseMediaPane\(course\)/);
  assert.match(app, /renderPreschoolCourseMedia\(course\)/);
  assert.match(app, /动画屋/);
  assert.match(app, /ui\.courseTab/);
  assert.doesNotMatch(app, /localStorage\.(setItem|getItem)\(['"]courseTab/);
  assert.match(app, /target\.dataset\.tab/);
  assert.match(styles, /preschool-course-tabs/);
  assert.match(styles, /preschool-course-wall-extras/);
});

test('keeps the english animation room as three cover cards', () => {
  const config = fs.readFileSync(path.join(root, 'config.js'), 'utf8');
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const styles = readCssGraph(path.join(root, 'css', 'preschool-workbench.css'));
  assert.match(app, /preschool-media-grid/);
  assert.match(app, /preschool-media-cover/);
  assert.match(app, /preschool-media-stage/);
  assert.match(app, /data-action="media-open"/);
  assert.match(app, /function renderPreschoolMediaCover\(item\)/);
  assert.match(config, /Minecraft 英语课/);
  assert.match(config, /Kids vs Phonics/);
  assert.match(config, /BV1jg411M7hC/);
  assert.match(config, /英语启蒙打印资料包/);
  assert.match(config, /preschool-media\/published\/minecraft-english\.jpg/);
  assert.match(config, /preschool-media\/published\/kids-vs-phonics\.jpg/);
  assert.doesNotMatch(config, /Super Simple Songs/);
  assert.doesNotMatch(config, /小猪佩奇/);
  assert.doesNotMatch(config, /English Singsing/);
  assert.match(styles, /preschool-media-grid/);
  assert.match(styles, /preschool-media-cover/);
});

test('applies the paper-glow palette and embeds world assets as faint backgrounds', () => {
  const workbenchCss = fs.readFileSync(path.join(root, 'css', 'preschool-workbench.css'), 'utf8');
  assert.match(workbenchCss, /38-paper-glow\.css\?v=20260816-switcher-z-v1/);
  assert.match(workbenchCss, /26-theme-skins\.css\?v=20260815-paper-glow-v1/);
  const skins = fs.readFileSync(path.join(root, 'css', 'preschool', '26-theme-skins.css'), 'utf8');
  assert.match(skins, /--theme-accent: #6fa893/);   // 花园雾绿
  assert.match(skins, /--theme-accent: #7a6fc0/);   // 方块柔紫
  assert.match(skins, /--theme-accent: #c99a44/);   // 闯关蜂蜜金
  assert.doesNotMatch(skins, /#e54139|#c82d2c/i);   // 火焰红已移除
  const glow = fs.readFileSync(path.join(root, 'css', 'preschool', '38-paper-glow.css'), 'utf8');
  assert.match(glow, /pvz-garden-lawn-bg\.webp/);
  assert.match(glow, /voxel-grass-block\.webp/);
  assert.match(glow, /platform-coin\.webp/);
});

test('preschool settings page stacks parent cards instead of a two-column level maze', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const styles = fs.readFileSync(path.join(root, 'css', 'preschool', '35-course-flashcards.css'), 'utf8');
  const workbenchCss = fs.readFileSync(path.join(root, 'css', 'preschool-workbench.css'), 'utf8');
  const accountStart = app.indexOf('function renderAccount()');
  const accountEnd = app.indexOf('function renderPreschoolThemeSettings');
  const account = app.slice(accountStart, accountEnd);
  assert.match(account, /preschool-settings-stack/);
  assert.match(account, /preschool-settings-more/);
  const themeAt = account.indexOf('renderPreschoolThemeSettings');
  const feedbackAt = account.indexOf('renderPreschoolFeedbackSettings');
  const levelsAt = account.indexOf('renderPreschoolPracticeLevelSettings');
  const moreAt = account.indexOf('preschool-settings-more');
  assert.ok(themeAt > -1 && themeAt < levelsAt);
  assert.ok(feedbackAt > -1 && feedbackAt < levelsAt);
  assert.ok(moreAt > levelsAt);
  assert.match(account, /preschool-settings-more[\s\S]*renderWorkbenchSwitcher/);
  assert.match(styles, /practice-level-settings[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(styles, /math-band-settings[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(workbenchCss, /35-course-flashcards\.css\?v=20260818-phonics-zh-v1/);
});
