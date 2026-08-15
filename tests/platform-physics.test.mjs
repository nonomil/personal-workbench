import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = path.join(fileURLToPath(new URL('..', import.meta.url)), 'prj');

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
  assert.equal(P.isInvincible(2500, 0, 3000), true);
});

test('child tuning defaults favor longer invincibility and slower enemies', () => {
  assert.equal(P.INVINCIBLE_MS, 3000);
  assert.equal(P.ENEMY_SPEED, 34);
  assert.equal(P.START_HEARTS, 5);
  assert.equal(P.FRICTION, 0.82);
  assert.equal(P.CAMERA_LERP, 12);
});

test('one extra air jump is allowed then blocked', () => {
  assert.equal(P.canAirJump(0, 1), true);
  assert.equal(P.canAirJump(1, 1), false);
  assert.equal(P.canAirJump(1, 2), true);
  assert.equal(P.canAirJump(2, 2), false);
});

test('early levels allow a third jump via extended air jump budget', () => {
  assert.equal(P.EARLY_LEVEL_AIR_JUMPS, 2);
  assert.equal(P.AIR_JUMP_BUFFER_MS, 200);
});

test('horizontal collision uses minimal-penetration guard against the full-width ground', () => {
  const game = fs.readFileSync(path.join(root, 'games', 'platform-quest', 'game.js'), 'utf8');
  assert.match(game, /penX >= penY/, 'horizontal resolve must skip when vertical overlap dominates (falling onto full-width ground must not teleport to level edge)');
});

test('dead horizontal knockback assignments are removed', () => {
  const game = fs.readFileSync(path.join(root, 'games', 'platform-quest', 'game.js'), 'utf8');
  assert.doesNotMatch(game, /player\.vx = player\.facing \* -\d/, 'horizontal knockback was dead code (overwritten by input next frame); vertical pop stays');
  assert.match(game, /player\.vy = -220/, 'hurt vertical pop must remain');
});

function platformGameSrc() {
  return fs.readFileSync(path.join(root, 'games', 'platform-quest', 'game.js'), 'utf8');
}

function extractPlatformFn(src, name) {
  const re = new RegExp('function ' + name + '\\([\\s\\S]*?\\n    \\}\\n');
  const match = src.match(re);
  assert.ok(match, name + ' missing in platform game.js');
  const box = {};
  vm.runInNewContext(match[0] + '\nthis.' + name + ' = ' + name + ';', box);
  return box[name];
}

test('full-width ground keeps any x on the floor without teleporting sideways', () => {
  const resolveGroundContact = extractPlatformFn(platformGameSrc(), 'resolveGroundContact');
  const ground = { x: 0, y: 400, w: 2000, h: 100 };
  [0, 80, 480, 960, 1600].forEach((x) => {
    const next = resolveGroundContact({ x: x, y: 390, w: 40, h: 52, vy: 120 }, ground);
    assert.equal(next.x, x, 'x must stay put at ' + x);
    assert.equal(next.y, 348);
    assert.equal(next.onGround, true);
    assert.equal(next.vy, 0);
  });
});

test('PlatformFeel coyote allows jump within 80ms and rejects 150ms', () => {
  const canJump = extractPlatformFn(platformGameSrc(), 'canJump');
  assert.equal(canJump({ lastGroundedAt: 920, lastJumpPressedAt: 1000 }, 1000), true);
  assert.equal(canJump({ lastGroundedAt: 850, lastJumpPressedAt: 1000 }, 1000), false);
});

test('PlatformFeel jump buffer fires when pressing 80ms before landing', () => {
  const canJump = extractPlatformFn(platformGameSrc(), 'canJump');
  assert.equal(canJump({ lastGroundedAt: 1000, lastJumpPressedAt: 920 }, 1000), true);
  assert.equal(canJump({ lastGroundedAt: 1000, lastJumpPressedAt: 820 }, 1000), false);
});

