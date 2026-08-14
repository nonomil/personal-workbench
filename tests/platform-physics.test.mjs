import assert from 'node:assert/strict';
import test from 'node:test';

await import('../prj/games/platform-quest/data/physics.js');
const P = globalThis.PlatformPhysics;

test('coyote window still allows a jump shortly after leaving ground', () => {
  const now = 1000;
  assert.equal(P.tryJump(now, now - 80, now, 100, 100), true);
  assert.equal(P.tryJump(now, now - 150, now, 100, 100), false);
});

test('jump buffer fires when landing after an early press', () => {
  const land = 1000;
  assert.equal(P.tryJump(land, land, land - 50, 100, 100), true);
  assert.equal(P.tryJump(land, land, land - 180, 100, 100), false);
});

test('invincible window blocks a second hit', () => {
  assert.equal(P.isInvincible(1000, 0, 2000), true);
  assert.equal(P.isInvincible(2500, 0, 2000), false);
  assert.equal(P.isInvincible(1000, -9999, 2000), false);
});

test('one extra air jump is allowed then blocked', () => {
  assert.equal(P.canAirJump(0, 1), true);
  assert.equal(P.canAirJump(1, 1), false);
});
