/*
 * pinyin-pronunciation-kit · data/pinyin-call-table.js
 * 声母呼读音 + 韵母呼读字映射（23 声母 / 24 韵母）。
 * 教学口径：声母读呼读音（b→波，含元音尾），韵母读本音呼读字（a→啊）。
 * 纯数据，无依赖；<script> 引入后读 global.PinyinCallTable。
 */
(function (global) {
    'use strict';

    global.PinyinCallTable = Object.freeze({
        initials: Object.freeze({
            'b': '波', 'p': '坡', 'm': '摸', 'f': '佛', 'd': '得', 't': '特', 'n': '讷', 'l': '勒',
            'g': '哥', 'k': '科', 'h': '喝', 'j': '鸡', 'q': '七', 'x': '西',
            'zh': '知', 'ch': '吃', 'sh': '狮', 'r': '日', 'z': '资', 'c': '刺', 's': '丝',
            'y': '衣', 'w': '乌'
        }),
        finals: Object.freeze({
            'a': '啊', 'o': '喔', 'e': '鹅', 'i': '衣', 'u': '乌', 'v': '迂',
            'ai': '哀', 'ei': '诶', 'ui': '威', 'ao': '凹', 'ou': '欧', 'iu': '优',
            'ie': '耶', 've': '约', 'er': '儿',
            'an': '安', 'en': '恩', 'in': '因', 'un': '温', 'vn': '晕',
            'ang': '昂', 'eng': '鞥', 'ing': '英', 'ong': '翁'
        })
    });
})(typeof window !== 'undefined' ? window : globalThis);
