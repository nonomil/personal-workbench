import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pre = path.join(repoRoot, 'prj', 'data', 'preschool');
const backupDir = path.join(repoRoot, '.tmp-analysis', 'banks-backup-20260815');
const cardArtPath = path.join(repoRoot, 'prj', 'preschool-card-art.js');
const gradedRoot = 'G:/StudyCode/卡片式单词学习游戏记忆系统/data/vocab/单词库_分级';

const only = String(process.argv.find((arg) => arg.startsWith('--bank=')) || '').split('=')[1] || 'all';

function readJson(file) {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, payload) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(payload, ensure_ascii_false(payload), 2) + '\n', 'utf8');
}

function ensure_ascii_false(payload) {
    return JSON.stringify(payload);
}

function writeJsonPretty(file, payload) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(payload, null, 2) + '\n', 'utf8');
}

function backupIfMissing(rel, src) {
    const dest = path.join(backupDir, rel);
    if (fs.existsSync(dest)) return dest;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    return dest;
}

function loadCardMaps() {
    const src = fs.readFileSync(cardArtPath, 'utf8');
    const wordMatch = src.match(/const WORD_EMOJI = (\{[\s\S]*?\});\s*const THEME_EMOJI/);
    const themeMatch = src.match(/const THEME_EMOJI = (\{[\s\S]*?\});\s*const CHAR_EMOJI/);
    const charMatch = src.match(/const CHAR_EMOJI = (\{[\s\S]*?\});\s*const PINYIN_KIND/);
    return {
        word: wordMatch ? vm.runInNewContext('(' + wordMatch[1] + ')') : {},
        theme: themeMatch ? vm.runInNewContext('(' + themeMatch[1] + ')') : {},
        char: charMatch ? vm.runInNewContext('(' + charMatch[1] + ')') : {}
    };
}

function loadJsExport(file, expression) {
    if (!fs.existsSync(file)) return [];
    const ctx = {};
    vm.runInNewContext(fs.readFileSync(file, 'utf8') + `\nthis.__export = ${expression};`, ctx);
    return Array.isArray(ctx.__export) ? ctx.__export : [];
}

function sourceString(value) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    return '';
}

function alreadyV1(bank, kind) {
    return Array.isArray(bank) && bank[0] && typeof bank[0] === 'object' && !Array.isArray(bank[0]) && bank[0].kind === kind && bank[0].media;
}

function migrateEnglish(maps) {
    const src = path.join(pre, '英语', 'vocabulary-bank.json');
    backupIfMissing(path.join('英语', 'vocabulary-bank.json'), src);
    const bank = readJson(src);
    if (alreadyV1(bank, 'english')) {
        return { bank: 'english', count: bank.length, skipped: true, emoji: bank.filter((row) => String(row.media && row.media.art || '').startsWith('emoji:')).length, none: bank.filter((row) => (row.media && row.media.art) === 'none').length };
    }
    let emoji = 0;
    let none = 0;
    const next = bank.map((row) => {
        const text = String(row.text || '').trim().toLowerCase();
        const image = /^https?:/i.test(String(row.image || '')) ? '' : String(row.image || '').trim();
        const audio = /^https?:/i.test(String(row.audio || '')) ? '' : String(row.audio || '').trim();
        const glyph = maps.word[text] || '';
        const art = glyph ? 'emoji:' + glyph : 'none';
        if (glyph) emoji += 1;
        else none += 1;
        const extra = {};
        if (row.source && typeof row.source === 'object') extra.sourceMeta = row.source;
        return {
            id: String(row.id || ('en-' + text.replace(/\s+/g, '-'))),
            kind: 'english',
            text: text,
            zh: String(row.zh || '').trim(),
            theme: String(row.theme || '').trim(),
            level: String(row.level || 'L1').trim() || 'L1',
            phrase: String(row.phrase || '').trim(),
            phraseZh: String(row.phraseZh || '').trim(),
            media: { image: image, art: art, audio: audio },
            source: sourceString(row.source) || 'base-597',
            extra: extra
        };
    });
    writeJsonPretty(src, next);
    return { bank: 'english', count: next.length, emoji: emoji, none: none };
}

