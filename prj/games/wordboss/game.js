(function () {
    'use strict';
    const engine = window.PersonalWorkbenchWordbossEngine;
    const bosses = window.PersonalWorkbenchWordbossBosses || [];
    const skills = window.PersonalWorkbenchWordbossSkills || [];
    const equips = window.PersonalWorkbenchWordbossEquips || [];
    const bridge = window.PersonalWorkbenchBridge;
    const vocab = window.PersonalWorkbenchPreschoolEnglishVocab;
    const dailyData = window.PersonalWorkbenchEnglishDailyData;

    const els = {
        scene: document.getElementById('scene'),
        prompt: document.getElementById('prompt'),
        speak: document.getElementById('speak'),
        tiles: document.getElementById('tiles'),
        typed: document.getElementById('typed'),
        skills: document.getElementById('skills'),
        shop: document.getElementById('shop'),
        status: document.getElementById('status'),
        retry: document.getElementById('retry'),
        next: document.getElementById('next')
    };

    const state = {
        stage: 0,
        battle: null,
        skillId: 'fire',
        word: null,
        tiles: [],
        typed: '',
        timer: 0,
        words: []
    };

    function todayWords() {
        const bank = vocab && dailyData && typeof dailyData.getDailyLoopBank === 'function'
            ? dailyData.getDailyLoopBank(vocab.getRuntimeBank())
            : [];
        const daily = vocab && typeof vocab.dailyWindow === 'function'
            ? vocab.dailyWindow(bank, (bridge && bridge.today && bridge.today()) || new Date().toISOString().slice(0, 10), 3).batch
            : bank.slice(0, 3);
        const learned = bank.filter(function (item) {
            return item && item.text;
        });
        return engine.buildWordPool({ daily: daily, learned: learned, bank: bank, size: 10 });
    }

    function currentBoss() {
        return bosses[state.stage] || bosses[0];
    }

    function currentSkill() {
        return skills.find(function (item) { return item.id === state.skillId; }) || skills[0];
    }

    function pickWord() {
        if (!state.words.length) state.words = todayWords();
        state.word = state.words[Math.floor(Math.random() * state.words.length)] || { text: 'cat', zh: '猫' };
        const skill = currentSkill();
        if (skill && skill.minLen && state.word.text.length < skill.minLen) {
            const longer = state.words.find(function (item) { return item.text.length >= skill.minLen; });
            if (longer) state.word = longer;
        }
        state.tiles = engine.buildLetterPool(state.word.text);
        state.typed = '';
    }

    function speakWord() {
        if (!state.word) return;
        if (window.speechSynthesis && window.SpeechSynthesisUtterance) {
            const utter = new SpeechSynthesisUtterance(state.word.text);
            utter.lang = 'en-US';
            utter.rate = 0.85;
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utter);
        }
    }

    function render() {
        const boss = currentBoss();
        const battle = state.battle;
        if (!battle) return;
        els.scene.innerHTML = '<div class="wb-hero"><img src="../../assets/generated/wordboss/published/hero.svg" alt=""><b>' + battle.heroHp + '/' + battle.heroMax + '</b></div><div class="wb-vs">VS</div><div class="wb-boss"><img src="' + boss.art + '" alt=""><strong>' + boss.name + '</strong><b>' + battle.bossHp + '/' + battle.bossMax + '</b></div>';
        els.status.textContent = '金币 ' + battle.gold + (battle.equipId ? ' · 装备已买' : ' · 徒手') + (battle.over === 'win' ? ' · 赢了' : battle.over === 'lose' ? ' · 再试一次' : '');
        els.prompt.textContent = (state.word && state.word.zh) || '';
        els.typed.textContent = state.typed || '…';
        els.tiles.innerHTML = state.tiles.map(function (letter) {
            return '<button type="button" data-letter="' + letter + '">' + letter + '</button>';
        }).join('');
        els.skills.innerHTML = skills.map(function (skill) {
            return '<button type="button" class="' + (skill.id === state.skillId ? 'is-on' : '') + '" data-skill="' + skill.id + '"><img src="' + skill.art + '" alt="">' + skill.name + '</button>';
        }).join('');
        els.shop.innerHTML = equips.map(function (item) {
            return '<button type="button" data-equip="' + item.id + '">' + item.name + ' +' + item.bonus + ' · ' + item.price + '</button>';
        }).join('');
        els.retry.hidden = battle.over !== 'lose';
        els.next.hidden = battle.over !== 'win';
        document.body.dataset.over = battle.over || '';
    }

    function startStage(index) {
        state.stage = index;
        state.battle = engine.createBattle(currentBoss(), 80);
        pickWord();
        render();
        speakWord();
        window.clearInterval(state.timer);
        state.timer = window.setInterval(function () {
            if (!state.battle || state.battle.over) return;
            state.battle = engine.applyBossHit(state.battle, currentBoss().attack);
            render();
        }, currentBoss().interval);
    }

    function castSkill() {
        if (!state.battle || state.battle.over) return;
        state.battle = engine.applySkill(state.battle, currentSkill());
        if (bridge && typeof bridge.recordWordAnswer === 'function' && state.word) {
            bridge.recordWordAnswer(state.word.text, true, { source: 'wordboss' });
        }
        if (state.battle.over === 'win' && bridge && typeof bridge.awardSunlight === 'function') {
            bridge.awardSunlight({ gameId: 'wordboss', reason: 'clear-' + currentBoss().id, eventKey: 'clear-' + currentBoss().id, amount: 8 });
        }
        pickWord();
        render();
        speakWord();
    }

    els.tiles.addEventListener('click', function (event) {
        const letter = event.target && event.target.dataset && event.target.dataset.letter;
        if (!letter || !state.word || (state.battle && state.battle.over)) return;
        const expected = state.word.text.charAt(state.typed.length);
        if (letter === expected) {
            state.typed += letter;
            if (state.typed === state.word.text) castSkill();
            else render();
        } else {
            state.typed = '';
            if (bridge && typeof bridge.recordWordAnswer === 'function') bridge.recordWordAnswer(state.word.text, false, { source: 'wordboss' });
            render();
        }
    });
    els.skills.addEventListener('click', function (event) {
        const button = event.target.closest('[data-skill]');
        if (!button) return;
        state.skillId = button.dataset.skill;
        render();
    });
    els.shop.addEventListener('click', function (event) {
        const button = event.target.closest('[data-equip]');
        if (!button || !state.battle) return;
        const item = equips.find(function (entry) { return entry.id === button.dataset.equip; });
        state.battle = engine.buyEquip(state.battle, item);
        render();
    });
    els.speak.addEventListener('click', speakWord);
    els.retry.addEventListener('click', function () { startStage(state.stage); });
    els.next.addEventListener('click', function () {
        if (state.stage >= bosses.length - 1) {
            els.status.textContent = '三关都过啦！金币不会带走。';
            return;
        }
        startStage(state.stage + 1);
    });

    startStage(0);
})();
