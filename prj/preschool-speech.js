(function (global) {
    'use strict';

    const DEFAULT_LANG = Object.freeze({
        hanzi: 'zh-CN',
        pinyin: 'zh-CN',
        poetry: 'zh-CN',
        word: 'en-US',
        phoneme: 'en-US',
        ipa: 'en-US'
    });
    const DEFAULT_RATE = Object.freeze({
        hanzi: 0.8,
        pinyin: 0.8,
        poetry: 0.86,
        word: 0.85,
        phoneme: 0.72,
        ipa: 0.72
    });
    const DEFAULT_LOCAL_AUDIO_ROOT = '../assets/audio/tts/';
    const DEFAULT_VOICE = 'mom';
    let activeAudio = null;

    function asText(value) {
        return String(value == null ? '' : value).trim();
    }

    function normalizeSpeechText(value) {
        return asText(value).replace(/\s+/g, ' ');
    }

    function normalizedKind(input) {
        const source = input && typeof input === 'object' ? input : {};
        const requested = asText(source.kind).toLowerCase();
        if (requested) return requested;
        return asText(source.lang).toLowerCase().indexOf('en') === 0 ? 'word' : 'hanzi';
    }

    function normalizeParts(value) {
        const source = Array.isArray(value) ? value : asText(value).split(/[|·]/);
        return source.map(asText).filter(Boolean);
    }

    function cleanIpaText(value) {
        return asText(value).replace(/[\/·|]/g, ' ').replace(/\s+/g, ' ').trim();
    }

    function buildSpeechPlan(input) {
        const source = input && typeof input === 'object' ? input : { text: input };
        const kind = normalizedKind(source);
        const rawText = asText(source.text);
        const parts = normalizeParts(source.parts);
        const text = kind === 'pinyin'
            ? asText(source.spokenText || source.sample || source.zh || rawText)
            : kind === 'ipa' && !parts.length
                ? cleanIpaText(rawText)
                : rawText;
        const lang = asText(source.lang) || DEFAULT_LANG[kind] || (kind === 'word' ? 'en-US' : 'zh-CN');
        const configuredRate = Number(source.rate);
        const rate = configuredRate > 0 ? configuredRate : DEFAULT_RATE[kind] || 0.8;
        const plan = {
            text: normalizeSpeechText(text),
            lang: lang,
            rate: rate,
            kind: kind,
            voice: asText(source.voice) || DEFAULT_VOICE,
            localAudio: source.localAudio !== false,
            localAudioRoot: asText(source.localAudioRoot),
            audioSrc: asText(source.audioSrc || source.audio)
        };
        if (parts.length) plan.parts = parts;
        return plan;
    }

    function utf8Bytes(value) {
        if (typeof global.TextEncoder === 'function') return new global.TextEncoder().encode(value);
        const encoded = unescape(encodeURIComponent(value));
        const bytes = [];
        for (let index = 0; index < encoded.length; index += 1) bytes.push(encoded.charCodeAt(index));
        return bytes;
    }

    function audioKey(input) {
        const plan = input && input.text !== undefined && input.kind ? input : buildSpeechPlan(input);
        const payload = `${plan.kind}|${plan.lang}|${plan.voice}|${normalizeSpeechText(plan.text)}`;
        const bytes = utf8Bytes(payload);
        let hash = 2166136261;
        bytes.forEach(function (byte) {
            hash ^= byte;
            hash = Math.imul(hash, 16777619) >>> 0;
        });
        return hash.toString(16).padStart(8, '0');
    }

    function getLocalAudioSource(input) {
        const source = input && typeof input === 'object' ? input : { text: input };
        const plan = source.kind && source.lang && source.text !== undefined ? Object.assign({}, source, {
            text: normalizeSpeechText(source.text),
            voice: asText(source.voice) || DEFAULT_VOICE
        }) : buildSpeechPlan(source);
        if (!plan.text || plan.localAudio === false) return '';
        const root = asText(plan.localAudioRoot) || DEFAULT_LOCAL_AUDIO_ROOT;
        const normalizedRoot = root.endsWith('/') ? root : `${root}/`;
        return `${normalizedRoot}${encodeURIComponent(plan.kind)}/${audioKey(plan)}.mp3`;
    }

    function nativePlugin() {
        const capacitor = global.Capacitor;
        if (!capacitor) return null;
        let plugin = capacitor.Plugins && capacitor.Plugins.TextToSpeech;
        if (!plugin && typeof capacitor.registerPlugin === 'function') {
            try {
                plugin = capacitor.registerPlugin('TextToSpeech');
            } catch (error) {
                plugin = null;
            }
        }
        return plugin && typeof plugin.speak === 'function' ? plugin : null;
    }

    function pickVoice(voices, lang) {
        const list = Array.isArray(voices) ? voices : [];
        const want = asText(lang || 'zh-CN').toLowerCase();
        const prefix = want.split('-')[0];
        return list.find(function (voice) {
            return asText(voice && voice.lang).toLowerCase() === want;
        }) || list.find(function (voice) {
            return asText(voice && voice.lang).toLowerCase().indexOf(prefix) === 0;
        }) || null;
    }

    function readVoices(synth) {
        let voices = [];
        try {
            voices = typeof synth.getVoices === 'function' ? (synth.getVoices() || []) : [];
        } catch (error) {
            voices = [];
        }
        if (voices.length || (!('onvoiceschanged' in synth) && typeof synth.addEventListener !== 'function')) {
            return Promise.resolve(voices);
        }
        return new Promise(function (resolve) {
            let settled = false;
            const previous = synth.onvoiceschanged;
            const finish = function () {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                if (synth.onvoiceschanged === changed) synth.onvoiceschanged = previous || null;
                try {
                    resolve(typeof synth.getVoices === 'function' ? (synth.getVoices() || []) : []);
                } catch (error) {
                    resolve([]);
                }
            };
            const changed = function () {
                if (typeof previous === 'function') previous();
                finish();
            };
            const timer = setTimeout(finish, 500);
            synth.onvoiceschanged = changed;
        });
    }

    function speakBrowser(plan) {
        const synth = global.speechSynthesis;
        const Utterance = global.SpeechSynthesisUtterance;
        if (!synth || typeof synth.speak !== 'function' || typeof Utterance !== 'function') {
            return Promise.resolve({ ok: false, reason: 'unsupported' });
        }
        return readVoices(synth).then(function (voices) {
            return new Promise(function (resolve) {
                let settled = false;
                const utterance = new Utterance(plan.text);
                utterance.lang = plan.lang;
                utterance.rate = plan.rate;
                const voice = pickVoice(voices, plan.lang);
                if (voice) utterance.voice = voice;
                const finish = function (result) {
                    if (settled) return;
                    settled = true;
                    resolve(result);
                };
                utterance.onend = function () { finish({ ok: true, provider: 'web' }); };
                utterance.onerror = function () { finish({ ok: false, reason: 'error' }); };
                try {
                    if (typeof synth.cancel === 'function') synth.cancel();
                    synth.speak(utterance);
                } catch (error) {
                    finish({ ok: false, reason: 'error' });
                }
            });
        });
    }

    function stopLocalAudio() {
        if (!activeAudio) return;
        try {
            activeAudio.pause();
            activeAudio.currentTime = 0;
        } catch (error) {
            // The browser may already have discarded the media element.
        }
        activeAudio = null;
    }

    function speakLocal(plan) {
        if (!plan.localAudio || typeof global.Audio !== 'function') return Promise.resolve(null);
        const source = plan.audioSrc || getLocalAudioSource(plan);
        if (!source) return Promise.resolve(null);
        stopLocalAudio();
        return new Promise(function (resolve) {
            let settled = false;
            const audio = new global.Audio(source);
            activeAudio = audio;
            const finish = function (result) {
                if (settled) return;
                settled = true;
                if (activeAudio === audio) activeAudio = null;
                resolve(result);
            };
            audio.onended = function () { finish({ ok: true, provider: 'local', source: source }); };
            audio.onerror = function () { finish(null); };
            try {
                const playing = audio.play();
                if (playing && typeof playing.catch === 'function') playing.catch(function () { finish(null); });
            } catch (error) {
                finish(null);
            }
        });
    }

    async function speak(input) {
        const plan = buildSpeechPlan(input);
        if (plan.parts && plan.parts.length) {
            return speakParts(plan.parts, plan.lang, { rate: plan.rate });
        }
        if (!plan.text) return { ok: false, reason: 'empty' };

        const local = await speakLocal(plan);
        if (local && local.ok) return local;

        const native = nativePlugin();
        if (native) {
            try {
                if (typeof native.stop === 'function') await native.stop();
                await native.speak({
                    text: plan.text,
                    lang: plan.lang,
                    rate: plan.rate,
                    pitch: 1,
                    volume: 1,
                    category: 'ambient',
                    queueStrategy: 0
                });
                return { ok: true, provider: 'native' };
            } catch (error) {
                // A missing Android language pack should fall through to Web Speech.
            }
        }
        return speakBrowser(plan);
    }

    function wait(pauseMs) {
        const delay = Math.max(0, Number(pauseMs) || 0);
        return delay ? new Promise(function (resolve) { setTimeout(resolve, delay); }) : Promise.resolve();
    }

    async function speakParts(parts, lang, options) {
        const list = normalizeParts(parts);
        if (!list.length) return { ok: false, reason: 'empty' };
        const settings = options && typeof options === 'object' ? options : {};
        const providers = [];
        for (let index = 0; index < list.length; index += 1) {
            const result = await speak({
                text: list[index],
                lang: lang || 'en-US',
                kind: 'phoneme',
                rate: Number(settings.rate) > 0 ? Number(settings.rate) : 0.72
            });
            if (!result.ok) return result;
            providers.push(result.provider);
            await wait(settings.pauseMs == null ? 120 : settings.pauseMs);
        }
        return { ok: true, provider: providers.every(function (provider) { return provider === 'native'; }) ? 'native' : 'web' };
    }

    async function stop() {
        stopLocalAudio();
        const native = nativePlugin();
        if (native && typeof native.stop === 'function') {
            try { await native.stop(); } catch (error) { /* fall through to browser */ }
        }
        const synth = global.speechSynthesis;
        if (synth && typeof synth.cancel === 'function') synth.cancel();
    }

    global.PersonalWorkbenchPreschoolSpeech = {
        buildSpeechPlan: buildSpeechPlan,
        audioKey: audioKey,
        getLocalAudioSource: getLocalAudioSource,
        pickVoice: pickVoice,
        speak: speak,
        speakParts: speakParts,
        stop: stop
    };
})(typeof window !== 'undefined' ? window : globalThis);
