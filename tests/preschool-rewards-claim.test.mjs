import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const appSource = fs.readFileSync(path.join(repoRoot, 'prj', 'app.js'), 'utf8');
const claimStart = appSource.indexOf('function claimReward(id)');
const claimEnd = appSource.indexOf('\n    function commit(', claimStart);
assert.ok(claimStart >= 0, 'claimReward must remain an app-level function');
assert.ok(claimEnd > claimStart, 'claimReward must have a stable function boundary');
const claimSource = appSource.slice(claimStart, claimEnd);

function loadClaimRewardHarness(reward, initialGrowth) {
  let state = { growth: JSON.parse(JSON.stringify(initialGrowth)) };
  let celebrationCount = 0;
  const ensureGrowth = (next) => {
    next.growth = next.growth && typeof next.growth === 'object' ? next.growth : {};
    if (!Array.isArray(next.growth.claimedRewardIds)) next.growth.claimedRewardIds = [];
    next.growth.sunlight = Math.max(0, Number(next.growth.sunlight) || 0);
    return next.growth;
  };
  const commit = (mutator) => {
    try {
      mutator(state);
      return true;
    } catch {
      return false;
    }
  };
  const preschoolGarden = {
    recordEvent(growth) {
      return { growth, rewardIds: [] };
    }
  };
  const claimReward = new Function(
    'isChild',
    'isPreschool',
    'getChildRewards',
    'commit',
    'ensureGrowth',
    'preschoolGarden',
    'storage',
    'showPreschoolCelebration',
    `return (${claimSource});`
  )(
    true,
    true,
    () => [reward],
    commit,
    ensureGrowth,
    preschoolGarden,
    { localDate: () => '2026-08-15' },
    () => { celebrationCount += 1; }
  );

  return {
    claimReward: () => claimReward(reward.id),
    getState: () => state,
    getCelebrationCount: () => celebrationCount
  };
}

const reward = { id: 'preschool-reward-story', cost: 40 };

test('rejects an unaffordable reward without changing the wallet', () => {
  const harness = loadClaimRewardHarness(reward, {
    sunlight: 20,
    totalSunlightEarned: 120,
    claimedRewardIds: []
  });

  harness.claimReward();

  assert.equal(harness.getState().growth.sunlight, 20);
  assert.deepEqual(harness.getState().growth.claimedRewardIds, []);
  assert.equal(harness.getCelebrationCount(), 0);
});

test('deducts the exact reward cost and records the claimed reward', () => {
  const harness = loadClaimRewardHarness(reward, {
    sunlight: 100,
    totalSunlightEarned: 120,
    claimedRewardIds: []
  });

  harness.claimReward();

  assert.equal(harness.getState().growth.sunlight, 60);
  assert.deepEqual(harness.getState().growth.claimedRewardIds, [reward.id]);
  assert.equal(harness.getCelebrationCount(), 1);
});

test('rejects a duplicate reward claim without deducting twice', () => {
  const harness = loadClaimRewardHarness(reward, {
    sunlight: 100,
    totalSunlightEarned: 120,
    claimedRewardIds: [reward.id]
  });

  harness.claimReward();

  assert.equal(harness.getState().growth.sunlight, 100);
  assert.deepEqual(harness.getState().growth.claimedRewardIds, [reward.id]);
  assert.equal(harness.getCelebrationCount(), 0);
});

test('claiming a reward does not change totalSunlightEarned', () => {
  const harness = loadClaimRewardHarness(reward, {
    sunlight: 100,
    totalSunlightEarned: 987,
    claimedRewardIds: []
  });

  harness.claimReward();

  assert.equal(harness.getState().growth.totalSunlightEarned, 987);
  assert.equal(harness.getState().growth.sunlight, 60);
});
