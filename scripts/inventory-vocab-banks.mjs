import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pre = path.join(repoRoot, 'prj', 'data', 'preschool');
const graded = 'G:/StudyCode/卡片式单词学习游戏记忆系统/data/vocab/单词库_分级';
const wqRoot = path.join(repoRoot, 'prj', 'assets', 'vocab', 'wordquest-vocab-2026.08.15');

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

function loadJsList(file, exportName) {
    const ctx = {};
    vm.runInNewContext(fs.readFileSync(file, 'utf8') + `\nthis.list = ${exportName};`, ctx);
    return Array.isArray(ctx.list) ? ctx.list : [];
}

const report = { local: {}, graded: {}, wordquest: {} };

report.local.english = readJson(path.join(pre, '英语', 'vocabulary-bank.json')).length;
report.local.literacy = readJson(path.join(pre, '识字', 'character-bank.json')).length;
report.local.pinyin = readJson(path.join(pre, '识字', 'pinyin-initial-bank.json')).length;
report.local.phonicsWords = readJson(path.join(pre, 'english', 'phonics', 'word-bank.json')).length;
report.local.phonicsLetters = readJson(path.join(pre, 'english', 'phonics', 'letter-bank.json')).length;
report.local.poems = readJson(path.join(pre, '古诗', 'poem-bank.json')).length;
report.local.math = readJson(path.join(pre, '数学', 'problem-bank.json')).length;
report.local.motion = readJson(path.join(pre, '运动与专注', 'motion-bank.json')).length;

const strokesCtx = {};
vm.runInNewContext(fs.readFileSync(path.join(repoRoot, 'prj', 'preschool-literacy-strokes-data.js'), 'utf8') + '\nthis.n = Object.keys((globalThis.PersonalWorkbenchLiteracyStrokes||{}).chars||{}).length;', strokesCtx);
report.local.strokes = strokesCtx.n;

const kinder = loadJsList(path.join(graded, '01_幼儿园/幼儿园完整词库.js'), 'MERGED_KINDERGARTEN_VOCAB');
const hanzi = loadJsList(path.join(graded, '06_汉字/幼儿园汉字.js'), 'typeof kindergartenHanzi !== "undefined" ? kindergartenHanzi : (typeof KINDERGARTEN_HANZI !== "undefined" ? KINDERGARTEN_HANZI : [])');
const pinyinPack = loadJsList(path.join(graded, '07_拼音/常用拼音.js'), 'PINYIN_CORE_PACK');
report.graded.kindergartenEnglish = kinder.length;
report.graded.hanzi = hanzi.length;
report.graded.pinyin = pinyinPack.length;
report.graded.hanziSample = hanzi.slice(0, 2);
report.graded.pinyinSample = pinyinPack.slice(0, 1);
const deadCdn = kinder.filter((c) => ((c.imageURLs || [])[0] || {}).url && /maxcdn/.test(c.imageURLs[0].url)).length;
report.graded.kinderMaxcdnImages = deadCdn;

const manifest = readJson(path.join(wqRoot, 'manifest.json'));
const catalog = readJson(path.join(wqRoot, 'catalog.json'));
const media = path.join(wqRoot, 'media');
let mediaBytes = 0;
let mediaFiles = 0;
const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(p);
        else { mediaBytes += fs.statSync(p).size; mediaFiles += 1; }
    }
};
if (fs.existsSync(media)) walk(media);
const audioCards = catalog.cards.filter((c) => c.audio).length;
report.wordquest = {
    schema: manifest.catalogSchema,
    cards: catalog.cards.length,
    mediaFiles,
    mediaMB: Math.round(mediaBytes / 1024 / 1024),
    audioCards,
    imageAllLocal: catalog.cards.every((c) => c.image && !/^https?:/.test(c.image))
};

console.log(JSON.stringify(report, null, 2));