test('held jump reaches at least 30% higher than a tap', () => {
  const src = platformGameSrc();
  const velMatch = src.match(/function jumpVelocity\([\s\S]*?\n    \}\n/);
  const hMatch = src.match(/function jumpHeight\([\s\S]*?\n    \}\n/);
  assert.ok(velMatch, 'jumpVelocity missing in platform game.js');
  assert.ok(hMatch, 'jumpHeight missing in platform game.js');
  const box = {};
  vm.runInNewContext(velMatch[0] + '\n' + hMatch[0] + '\nthis.jumpHeight = jumpHeight;', box);
  const tap = box.jumpHeight(false);
  const hold = box.jumpHeight(true);
  assert.ok(hold >= tap * 1.3, `hold ${hold} should be >= 130% of tap ${tap}`);
});

test('all levels use the small mushroom enemy sprite', () => {
  const src = platformGameSrc();
  assert.match(src, /enemies\/shroom-idle\.png/, 'enemy art must be the small mushroom');
  const themeForLevel = extractPlatformFn(src, 'themeForLevel');
  [1, 4, 6, 8, 10].forEach((id) => {
    assert.equal(themeForLevel(id).enemy, 'enemy-shroom', 'level ' + id + ' must spawn mushrooms');
  });
});

test('mushroom walks past old patrol bounds and only turns on obstacles', () => {
  const enemyShouldReverse = extractPlatformFn(platformGameSrc(), 'enemyShouldReverse');
  const enemy = { x: 900, y: 364, w: 32, h: 36, dir: 1 };
  const bounds = { left: 0, right: 2400 };
  assert.equal(enemyShouldReverse(enemy, [], bounds), false, 'open ground must keep walking');
  assert.equal(enemyShouldReverse({ x: -2, y: 364, w: 32, h: 36 }, [], bounds), true, 'level edge turns');
  assert.equal(enemyShouldReverse({ x: 2372, y: 364, w: 32, h: 36 }, [], bounds), true, 'far edge turns');
  const pipe = { x: 1000, y: 340, w: 48, h: 60 };
  assert.equal(enemyShouldReverse({ x: 980, y: 364, w: 32, h: 36 }, [pipe], bounds), true, 'pipe is an obstacle');
  assert.equal(enemyShouldReverse({ x: 800, y: 364, w: 32, h: 36 }, [pipe], bounds), false, 'pipe far away is not a wall');
});

test('mushroom turns at a pit instead of walking off the floor', () => {
  const enemyAdvance = extractPlatformFn(platformGameSrc(), 'enemyAdvance');
  const enemyShouldReverse = extractPlatformFn(platformGameSrc(), 'enemyShouldReverse');
  const floors = [{ x: 0, w: 1040 }, { x: 1120, w: 2000 }];
  const bounds = { left: 0, right: 6400, floors: floors };
  assert.equal(enemyShouldReverse({ x: 400, y: 364, w: 32, h: 36, dir: 1 }, [], bounds), false, 'mid-segment keeps walking');
  assert.equal(enemyShouldReverse({ x: 1008, y: 364, w: 32, h: 36, dir: 1 }, [], bounds), true, 'pit edge turns');
  const moved = enemyAdvance({ x: 1008, y: 364, w: 32, h: 36, dir: 1 }, 4, [], bounds);
  assert.equal(moved.dir, -1, 'must face back onto the floor');
  assert.ok(moved.x + 32 <= 1040, 'must not step into the pit');
});

test('sprite dest snaps to integer pixels so downscaled mushrooms do not shimmer', () => {
  const src = platformGameSrc();
  const snapDrawRect = extractPlatformFn(src, 'snapDrawRect');
  const spriteDestSize = extractPlatformFn(src, 'spriteDestSize');
  const box = snapDrawRect(520.42, 364.8, 32.018, 34.018);
  assert.equal(box.x, 520);
  assert.equal(box.y, 365);
  assert.equal(box.w, 32);
  assert.equal(box.h, 34);
  const size = spriteDestSize(222, 236, 32, 36);
  assert.equal(Number.isInteger(size.w), true);
  assert.equal(Number.isInteger(size.h), true);
  assert.ok(size.w <= 32 && size.h <= 36);
});

