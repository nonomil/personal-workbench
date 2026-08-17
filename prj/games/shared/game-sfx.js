/**
 * 三游戏共用短音效（Web Audio 合成）+ 可选循环 BGM 文件
 * 默认增益 ≤ 0.3
 */
(function (global) {
    'use strict';

    const MAX_GAIN = 0.3;
    const BGM_VOL = 0.22;
    let actx = null;
    let unlockBound = false;
    let bgmEl = null;
    let muted = false;

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
        if (muted) return;
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
            if (bgmEl && !muted && bgmEl.paused && bgmEl.getAttribute('data-src')) {
                const p = bgmEl.play();
                if (p && typeof p.catch === 'function') p.catch(function () {});
            }
            global.removeEventListener('pointerdown', once, true);
            global.removeEventListener('keydown', once, true);
        }
        global.addEventListener('pointerdown', once, true);
        global.addEventListener('keydown', once, true);
    }

    bindUnlock();

    function applyBgmVol() {
        if (bgmEl) bgmEl.volume = muted ? 0 : BGM_VOL;
    }

    function playBgm(url) {
        if (!url && !(global.document && global.document.getElementById('theme-bgm'))) return null;
        if (!bgmEl) {
            bgmEl = (global.document && global.document.getElementById('theme-bgm')) ||
                (typeof global.Audio === 'function' ? new global.Audio() : null);
        }
        if (!bgmEl) return null;
        bgmEl.loop = true;
        bgmEl.preload = 'auto';
        if (url && bgmEl.getAttribute('data-src') !== url && bgmEl.getAttribute('src') !== url) {
            bgmEl.src = url;
            bgmEl.setAttribute('data-src', url);
        }
        applyBgmVol();
        ensure();
        const p = bgmEl.play();
        if (p && typeof p.catch === 'function') p.catch(function () {});
        return bgmEl;
    }

    function stopBgm() {
        if (bgmEl) bgmEl.pause();
    }

    function setMuted(on) {
        muted = !!on;
        applyBgmVol();
        return muted;
    }

    global.WorkbenchGameSfx = {
        MAX_GAIN: MAX_GAIN,
        unlock: ensure,
        playBgm: playBgm,
        stopBgm: stopBgm,
        setMuted: setMuted,
        isMuted: function () { return muted; },
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
        mine: function (kind) {
            if (kind === 'wood') {
                tone(160, 0.07, 'triangle', 0.1, 90);
            } else if (kind === 'stone') {
                tone(90, 0.05, 'square', 0.09, 50);
            } else {
                tone(220, 0.05, 'sine', 0.08, 140);
            }
        },
        hit: function () {
            tone(210, 0.05, 'square', 0.09, 140);
        },
        crit: function () {
            tone(520, 0.06, 'square', 0.1);
            tone(780, 0.09, 'square', 0.1, 1040, 0.05);
        },
        shieldBreak: function () {
            tone(880, 0.05, 'triangle', 0.1, 220);
            tone(330, 0.12, 'sawtooth', 0.08, 80, 0.04);
        },
        swing: function () {
            tone(180, 0.06, 'triangle', 0.07, 90);
        },
        pickup: function () {
            tone(784, 0.06, 'sine', 0.08);
            tone(988, 0.08, 'sine', 0.08, null, 0.05);
        },
        coin: function () {
            tone(880, 0.05, 'sine', 0.1);
            tone(1175, 0.08, 'sine', 0.1, 1568, 0.05);
        },
        reward: function () {
            chord([659, 784, 988, 1319], 0.12, 0.07, 0.11);
        },
        levelClear: function () {
            chord([523, 659, 784, 1047, 1319, 1568], 0.16, 0.09, 0.11);
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
        },
        place: function () {
            tone(140, 0.07, 'triangle', 0.1, 90);
        },
        hurt: function () {
            tone(220, 0.12, 'sawtooth', 0.11, 80);
        },
        death: function () {
            tone(196, 0.22, 'square', 0.1, 70);
            tone(130, 0.18, 'triangle', 0.08, 50, 0.08);
        },
        bolt: function () {
            tone(520, 0.1, 'sine', 0.09, 880);
        },
        eat: function () {
            tone(400, 0.05, 'square', 0.08);
            tone(320, 0.07, 'square', 0.08, null, 0.05);
        }
    };
}(typeof window !== 'undefined' ? window : globalThis));
