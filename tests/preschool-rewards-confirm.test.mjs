import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
await import('../prj/child-growth.js');
const growthApi = globalThis.PersonalWorkbenchChildGrowth;
const reward = { id: 'preschool-reward-story', cost: 40 };

function seed(extra) {
    return growthApi.normalize(Object.assign({
        sunlight: 100,
        totalSunlightEarned: 120,
        claimedRewardIds: [],
        pendingRewardIds: []
    }, extra || {}));
}

test('old snapshots gain an empty pendingRewardIds list without touching claimed rewards', () => {
    const growth = growthApi.normalize({
        sunlight: 80,
        claimedRewardIds: ['preschool-reward-sticker']
    });
    assert.deepEqual(growth.pendingRewardIds, []);
    assert.deepEqual(growth.claimedRewardIds, ['preschool-reward-sticker']);
    assert.equal(growth.sunlight, 80);
});

test('requesting a reward keeps sunlight and only marks it pending', () => {
    const result = growthApi.requestPendingReward(seed(), reward);
    assert.equal(result.ok, true);
    assert.equal(result.growth.sunlight, 100);
    assert.deepEqual(result.growth.pendingRewardIds, [reward.id]);
    assert.deepEqual(result.growth.claimedRewardIds, []);
    assert.equal(result.growth.totalSunlightEarned, 120);
});

test('parent confirm deducts sunlight and moves the reward to claimed', () => {
    const pending = growthApi.requestPendingReward(seed(), reward).growth;
    const confirmed = growthApi.confirmPendingReward(pending, reward);
    assert.equal(confirmed.ok, true);
    assert.equal(confirmed.growth.sunlight, 60);
    assert.deepEqual(confirmed.growth.claimedRewardIds, [reward.id]);
    assert.deepEqual(confirmed.growth.pendingRewardIds, []);
    assert.equal(confirmed.growth.totalSunlightEarned, 120);
});

test('cancel returns to the initial wallet and clears pending', () => {
    const pending = growthApi.requestPendingReward(seed(), reward).growth;
    const cancelled = growthApi.cancelPendingReward(pending, reward.id);
    assert.equal(cancelled.ok, true);
    assert.equal(cancelled.growth.sunlight, 100);
    assert.deepEqual(cancelled.growth.pendingRewardIds, []);
    assert.deepEqual(cancelled.growth.claimedRewardIds, []);
});

test('cannot request a reward when sunlight is not enough', () => {
    const result = growthApi.requestPendingReward(seed({ sunlight: 20 }), reward);
    assert.equal(result.ok, false);
    assert.equal(result.growth.sunlight, 20);
    assert.deepEqual(result.growth.pendingRewardIds, []);
});

test('requesting the same reward twice stays a single pending item', () => {
    const first = growthApi.requestPendingReward(seed(), reward).growth;
    const again = growthApi.requestPendingReward(first, reward);
    assert.equal(again.ok, true);
    assert.deepEqual(again.growth.pendingRewardIds, [reward.id]);
    assert.equal(again.growth.sunlight, 100);
});

test('preschool rewards ui has pending, cancel and 2s parent hold confirm', () => {
    const app = fs.readFileSync(path.join(repoRoot, 'prj', 'app.js'), 'utf8');
    const html = fs.readFileSync(path.join(repoRoot, 'prj', 'preschool-workbench', 'index.html'), 'utf8');
    assert.match(app, /pendingRewardIds/);
    assert.match(app, /requestPendingReward|requestReward/);
    assert.match(app, /confirmPendingReward|confirmReward/);
    assert.match(app, /cancelPendingReward|cancelReward/);
    assert.match(app, /hold-confirm-reward/);
    assert.match(app, /cancel-reward/);
    assert.match(app, /2000/);
    assert.match(app, /待家长确认|等家长/);
    assert.match(html, /app\.js\?v=20260818-phonics-zh-v1/);
});