function migrateLiteracy(maps) {
    const src = path.join(pre, '识字', 'character-bank.json');
    backupIfMissing(path.join('识字', 'character-bank.json'), src);
    const bank = readJson(src);
    const external = loadJsExport(path.join(gradedRoot, '06_汉字', '幼儿园汉字.js'), 'typeof kindergartenHanzi !== "undefined" ? kindergartenHanzi : (typeof KINDERGARTEN_HANZI !== "undefined" ? KINDERGARTEN_HANZI : [])');
    const byChar = new Map();
    for (const item of external) {
        const ch = String(item.character || item.word || item.chinese || '').trim();
        if (ch.length === 1 && !byChar.has(ch)) byChar.set(ch, item);
    }
    let filledWords = 0;
    let filledExplain = 0;
    const samples = [];
    const next = bank.map((row) => {
        const isObj = row && typeof row === 'object' && !Array.isArray(row);
        const extraIn = isObj && row.extra && typeof row.extra === 'object' ? row.extra : {};
        const char = isObj ? String(row.text || row.char || '').trim() : String(row[0] || '').trim();
        const pinyin = isObj ? String(extraIn.pinyin || row.pinyin || '').trim() : String(row[1] || '').trim();
        const theme = isObj ? String(row.theme || '').trim() : String(row[2] || '').trim();
        let words = isObj
            ? (Array.isArray(extraIn.words) ? extraIn.words : (Array.isArray(row.words) ? row.words : []))
            : (Array.isArray(row[3]) ? row[3] : []);
        words = words.map((word) => String(word || '').trim()).filter(Boolean);
        let explain = isObj
            ? String(extraIn.explain || row.explain || '').trim()
            : (/^L[1-5]$/.test(String(row[4] || '').trim()) ? '' : String(row[4] || '').trim());
        const level = isObj
            ? String(row.level || 'L1').trim() || 'L1'
            : (String(row[row.length - 1] || 'L1').trim() || 'L1');
        const ext = byChar.get(char);
        if (ext) {
            const extWords = (Array.isArray(ext.examples) ? ext.examples : [])
                .map((item) => String(item && item.word || '').trim())
                .filter((word) => word && word.includes(char));
            if (!words.length && extWords.length) {
                words = extWords.slice(0, 2);
                filledWords += 1;
            }
        }
        if (!explain && words.length) {
            explain = '用组词来记：「' + words.slice(0, 2).join('」「') + '」。看见这些词，就能找到「' + char + '」。';
            filledExplain += 1;
            if (samples.length < 8) samples.push({ char: char, explain: explain, words: words });
        } else if (!explain && ext && ext.english) {
            explain = String(ext.english || '').trim();
            if (explain) {
                filledExplain += 1;
                if (samples.length < 8) samples.push({ char: char, explain: explain, words: words });
            }
        }
        const art = maps.char[char] ? 'emoji:' + maps.char[char] : (maps.theme[theme] ? 'emoji:' + maps.theme[theme] : 'emoji:🔤');
        return {
            id: isObj && row.id ? String(row.id) : ('zh-' + char),
            kind: 'literacy',
            text: char,
            theme: theme,
            level: /^L[1-5]$/.test(level) ? level : 'L1',
            media: { image: '', art: art, audio: '' },
            source: isObj && row.source ? sourceString(row.source) || 'base-1500' : 'base-1500',
            extra: { pinyin: pinyin, words: words, explain: explain }
        };
    });
    writeJsonPretty(src, next);
    const report = { bank: 'literacy', count: next.length, filledWords: filledWords, filledExplain: filledExplain, external: external.length, samples: samples };
    writeJsonPretty(path.join(repoRoot, '.tmp-analysis', 'literacy-backfill-20260815.json'), report);
    return report;
}

