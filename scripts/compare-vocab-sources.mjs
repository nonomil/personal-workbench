import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const graded = 'G:/StudyCode/卡片式单词学习游戏记忆系统/data/vocab/单词库_分级';
const wqRoot = path.join(repoRoot, 'prj', 'assets', 'vocab', 'wordquest-vocab-2026.08.15');

function loadJsList(file, exportName) {
    const code = fs.readFileSync(file, 'utf8');
    const ctx = {};
    vm.runInNewContext(code + `\nthis.list = ${exportName};`, ctx);
    return Array.isArray(ctx.list) ? ctx.list : [];
}

function keyOf(card) {
    return String(card.standardized || card.word || card.text || '').toLowerCase().trim();
}

function imageKind(card) {
    const url = (card.imageURLs && card.imageURLs[0] && card.imageURLs[0].url) || card.image || '';
    if (!url) return 'none';
    if (/twemoji|maxcdn|svg\/[0-9a-f-]+\.svg/i.test(url)) return 'twemoji';
    if (/\.png|\.webp|\.jpg/i.test(url)) return 'bitmap';
    return 'other';
}

function summarize(name, cards, ours) {
    const map = new Map();
    let twemoji = 0;
    let bitmap = 0;
    let none = 0;
    let phraseOk = 0;
    let phraseSame = 0;
    let useThe = 0;
    for (const card of cards) {
        const key = keyOf(card);
        if (!key || map.has(key)) continue;
        map.set(key, card);
        const kind = imageKind(card);
        if (kind === 'twemoji') twemoji += 1;
        else if (kind === 'bitmap') bitmap += 1;
        else none += 1;
        const phrase = String(card.phrase || card.example || '').trim();
        if (!phrase || phrase.toLowerCase() === key) phraseSame += 1;
        else if (phrase.toLowerCase().includes(key.split(' ')[0])) phraseOk += 1;
        if (/^use the /i.test(phrase)) useThe += 1;
    }
    const hit = ours.filter((w) => map.has(w));
    return {
        name,
        cards: cards.length,
        unique: map.size,
        overlap597: hit.length,
        miss597: ours.length - hit.length,
        image: { twemoji, bitmap, none },
        phrase: { hasWord: phraseOk, sameAsWord: phraseSame, useThe },
        missSample: ours.filter((w) => !map.has(w)).slice(0, 12),
        hitSample: hit.slice(0, 8)
    };
}

const ours = JSON.parse(fs.readFileSync(path.join(repoRoot, 'prj', 'data', 'preschool', '英语', 'vocabulary-bank.json'), 'utf8'))
    .map((item) => String(item.text || '').toLowerCase().trim());

const kinder = loadJsList(path.join(graded, '01_幼儿园/幼儿园完整词库.js'), 'MERGED_KINDERGARTEN_VOCAB');
const elemLower = loadJsList(path.join(graded, '03_小学_高年级/小学低年级基础.js'), 'STAGE_ELEMENTARY_LOWER');
const elemUpper = loadJsList(path.join(graded, '03_小学_高年级/小学高年级基础.js'), 'STAGE_ELEMENTARY_UPPER');
const wq = JSON.parse(fs.readFileSync(path.join(wqRoot, 'catalog.json'), 'utf8')).cards;
const wqKinder = wq.filter((card) => card.stage === 'kindergarten' || (Array.isArray(card.tags) && card.tags.includes('kindergarten')));
const wqD1 = wq.filter((card) => Number(card.difficulty) === 1);

const report = {
    ours: ours.length,
    packs: [
        summarize('kindergarten-full.js', kinder, ours),
        summarize('elementary-lower.js', elemLower, ours),
        summarize('elementary-upper.js', elemUpper, ours),
        summarize('wordquest-all', wq, ours),
        summarize('wordquest-stage-kindergarten', wqKinder, ours),
        summarize('wordquest-difficulty-1', wqD1, ours)
    ]
};

const kinderMap = new Map(kinder.map((card) => [keyOf(card), card]));
const wqMap = new Map(wq.map((card) => [keyOf(card), card]));
report.samples = ['panda', 'apple', 'dog', 'age', 'school', 'black', 'pink', 'bear'].map((word) => ({
    word,
    kinder: kinderMap.has(word) ? {
        zh: kinderMap.get(word).chinese,
        phrase: kinderMap.get(word).phrase,
        image: imageKind(kinderMap.get(word))
    } : null,
    wordquest: wqMap.has(word) ? {
        zh: wqMap.get(word).translation,
        phrase: wqMap.get(word).phrase,
        stage: wqMap.get(word).stage,
        image: wqMap.get(word).image
    } : null
}));

const out = path.join(repoRoot, '.tmp-analysis', 'vocab-source-compare.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(report, null, 2), 'utf8');
console.log(out);
console.log(JSON.stringify(report, null, 2));
