/**
 * blocklegend · 关卡任务纯函数（Phase 1）
 * 第一关五步引导；其他关先视为已完成，避免挡住旧流程。
 */
(function (global) {
    'use strict';

    const LEVEL1 = [
        { id: 'look-tree', title: '找到会发光的橡树', hint: 'WASD 走到树前，对准它' },
        { id: 'make-sword', title: '砍 1 块原木，做一把木剑', hint: '按 2 用斧砍树，再按 C 合成' },
        { id: 'hit-slime', title: '听懂并击败史莱姆', hint: '对准 slime，答对意思再打' },
        { id: 'learn-five', title: '学习 5 个词，打开单词门', hint: '答对 5 个目标词' },
        { id: 'break-boss', title: '用 3 个词击破 Boss 护盾', hint: '对 Boss 答对，蓝罩变红' }
    ];
    const LEVEL2 = [
        { id: 'find-fox', title: '按英语线索找到狐狸', hint: '听 left / right / behind，走到狐狸旁边' },
        { id: 'pick-flower', title: '采一朵会发光的花', hint: '对准花或树叶，看英文名字' },
        { id: 'learn-six', title: '学会 6 个方位和动物词', hint: '答对 6 个目标词' },
        { id: 'break-boss', title: '对镜子狐狸喊出方位破盾', hint: '说 left / right / behind' }
    ];
    const LEVEL3 = [
        { id: 'collect-loot', title: '收集材料打开遗迹', hint: '挖沙石、打怪，凑齐钥匙材料' },
        { id: 'spell-key', title: '拼出钥匙词打开门', hint: '对着闸门把英文拼出来' },
        { id: 'break-boss', title: '拼写钥匙词击破守卫', hint: '拼对才能削罩' }
    ];
    const BY_LEVEL = { 1: LEVEL1, 2: LEVEL2, 3: LEVEL3 };

    function create(level) {
        const lv = Math.max(1, Number(level) || 1);
        const steps = BY_LEVEL[lv];
        if (!steps) {
            return { level: lv, step: 0, steps: [], complete: true, wordCorrect: 0 };
        }
        return { level: lv, step: 0, steps: steps.slice(), complete: false, wordCorrect: 0 };
    }

    function current(q) {
        const s = q || create(1);
        if (s.complete || !s.steps || !s.steps.length || s.step >= s.steps.length) {
            return { id: 'done', title: '本关完成', hint: '', complete: true };
        }
        return s.steps[s.step];
    }

    function matches(step, ev) {
        if (!step || !ev) return false;
        if (step.id === 'look-tree') return ev.type === 'look' && ev.kind === 'log';
        if (step.id === 'make-sword') return ev.type === 'craft' && ev.id === 'wood_sword';
        if (step.id === 'hit-slime') {
            return ev.type === 'kill' && ev.kind === 'slime' && !!ev.quizCorrect;
        }
        if (step.id === 'learn-five') {
            return ev.type === 'word-correct' && (Number(ev.count) || 0) >= 5;
        }
        if (step.id === 'find-fox') return ev.type === 'look' && ev.kind === 'fox';
        if (step.id === 'pick-flower') {
            return ev.type === 'look' && (ev.kind === 'leaf' || ev.kind === 'flower' || ev.kind === 'grass');
        }
        if (step.id === 'learn-six') {
            return ev.type === 'word-correct' && (Number(ev.count) || 0) >= 6;
        }
        if (step.id === 'collect-loot') return ev.type === 'collect' || ev.type === 'mine';
        if (step.id === 'spell-key') {
            return ev.type === 'gate-open' || (ev.type === 'word-correct' && ev.channel === 'spell');
        }
        if (step.id === 'break-boss') return ev.type === 'boss-shield-break';
        return false;
    }

    function apply(q, ev) {
        const src = q || create(1);
        const next = {
            level: src.level,
            step: src.step,
            steps: (src.steps || []).slice(),
            complete: !!src.complete,
            wordCorrect: Number(src.wordCorrect) || 0
        };
        if (ev && ev.type === 'word-correct') {
            next.wordCorrect = Math.max(next.wordCorrect, Number(ev.count) || 0);
        }
        if (next.complete) return next;
        if (!matches(next.steps[next.step], ev)) return next;
        next.step += 1;
        if (next.step >= next.steps.length) next.complete = true;
        return next;
    }

    global.BlockLegendQuests = {
        create: create,
        current: current,
        apply: apply,
        LEVEL1: LEVEL1,
        LEVEL2: LEVEL2,
        LEVEL3: LEVEL3
    };
}(typeof window !== 'undefined' ? window : globalThis));
