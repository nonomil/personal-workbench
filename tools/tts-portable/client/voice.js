/**
 * VoiceSystem — 通用前端语音播报库（可移植版）
 *
 * 三层降级：后端 TTS 服务（VoxCPM2/edge-tts）→ 浏览器 Web Speech API → 静默
 * 零侵入：监听任意 DOM 文字容器自动播报，不改业务代码。
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ 新项目接入（3 步）                                             │
 * │  1. <script src="js/voice.js"></script>                        │
 * │  2. 配 window.VoiceSystemConfig = { selectors, panelSelector } │
 * │  3. （或手动）VoiceSystem.init(options)                        │
 * │ 详见 client/接入示例.md                                         │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * 配置项（init(options) 或 window.VoiceSystemConfig）：
 *   storageKey        localStorage 键名（默认 'voice_settings'）
 *   panelSelector     设置面板挂载点 CSS 选择器（默认 '.voice-settings-panel'，找不到则不注入面板）
 *   selectors         [{sel, extract(n)->string, throttle?ms}] 监听规则数组（默认 []）
 *   defaultSettings   { enabled, voice, rate, pitch, serverUrl } 默认值
 *   defaultVoice      等价于 defaultSettings.voice（便捷写法）
 *
 * 暴露 API（window.VoiceSystem）：
 *   init(options)         初始化（可重复调用，幂等）
 *   speak(text, opts?)    主动播报一段文本（opts 可传 lang/voice/engine/allowSingle）
 *   getSettings()         读取当前设置（副本）
 *   setSettings(partial)  局部更新设置并持久化
 *   checkServer()         手动触发服务可达性检测（Promise<boolean>）
 */
