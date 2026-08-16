/**
 * blocklegend · 战斗纯函数（T20260815-blocklegend-3d S2）
 * 无 DOM / 无 three.js。浏览器挂 window.BlockLegendCombat，node 可 import。
 */
(function (global) {
    'use strict';

    const CRIT_MULT = 3;
    const BASE_MELEE = 8;
    const BASE_BOLT = 5;
    const MELEE_COOLDOWN_MS = 420;
    const BOLT_COOLDOWN_MS = 640;
    const INVINCIBLE_MS = 1600;
    const MELEE_RANGE = 4.5;
    const MELEE_ARC = 1.15; // 约 66° 半角
    const BOLT_SPEED = 11;
    const BOLT_TURN = 7.2; // rad/s
    const BOLT_LIFE = 2.4;
    const CONTACT_RANGE = 1.7; // 停在玩家前方可见距离（1.15 时低于相机半视场角看不见）

    const MONSTERS = {
        slime: { kind: 'slime', hp: 24, coins: 4, contact: 1, speed: 1.35, loot: 'slime-gel', color: 0x6fbf4a },
        cube: { kind: 'cube', hp: 36, coins: 6, contact: 2, speed: 1.05, loot: 'cube-shard', color: 0xc47a3a },
        husk: { kind: 'husk', hp: 48, coins: 8, contact: 2, speed: 1.05, loot: 'husk-bone', color: 0x8a8f99 },
        fox: { kind: 'fox', hp: 28, coins: 5, contact: 1, speed: 1.55, loot: 'fox-fur', color: 0xe07a28 },
        magma: { kind: 'magma', hp: 40, coins: 7, contact: 2, speed: 0.95, loot: 'magma-cream', color: 0xff6a2a },
        blaze: { kind: 'blaze', hp: 36, coins: 8, contact: 2, speed: 1.15, loot: 'blaze-rod', color: 0xffc04a, hitRadius: 0.55 },
        ghast: { kind: 'ghast', hp: 52, coins: 10, contact: 2, speed: 0.72, loot: 'ghast-tear', color: 0xf4f0ea, hitRadius: 0.9 },
        warden: { kind: 'warden', hp: 70, coins: 12, contact: 3, speed: 0.7, loot: 'warden-horn', color: 0x2a6a78, hitRadius: 0.7 },
        creeper: { kind: 'creeper', hp: 32, coins: 7, contact: 3, speed: 1.05, loot: 'gunpowder', color: 0x6fbf45, hitRadius: 0.55 },
        zombie: { kind: 'zombie', hp: 44, coins: 7, contact: 2, speed: 1.12, loot: 'rotten-flesh', color: 0x5a7a4a, hitRadius: 0.5 },
        skeleton: { kind: 'skeleton', hp: 36, coins: 8, contact: 2, speed: 1.12, loot: 'bone', color: 0xe8d8b8, hitRadius: 0.45 },
        spider: { kind: 'spider', hp: 30, coins: 6, contact: 2, speed: 1.28, loot: 'string', color: 0x3a2418, hitRadius: 0.7 },
        enderman: { kind: 'enderman', hp: 50, coins: 10, contact: 2, speed: 1.22, loot: 'ender-pearl', color: 0x14141c, hitRadius: 0.45 },
        piglin: { kind: 'piglin', hp: 42, coins: 8, contact: 2, speed: 1.0, loot: 'gold-nugget', color: 0xe8a878, hitRadius: 0.5 },
        witch: { kind: 'witch', hp: 38, coins: 9, contact: 2, speed: 0.86, loot: 'glow-dust', color: 0x5a2a78, hitRadius: 0.5 }
    };
    const MONSTER_KINDS = Object.keys(MONSTERS);

    function critMultiplier(opts) {
        const o = opts || {};
        if (!o.answered || !o.correct) return 1;
        const combo = Math.max(0, Number(o.combo) || 0);
        return combo >= 3 ? CRIT_MULT + 1 : CRIT_MULT;
    }

    function damage(opts) {
        const o = opts || {};
        const base = o.kind === 'bolt' ? BASE_BOLT : BASE_MELEE;
        return base * critMultiplier(o);
    }

    function nextCombo(opts) {
        const o = opts || {};
        if (!o.answered || !o.correct) return 0;
        return (Math.max(0, Number(o.combo) || 0)) + 1;
    }

    function cooldownOf(kind) {
        return kind === 'bolt' ? BOLT_COOLDOWN_MS : MELEE_COOLDOWN_MS;
    }

    function canAttack(opts) {
        const o = opts || {};
        const last = Number(o.lastAt) || 0;
        if (last <= 0) return true;
        const now = Number(o.now) || 0;
        return now - last >= cooldownOf(o.kind);
    }

    function monsterOf(kind) {
        const row = MONSTERS[kind] || MONSTERS.slime;
        return {
            kind: row.kind,
            hp: row.hp,
            coins: row.coins,
            contact: row.contact,
            speed: row.speed,
            loot: row.loot,
            color: row.color,
            hitRadius: row.hitRadius || 0.45
        };
    }

    function emptyBag() {
        return {};
    }

    function addLoot(bag, item, n) {
        const next = Object.assign({}, bag || {});
        const key = String(item || '');
        if (!key) return next;
        next[key] = (Number(next[key]) || 0) + (Number(n) || 0);
        return next;
    }

    function pickupCoins(current, amount) {
        return (Number(current) || 0) + (Number(amount) || 0);
    }

    function forwardXZ(yaw) {
        return { x: -Math.sin(yaw), z: -Math.cos(yaw) };
    }

    function aimAction(opts) {
        const o = opts || {};
        const range = Number(o.meleeRange) || MELEE_RANGE;
        const lookDist = o.lookDist == null ? Infinity : Number(o.lookDist);
        if (o.inMelee || (o.lookMob && lookDist <= range + 0.2)) return 'melee';
        if (o.mining && o.hasBlock) return 'mine';
        return 'none';
    }

    function aimPoint(mob) {
        const m = mob || {};
        const h = Number(m.height) || 1.6;
        return {
            x: Number(m.x) || 0,
            y: (Number(m.y) || 0) + h * 0.55,
            z: Number(m.z) || 0
        };
    }

    function inMeleeArc(player, yaw, target) {
        const dx = target.x - player.x;
        const dz = target.z - player.z;
        const dist = Math.hypot(dx, dz);
        const pad = Number(target.hitRadius) || 0;
        if (dist > MELEE_RANGE + pad || dist < 0.05) return false;
        const f = forwardXZ(yaw);
        const dot = (dx * f.x + dz * f.z) / dist;
        return Math.acos(Math.max(-1, Math.min(1, dot))) <= MELEE_ARC;
    }

    function nearestMonster(origin, monsters) {
        let best = null;
        let bestD = Infinity;
        (monsters || []).forEach(function (m) {
            if (!m || (Number(m.hp) || 0) <= 0) return;
            const d = Math.hypot(m.x - origin.x, m.z - origin.z);
            if (d < bestD) {
                bestD = d;
                best = m;
            }
        });
        return best;
    }

    function steerBolt(bolt, target, dt) {
        const next = {
            x: bolt.x, z: bolt.z,
            vx: bolt.vx, vz: bolt.vz
        };
        if (!target) return next;
        const dx = target.x - bolt.x;
        const dz = target.z - bolt.z;
        const dist = Math.hypot(dx, dz) || 1;
        const wantX = dx / dist * BOLT_SPEED;
        const wantZ = dz / dist * BOLT_SPEED;
        const maxTurn = BOLT_TURN * (Number(dt) || 0);
        const curAng = Math.atan2(bolt.vx, bolt.vz);
        const wantAng = Math.atan2(wantX, wantZ);
        let diff = wantAng - curAng;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const ang = curAng + Math.max(-maxTurn, Math.min(maxTurn, diff));
        next.vx = Math.sin(ang) * BOLT_SPEED;
        next.vz = Math.cos(ang) * BOLT_SPEED;
        next.x = bolt.x + next.vx * (Number(dt) || 0);
        next.z = bolt.z + next.vz * (Number(dt) || 0);
        return next;
    }

    function canTouch(player, monster, opts) {
        const o = opts || {};
        const range = Number(o.range) || CONTACT_RANGE;
        const dist = Math.hypot((player.x || 0) - (monster.x || 0), (player.z || 0) - (monster.z || 0));
        if (dist > range) return false;
        if (o.playerSheltered && !o.mobSheltered) return false;
        if (o.wallBetween) return false;
        return true;
    }

    function applyContact(player, monster, now) {
        const hp = Number(player && player.hp) || 0;
        const last = Number(player && player.lastHitAt) || 0;
        const t = Number(now) || 0;
        if (last > 0 && t - last < INVINCIBLE_MS) {
            return { hit: false, hp: hp, lastHitAt: last };
        }
        const dmg = Math.max(1, Number(monster && monster.contact) || 1);
        return { hit: true, hp: Math.max(0, hp - dmg), lastHitAt: t };
    }

    function applyHit(hp, amount) {
        const next = Math.max(0, (Number(hp) || 0) - (Number(amount) || 0));
        return { hp: next, dead: next <= 0 };
    }

    global.BlockLegendCombat = {
        CRIT_MULT: CRIT_MULT,
        BASE_MELEE: BASE_MELEE,
        BASE_BOLT: BASE_BOLT,
        MELEE_COOLDOWN_MS: MELEE_COOLDOWN_MS,
        BOLT_COOLDOWN_MS: BOLT_COOLDOWN_MS,
        INVINCIBLE_MS: INVINCIBLE_MS,
        MELEE_RANGE: MELEE_RANGE,
        MELEE_ARC: MELEE_ARC,
        BOLT_SPEED: BOLT_SPEED,
        BOLT_TURN: BOLT_TURN,
        BOLT_LIFE: BOLT_LIFE,
        CONTACT_RANGE: CONTACT_RANGE,
        MONSTERS: MONSTERS,
        MONSTER_KINDS: MONSTER_KINDS,
        critMultiplier: critMultiplier,
        damage: damage,
        nextCombo: nextCombo,
        canAttack: canAttack,
        cooldownOf: cooldownOf,
        monsterOf: monsterOf,
        emptyBag: emptyBag,
        addLoot: addLoot,
        pickupCoins: pickupCoins,
        forwardXZ: forwardXZ,
        aimAction: aimAction,
        aimPoint: aimPoint,
        inMeleeArc: inMeleeArc,
        nearestMonster: nearestMonster,
        steerBolt: steerBolt,
        canTouch: canTouch,
        applyContact: applyContact,
        applyHit: applyHit
    };
}(typeof window !== 'undefined' ? window : globalThis));
