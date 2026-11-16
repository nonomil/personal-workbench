import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
await import('../prj/child-growth.js');
const growthApi = globalThis.PersonalWorkbenchChildGrowth;

const catalog = [
  { id: 'preschool-reward-sticker', title: '选一张贴纸', cost: 20 },
  { id: 'preschool-reward-story', title: '选故事', cost: 40 },
  { id: 'preschool-reward-play', title: '选游戏', cost: 60 }
];

function sliceFn(source, name) {
  const start = source.indexOf('function ' + name);
  assert.ok(start >= 0, name + ' must exist');
  const next = source.indexOf('\n    function ', start + 10);
  return source.slice(start, next >= 0 ? next : source.length);
}

test('next reward hint picks the cheapest unclaimed and reports remaining sunlight', () => {
  const hint = growthApi.getNextRewardHint(catalog, { sunlight: 8, claimedRewardIds: [], pendingRewardIds: [] });
  assert.equal(hint.status, 'short');
  assert.equal(hint.remaining, 12);
  assert.equal(hint.next.id, 'preschool-reward-sticker');
  assert.equal(hint.pending, false);
});

test('next reward hint is ready when sunlight covers cost and pending when waiting for parent', () => {
  const ready = growthApi.getNextRewardHint(catalog, { sunlight: 20, claimedRewardIds: [], pendingRewardIds: [] });
  assert.equal(ready.status, 'ready');
  assert.equal(ready.remaining, 0);
  assert.equal(ready.next.title, '选一张贴纸');

  const pending = growthApi.getNextRewardHint(catalog, {
    sunlight: 40,
    claimedRewardIds: [],
    pendingRewardIds: ['preschool-reward-sticker']
  });
  assert.equal(pending.status, 'pending');
  assert.equal(pending.next.id, 'preschool-reward-sticker');
  assert.equal(pending.remaining, 0);
});

test('next reward hint skips claimed items and stays done without mutating growth', () => {
  const growth = {
    sunlight: 100,
    claimedRewardIds: ['preschool-reward-sticker'],
    pendingRewardIds: []
  };
  const hint = growthApi.getNextRewardHint(catalog, growth);
  assert.equal(hint.next.id, 'preschool-reward-story');
  assert.equal(hint.remaining, 0);
  assert.equal(hint.status, 'ready');
  assert.equal(growth.sunlight, 100);
  assert.deepEqual(growth.claimedRewardIds, ['preschool-reward-sticker']);

  const done = growthApi.getNextRewardHint(catalog, {
    sunlight: 200,
    claimedRewardIds: catalog.map((item) => item.id),
    pendingRewardIds: []
  });
  assert.equal(done.status, 'done');
  assert.equal(done.next, null);
  assert.equal(done.remaining, 0);
});

test('home hero shows next-reward distance and only navigates to the mall', () => {
  const app = fs.readFileSync(path.join(repoRoot, 'prj', 'app.js'), 'utf8');
  const hero = sliceFn(app, 'renderPreschoolHomeHero');
  const renderHint = sliceFn(app, 'renderPreschoolHomeNextReward');
  const overview = sliceFn(app, 'renderPreschoolHomeOverview');
  assert.match(hero, /renderPreschoolHomeNextReward\(/);
  assert.match(renderHint, /preschool-home-next-reward/);
  assert.match(renderHint, /还差/);
  assert.match(renderHint, /data-action="navigate"/);
  assert.match(renderHint, /data-page="rewards"/);
  assert.doesNotMatch(renderHint, /claim-reward/);
  assert.match(overview, /去领奖励/);
  assert.match(overview, /还差/);
});

test('home next-reward CSS stays compact and avoids old-WebView traps', () => {
  const cssPath = path.join(repoRoot, 'prj', 'css', 'preschool', '59-home-next-reward.css');
  assert.equal(fs.existsSync(cssPath), true, '59-home-next-reward.css should exist');
  const css = fs.readFileSync(cssPath, 'utf8');
  assert.match(css, /preschool-home-next-reward/);
  assert.doesNotMatch(css, /:has\(/);
  assert.doesNotMatch(css, /color-mix\(/);
  assert.doesNotMatch(css, /(?<![a-z-])dvh/);
  assert.doesNotMatch(css, /preschool-home-next-reward[\s\S]{0,80}display:\s*none/);
});

test('preschool index stamps home-next-reward without dropping hunger or today-goals', () => {
  const index = fs.readFileSync(path.join(repoRoot, 'prj', 'preschool-workbench', 'index.html'), 'utf8');
  assert.match(index, /59-home-next-reward\.css\?[^"']*home-next-reward=v1/);
  assert.match(index, /app\.js\?[^"']*home-next-reward=v1/);
  assert.match(index, /app\.js\?[^"']*home-hunger=v1/);
  assert.match(index, /app\.js\?[^"']*today-goals=v1/);
  assert.match(index, /child-growth\.js\?[^"']*home-next-reward=v1/);
});
