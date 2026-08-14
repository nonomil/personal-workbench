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
    const INVINCIBLE_MS = 2000;
    const MAX_AIR_JUMPS = 1;

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
        MAX_AIR_JUMPS: MAX_AIR_JUMPS,
        GRAVITY: 1500,
        HOLD_GRAVITY: 780,
        JUMP_VY: -620,
        AIR_JUMP_VY: -520,
        MAX_FALL: 900,
        RUN_SPEED: 240,
        SPRINT_SPEED: 340,
        ENEMY_SPEED: 48,
        tryJump: tryJump,
        isInvincible: isInvincible,
        canAirJump: canAirJump
    };
}(typeof window !== 'undefined' ? window : globalThis));
