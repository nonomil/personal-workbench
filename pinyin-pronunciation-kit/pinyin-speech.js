/*
 * pinyin-pronunciation-kit · pinyin-speech.js
 * 独立发音播放器：本地音频优先（audio/manifest.json 按"文本"索引），
 * 回退 Capacitor TextToSpeech，再回退 Web Speech。零项目依赖。
 *
 * 接入：
 *   <script src="data/pinyin-call-table.js"></script>
 *   <script src="data/pinyin-tone.js"></script>
 *   <script src="data/pinyin-legal-syllables.js"></script>
 *   <script src="blend.js"></script>
 *   <script src="pinyin-speech.js"></script>
 *
 *   PinyinSpeech.config({ audioRoot: 'audio/' });          // 可选，默认相对 audio/
 *   await PinyinSpeech.speak({ text: '波' });              // 本地 波.mp3，缺失走 TTS
 *   await PinyinSpeech.speakBlend(['波','啊','爸']);        // 三段拼读（自带节奏停顿）
 */
(function (global) {
    'use strict';

    const settings = { audioRoot: 'audio/' };
    let manifestCache = null;
    let activeAudio = null;

    function config(options) {
        const opts = options || {};
        if (opts.audioRoot) settings.audioRoot = String(opts.audioRoot).replace(/\/?$/, '/');
        return Object.assign({}, settings);
    }

    async function ensureManifest() {
        if (manifestCache) return manifestCache;
        try {
            const response = await global.fetch(settings.audioRoot + 'manifest.json', { cache: 'force-cache' });
            manifestCache = await response.json();
        } catch (error) {
            manifestCache = {};
        }
        return manifestCache;
    }

    function nativePlugin() {
        const capacitor = global.Capacitor;
        const plugin = capacitor && capacitor.Plugins && capacitor.Plugins.TextToSpeech;
        return plugin && typeof plugin.speak === 'function' ? plugin : null;
    }

    function speakWeb(plan) {
        const synth = global.speechSynthesis;
        const Utterance = global.SpeechSynthesisUtterance;
        if (!synth || typeof synth.speak !== 'function' || typeof Utterance !== 'function') {
            return Promise.resolve({ ok: false, reason: 'unsupported' });
        }
        return new Promise(function (resolve) {
            const utterance = new Utterance(plan.text);
            utterance.lang = plan.lang || 'zh-CN';
            utterance.rate = plan.rate || 0.8;
            utterance.onend = function () { resolve({ ok: true, provider: 'web' }); };
            utterance.onerror = function () { resolve({ ok: false, reason: 'error' }); };
            try { synth.cancel(); synth.speak(utterance); } catch (error) { resolve({ ok: false, reason: 'error' }); }
        });
    }

    function speakLocalFile(file) {
        if (!file || typeof global.Audio !== 'function') return Promise.resolve(null);
        if (activeAudio) { try { activeAudio.pause(); } catch (error) { /* 已释放 */ } activeAudio = null; }
        return new Promise(function (resolve) {
            let settled = false;
            const audio = new global.Audio(settings.audioRoot + file);
            activeAudio = audio;
            const finish = function (result) {
                if (settled) return;
                settled = true;
                if (activeAudio === audio) activeAudio = null;
                resolve(result);
            };
            audio.onended = function () { finish({ ok: true, provider: 'local' }); };
            audio.onerror = function () { finish(null); };
            try {
                const playing = audio.play();
                if (playing && typeof playing.catch === 'function') playing.catch(function () { finish(null); });
            } catch (error) { finish(null); }
        });
    }

    async function speak(input) {
        const plan = {
            text: String(input && input.text || '').trim(),
            lang: (input && input.lang) || 'zh-CN',
            rate: Number(input && input.rate) > 0 ? Number(input.rate) : 0.8
        };
        if (!plan.text) return { ok: false, reason: 'empty' };
        const manifest = await ensureManifest();
        const local = await speakLocalFile(manifest[plan.text] || manifest[plan.text + '.mp3']);
        if (local && local.ok) return local;
        const native = nativePlugin();
        if (native) {
            try {
                if (typeof native.stop === 'function') await native.stop();
                await native.speak({ text: plan.text, lang: plan.lang, rate: plan.rate, pitch: 1, volume: 1 });
                return { ok: true, provider: 'native' };
            } catch (error) { /* 缺语言包时落到 Web Speech */ }
        }
        return speakWeb(plan);
    }

    function wait(pauseMs) {
        const delay = Math.max(0, Number(pauseMs) || 0);
        return delay ? new Promise(function (resolve) { setTimeout(resolve, delay); }) : Promise.resolve();
    }

    // 三段拼读：['波','啊','爸'] → 声母轻短 0.7 → 韵母 → 音节 0.85，段间 340ms
    async function speakBlend(parts, options) {
        const list = (Array.isArray(parts) ? parts : String(parts || '').split('|')).map(function (part) {
            return String(part || '').trim();
        }).filter(Boolean);
        if (!list.length) return { ok: false, reason: 'empty' };
        const opts = options || {};
        const pauseMs = opts.pauseMs == null ? 340 : opts.pauseMs;
        for (let index = 0; index < list.length; index += 1) {
            const last = index === list.length - 1;
            await speak({ text: list[index], lang: 'zh-CN', rate: last ? 0.85 : 0.7 });
            await wait(last ? 60 : pauseMs);
        }
        return { ok: true, provider: 'blend' };
    }

    async function stop() {
        if (activeAudio) { try { activeAudio.pause(); } catch (error) { /* 已释放 */ } activeAudio = null; }
        const native = nativePlugin();
        if (native && typeof native.stop === 'function') { try { await native.stop(); } catch (error) { /* 已停止 */ } }
        if (global.speechSynthesis && typeof global.speechSynthesis.cancel === 'function') global.speechSynthesis.cancel();
    }

    global.PinyinSpeech = Object.freeze({
        config: config,
        speak: speak,
        speakBlend: speakBlend,
        stop: stop
    });
})(typeof window !== 'undefined' ? window : globalThis);