(function () {
    'use strict';

    // ===== 默认配置 =====
    var DEFAULT_OPTIONS = {
        storageKey: 'voice_settings',
        panelSelector: '.voice-settings-panel',
        selectors: [],                 // 默认不监听任何容器，由接入方按需配置
        defaultSettings: {
            enabled: false,
            voice: 'mom',              // mom / grandpa / teacher / child（与后端 config.py 的 VOICE_PRESETS key 对应）
            rate: 1.0,
            pitch: 1.0,
            serverUrl: ''              // 如 'http://127.0.0.1:9885'，留空则只用 Web Speech
        }
    };

    var settings = null;               // 当前设置（运行时由 options.defaultSettings 与 localStorage 合并）
    var options = null;                // init 时固化的 options
    var _serverAvailable = false;
    var _lastServerCheck = 0;
    var _SERVER_CHECK_INTERVAL = 30000;

    // ===== 节流状态（按 selector 索引记录上次触发时间，对应规则的 throttle 字段）=====
    var _throttleMap = {};             // sel -> lastTimestamp

    function _mergeSettings(defaults, stored) {
        var base = {};
        for (var k in defaults) base[k] = defaults[k];
        if (stored) for (var k2 in stored) base[k2] = stored[k2];
        return base;
    }

    // ===== 配置存储 =====
    function load() {
        try {
            var raw = localStorage.getItem(options.storageKey);
            settings = _mergeSettings(options.defaultSettings, raw ? JSON.parse(raw) : null);
        } catch (e) {
            settings = _mergeSettings(options.defaultSettings, null);
        }
    }
    function save() {
        try { localStorage.setItem(options.storageKey, JSON.stringify(settings)); } catch (e) { /* ignore */ }
    }
    function getSettings() { return _mergeSettings(settings, null); }
    function setSettings(partial) {
        settings = _mergeSettings(settings, partial || {});
        save();
        if (partial && 'serverUrl' in partial) { _lastServerCheck = 0; checkServer(); }
    }

    // ===== 文本清洗 =====
    function cleanText(text, opts) {
        opts = opts || {};
        if (typeof text !== 'string') return '';
        var s = text;
        // 去 emoji：优先 Unicode 属性，否则回退区间
        try {
            s = s.replace(/\p{Extended_Pictographic}/gu, '');
        } catch (e) {
            s = s.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{1F1E6}-\u{1F1FF}]/gu, '');
        }
        s = s.replace(/\s+/g, ' ').trim();
        if (!s) return '';
        // 数学符号转中文读法（仅当文本像算式时）
        if (/[\d+\-*/×÷=]/.test(s) && /[+\-*/×÷=]/.test(s)) {
            s = s.replace(/\+/g, '加')
                 .replace(/-/g, '减')
                 .replace(/[×*]/g, '乘')
                 .replace(/÷/g, '除')
                 .replace(/=/g, '等于');
            s = s.trim();
        }
        if (!s) return '';
        if (/^\d+(\.\d+)?$/.test(s)) return '';   // 纯数字不播
        if (s.length < 2 && !opts.allowSingle) return ''; // 普通 DOM 播报过滤单字符；主动发音可放开
        return s;
    }

    // ===== 串行播放队列 + 2s 去重 =====
    var _queue = [];
    var _playing = false;
    var _lastText = '';
    var _lastTime = 0;

    function speak(text, opts) {
        opts = opts || {};
        if (!settings.enabled) return;
        text = cleanText(text, opts);
        if (!text) return;
        var now = Date.now();
        if (text === _lastText && (now - _lastTime) < 2000) return;   // 指纹去重
        _lastText = text; _lastTime = now;
        _queue.push({ text: text, opts: opts });
        _playNext();
    }

    function _playNext() {
        if (_playing) return;
        var item = _queue.shift();
        if (item == null) return;
        var text = item.text;
        var speakOptions = item.opts || {};
        _playing = true;
        var done = function () { _playing = false; _playNext(); };
        if (settings.serverUrl && _serverAvailable) {
            _speakViaServer(text, speakOptions).then(done).catch(function (err) {
                console.warn('[VoiceSystem] server tts failed, fallback browser:', err && err.message);
                _speakViaBrowser(text, done, speakOptions);
            });
        } else {
            _speakViaBrowser(text, done, speakOptions);
        }
    }

    // ===== 后端 TTS =====
    function _speakViaServer(text, opts) {
        opts = opts || {};
        return new Promise(function (resolve, reject) {
            var ctrl = new AbortController();
            var timer = setTimeout(function () { ctrl.abort(); }, 15000);
            fetch(settings.serverUrl.replace(/\/$/, '') + '/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text,
                    voice: opts.voice || settings.voice,
                    lang: opts.lang || 'zh-CN',
                    engine: opts.engine || 'auto'
                }),
                signal: ctrl.signal
            }).then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                var contentType = res.headers.get('content-type') || '';
                function playBlob(blob) {
                    var url = URL.createObjectURL(blob);
                    var audio = new Audio(url);
                    audio.onended = function () { URL.revokeObjectURL(url); resolve(); };
                    audio.onerror = function () { URL.revokeObjectURL(url); reject(new Error('audio play error')); };
                    audio.play().catch(function (e) { URL.revokeObjectURL(url); reject(e); });
                }
                if (contentType.indexOf('json') !== -1) {
                    // 服务端降级响应 {error, fallback:true} → 走 catch 由浏览器兜底
                    return res.json().then(function (j) { reject(new Error((j && j.error) || 'server tts error')); });
                }
                return res.blob().then(playBlob);   // audio/* 或未知类型都当音频试播
            }).catch(function (err) {
                reject(err);
            }).finally(function () { clearTimeout(timer); });
        });
    }

    // ===== 浏览器 Web Speech API =====
    var _voicesCache = null;
    function _getVoices() {
        if (_voicesCache && _voicesCache.length) return _voicesCache;
        try { _voicesCache = window.speechSynthesis.getVoices() || []; } catch (e) { _voicesCache = []; }
        return _voicesCache;
    }
    function _pickBrowserVoice(lang) {
        var voices = _getVoices();
        if (!voices.length) return null;
        var wanted = String(lang || 'zh-CN').toLowerCase();
        var prefix = wanted.split('-')[0];
        var localized = voices.filter(function (v) {
            var voiceLang = String(v.lang || '').toLowerCase();
            return voiceLang === wanted || voiceLang.indexOf(prefix) === 0;
        });
        var pool = localized.length ? localized : voices;
        var kw;
        if (settings.voice === 'grandpa') kw = ['Yun', 'Male', '男'];
        else if (settings.voice === 'teacher' || settings.voice === 'mom' || settings.voice === 'child') kw = ['Xiao', 'Female', '女'];
        else kw = ['Female', '女'];
        for (var i = 0; i < kw.length; i++) {
            var hit = pool.find(function (vv) { return vv.name && vv.name.indexOf(kw[i]) !== -1; });
            if (hit) return hit;
        }
        return pool[0];
    }
    function _speakViaBrowser(text, done, opts) {
        opts = opts || {};
        if (!('speechSynthesis' in window)) { done && done(); return; }
        var utter;
        try { utter = new SpeechSynthesisUtterance(text); } catch (e) { done && done(); return; }
        utter.lang = opts.lang || 'zh-CN';
        var v = _pickBrowserVoice(utter.lang);
        if (v) utter.voice = v;
        var rate = settings.rate;
        if (settings.voice === 'child') rate *= 0.85;   // 童声稍慢
        utter.rate = rate;
        utter.pitch = settings.pitch;
        var settled = false;
        var finish = function () { if (settled) return; settled = true; done && done(); };
        utter.onend = finish;
        utter.onerror = finish;
        try { window.speechSynthesis.speak(utter); } catch (e) { finish(); }
        setTimeout(finish, 5000);   // 安全兜底：5s 未结束也释放队列
    }

    // ===== 服务可达性检测 =====
    function checkServer() {
        if (!settings.serverUrl) { _serverAvailable = false; return Promise.resolve(false); }
        var now = Date.now();
        if ((now - _lastServerCheck) < _SERVER_CHECK_INTERVAL && _lastServerCheck) {
            return Promise.resolve(_serverAvailable);
        }
        _lastServerCheck = now;
        return new Promise(function (resolve) {
            var ctrl = new AbortController();
            var timer = setTimeout(function () { ctrl.abort(); }, 2000);
            fetch(settings.serverUrl.replace(/\/$/, '') + '/health', { signal: ctrl.signal })
                .then(function (res) { _serverAvailable = !!res.ok; resolve(_serverAvailable); })
                .catch(function () { _serverAvailable = false; resolve(false); })
                .finally(function () { clearTimeout(timer); });
        });
    }

    // ===== MutationObserver：按配置的 selectors 监听文字容器 =====
    function _matchAndExtract(node) {
        if (!node || node.nodeType !== 1) return null;
        var rules = options.selectors || [];
        for (var i = 0; i < rules.length; i++) {
            var rule = rules[i];
            var matched = null;
            try {
                if (node.matches && node.matches(rule.sel)) matched = node;
                else if (node.closest && node.closest(rule.sel)) matched = node.closest(rule.sel);
            } catch (e) { /* invalid selector */ }
            if (matched) {
                // 节流（可选，每个 selector 独立计时）
                if (rule.throttle) {
                    var last = _throttleMap[rule.sel] || 0;
                    if (Date.now() - last < rule.throttle) return null;
                    _throttleMap[rule.sel] = Date.now();
                }
                try {
                    var t = rule.extract(matched);
                    if (t) return t;
                } catch (e) { /* ignore */ }
            }
        }
        return null;
    }
    function _handleMutationNode(node) {
        var text = _matchAndExtract(node);
        if (text) speak(text);
    }
    function _initContentObserver() {
        var obs = new MutationObserver(function (mutations) {
            for (var i = 0; i < mutations.length; i++) {
                var m = mutations[i];
                if (m.type === 'characterData') {
                    var parent = m.target.parentElement;
                    if (parent) _handleMutationNode(parent);
                    continue;
                }
                if (m.addedNodes && m.addedNodes.length) {
                    for (var j = 0; j < m.addedNodes.length; j++) {
                        var n = m.addedNodes[j];
                        if (n.nodeType === 1) _handleMutationNode(n);
                        else if (n.nodeType === 3 && n.parentElement) _handleMutationNode(n.parentElement);
                    }
                }
            }
        });
        obs.observe(document.body, { childList: true, subtree: true, characterData: true });
    }

    // ===== 设置 UI 自注入（挂到 panelSelector 指向的容器）=====
    function _injectSettingsUI(panel) {
        if (!panel || panel.dataset.voiceInjected) return;
        panel.dataset.voiceInjected = '1';

        var card = document.createElement('div');
        card.className = 'voice-settings-card';
        card.style.cssText = 'margin-top:12px;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:14px;display:flex;flex-direction:column;gap:10px;';
        card.innerHTML =
            '<div style="font-weight:600;">🔊 语音设置</div>' +
            '<label style="display:flex;align-items:center;gap:8px;">' +
                '<input type="checkbox" id="voiceEnabled" ' + (settings.enabled ? 'checked' : '') + '> 启用语音播报' +
            '</label>' +
            '<label style="display:flex;align-items:center;gap:8px;">音色 ' +
                '<select id="voiceSelect" style="flex:1;padding:4px;">' +
                    '<option value="mom"' + (settings.voice === 'mom' ? ' selected' : '') + '>温柔妈妈</option>' +
                    '<option value="grandpa"' + (settings.voice === 'grandpa' ? ' selected' : '') + '>温暖爷爷</option>' +
                    '<option value="teacher"' + (settings.voice === 'teacher' ? ' selected' : '') + '>活泼老师</option>' +
                    '<option value="child"' + (settings.voice === 'child' ? ' selected' : '') + '>可爱童声</option>' +
                '</select>' +
            '</label>' +
            '<label style="display:flex;align-items:center;gap:8px;">语速 ' +
                '<input type="range" id="voiceRate" min="0.5" max="1.5" step="0.1" value="' + settings.rate + '" style="flex:1;">' +
                '<span id="voiceRateVal" style="min-width:32px;text-align:right;">' + settings.rate.toFixed(1) + '</span>' +
            '</label>' +
            '<label style="display:flex;align-items:center;gap:8px;">音调 ' +
                '<input type="range" id="voicePitch" min="0.7" max="1.3" step="0.1" value="' + settings.pitch + '" style="flex:1;">' +
                '<span id="voicePitchVal" style="min-width:32px;text-align:right;">' + settings.pitch.toFixed(1) + '</span>' +
            '</label>' +
            '<label style="display:flex;align-items:center;gap:8px;">服务地址 ' +
                '<input type="text" id="voiceServerUrl" placeholder="http://127.0.0.1:9885" value="' + (settings.serverUrl || '') + '" style="flex:1;padding:4px;">' +
            '</label>' +
            '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
                '<button type="button" id="voiceTestConn" style="padding:4px 10px;">测试连接</button>' +
                '<button type="button" id="voicePreview" style="padding:4px 10px;">🔊 试听</button>' +
            '</div>';
        panel.appendChild(card);

        var elEnabled = card.querySelector('#voiceEnabled');
        var elVoice = card.querySelector('#voiceSelect');
        var elRate = card.querySelector('#voiceRate');
        var elRateVal = card.querySelector('#voiceRateVal');
        var elPitch = card.querySelector('#voicePitch');
        var elPitchVal = card.querySelector('#voicePitchVal');
        var elServerUrl = card.querySelector('#voiceServerUrl');
        var elTestConn = card.querySelector('#voiceTestConn');
        var elPreview = card.querySelector('#voicePreview');

        elEnabled.addEventListener('change', function () { settings.enabled = elEnabled.checked; save(); });
        elVoice.addEventListener('change', function () { settings.voice = elVoice.value; save(); });
        elRate.addEventListener('input', function () { settings.rate = parseFloat(elRate.value); elRateVal.textContent = settings.rate.toFixed(1); save(); });
        elPitch.addEventListener('input', function () { settings.pitch = parseFloat(elPitch.value); elPitchVal.textContent = settings.pitch.toFixed(1); save(); });
        elServerUrl.addEventListener('change', function () {
            settings.serverUrl = elServerUrl.value.trim(); save(); _lastServerCheck = 0; checkServer();
        });
        elTestConn.addEventListener('click', function () {
            settings.serverUrl = elServerUrl.value.trim(); save(); _lastServerCheck = 0;
            checkServer().then(function (ok) {
                elTestConn.textContent = ok ? '✓ 可达' : '✗ 不可达';
                setTimeout(function () { elTestConn.textContent = '测试连接'; }, 2000);
            });
        });
        // 试听：用户手势激活 speechSynthesis（Chrome 首次需交互，见踩坑 #10）
        elPreview.addEventListener('click', function () {
            if (!settings.enabled) { settings.enabled = true; elEnabled.checked = true; save(); }
            speak('你好呀，我是你的小伙伴！');
        });
    }

    function _initPanelObserver() {
        var mountSel = options.panelSelector;
        if (!mountSel) { return; }   // 没配挂载点就不注入面板（仍可 API 调用）
        var inject = function () {
            var panels = document.querySelectorAll(mountSel);
            panels.forEach(function (p) { _injectSettingsUI(p); });
        };
        // 首次扫描
        inject();
        // 监听后续动态挂载（panel 可能晚于 voice.js 加载）
        var obs = new MutationObserver(function () { inject(); });
        obs.observe(document.body, { childList: true, subtree: true });
    }

    // ===== 初始化 =====
    var _booted = false;
    function init(userOptions) {
        options = Object.assign({}, DEFAULT_OPTIONS, userOptions || {});
        // defaultVoice 便捷写法
        if (userOptions && userOptions.defaultVoice && !userOptions.defaultSettings) {
            options.defaultSettings = Object.assign({}, options.defaultSettings, { voice: userOptions.defaultVoice });
        }
        load();
        if ('speechSynthesis' in window) {
            try {
                window.speechSynthesis.onvoiceschanged = function () { _voicesCache = window.speechSynthesis.getVoices() || []; };
            } catch (e) {}
        }
        if (!_booted) {
            _initContentObserver();
            _booted = true;
        }
        _initPanelObserver();
        checkServer();
        setInterval(function () { if (settings.serverUrl) checkServer(); }, _SERVER_CHECK_INTERVAL);
        console.log('[VoiceSystem] init, enabled=' + settings.enabled + ', selectors=' + (options.selectors ? options.selectors.length : 0));
        return window.VoiceSystem;
    }

    // ===== 暴露 API =====
    window.VoiceSystem = {
        init: init,
        speak: speak,
        getSettings: getSettings,
        setSettings: setSettings,
        checkServer: checkServer
    };

    // ===== 自动启动：DOMContentLoaded 时若已定义 window.VoiceSystemConfig 则自动 init =====
    function _autoload() {
        if (typeof window.VoiceSystemConfig !== 'undefined') {
            init(window.VoiceSystemConfig);
        }
        // 否则仅暴露 API，等接入方手动调用 VoiceSystem.init(options)
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _autoload);
    } else {
        _autoload();
    }
})();