test('stuck mushroom keeps facing instead of flipping every step', () => {
  const enemyAdvance = extractPlatformFn(platformGameSrc(), 'enemyAdvance');
  const pipe = { x: 1000, y: 340, w: 48, h: 60 };
  const bounds = { left: 0, right: 2400 };
  const enemy = { x: 1004, y: 364, w: 32, h: 36, dir: 1 };
  const a = enemyAdvance(enemy, 2, [pipe], bounds);
  const b = enemyAdvance({ x: a.x, y: 364, w: 32, h: 36, dir: a.dir }, 2, [pipe], bounds);
  assert.equal(a.dir, b.dir, 'must not flip every frame when overlapping a pipe');
  assert.ok(a.x + 32 <= 1000 || a.x >= 1048, 'overlapping mushroom must be pushed off the pipe');
});

test('bouncing shot hops forward on the floor and dies after a few bounces', () => {
  const bounceShot = extractPlatformFn(platformGameSrc(), 'bounceShot');
  const floors = [{ x: 0, y: 400, w: 2000, h: 80 }];
  let shot = { x: 80, y: 388, w: 12, h: 12, vx: 300, vy: 40, bounces: 0, life: 2.4, dead: false };
  shot = bounceShot(shot, 0.016, floors, 1500, 900);
  assert.equal(shot.dead, false);
  assert.ok(shot.x > 80, 'shot must travel forward');
  assert.ok(shot.vy < 0, 'shot must bounce up after hitting the floor');
  assert.equal(shot.bounces, 1);
  shot.bounces = 4;
  shot = bounceShot(shot, 0.016, floors, 1500, 900);
  assert.equal(shot.dead, true);
});

test('standing on a pipe is only true when feet sit on the rim', () => {
  const standingOnPipe = extractPlatformFn(platformGameSrc(), 'standingOnPipe');
  const pipe = { x: 720, y: 340, w: 48, h: 60 };
  assert.equal(standingOnPipe({ x: 724, y: 288, w: 40, h: 52 }, pipe), true);
  assert.equal(standingOnPipe({ x: 500, y: 288, w: 40, h: 52 }, pipe), false);
  assert.equal(standingOnPipe({ x: 724, y: 200, w: 40, h: 52 }, pipe), false);
});

test('beetle first stomp becomes a shell, second stomp kicks it', () => {
  const applyStomp = extractPlatformFn(platformGameSrc(), 'applyStomp');
  const first = applyStomp({ kind: 'beetle', state: 'walk', x: 400, w: 32 }, 360);
  assert.equal(first.state, 'shell');
  assert.equal(first.vx, 0);
  assert.ok(first.wakeIn >= 4000);
  const kick = applyStomp({ kind: 'beetle', state: 'shell', x: 400, w: 32 }, 360);
  assert.equal(kick.state, 'slide');
  assert.ok(kick.vx > 0, 'stomp from the left kicks the shell right');
  const stop = applyStomp({ kind: 'beetle', state: 'slide', x: 400, w: 32 }, 360);
  assert.equal(stop.state, 'shell');
  assert.equal(applyStomp({ kind: 'shroom', state: 'walk' }, 0).state, 'gone');
});

test('walking pickup turns around when it hits a wall', () => {
  const steerPickup = extractPlatformFn(platformGameSrc(), 'steerPickup');
  const wall = { x: 200, y: 360, w: 40, h: 40 };
  const hit = steerPickup({ x: 188, y: 368, w: 28, h: 28, vx: 46, vy: 0 }, [wall]);
  assert.ok(hit.vx < 0, 'must bounce back from the side of a block');
  const land = steerPickup({ x: 80, y: 384, w: 28, h: 28, vx: 46, vy: 40 }, [{ x: 0, y: 400, w: 800, h: 80 }]);
  assert.equal(land.vy, 0);
  assert.equal(land.y, 372);
});

