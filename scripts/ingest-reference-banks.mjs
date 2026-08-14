import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const refs = path.join(repoRoot, 'docs', '学习项目设计', 'refs');
const prj = path.join(repoRoot, 'prj');
const bannedChars = new Set(['坡', '始', '游', '她', '店']);
const allowedThemes = new Set([
    'self', 'body', 'nature', 'number', 'family', 'food',
    'life', 'color', 'animal', 'action', 'quantity', 'school'
]);

function read(filePath) {
    return fs.readFileSync(filePath, 'utf8');
}

function writeJson(filePath, value) {
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function loadYxj(relative, key) {
    const filePath = path.join(refs, 'yxj-workbench', 'js', relative);
    if (!fs.existsSync(filePath)) return null;
    const context = { window: {} };
    vm.createContext(context);
    vm.runInContext(read(filePath), context, { filename: relative });
    return context.window[key] || null;
}

function extractTsField(text, field) {
    const items = [];
    const pattern = new RegExp(`${field}:\\s*'((?:\\\\'|[^'])*)'`, 'g');
    let match;
    while ((match = pattern.exec(text))) items.push(match[1].replace(/\\'/g, "'"));
    return items;
}

function loadChineseProject() {
    const dir = path.join(refs, 'chineseproject', 'src', 'data');
    const chars = [];
    const words = [];
    if (!fs.existsSync(dir)) return { chars, words };
    for (const name of fs.readdirSync(dir)) {
        if (!name.endsWith('.ts')) continue;
        const text = read(path.join(dir, name));
        const charHits = [...text.matchAll(/char:\s*'([^']+)'[\s\S]*?pinyin:\s*'([^']+)'[\s\S]*?meaning:\s*'([^']+)'[\s\S]*?category:\s*'([^']+)'/g)];
        for (const hit of charHits) {
            chars.push({ c: hit[1], py: hit[2], mean: hit[3], category: hit[4] });
        }
        for (const word of extractTsField(text, 'word')) {
            if (word && !word.includes('/')) words.push(word);
        }
    }
    return { chars, words };
}

function loadWordsGame() {
    const filePath = path.join(refs, 'words-game', 'words_game.html');
    if (!fs.existsSync(filePath)) return [];
    const text = read(filePath);
    const items = [];
    const patterns = [
        /\{en:'((?:\\'|[^'])+)',cn:'((?:\\'|[^'])+)'\}/g,
        /\{en:"((?:\\"|[^"])+)",cn:'((?:\\'|[^'])+)'\}/g
    ];
    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(text))) {
            items.push({
                en: match[1].replace(/\\'/g, "'").replace(/\\"/g, '"').trim(),
                zh: match[2].replace(/\\'/g, "'").trim()
            });
        }
    }
    return items;
}

function loadPepGrade1() {
    const filePath = path.join(refs, 'pep-english-vocabulary', 'public', 'data', 'pep_english_vocabulary_full.csv');
    if (!fs.existsSync(filePath)) return [];
    const lines = read(filePath).trim().split(/\r?\n/).slice(1);
    const items = [];
    for (const line of lines) {
        const parts = line.split(',');
        if (parts.length < 8 || parts[1] !== '1') continue;
        items.push({
            text: parts[6].trim(),
            zh: parts[7].trim(),
            theme: '学校',
            attribution: 'pep-english-vocabulary grade 1'
        });
    }
    return items;
}

function loadKidsLearningCards() {
    const cardsDir = path.join(refs, 'kids-learning-cards', 'cards', 'english');
    if (!fs.existsSync(cardsDir)) return [];
    const items = [];
    for (const name of fs.readdirSync(cardsDir)) {
        if (!name.endsWith('.yaml') && !name.endsWith('.yml')) continue;
        const text = read(path.join(cardsDir, name));
        const subject = name.replace(/\.(yaml|yml)$/, '');
        const zh = (text.match(/^zh:\s*(.+)$/m) || [])[1]?.trim();
        const phrase = (text.match(/^phrase:\s*(.+)$/m) || [])[1]?.trim();
        const phraseZh = (text.match(/^phrase_zh:\s*(.+)$/m) || [])[1]?.trim();
        const sentence = (text.match(/^sentence:\s*(.+)$/m) || [])[1]?.trim();
        const sentenceZh = (text.match(/^sentence_zh:\s*(.+)$/m) || [])[1]?.trim();
        items.push({ subject, zh, phrase, phraseZh, sentence, sentenceZh });
    }
    return items;
}

function guessTheme(char, word, mean, category) {
    const blob = [char, word, mean, category].join('');
    const rules = [
        ['body', /身体|手|口|耳|目|头|足|眼|鼻|牙|发|脚/],
        ['animal', /动物|猫|狗|兔|鸡|鸭|鹅|猪|龙|虎|象|牛|羊|鸟|鱼|虫|马/],
        ['food', /食物|水果|米|饭|菜|果|瓜|茶|汤|吃/],
        ['family', /家庭|人物|爸|妈|爷|奶|兄|姐|弟|妹|亲/],
        ['number', /数字|一|二|三|四|五|六|七|八|九|十/],
        ['color', /颜色|红|黄|蓝|绿|白|黑/],
        ['action', /动作|走|跑|跳|看|听|说|读|写|玩/],
        ['school', /学校|学|书|字|笔|纸|课/],
        ['nature', /自然|日|月|水|火|山|石|田|土|木|禾|云|雨|风|雪|电|天|地|江|河|湖|海/],
        ['quantity', /多少|大小/]
    ];
    for (const [theme, pattern] of rules) {
        if (pattern.test(blob)) return theme;
    }
    return 'life';
}

function wordPattern(text) {
    const key = String(text || '').trim().toLowerCase();
    if (!key) return null;
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    return new RegExp(`(?:^|[^a-z])${escaped}(?:[^a-z]|$)`, 'i');
}

function wordInSentence(text, sentence) {
    const pattern = wordPattern(text);
    return pattern ? pattern.test(String(sentence || '')) : false;
}

function findYxjSentence(text, sentences) {
    return (sentences || []).find((item) => wordInSentence(text, item.en)) || null;
}

function findPhrase(word, sentences) {
    const hit = findYxjSentence(word, sentences);
    if (!hit) return null;
    return { phrase: String(hit.en).trim(), phraseZh: String(hit.zh || '').trim() };
}

function nextEnglishId(bank) {
    let max = 0;
    for (const item of bank) {
        const match = String(item.id || '').match(/(\d+)$/);
        if (match) max = Math.max(max, Number(match[1]));
    }
    return max + 1;
}

function appendEnglishWord(bank, existing, item, sentences, nextIdRef) {
    const key = item.text.toLowerCase();
    if (!item.text || !item.zh || existing.has(key) || item.zh.includes('山寨')) return 0;
    const matched = findPhrase(item.text, sentences);
    const phrase = matched && matched.phrase ? matched.phrase : item.text;
    const phraseZh = matched && matched.phraseZh ? matched.phraseZh : item.zh;
    if (!wordInSentence(item.text, phrase) && phrase.toLowerCase() !== key) return 0;
    bank.push({
        id: `english-word-${String(nextIdRef.value).padStart(2, '0')}`,
        text: item.text,
        theme: item.theme,
        image: '',
        source: {
            kind: 'reference-port',
            license: 'reference',
            attribution: item.attribution
        },
        zh: item.zh,
        phrase,
        phraseZh
    });
    existing.add(key);
    nextIdRef.value += 1;
    return 1;
}

function ingestHanzi() {
    const bankPath = path.join(prj, 'data', 'preschool', '识字', 'character-bank.json');
    const bank = JSON.parse(read(bankPath));
    const existing = new Set(bank.map((row) => row[0]));
    const yxj = loadYxj('data-hanzi.js', 'YXJ_HANZI') || [];
    const chinese = loadChineseProject();
    const wordPool = [];
    for (const row of bank) {
        for (const word of row[3] || []) wordPool.push(word);
    }
    for (const item of yxj) if (item.word) wordPool.push(item.word);
    for (const word of chinese.words) wordPool.push(word);

    const sources = [];
    for (const item of yxj) {
        sources.push({ c: item.c, py: item.py, mean: item.mean, word: item.word, category: '' });
    }
    for (const item of chinese.chars) {
        sources.push({ c: item.c, py: item.py, mean: item.mean, word: '', category: item.category });
    }

    let added = 0;
    for (const item of sources) {
        const char = String(item.c || '').trim();
        if (char.length !== 1 || existing.has(char) || bannedChars.has(char)) continue;
        const words = [];
        const seen = new Set();
        for (const word of [item.word, ...wordPool, char]) {
            const text = String(word || '').trim();
            if (!text || !text.includes(char) || seen.has(text) || text === '山寨') continue;
            seen.add(text);
            words.push(text);
            if (words.length >= 2) break;
        }
        if (words.length < 2) continue;
        const theme = guessTheme(char, words.join(''), item.mean, item.category);
        const row = [char, String(item.py || '').trim(), allowedThemes.has(theme) ? theme : 'life', words];
        if (item.mean) row.push(String(item.mean).trim());
        bank.push(row);
        existing.add(char);
        added += 1;
    }

    writeJson(bankPath, bank);
    return { total: bank.length, added };
}

function ingestEnglish() {
    const bankPath = path.join(prj, 'data', 'preschool', '英语', 'vocabulary-bank.json');
    const bank = JSON.parse(read(bankPath));
    const existing = new Set(bank.map((item) => String(item.text || '').trim().toLowerCase()));
    const yxj = loadYxj('data-english.js', 'YXJ_ENGLISH') || { words: [], sentences: [] };
    const sentences = Array.isArray(yxj.sentences) ? yxj.sentences : [];
    const incoming = [];

    for (const item of yxj.words || []) {
        incoming.push({
            text: String(item.en || '').trim(),
            zh: String(item.zh || '').trim(),
            theme: String(item.theme || '生活').trim() || '生活',
            attribution: 'yxj-workbench words'
        });
    }
    for (const item of loadWordsGame()) {
        incoming.push({
            text: String(item.en || '').trim(),
            zh: String(item.zh || '').trim(),
            theme: '生活',
            attribution: 'words-game 译林 4A/4B'
        });
    }
    for (const item of loadPepGrade1()) {
        incoming.push(item);
    }

    let added = 0;
    const nextIdRef = { value: nextEnglishId(bank) };
    for (const item of incoming) {
        added += appendEnglishWord(bank, existing, item, sentences, nextIdRef);
    }

    writeJson(bankPath, bank);
    return { total: bank.length, added };
}

function upgradeEnglishFromYxj() {
    const bankPath = path.join(prj, 'data', 'preschool', '英语', 'vocabulary-bank.json');
    const bank = JSON.parse(read(bankPath));
    const yxj = loadYxj('data-english.js', 'YXJ_ENGLISH') || { sentences: [] };
    const sentences = Array.isArray(yxj.sentences) ? yxj.sentences : [];
    let upgraded = 0;
    for (const item of bank) {
        const hit = findYxjSentence(item.text, sentences);
        if (!hit) continue;
        const phrase = String(hit.en).trim();
        const phraseZh = String(hit.zh || '').trim();
        if (!phrase || phrase === item.phrase) continue;
        if (!wordInSentence(item.text, phrase)) continue;
        item.phrase = phrase;
        item.phraseZh = phraseZh || item.phraseZh;
        item.source = {
            kind: 'reference-port',
            license: 'reference',
            attribution: 'yxj-workbench sentences'
        };
        upgraded += 1;
    }
    writeJson(bankPath, bank);
    return { total: bank.length, upgraded };
}

function applyKidsLearningCards() {
    const bankPath = path.join(prj, 'data', 'preschool', '英语', 'vocabulary-bank.json');
    const bank = JSON.parse(read(bankPath));
    const cards = loadKidsLearningCards();
    let applied = 0;
    for (const card of cards) {
        const item = bank.find((entry) => entry.text.toLowerCase() === card.subject.toLowerCase());
        if (!item) continue;
        if (card.sentence && wordInSentence(item.text, card.sentence)) {
            item.phrase = card.sentence;
            item.phraseZh = card.sentenceZh || item.phraseZh;
        } else if (card.phrase && wordInSentence(item.text, card.phrase)) {
            item.phrase = card.phrase;
            item.phraseZh = card.phraseZh || item.phraseZh;
        }
        if (card.zh) item.zh = card.zh;
        item.source = {
            kind: 'reference-port',
            license: 'PolyForm-Noncommercial-1.0.0',
            attribution: 'kids-learning-cards YAML'
        };
        applied += 1;
    }
    writeJson(bankPath, bank);
    return { applied };
}

function ingestPoetry() {
    const bankPath = path.join(prj, 'data', 'preschool', '古诗', 'poem-bank.json');
    const bank = JSON.parse(read(bankPath));
    const existingTitles = new Set(bank.map((item) => String(item.title || '').replace(/（.*）/g, '').trim()));
    const yxj = loadYxj('data-poems.js', 'YXJ_POEMS') || [];
    const clean = (line) => String(line || '').replace(/[，。、；：！？,.!?;:“”‘’《》\s]/g, '').trim();
    let added = 0;
    for (const poem of yxj) {
        const title = String(poem.title || '').trim();
        const key = title.replace(/（.*）/g, '').trim();
        if (!title || existingTitles.has(key)) continue;
        const lines = (poem.lines || []).map(clean).filter(Boolean);
        if (lines.length < 2) continue;
        bank.push({
            id: `poem-yxj-${poem.id}`,
            title,
            author: String(poem.author || '').trim(),
            theme: String(poem.dynasty || 'classic').trim() || 'classic',
            lines,
            source: {
                kind: 'public-domain',
                license: 'public-domain',
                attribution: '原诗公有领域 / yxj-workbench 小学必背'
            }
        });
        existingTitles.add(key);
        added += 1;
    }
    writeJson(bankPath, bank);
    return { total: bank.length, added };
}

function loadStrokesPack() {
    const filePath = path.join(prj, 'preschool-literacy-strokes-data.js');
    const text = read(filePath);
    const match = text.match(/PersonalWorkbenchLiteracyStrokes = (\{[\s\S]*?\});/);
    if (!match) throw new Error('unable to parse strokes pack');
    return JSON.parse(match[1]);
}

function writeStrokesPack(pack) {
    const body = JSON.stringify(pack);
    const js = `(function (global) {\n    'use strict';\n    global.PersonalWorkbenchLiteracyStrokes = ${body};\n})(typeof window !== 'undefined' ? window : globalThis);\n`;
    fs.writeFileSync(path.join(prj, 'preschool-literacy-strokes-data.js'), js, 'utf8');
}

function ingestStrokes() {
    const pack = loadStrokesPack();
    const bankChars = new Set(JSON.parse(read(path.join(prj, 'data', 'preschool', '识字', 'character-bank.json'))).map((row) => row[0]));
    const strokeDir = path.join(refs, 'yxj-workbench', 'js', 'strokes');
    if (!fs.existsSync(strokeDir)) return { total: Object.keys(pack.chars).length, added: 0 };
    let added = 0;
    for (const fileName of fs.readdirSync(strokeDir)) {
        if (!fileName.endsWith('.json')) continue;
        const char = fileName.replace(/\.json$/, '');
        if (!bankChars.has(char) || pack.chars[char]) continue;
        const payload = JSON.parse(read(path.join(strokeDir, fileName)));
        if (!Array.isArray(payload.strokes) || !payload.strokes.length) continue;
        pack.chars[char] = { strokes: payload.strokes };
        added += 1;
    }
    pack.source = {
        kind: 'extracted-subset',
        project: 'yxj-workbench strokes-data (Make Me a Hanzi compatible)',
        license: 'extracted-subset-for-local-replay',
        chars: Object.keys(pack.chars).length,
        bank: bankChars.size
    };
    writeStrokesPack(pack);
    return { total: Object.keys(pack.chars).length, added };
}

if (!fs.existsSync(refs)) {
    console.error('missing refs:', refs);
    process.exit(1);
}

const hanzi = ingestHanzi();
const english = ingestEnglish();
const phrases = upgradeEnglishFromYxj();
const cards = applyKidsLearningCards();
const poetry = ingestPoetry();
const strokes = ingestStrokes();
console.log(JSON.stringify({ hanzi, english, phrases, cards, poetry, strokes }, null, 2));
