/**
 * 三游戏共用短音效（Web Audio 合成，不引入音频文件）
 * 总纲裁决：一期只做庆祝 / 升段 / 检查点 / 通关 / 新纪录；默认增益 ≤ 0.3
 */
(function (global) {
    'use strict';

    const MAX_GAIN = 0.3;
    let actx = null;
    let unlockBound = false;

    function ensure() {
        const AC = global.AudioContext || global.webkitAudioContext;
        if (!AC) return null;
        if (!actx) actx = new AC();
        if (actx.state === 'suspended') {
            const p = actx.resume();
            if (p && typeof p.catch === 'function') p.catch(function () {});
        }
        return actx;
    }

    function tone(freq, dur, type, vol, slideTo, delay) {
        const ac = ensure();
        if (!ac) return;
        const t0 = ac.currentTime + (delay || 0);
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        const level = Math.min(MAX_GAIN, vol == null ? 0.12 : vol);
        osc.type = type || 'square';
        osc.frequency.setValueAtTime(freq, t0);
        if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
        gain.gain.setValueAtTime(level, t0);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start(t0);
        osc.stop(t0 + dur + 0.03);
    }

    function chord(freqs, dur, gap, vol) {
        freqs.forEach(function (f, i) {
            tone(f, dur, 'square', vol == null ? 0.1 : vol, null, i * (gap == null ? 0.09 : gap));
        });
    }

    function bindUnlock() {
        if (unlockBound || typeof global.addEventListener !== 'function') return;
        unlockBound = true;
        function once() {
            ensure();
            global.removeEventListener('pointerdown', once, true);
            global.removeEventListener('keydown', once, true);
        }
        global.addEventListener('pointerdown', once, true);
        global.addEventListener('keydown', once, true);
    }

    bindUnlock();

    global.WorkbenchGameSfx = {
        MAX_GAIN: MAX_GAIN,
        unlock: ensure,
        celebrate: function () {
            chord([523, 659, 784, 1047], 0.16, 0.08, 0.12);
        },
        rankUp: function () {
            chord([392, 523, 659, 784, 1047], 0.14, 0.09, 0.12);
        },
        checkpoint: function () {
            tone(660, 0.08, 'square', 0.1);
            tone(880, 0.12, 'square', 0.1, null, 0.07);
        },
        clear: function () {
            chord([523, 659, 784, 1047, 1319], 0.14, 0.1, 0.1);
        },
        record: function () {
            tone(988, 0.08, 'square', 0.1);
            tone(1319, 0.12, 'square', 0.1, 1760, 0.07);
        },
        mine: function () {
            tone(180, 0.05, 'square', 0.08, 90);
        },
        jump: function () {
            tone(420, 0.08, 'square', 0.08, 620);
        },
        craft: function () {
            tone(523, 0.07, 'square', 0.1);
            tone(784, 0.1, 'square', 0.1, null, 0.06);
        },
        buy: function () {
            tone(660, 0.06, 'square', 0.09);
            tone(880, 0.08, 'square', 0.09, null, 0.05);
        }
    };
}(typeof window !== 'undefined' ? window : globalThis));