test('pipe flower hides then pops on a timer', () => {
  const plantVisible = extractPlatformFn(platformGameSrc(), 'plantVisible');
  assert.equal(plantVisible(200, 1000, 1000, 0), false);
  assert.equal(plantVisible(1200, 1000, 1000, 0), true);
  assert.equal(plantVisible(200, 1000, 1000, 1000), true);
});

test('long grass strip splits into cubes and only the cube under the head breaks', () => {
  const src = platformGameSrc();
  const parts = ['placeSolidCube', 'expandPlatformsToCubes', 'pickBumpTarget'].map((name) => {
    const re = new RegExp('function ' + name + '\\([\\s\\S]*?\\n    \\}\\n');
    const match = src.match(re);
    assert.ok(match, name + ' missing in platform game.js');
    return match[0];
  });
  const box = {};
  vm.runInNewContext(parts.join('\n') + '\nthis.expandPlatformsToCubes = expandPlatformsToCubes;\nthis.pickBumpTarget = pickBumpTarget;', box);
  const expandPlatformsToCubes = box.expandPlatformsToCubes;
  const pickBumpTarget = box.pickBumpTarget;
  const cubes = expandPlatformsToCubes([[180, 320, 110, 20]], 32);
  assert.ok(cubes.length >= 3, '110px strip must become several 32px cubes');
  cubes.forEach((c) => {
    assert.equal(c.w, 32);
    assert.equal(c.h, 32);
    assert.equal(c.type, 'grass');
    assert.equal(c.breakable, true);
  });
  const moving = expandPlatformsToCubes([{ x: 600, y: 260, w: 90, h: 20, mv: { axis: 'y', range: 36 } }], 32);
  assert.equal(moving.length, 1);
  assert.ok(moving[0].mv);
  cubes.forEach((c) => {
    assert.ok(c.y + c.h <= 348, 'cube must sit above the standing walkway');
  });
  const player = { x: 210, y: 288, w: 40, h: 52 };
  const target = pickBumpTarget(player, cubes);
  assert.ok(target);
  assert.equal(target.x, 212, 'head center 230 should hit the middle cube at 212');
  target.broken = true;
  assert.equal(cubes.filter((c) => c.broken).length, 1);
  assert.equal(cubes.filter((c) => !c.broken).length, cubes.length - 1);
});

test('small form only bumps cubes, big form breaks the hit cube', () => {
  const canBreakSolid = extractPlatformFn(platformGameSrc(), 'canBreakSolid');
  assert.equal(canBreakSolid({ type: 'grass' }, false), true);
  assert.equal(canBreakSolid({ type: 'brick' }, false), false);
  assert.equal(canBreakSolid({ type: 'grass' }, true), true);
  assert.equal(canBreakSolid({ type: 'brick' }, true), true);
  assert.equal(canBreakSolid({ type: 'question' }, true), false);
});

test('upward jump into a cube skips side-push so the head bump can fire', () => {
  const skipSidePushOnHeadBump = extractPlatformFn(platformGameSrc(), 'skipSidePushOnHeadBump');
  const cube = { x: 180, y: 260, w: 40, h: 40, type: 'grass', breakable: true };
  assert.equal(skipSidePushOnHeadBump({ x: 188, y: 294, w: 40, h: 52, vx: 240, vy: -400 }, cube), true);
  assert.equal(skipSidePushOnHeadBump({ x: 188, y: 208, w: 40, h: 52, vx: 240, vy: 200 }, cube), false);
  assert.equal(skipSidePushOnHeadBump({ x: 100, y: 348, w: 40, h: 52, vx: 240, vy: 0 }, { x: 0, y: 340, w: 48, h: 60 }), false);
});

test('jumping while standing on a brick is not treated as a head bump', () => {
  const skipSidePushOnHeadBump = extractPlatformFn(platformGameSrc(), 'skipSidePushOnHeadBump');
  const brick = { x: 400, y: 360, w: 40, h: 40, type: 'brick', stair: true };
  assert.equal(skipSidePushOnHeadBump({ x: 400, y: 308, w: 40, h: 52, vx: 80, vy: -620 }, brick), false);
  assert.equal(skipSidePushOnHeadBump({ x: 408, y: 268, w: 40, h: 52, vx: 80, vy: -400 }, { x: 440, y: 280, w: 40, h: 40, type: 'brick', stair: true }), false);
});

