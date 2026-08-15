import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bank = JSON.parse(fs.readFileSync(path.join(repoRoot, 'prj', 'data', 'preschool', '英语', 'vocabulary-bank.json'), 'utf8'));
const chars = JSON.parse(fs.readFileSync(path.join(repoRoot, 'prj', 'data', 'preschool', '识字', 'character-bank.json'), 'utf8'));
const kinderPath = 'G:/StudyCode/卡片式单词学习游戏记忆系统/data/vocab/单词库_分级/01_幼儿园/幼儿园完整词库.js';
const catalogPath = 'G:/StudyCode/卡片式单词学习游戏记忆系统/data/word-quest/vocab-catalog.json';

function hexToEmoji(hex) {
    return String(hex || '')
        .split('-')
        .filter(Boolean)
        .map((part) => String.fromCodePoint(parseInt(part, 16)))
        .join('');
}

function emojiFromUrl(url) {
    const match = String(url || '').match(/\/svg\/([0-9a-f-]+)\.svg/i);
    return match ? hexToEmoji(match[1]) : '';
}

const kinderCode = fs.readFileSync(kinderPath, 'utf8');
const kinderCtx = {};
vm.runInNewContext(kinderCode + '\nthis.list = MERGED_KINDERGARTEN_VOCAB;', kinderCtx);
const kinderEmoji = new Map();
for (const card of kinderCtx.list || []) {
    const key = String(card.standardized || card.word || '').toLowerCase().trim();
    const url = card.imageURLs && card.imageURLs[0] && card.imageURLs[0].url;
    const emoji = emojiFromUrl(url);
    if (key && emoji && !kinderEmoji.has(key)) kinderEmoji.set(key, emoji);
}

let catalogEmoji = new Map();
if (fs.existsSync(catalogPath)) {
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    const list = Array.isArray(catalog) ? catalog : catalog.words || catalog.items || [];
    for (const card of list) {
        const key = String(card.standardized || card.word || card.text || '').toLowerCase().trim();
        const url = (card.imageURLs && card.imageURLs[0] && card.imageURLs[0].url) || card.image || card.emoji;
        const emoji = url && url.includes('/svg/') ? emojiFromUrl(url) : (/^\p{Extended_Pictographic}/u.test(String(url || '')) ? url : '');
        if (key && emoji && !catalogEmoji.has(key)) catalogEmoji.set(key, emoji);
    }
}

const wordMap = {};
let hit = 0;
for (const item of bank) {
    const key = String(item.text || '').toLowerCase().trim();
    const emoji = kinderEmoji.get(key) || catalogEmoji.get(key) || '';
    if (emoji) {
        wordMap[key] = emoji;
        hit += 1;
    }
}

const themes = {};
for (const row of chars) {
    const theme = String(row[2] || '').trim();
    themes[theme] = (themes[theme] || 0) + 1;
}

const out = path.join(repoRoot, '.tmp-analysis', 'card-emoji-map.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({
    total: bank.length,
    hit,
    miss: bank.length - hit,
    missing: bank.filter((item) => !wordMap[String(item.text || '').toLowerCase()]).map((item) => item.text),
    wordMap,
    literacyThemes: themes,
    englishThemes: [...new Set(bank.map((item) => item.theme))]
}, null, 2), 'utf8');
console.log(JSON.stringify({ total: bank.length, hit, miss: bank.length - hit, themes: Object.keys(themes), englishThemes: [...new Set(bank.map((item) => item.theme))] }, null, 2));
