/*
 * pinyin-pronunciation-kit · data/pinyin-tone.js
 * 声调工具：去调、按小学规则标调（a 优先 → o/e → iu/ui 标后 → i/u/v）、四声形态派生。
 * 纯函数，无依赖。
 */
(function (global) {
    'use strict';

    const TONE_STRIP = {
        'ā': 'a', 'á': 'a', 'ǎ': 'a', 'à': 'a',
        'ē': 'e', 'é': 'e', 'ě': 'e', 'è': 'e',
        'ī': 'i', 'í': 'i', 'ǐ': 'i', 'ì': 'i',
        'ō': 'o', 'ó': 'o', 'ǒ': 'o', 'ò': 'o',
        'ū': 'u', 'ú': 'u', 'ǔ': 'u', 'ù': 'u',
        'ǖ': 'v', 'ǘ': 'v', 'ǚ': 'v', 'ǜ': 'v'
    };

    const TONE_MARKS = {
        a: ['ā', 'á', 'ǎ', 'à'],
        o: ['ō', 'ó', 'ǒ', 'ò'],
        e: ['ē', 'é', 'ě', 'è'],
        i: ['ī', 'í', 'ǐ', 'ì'],
        u: ['ū', 'ú', 'ǔ', 'ù'],
        v: ['ǖ', 'ǘ', 'ǚ', 'ǜ']
    };

    function stripPinyinTone(syllable) {
        return String(syllable || '').split('').map(function (ch) { return TONE_STRIP[ch] || ch; }).join('');
    }

    function pinyinToneMark(vowel, toneIndex) {
        const row = TONE_MARKS[vowel];
        return row ? row[toneIndex] : vowel;
    }

    // 返回 ['bā','bá','bǎ','bà'] 形态（轻声/儿化不在范围内）
    function pinyinToneForms(syllable) {
        const bare = stripPinyinTone(syllable);
        if (!bare) return [];
        const lower = bare.toLowerCase();
        const forms = [];
        for (let tone = 0; tone < 4; tone += 1) {
            let out = bare;
            if (lower.indexOf('a') >= 0) out = bare.replace('a', pinyinToneMark('a', tone));
            else if (lower.indexOf('o') >= 0) out = bare.replace('o', pinyinToneMark('o', tone));
            else if (lower.indexOf('e') >= 0) out = bare.replace('e', pinyinToneMark('e', tone));
            else if (/(iu|ui|i?u)$/.test(lower)) out = bare.replace(/(iu|ui|u)$/, function (m) { return m.replace('u', pinyinToneMark('u', tone)); });
            else if (lower.indexOf('i') >= 0) out = bare.replace('i', pinyinToneMark('i', tone));
            else if (lower.indexOf('u') >= 0) out = bare.replace('u', pinyinToneMark('u', tone));
            else if (lower.indexOf('v') >= 0) out = bare.replace('v', pinyinToneMark('v', tone));
            forms.push(out);
        }
        return forms;
    }

    global.PinyinTone = Object.freeze({
        stripPinyinTone: stripPinyinTone,
        pinyinToneMark: pinyinToneMark,
        pinyinToneForms: pinyinToneForms
    });
})(typeof window !== 'undefined' ? window : globalThis);