function foldPinyin(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[āáǎà]/g, 'a')
        .replace(/[ōóǒò]/g, 'o')
        .replace(/[ēéěè]/g, 'e')
        .replace(/[īíǐì]/g, 'i')
        .replace(/[ūúǔù]/g, 'u')
        .replace(/[ǖǘǚǜü]/g, 'v');
}

function migratePinyin() {
    const src = path.join(pre, '识字', 'pinyin-initial-bank.json');
    backupIfMissing(path.join('识字', 'pinyin-initial-bank.json'), src);
    const bank = readJson(src);
    const external = loadJsExport(path.join(gradedRoot, '07_拼音', '常用拼音.js'), 'PINYIN_CORE_PACK');
    let merged = 0;
    const next = bank.map((row) => {
        const extraIn = row.extra && typeof row.extra === 'object' ? row.extra : {};
        const text = String(row.text || extraIn.initial || row.initial || '').trim();
        const sample = String(row.sample || extraIn.sample || '').trim();
        const pinyin = String(row.pinyin || extraIn.pinyin || '').trim();
        const kind = String(extraIn.kind || row.kind || 'initial').trim() || 'initial';
        const group = String(extraIn.group || row.group || '').trim();
        const folded = foldPinyin(text);
        const matches = external.filter((item) => {
            const base = foldPinyin(item.base || item.word || item.pinyin);
            return base === folded || base.indexOf(folded) === 0 || folded.indexOf(base) === 0;
        });
        const homophones = new Set(Array.isArray(extraIn.homophones) ? extraIn.homophones : []);
        const nearPhones = new Set(Array.isArray(extraIn.nearPhones) ? extraIn.nearPhones : []);
        matches.forEach((item) => {
            (item.homophones || []).forEach((value) => { if (value) homophones.add(String(value)); });
            (item.nearPhones || []).forEach((value) => { if (value) nearPhones.add(String(value)); });
        });
        if (matches.length) merged += 1;
        const extra = {
            initial: String(extraIn.initial || row.initial || text).trim(),
            sample: sample,
            pinyin: pinyin,
            kind: kind,
            group: group,
            homophones: Array.from(homophones),
            nearPhones: Array.from(nearPhones)
        };
        return {
            id: String(row.id || ('py-' + text)),
            kind: 'pinyin',
            text: text,
            zh: sample,
            theme: group || kind,
            level: String(row.level || 'L1').trim() || 'L1',
            media: row.media && typeof row.media === 'object' ? row.media : { image: '', art: 'emoji:🔤', audio: '' },
            source: sourceString(row.source) || 'base-63',
            extra: extra
        };
    });
    writeJsonPretty(src, next);
    return { bank: 'pinyin', count: next.length, merged: merged, external: external.length };
}

function migratePhonicsWords() {
    const src = path.join(pre, 'english', 'phonics', 'word-bank.json');
    backupIfMissing(path.join('english', 'phonics', 'word-bank.json'), src);
    const bank = readJson(src);
    const next = bank.map((row) => {
        const extraIn = row.extra && typeof row.extra === 'object' ? row.extra : {};
        const text = String(row.text || '').trim().toLowerCase();
        const graphemes = Array.isArray(extraIn.graphemes) ? extraIn.graphemes : (Array.isArray(row.graphemes) ? row.graphemes : []);
        const phonemes = Array.isArray(extraIn.phonemes) ? extraIn.phonemes : (Array.isArray(row.phonemes) ? row.phonemes : []);
        const stageId = String(extraIn.stageId || row.stageId || '');
        return {
            id: String(row.id || ('ph-' + text)),
            kind: 'phonics',
            text: text,
            zh: '',
            theme: stageId,
            level: String(row.level || 'L3').trim() || 'L3',
            graphemes: graphemes,
            phonemes: phonemes,
            stageId: stageId,
            media: row.media && typeof row.media === 'object' ? row.media : { image: '', art: 'emoji:🔤', audio: '' },
            source: row.source && typeof row.source === 'object' ? row.source : (sourceString(row.source) || 'base-phonics'),
            extra: { graphemes: graphemes, phonemes: phonemes, stageId: stageId }
        };
    });
    writeJsonPretty(src, next);
    return { bank: 'phonics-words', count: next.length };
}

