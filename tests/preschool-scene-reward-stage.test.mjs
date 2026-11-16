import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (filePath) => fs.readFileSync(filePath, 'utf8');
const appPath = path.join(repoRoot, 'prj', 'app.js');
const indexPath = path.join(repoRoot, 'prj', 'preschool-workbench', 'index.html');
const focusCssPath = path.join(repoRoot, 'prj', 'css', 'preschool', '56-phone-landscape-focus.css');
const highResCssPath = path.join(repoRoot, 'prj', 'css', 'preschool', '53-high-resolution-landscape.css');

test('theme reward copy uses coins on Mario and keeps garden sunlight', () => {
  const app = read(appPath);
  const copyStart = app.indexOf('function preschoolRewardCopy');
  const copyEnd = app.indexOf('\n    function preschoolThemeBuddyTitle', copyStart);
  const copyFn = app.slice(copyStart, copyEnd);
  assert.match(copyFn, /platform-quest/);
  assert.match(copyFn, /currency: playbook\.currency \|\| '金币'/);
  assert.match(copyFn, /chestTitle: '闯关宝藏'/);
  assert.match(copyFn, /currency: playbook\.currency \|\| '阳光'/);

  const buddyStart = app.indexOf('function preschoolThemeBuddyTitle');
  const buddyEnd = app.indexOf('\n    const PRESCHOOL_WORLD_GAME_LINKS', buddyStart);
  const buddy = app.slice(buddyStart, buddyEnd);
  assert.match(buddy, /'plant-sunflower': '草台'/);
  assert.match(buddy, /'plant-peashooter': '小探险家'/);

  const rewardsStart = app.indexOf('function renderPreschoolRewards');
  const rewardsEnd = app.indexOf('\n    function getPreschoolLearningSummary', rewardsStart);
  const rewards = app.slice(rewardsStart, rewardsEnd);
  assert.match(rewards, /preschoolRewardCopy\(\)/);
  assert.match(rewards, /copy\.currency/);
  assert.match(rewards, /heading: '用' \+ copy\.currency \+ '换一个期待'/);
  assert.equal(rewards.includes('} 阳光</strong>'), false);

  const stageStart = app.indexOf('function renderPreschoolRewardStage');
  const stageEnd = app.indexOf('\n    function renderPreschoolCollection', stageStart);
  const stage = app.slice(stageStart, stageEnd);
  assert.match(stage, /preschoolThemeBuddyTitle\(activePlant\)/);
  assert.match(stage, /copy\.stageKicker/);
  assert.match(stage, /\$\{pet\.feedCost \|\| 5\} \$\{escapeHtml\(copy\.currency\)\}/);
});

