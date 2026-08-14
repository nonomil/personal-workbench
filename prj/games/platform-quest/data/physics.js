/**
 * 横版跳跃手感
 * coyote/缓冲：HTML5_Platformer + bros
 * 变跳高/奔跑/无敌帧：mahmodnasser/mario（只抽公式，不拷贴图）
 * 二段跳：super-catrio 的 currentJumps/maxJumps
 */
(function (global) {
    'use strict';

    const COYOTE_MS = 120;
    const JUMP_BUFFER_MS = 120;
    const INVINCIBLE_MS = 3000;
    const STAR_INVINCIBLE_MS = 8000;
    const MAX_AIR_JUMPS = 1;
    const EARLY_LEVEL_AIR_JUMPS = 2;
    const EARLY_LEVEL_AIR_UNTIL = 4;
    const AIR_JUMP_BUFFER_MS = 200;
    const START_HEARTS = 5;
    const COIN_LIFE_MILESTONE = 100;
    const CAMERA_LOOK = 80;
    const CAMERA_LERP = 12;

    function tryJump(now, lastGroundedAt, lastJumpPressedAt, coyoteMs, bufferMs) {
        const coyote = coyoteMs == null ? COYOTE_MS : coyoteMs;
        const buffer = bufferMs == null ? JUMP_BUFFER_MS : bufferMs;
        const groundedAgo = now - lastGroundedAt;
        const pressedAgo = now - lastJumpPressedAt;
        return groundedAgo >= 0 && groundedAgo <= coyote && pressedAgo >= 0 && pressedAgo <= buffer;
    }

    function isInvincible(now, lastHitAt, invincibleMs) {
        const window = invincibleMs == null ? INVINCIBLE_MS : invincibleMs;
        return lastHitAt >= 0 && now - lastHitAt >= 0 && now - lastHitAt < window;
    }

    function canAirJump(airJumpsUsed, maxAir) {
        const max = maxAir == null ? MAX_AIR_JUMPS : maxAir;
        return (Number(airJumpsUsed) || 0) < max;
    }

    global.PlatformPhysics = {
        COYOTE_MS: COYOTE_MS,
        JUMP_BUFFER_MS: JUMP_BUFFER_MS,
        INVINCIBLE_MS: INVINCIBLE_MS,
        STAR_INVINCIBLE_MS: STAR_INVINCIBLE_MS,
        MAX_AIR_JUMPS: MAX_AIR_JUMPS,
        EARLY_LEVEL_AIR_JUMPS: EARLY_LEVEL_AIR_JUMPS,
        EARLY_LEVEL_AIR_UNTIL: EARLY_LEVEL_AIR_UNTIL,
        AIR_JUMP_BUFFER_MS: AIR_JUMP_BUFFER_MS,
        START_HEARTS: START_HEARTS,
        COIN_LIFE_MILESTONE: COIN_LIFE_MILESTONE,
        CAMERA_LOOK: CAMERA_LOOK,
        CAMERA_LERP: CAMERA_LERP,
        GRAVITY: 1500,
        HOLD_GRAVITY: 780,
        JUMP_VY: -620,
        AIR_JUMP_VY: -520,
        MAX_FALL: 900,
        RUN_SPEED: 240,
        SPRINT_SPEED: 340,
        ENEMY_SPEED: 34,
        FRICTION: 0.82,
        tryJump: tryJump,
        isInvincible: isInvincible,
        canAirJump: canAirJump
    };
}(typeof window !== 'undefined' ? window : globalThis));