function migratePhonicsLetters() {
    const src = path.join(pre, 'english', 'phonics', 'letter-bank.json');
    backupIfMissing(path.join('english', 'phonics', 'letter-bank.json'), src);
    const bank = readJson(src);
    const next = bank.map((row) => {
        const extraIn = row.extra && typeof row.extra === 'object' ? row.extra : {};
        const letter = String(row.text || row.letter || extraIn.letter || '').trim().toLowerCase();
        return {
            id: String(row.id || ('letter-' + letter)),
            kind: 'phonics',
            text: letter,
            zh: String(extraIn.keyword || row.keyword || ''),
            theme: String(extraIn.group || row.group || ''),
            level: String(row.level || 'L1').trim() || 'L1',
            media: row.media && typeof row.media === 'object' ? row.media : { image: '', art: 'emoji:🔤', audio: '' },
            source: sourceString(row.source) || 'base-phonics',
            extra: {
                letter: letter,
                sound: String(extraIn.sound || row.sound || '').trim().toLowerCase(),
                keyword: String(extraIn.keyword || row.keyword || '').trim().toLowerCase(),
                group: String(extraIn.group || row.group || '').trim()
            }
        };
    });
    writeJsonPretty(src, next);
    return { bank: 'phonics-letters', count: next.length };
}

function levelCounts(bank) {
    const counts = {};
    for (const row of bank) {
        const level = String((row && row.level) || 'L1');
        counts[level] = (counts[level] || 0) + 1;
    }
    return counts;
}

function writeIndex(results) {
    const indexPath = path.join(pre, 'banks-index.json');
    const current = fs.existsSync(indexPath) ? readJson(indexPath) : { schemaVersion: 1, banks: [] };
    const catalog = {
        english: { id: 'english', kind: 'english', path: '英语/vocabulary-bank.json', expected: 597 },
        literacy: { id: 'literacy', kind: 'literacy', path: '识字/character-bank.json', expected: 1500 },
        pinyin: { id: 'pinyin', kind: 'pinyin', path: '识字/pinyin-initial-bank.json', expected: 63 },
        'phonics-words': { id: 'phonics-words', kind: 'phonics', path: 'english/phonics/word-bank.json', expected: 94 },
        'phonics-letters': { id: 'phonics-letters', kind: 'phonics', path: 'english/phonics/letter-bank.json', expected: 26 }
    };
    const byId = new Map((current.banks || []).map((row) => [row.id, row]));
    for (const result of results) {
        const meta = catalog[result.bank];
        if (!meta) continue;
        const file = path.join(pre, meta.path);
        const bank = readJson(file);
        byId.set(meta.id, {
            id: meta.id,
            kind: meta.kind,
            path: meta.path,
            count: bank.length,
            expected: meta.expected,
            schemaVersion: 1,
            levels: levelCounts(bank)
        });
    }
    const payload = { schemaVersion: 1, updated: '2026-08-15', banks: Array.from(byId.values()) };
    writeJsonPretty(indexPath, payload);
    return payload;
}

const maps = loadCardMaps();
const results = [];
if (only === 'all' || only === 'english') results.push(migrateEnglish(maps));
if (only === 'all' || only === 'literacy') results.push(migrateLiteracy(maps));
if (only === 'all' || only === 'pinyin') results.push(migratePinyin());
if (only === 'all' || only === 'phonics') {
    results.push(migratePhonicsWords());
    results.push(migratePhonicsLetters());
}
const index = writeIndex(results);
console.log(JSON.stringify({ results: results, index: index }, null, 2));
