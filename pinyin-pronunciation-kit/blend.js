/*
 * pinyin-pronunciation-kit · blend.js
 * 拼读组合：呼读文本、三段拼读（声母呼读→韵母→例字音节）、合法韵母与音节拼合。
 * 依赖：data/pinyin-call-table.js、data/pinyin-legal-syllables.js、data/pinyin-tone.js
 */
(function (global) {
    'use strict';

    const tables = global.PinyinCallTable;
    const legal = global.PinyinLegalSyllables || [];
    const tone = global.PinyinTone || {};
    if (!tables || !tone.stripPinyinTone) {
        throw new Error('pinyin-pronunciation-kit: 先加载 data/pinyin-call-table.js 与 data/pinyin-tone.js');
    }

    const FINAL_DISPLAY = { v: 'ü', ve: 'üe', vn: 'ün' };

    // 卡片数据形状：{ text:'b', kind:'initial'|'final'|'whole', initial:'b', pinyin:'bà', sample:'爸' }
    // （与 preschool-pinyin.js parseBank 拆平后的顶层字段一致——不要读 item.extra）
    function callText(item) {
        if (!item) return '';
        if (item.kind === 'initial') return tables.initials[item.initial || item.text] || item.sample || item.text;
        if (item.kind === 'final') return tables.finals[tone.stripPinyinTone(item.text)] || item.sample || item.text;
        return item.sample || item.text;
    }

    // 三段拼读：['波','啊','爸']；非声母卡（无拼读）返回 null
    function blendParts(item) {
        if (!item || item.kind !== 'initial' || !item.initial || !item.pinyin || !item.sample) return null;
        const initialCall = tables.initials[item.initial];
        if (!initialCall) return null;
        const bare = tone.stripPinyinTone(item.pinyin);
        const finalKey = bare.indexOf(item.initial) === 0 ? bare.slice(item.initial.length) : bare;
        const finalCall = tables.finals[finalKey];
        if (!finalCall) return null;
        return [initialCall, finalCall, item.sample];
    }

    // initial + final → 合法书写音节（v 系自动尝试 u 变体）；不合法返回 ''
    function syllableFor(initial, finalKey) {
        const a = String(initial || '');
        const b = String(finalKey || '');
        if (!a || !b) return '';
        const candidates = [a + b];
        if (b.charAt(0) === 'v') {
            candidates.push(a + 'u' + b.slice(1));
            candidates.push(a + 'v' + b.slice(1));
        }
        for (let index = 0; index < candidates.length; index += 1) {
            if (legal.indexOf(candidates[index]) >= 0) return candidates[index];
        }
        return '';
    }

    function legalFinals(initial) {
        return Object.keys(tables.finals).filter(function (finalKey) {
            return finalKey !== 'er' && !!syllableFor(initial, finalKey);
        });
    }

    global.PinyinBlend = Object.freeze({
        callText: callText,
        blendParts: blendParts,
        syllableFor: syllableFor,
        legalFinals: legalFinals,
        finalDisplay: FINAL_DISPLAY
    });
})(typeof window !== 'undefined' ? window : globalThis);