test('renders a reward home stage with pet feeding and garden watering actions', () => {
  const app = read(appPath);
  const stageStart = app.indexOf('function renderPreschoolRewardStage');
  const stageEnd = app.indexOf('\n    function ', stageStart + 1);
  assert.ok(stageStart >= 0 && stageEnd > stageStart, 'reward stage renderer must exist');
  const stage = app.slice(stageStart, stageEnd);

  assert.match(stage, /preschool-reward-stage/);
  assert.match(stage, /PersonalWorkbenchPet\.view/);
  assert.match(stage, /preschoolPlantAsset/);
  assert.match(stage, /data-action="feed-pet"/);
  assert.match(stage, /data-action="water-plant"/);
  assert.match(stage, /getPreschoolThemeId\(\) === ['"]garden-defense['"]/);
  assert.match(app, /renderPreschoolRewardStage\(growth\)/);
});

test('splits the Android landscape reward route into stage, tier, and collection pages', () => {
  const app = read(appPath);
  const pagerStart = app.indexOf('function setupAndroidLandscapePages');
  const pagerEnd = app.indexOf('\n    function render()', pagerStart);
  assert.ok(pagerStart >= 0 && pagerEnd > pagerStart, 'landscape pager setup must exist');
  const pager = app.slice(pagerStart, pagerEnd);

  assert.match(pager, /ui\.page === ['"]rewards['"]/);
  assert.match(pager, /preschool-reward-progress/);
  assert.match(pager, /preschool-reward-stage/);
  assert.match(pager, /preschool-reward-tier-list/);
  assert.match(pager, /preschool-collection-section/);
  assert.match(pager, /['"]rewards-stage['"]/);
  assert.match(pager, /['"]rewards-tiers['"]/);
  assert.match(pager, /['"]rewards-collection['"]/);
});

test('keeps reward-stage feedback transient and reveals newly unlocked collection items', () => {
  const app = read(appPath);

  assert.match(app, /rewardStagePulse/);
  assert.match(app, /rewardStageRevealIds/);
  assert.match(app, /function pulsePreschoolRewardStage\(/);
  assert.match(app, /function revealPreschoolRewardStage\(/);
  assert.match(app, /pulsePreschoolRewardStage\(['"](?:pet|plant)['"]\)/);
  assert.match(app, /revealPreschoolRewardStage\(/);
  assert.match(app, /gardenEvent\.rewardIds/);
});

test('renders unlocked and locked collection shelf states with a bounded new-item pulse', () => {
  const app = read(appPath);
  const collectionStart = app.indexOf('function renderPreschoolCollection');
  const collectionEnd = app.indexOf('\n    function ', collectionStart + 1);
  assert.ok(collectionStart >= 0 && collectionEnd > collectionStart, 'collection renderer must exist');
  const collection = app.slice(collectionStart, collectionEnd);

  assert.match(collection, /data-collection-id/);
  assert.match(collection, /is-unlocked/);
  assert.match(collection, /is-locked/);
  assert.match(collection, /rewardStageRevealIds/);
  assert.match(collection, /is-new/);
  assert.match(collection, /[？?]/);
  assert.match(collection, /灰色|filter|silhouette|待发现/);
});

test('animates reward-stage pet and heart feedback with transform/opacity only', () => {
  for (const filePath of [focusCssPath, highResCssPath]) {
    const css = read(filePath);
    assert.match(css, /preschool-reward-stage/);
    assert.match(css, /preschool-reward-stage-pet/);
    assert.match(css, /preschool-reward-stage-hearts/);
    assert.match(css, /@keyframes\s+preschool-reward-stage/);
    assert.match(css, /preschool-no-motion[\s\S]{0,800}preschool-reward-stage[\s\S]{0,320}animation:\s*none/);
    assert.match(css, /prefers-reduced-motion:\s*reduce/);
    const rewardKeyframes = (css.match(/@keyframes[\s\S]*?\n\s*\}/g) || [])
      .filter((block) => /preschool-reward-stage/.test(block));
    assert.ok(rewardKeyframes.length >= 2, 'reward stage should define pet and heart keyframes');
    for (const block of rewardKeyframes) {
      assert.doesNotMatch(block, /(?:box-shadow|top|left|width|height)\s*:/, 'reward animation must not animate layout');
    }
  }
});

test('growth and daily-game copy use Mario coins while garden keeps sunlight', () => {
  const app = read(appPath);
  const progressStart = app.indexOf('function renderPreschoolHomeWorldProgress');
  const progressEnd = app.indexOf('\n    const VOXEL_HOME_CELL_COLOR', progressStart);
  const progress = app.slice(progressStart, progressEnd);
  assert.match(progress, /preschoolRewardCopy\(\)/);
  assert.match(progress, /今日游戏\$\{currency\}/);
  assert.match(progress, /还可再赚 \$\{cap - earned\} \$\{currency\}/);
  assert.doesNotMatch(progress, /今日游戏阳光 \$\{earned\}/);

  const growthStart = app.indexOf('function renderPreschoolGrowth()');
  const growthEnd = app.indexOf('\n    function renderPreschoolPlans', growthStart);
  const growth = app.slice(growthStart, growthEnd);
  assert.match(growth, /preschoolRewardCopy\(\)/);
  assert.match(growth, /copy\.currency/);
  assert.doesNotMatch(growth, /<small>阳光<\/small>/);

  const chromeStart = app.indexOf('function getPreschoolGrowthChrome');
  const chromeEnd = app.indexOf('\n    function renderPreschoolGrowth()', chromeStart);
  const chrome = app.slice(chromeStart, chromeEnd);
  assert.match(chrome, /label: '闯关基地'/);
  assert.doesNotMatch(chrome, /用阳光喂大/);
  assert.match(chrome, /用晶体喂大/);

  const weeklyStart = app.indexOf('function renderPreschoolWeeklyAdventureReport');
  const weeklyEnd = app.indexOf('\n    function getPreschoolGrowthChrome', weeklyStart);
  const weekly = app.slice(weeklyStart, weeklyEnd);
  assert.match(weekly, /preschoolRewardCopy\(\)/);
  assert.match(weekly, /本周游戏\$\{currency\}/);
  assert.doesNotMatch(weekly, /本周游戏阳光/);
  assert.match(weekly, /游戏\$\{currency\}有每日上限/);
});

test('appends the reward-stage cache stamp without replacing prior runtime versions', () => {
  const index = read(indexPath);
  assert.match(index, /app\.js\?[^"']*reward-stage=v1/);
  assert.match(index, /53-high-resolution-landscape\.css\?[^"']*reward-stage=v1/);
  assert.match(index, /56-phone-landscape-focus\.css\?[^"']*reward-stage=v1/);
});