test('high cubes keep their designed height; only walkway-clipping cubes lift', () => {
  const placeSolidCube = extractPlatformFn(platformGameSrc(), 'placeSolidCube');
  const high = placeSolidCube({ x: 820, y: 200, w: 40, h: 40, type: 'brick' }, 40);
  const mid = placeSolidCube({ x: 620, y: 240, w: 40, h: 40, type: 'question' }, 40);
  const low = placeSolidCube({ x: 180, y: 320, w: 40, h: 20, type: 'grass' }, 40);
  const stair = placeSolidCube({ x: 400, y: 360, w: 40, h: 40, type: 'brick', stair: true, breakable: false }, 40);
  assert.equal(high.y, 200);
  assert.equal(mid.y, 240);
  assert.ok(high.y < mid.y);
  assert.ok(low.y + low.h <= 348);
  assert.equal(stair.y, 360, 'stairs stay on the ground and are not lifted');
});

test('groundRects leaves pits so the floor is not one solid strip', () => {
  const groundRects = extractPlatformFn(platformGameSrc(), 'groundRects');
  const rects = groundRects({
    groundY: 400,
    width: 6400,
    grounds: [{ x: 0, w: 1040 }, { x: 1200, w: 1120 }, { x: 2520, w: 3880 }]
  });
  assert.equal(rects.length, 3);
  assert.equal(rects[0].x, 0);
  assert.equal(rects[0].w, 1040);
  assert.ok(rects[1].x > rects[0].x + rects[0].w, 'a pit must sit between ground segments');
  const full = groundRects({ groundY: 400, width: 2400 });
  assert.equal(full.length, 1);
  assert.equal(full[0].w, 2400);
});

test('air grass platforms can be bumped and broken, moving pads stay', () => {
  const isBumpBlock = extractPlatformFn(platformGameSrc(), 'isBumpBlock');
  const normalizePlatform = extractPlatformFn(platformGameSrc(), 'normalizePlatform');
  const grass = normalizePlatform([180, 320, 110, 20]);
  assert.equal(grass.type, 'grass');
  assert.equal(grass.breakable, true);
  assert.equal(isBumpBlock(grass), true);
  const moving = normalizePlatform({ x: 600, y: 260, w: 90, h: 20, mv: { axis: 'y', range: 36, speed: 1 } });
  assert.equal(isBumpBlock(moving), false);
  assert.equal(isBumpBlock({ x: 0, y: 400, w: 2400, h: 100 }), false);
  assert.equal(isBumpBlock({ type: 'brick', broken: false }), true);
});

test('stomped walker flattens then disappears after a short beat', () => {
  const crushEnemy = extractPlatformFn(platformGameSrc(), 'crushEnemy');
  const tickCrush = extractPlatformFn(platformGameSrc(), 'tickCrush');
  const flat = crushEnemy({ x: 200, y: 372, w: 36, h: 28 });
  assert.equal(flat.state, 'flat');
  assert.equal(flat.h, 10);
  assert.equal(flat.y, 390);
  assert.ok(flat.life > 0.3);
  const mid = tickCrush({ state: 'flat', life: 0.42 }, 0.1);
  assert.equal(mid.gone, false);
  const done = tickCrush({ state: 'flat', life: 0.05 }, 0.1);
  assert.equal(done.gone, true);
});

test('touching the finish pole slides the player down before clear', () => {
  const flagSlide = extractPlatformFn(platformGameSrc(), 'flagSlide');
  const flag = { x: 6000, y: 280, w: 44, h: 120 };
  const mid = flagSlide({ x: 5988, y: 300, w: 40, h: 52 }, flag, 0.05, 400);
  assert.equal(mid.climbing, true);
  assert.equal(mid.done, false);
  assert.equal(mid.x, 5994);
  assert.ok(mid.y > 300);
  const land = flagSlide({ x: 5988, y: 347, w: 40, h: 52 }, flag, 0.05, 400);
  assert.equal(land.done, true);
  assert.equal(land.y, 348);
});

