/**
 * blocklegend · 语音结果归一化（Phase 2）
 * 不保存录音，不上传。浏览器适配在 game.js。
 */
(function (global) {
    'use strict';

    const FAIL_KINDS = ['no-permission', 'unsupported', 'timeout', 'noise', 'mismatch'];

    function normHeard(s) {
        return String(s || '').trim().toLowerCase().replace(/[^a-z']/g, '');
    }

    function editDistance(a, b) {
        const left = String(a || '');
        const right = String(b || '');
        const rows = left.length + 1;
        const cols = right.length + 1;
        const grid = [];
        for (let i = 0; i < rows; i += 1) {
            grid[i] = [i];
        }
        for (let j = 0; j < cols; j += 1) grid[0][j] = j;
        for (let i = 1; i < rows; i += 1) {
            for (let j = 1; j < cols; j += 1) {
                const cost = left[i - 1] === right[j - 1] ? 0 : 1;
                grid[i][j] = Math.min(
                    grid[i - 1][j] + 1,
                    grid[i][j - 1] + 1,
                    grid[i - 1][j - 1] + cost
                );
            }
        }
        return grid[left.length][right.length];
    }

    function tokensOf(s) {
        return String(s || '').toLowerCase().split(/[^a-z']+/).filter(Boolean);
    }

    function closeEnough(want, got) {
        if (!want || !got) return false;
        if (want === got) return true;
        if (want.length <= 3) return false;
        return editDistance(want, got) <= 1;
    }

    function matchHeard(target, heard) {
        const want = normHeard(target);
        if (!want) return { ok: false, kind: 'mismatch' };
        const parts = tokensOf(heard);
        let i = 0;
        for (i = 0; i < parts.length; i += 1) {
            if (closeEnough(want, parts[i])) {
                return { ok: true, kind: parts[i] === want ? 'match' : 'close' };
            }
        }
        const got = normHeard(heard);
        if (closeEnough(want, got)) return { ok: true, kind: want === got ? 'match' : 'close' };
        return { ok: false, kind: 'mismatch' };
    }

    function fail(kind) {
        const k = FAIL_KINDS.indexOf(kind) >= 0 ? kind : 'mismatch';
        return { ok: false, kind: k };
    }

    function canSpeak() {
        if (typeof window === 'undefined') return false;
        return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    }

    global.BlockLegendSpeech = {
        FAIL_KINDS: FAIL_KINDS,
        normHeard: normHeard,
        editDistance: editDistance,
        matchHeard: matchHeard,
        fail: fail,
        canSpeak: canSpeak
    };
}(typeof window !== 'undefined' ? window : globalThis));
