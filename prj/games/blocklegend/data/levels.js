/**
 * blocklegend · 关卡与 Boss 纯函数（T20260815-blocklegend-3d S4）
 */
(function (global) {
    'use strict';

    const UNLOCK_COST = [0, 50, 150, 300, 500, 800];
    const SUN_PER_LEVEL = 8;
    const SHIELD_REDUCE = 0.5;
    const BROKEN_MS = 8000;
    const LEVEL_TOTAL = 6;

    const LEVELS = [
        { level: 1, waves: 2, bossHp: 80, bossShield: 3, climate: 'plains', worldSeed: 7, bossId: 'wither', waveKinds: ['slime', 'cube', 'creeper'] },
        { level: 2, waves: 2, bossHp: 110, bossShield: 4, climate: 'cherry', worldSeed: 21, bossId: 'wither', waveKinds: ['slime', 'fox', 'creeper'] },
        { level: 3, waves: 3, bossHp: 140, bossShield: 4, climate: 'desert', worldSeed: 33, bossId: 'wither', waveKinds: ['cube', 'zombie', 'husk'] },
        { level: 4, waves: 3, bossHp: 170, bossShield: 5, climate: 'duskvale', worldSeed: 47, bossId: 'wither', waveKinds: ['fox', 'skeleton', 'enderman'] },
        { level: 5, waves: 3, bossHp: 200, bossShield: 5, climate: 'crystal', worldSeed: 59, bossId: 'wither', waveKinds: ['spider', 'witch', 'warden', 'golem'] },
        { level: 6, waves: 4, bossHp: 240, bossShield: 6, climate: 'nether', worldSeed: 71, bossId: 'wither', waveKinds: ['magma', 'piglin', 'ghast'] }
    ];

    function cloneBoss(boss) {
        return Object.assign({}, boss);
    }

    function levelOf(n) {
        return LEVELS[Math.max(0, Math.min(LEVEL_TOTAL, Number(n) || 1) - 1)];
    }

    function eventKey(n) {
        return 'level-' + Number(n);
    }

    function createBoss(level) {
        const cfg = levelOf(level);
        return {
            level: cfg.level,
            hp: cfg.bossHp,
            maxHp: cfg.bossHp,
            shield: cfg.bossShield,
            shieldMax: cfg.bossShield,
            state: 'shielded',
            color: 'blue',
            brokenUntil: 0,
            dead: false
        };
    }

    function applyBossDamage(boss, raw, opts) {
        const now = (opts && opts.now) || 0;
        let b = tickBoss(boss, now);
        if (b.dead) return { dealt: 0, boss: b };
        const amount = Number(raw) || 0;
        const dealt = b.state === 'shielded' ? amount * SHIELD_REDUCE : amount;
        b = cloneBoss(b);
        b.hp = Math.max(0, b.hp - dealt);
        if (b.hp <= 0) {
            b.hp = 0;
            b.dead = true;
        }
        return { dealt: dealt, boss: b };
    }

    function chipShield(boss, amount, opts) {
        const now = (opts && opts.now) || 0;
        let b = tickBoss(boss, now);
        if (b.dead || b.state === 'broken') return { boss: b };
        b = cloneBoss(b);
        b.shield = Math.max(0, b.shield - (Number(amount) || 0));
        if (b.shield <= 0) {
            b.shield = 0;
            b.state = 'broken';
            b.color = 'red';
            b.brokenUntil = now + BROKEN_MS;
        }
        return { boss: b };
    }

    function tickBoss(boss, now) {
        const b = cloneBoss(boss || createBoss(1));
        if (b.dead) return b;
        if (b.state === 'broken' && now >= (b.brokenUntil || 0)) {
            b.state = 'shielded';
            b.color = 'blue';
            b.shield = Math.max(1, Math.floor((b.shieldMax || 1) * 0.5));
            b.brokenUntil = 0;
        }
        return b;
    }

    function tryUnlock(progress, level) {
        const p = Object.assign({ unlockedLevel: 1, coined: 0 }, progress || {});
        const want = Number(level) || 1;
        if (want <= p.unlockedLevel) return { ok: true, unlockedLevel: p.unlockedLevel, coined: p.coined };
        if (want > p.unlockedLevel + 1) return { ok: false, unlockedLevel: p.unlockedLevel, coined: p.coined };
        const cost = UNLOCK_COST[want - 1] || 0;
        if ((Number(p.coined) || 0) < cost) {
            return { ok: false, unlockedLevel: p.unlockedLevel, coined: p.coined };
        }
        return { ok: true, unlockedLevel: want, coined: (Number(p.coined) || 0) - cost };
    }

    function buildSettlement(opts) {
        const o = opts || {};
        const meta = o.meta || {};
        const sun = Number(o.sunAwarded) || 0;
        const capped = !!o.sunCapped;
        const lv = Number(o.level) || 1;
        const next = lv < LEVEL_TOTAL ? '下一关解锁要 ' + (UNLOCK_COST[lv] || 0) + ' 金币' : '全部关卡都打完啦';
        return {
            gain: '阳光 +' + sun + (capped ? '（今日已达上限）' : '') + ' · 第 ' + lv + ' 关',
            progressLabel: '冒险 Lv.' + (meta.adventureLevel || 1) + ' ' + (meta.adventureTitle || '') +
                ' · ' + (meta.adventurePoints || 0) + '/' + ((meta.nextRank && meta.nextRank.need) || 0),
            nextGoal: next
        };
    }

    global.BlockLegendLevels = {
        UNLOCK_COST: UNLOCK_COST,
        SUN_PER_LEVEL: SUN_PER_LEVEL,
        SHIELD_REDUCE: SHIELD_REDUCE,
        BROKEN_MS: BROKEN_MS,
        LEVEL_TOTAL: LEVEL_TOTAL,
        LEVELS: LEVELS,
        levelOf: levelOf,
        eventKey: eventKey,
        createBoss: createBoss,
        applyBossDamage: applyBossDamage,
        chipShield: chipShield,
        tickBoss: tickBoss,
        tryUnlock: tryUnlock,
        buildSettlement: buildSettlement
    };
}(typeof window !== 'undefined' ? window : globalThis));