test('saved checkpoint flag rises once and then stays up', () => {
  const checkpointRaise = extractPlatformFn(platformGameSrc(), 'checkpointRaise');
  const first = checkpointRaise(0, 0.2);
  assert.ok(first > 0 && first < 1);
  assert.equal(checkpointRaise(0.95, 0.2), 1);
  assert.equal(checkpointRaise(1, 0.2), 1);
});

test('clear fireworks burst from the pole and fade out', () => {
  const spawnFireworks = extractPlatformFn(platformGameSrc(), 'spawnFireworks');
  const burst = spawnFireworks(6000, 320);
  assert.ok(burst.length >= 12);
  assert.equal(burst[0].x, 6000);
  assert.ok(burst[0].life > 0);
});

test('empty hearts refill to the preschool start count, not three', () => {
  const src = platformGameSrc();
  assert.doesNotMatch(src, /hearts = 3;/);
  assert.match(src, /hearts = phy\.START_HEARTS/);
});

test('shell stands on the floor under its feet, not always world ground', () => {
  const enemyStandY = extractPlatformFn(platformGameSrc(), 'enemyStandY');
  const y = enemyStandY({ x: 400, w: 32, h: 22 }, [{ x: 360, y: 280, w: 80, h: 20 }], 400);
  assert.equal(y, 258);
  assert.equal(enemyStandY({ x: 20, w: 32, h: 22 }, [], 400), 378);
});

test('game loop keeps requesting frames even if a tick throws', () => {
  const src = platformGameSrc();
  const loop = src.match(/function loop\([\s\S]*?\n    \}\n/);
  assert.ok(loop, 'loop missing');
  assert.match(loop[0], /try\s*\{/);
  assert.match(loop[0], /requestAnimationFrame\(loop\)/);
  const afterCatch = loop[0].split(/catch\s*\(/)[1] || '';
  assert.match(afterCatch, /requestAnimationFrame\(loop\)/, 'rAF must run after a thrown tick');
});

test('standing on the flag platform still counts as touching the pole', () => {
  const touchingFlag = extractPlatformFn(platformGameSrc(), 'touchingFlag');
  const flag = { x: 6200, y: 280, w: 44, h: 120 };
  assert.equal(touchingFlag({ x: 6192, y: 228, w: 40, h: 52 }, flag), true);
  assert.equal(touchingFlag({ x: 5000, y: 348, w: 40, h: 52 }, flag), false);
  assert.equal(touchingFlag({ x: 6400, y: 223, w: 40, h: 52 }, flag), true, 'sprinting past the pole still clears');
});

test('P6 diet: walking to the flag stays under preschool time gates', async () => {
  await import('../prj/games/platform-quest/data/levels.js');
  const list = globalThis.PlatformLevels;
  const walkSec = (id) => (list.get(id).flag.x - 48) / 240;
  assert.ok(walkSec(1) <= 60, 'level 1 walk must stay under 60s');
  assert.ok(walkSec(2) <= 60, 'level 2 walk must stay under 60s');
  assert.ok(walkSec(9) <= 120, 'level 9 walk must stay under 120s');
  assert.ok(walkSec(10) <= 120, 'level 10 walk must stay under 120s');
});

test('qa autoplay is opt-in and jumps before walls or pits', () => {
  const src = platformGameSrc();
  assert.match(src, /qaParams\.get\('qa'\) === 'run'/, 'autoplay only when ?qa=run');
  assert.match(src, /function qaDrive\(/);
  assert.match(src, /function qaAheadBlocked\(/);
  assert.match(src, /function qaPitAhead\(/);
  assert.match(src, /qaDrive\(now\)/);
  assert.doesNotMatch(src, /qaAuto\s*=\s*true/, 'must not hard-enable autoplay');
});
