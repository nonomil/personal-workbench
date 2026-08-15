(function (global) {
    'use strict';

    function shuffle(list) {
        const next = (Array.isArray(list) ? list : []).slice();
        for (let i = next.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            const hold = next[i];
            next[i] = next[j];
            next[j] = hold;
        }
        return next;
    }

    function buildLetterPool(word) {
        const target = String(word || '').toLowerCase().replace(/[^a-z]/g, '');
        const extras = 'bcdfghjklmnpqrstvwxyz'.split('').filter(function (letter) {
            return target.indexOf(letter) < 0;
        }).slice(0, 2);
        return shuffle(target.split('').concat(extras));
    }

    function buildWordPool(input) {
        const source = input && typeof input === 'object' ? input : {};
        const size = Math.max(6, Number(source.size) || 8);
        const used = {};
        const pool = [];
        function push(item) {
            const text = String(item && item.text || '').toLowerCase();
            if (!text || used[text] || pool.length >= size) return;
            used[text] = true;
            pool.push({ text: text, zh: String(item.zh || ''), audio: String((item.media && item.media.audio) || item.audio || '') });
        }
        (Array.isArray(source.daily) ? source.daily : []).forEach(push);
        (Array.isArray(source.learned) ? source.learned : []).forEach(push);
        (Array.isArray(source.bank) ? source.bank : []).forEach(push);
        return pool;
    }

    function createBattle(boss, heroHp) {
        return {
            bossId: boss && boss.id,
            bossHp: Number(boss && boss.hp) || 60,
            bossMax: Number(boss && boss.hp) || 60,
            heroHp: Number(heroHp) || 80,
            heroMax: Number(heroHp) || 80,
            gold: 0,
            bonus: 0,
            freeze: 0,
            equipId: '',
            over: '',
            goldLedger: true
        };
    }

    function applySkill(battle, skill) {
        const next = Object.assign({}, battle);
        const hit = Math.max(0, (Number(skill && skill.damage) || 0) + (Number(next.bonus) || 0));
        if (skill && skill.effect === 'heal') {
            next.heroHp = Math.min(next.heroMax, next.heroHp + (Number(skill.heal) || 0));
        } else {
            next.bossHp = Math.max(0, next.bossHp - hit);
        }
        if (skill && skill.effect === 'freeze') next.freeze = 1;
        next.gold += 10;
        if (next.bossHp <= 0) next.over = 'win';
        return next;
    }

    function applyBossHit(battle, attack) {
        const next = Object.assign({}, battle);
        if (next.freeze > 0) {
            next.freeze -= 1;
            return next;
        }
        next.heroHp = Math.max(0, next.heroHp - (Number(attack) || 0));
        if (next.heroHp <= 0 && next.over !== 'win') next.over = 'lose';
        return next;
    }

    function buyEquip(battle, item) {
        const next = Object.assign({}, battle);
        const price = Number(item && item.price) || 0;
        if (next.gold < price) return next;
        next.gold -= price;
        next.bonus = Number(item.bonus) || 0;
        next.equipId = String(item.id || '');
        return next;
    }

    global.PersonalWorkbenchWordbossEngine = {
        buildLetterPool: buildLetterPool,
        buildWordPool: buildWordPool,
        createBattle: createBattle,
        applySkill: applySkill,
        applyBossHit: applyBossHit,
        buyEquip: buyEquip
    };
})(typeof window !== 'undefined' ? window : globalThis);
