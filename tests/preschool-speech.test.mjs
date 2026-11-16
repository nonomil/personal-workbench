import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

await import('../prj/preschool-speech.js');
const Speech = globalThis.PersonalWorkbenchPreschoolSpeech;

afterEach(() => {
    delete globalThis.Capacitor;
    delete globalThis.speechSynthesis;
    delete globalThis.SpeechSynthesisUtterance;
});

test('buildSpeechPlan maps learning kinds to language and spoken text', () => {
    assert.deepEqual(Speech.buildSpeechPlan({ kind: 'hanzi', text: '山' }), {
        text: '山', lang: 'zh-CN', rate: 0.8, kind: 'hanzi',
        voice: 'mom', localAudio: true, audioSrc: ''
    });
    assert.equal(Speech.buildSpeechPlan({ kind: 'pinyin', text: 'b', spokenText: '爸' }).text, '爸');
    assert.equal(Speech.buildSpeechPlan({ kind: 'pinyin', text: 'b', spokenText: '爸' }).lang, 'zh-CN');
    assert.equal(Speech.buildSpeechPlan({ kind: 'word', text: 'apple' }).lang, 'en-US');
    assert.deepEqual(Speech.buildSpeechPlan({
        kind: 'ipa', text: '/m/ · /æ/ · /t/', parts: ['mmm', 'ah', 'tuh']
    }).parts, ['mmm', 'ah', 'tuh']);
});

test('speak prefers the Capacitor native plugin when available', async () => {
    const calls = [];
    globalThis.Capacitor = {
        Plugins: {
            TextToSpeech: {
                stop: async () => calls.push(['stop']),
                speak: async (options) => calls.push(['speak', options])
            }
        }
    };

    const result = await Speech.speak({ kind: 'hanzi', text: '爸' });

    assert.equal(result.ok, true);
    assert.equal(result.provider, 'native');
    assert.deepEqual(calls.map((entry) => entry[0]), ['stop', 'speak']);
    assert.equal(calls[1][1].text, '爸');
    assert.equal(calls[1][1].lang, 'zh-CN');
    assert.equal(calls[1][1].queueStrategy, 0);
});

test('speak registers the Capacitor plugin when the static page has no Plugins entry', async () => {
    const calls = [];
    globalThis.Capacitor = {
        Plugins: {},
        registerPlugin: (name) => {
            assert.equal(name, 'TextToSpeech');
            return {
                stop: async () => calls.push('stop'),
                speak: async (options) => calls.push(['speak', options])
            };
        }
    };

    const result = await Speech.speak({ kind: 'hanzi', text: '学' });

    assert.equal(result.ok, true);
    assert.equal(result.provider, 'native');
    assert.deepEqual(calls.map((entry) => Array.isArray(entry) ? entry[0] : entry), ['stop', 'speak']);
    assert.equal(calls[1][1].text, '学');
});

test('speak falls back to Web Speech when the native plugin is unavailable', async () => {
    const calls = [];
    globalThis.speechSynthesis = {
        getVoices: () => [{ name: 'Chinese', lang: 'zh-CN' }],
        cancel: () => calls.push(['cancel']),
        speak: (utterance) => {
            calls.push(['speak', utterance]);
            utterance.onend();
        }
    };
    globalThis.SpeechSynthesisUtterance = function SpeechSynthesisUtterance(text) {
        this.text = text;
    };

    const result = await Speech.speak({ kind: 'hanzi', text: '花' });

    assert.equal(result.ok, true);
    assert.equal(result.provider, 'web');
    assert.deepEqual(calls.map((entry) => entry[0]), ['cancel', 'speak']);
    assert.equal(calls[1][1].text, '花');
    assert.equal(calls[1][1].lang, 'zh-CN');
    assert.equal(calls[1][1].rate, 0.8);
});

test('native failure falls through to Web Speech instead of swallowing the tap', async () => {
    const calls = [];
    globalThis.Capacitor = {
        Plugins: {
            TextToSpeech: {
                stop: async () => calls.push('native-stop'),
                speak: async () => { throw new Error('no Chinese voice'); }
            }
        }
    };
    globalThis.speechSynthesis = {
        getVoices: () => [{ name: 'English', lang: 'en-US' }],
        cancel: () => calls.push('web-cancel'),
        speak: (utterance) => utterance.onend()
    };
    globalThis.SpeechSynthesisUtterance = function SpeechSynthesisUtterance(text) {
        this.text = text;
    };

    const result = await Speech.speak({ kind: 'word', text: 'cat' });

    assert.equal(result.ok, true);
    assert.equal(result.provider, 'web');
    assert.deepEqual(calls, ['native-stop', 'web-cancel']);
});

test('speakParts keeps phoneme order and uses the phoneme language', async () => {
    const utterances = [];
    globalThis.speechSynthesis = {
        getVoices: () => [{ name: 'English', lang: 'en-US' }],
        cancel: () => {},
        speak: (utterance) => {
            utterances.push(utterance);
            utterance.onend();
        }
    };
    globalThis.SpeechSynthesisUtterance = function SpeechSynthesisUtterance(text) {
        this.text = text;
    };

    const result = await Speech.speakParts(['mmm', 'ah', 'tuh'], 'en-US', { pauseMs: 0 });

    assert.equal(result.ok, true);
    assert.deepEqual(utterances.map((item) => item.text), ['mmm', 'ah', 'tuh']);
    assert.deepEqual(utterances.map((item) => item.lang), ['en-US', 'en-US', 'en-US']);
});
