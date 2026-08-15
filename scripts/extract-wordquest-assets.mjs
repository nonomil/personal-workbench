import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const wqRoot = path.join(repoRoot, 'prj', 'assets', 'vocab', 'wordquest-vocab-2026.08.15');
const bankPath = path.join(repoRoot, 'prj', 'data', 'preschool', '英语', 'vocabulary-bank.json');
const imgDir = path.join(repoRoot, 'prj', 'assets', 'img', 'vocab');
const audioDir = path.join(repoRoot, 'prj', 'assets', 'audio', 'vocab');
const reportPath = path.join(repoRoot, '.tmp-analysis', 'wordquest-extract-report.json');

function resetDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
    for (const name of fs.readdirSync(dir)) {
        fs.rmSync(path.join(dir, name), { force: true });
    }
}

const IMAGE_REJECT = new Set(['sun', 'hello', 'look', 'play', 'friend', 'water', 'tree']);

const catalog = JSON.parse(fs.readFileSync(path.join(wqRoot, 'catalog.json'), 'utf8'));
const bank = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
if (bank.length !== 597) {
    throw new Error(`english bank must stay at 597, got ${bank.length}`);
}

const wqByWord = new Map();
for (const card of catalog.cards) {
    const key = String(card.word || '').trim().toLowerCase();
    if (key && !wqByWord.has(key)) wqByWord.set(key, card);
}

resetDir(imgDir);
resetDir(audioDir);
fs.mkdirSync(path.dirname(reportPath), { recursive: true });

const words = [];
let bytes = 0;
for (const row of bank) {
    const key = String(row.text || '').trim().toLowerCase();
    const card = wqByWord.get(key);
    row.image = '';
    delete row.audio;
    if (!card) continue;
    const entry = { text: key, image: '', audio: '', bytes: 0, rejected: IMAGE_REJECT.has(key) };
    if (!IMAGE_REJECT.has(key)) {
        const imageRel = `assets/img/vocab/${key}.png`;
        const imageSrc = path.join(wqRoot, card.image || '');
        if (!card.image || !fs.existsSync(imageSrc)) {
            throw new Error(`missing semantic image for ${key}: ${card.image}`);
        }
        fs.copyFileSync(imageSrc, path.join(repoRoot, 'prj', imageRel));
        const imageBytes = fs.statSync(path.join(repoRoot, 'prj', imageRel)).size;
        bytes += imageBytes;
        row.image = imageRel;
        entry.image = imageRel;
        entry.bytes += imageBytes;
    }
    if (card.audio) {
        const audioRel = `assets/audio/vocab/${key}.mp3`;
        const audioSrc = path.join(wqRoot, card.audio);
        if (!fs.existsSync(audioSrc)) throw new Error(`missing audio for ${key}: ${card.audio}`);
        fs.copyFileSync(audioSrc, path.join(repoRoot, 'prj', audioRel));
        const audioBytes = fs.statSync(path.join(repoRoot, 'prj', audioRel)).size;
        bytes += audioBytes;
        row.audio = audioRel;
        entry.audio = audioRel;
        entry.bytes += audioBytes;
    }
    words.push(entry);
}

if (words.length !== 108) throw new Error(`expected 108 overlap words, got ${words.length}`);
const imageCount = words.filter((row) => row.image).length;
const audioCount = words.filter((row) => row.audio).length;
if (imageCount !== 108 - IMAGE_REJECT.size) throw new Error(`expected ${108 - IMAGE_REJECT.size} images, got ${imageCount}`);
if (audioCount !== 33) throw new Error(`expected 33 audio files, got ${audioCount}`);

fs.writeFileSync(bankPath, JSON.stringify(bank, null, 2) + '\n', 'utf8');
const report = {
    generatedAt: new Date().toISOString(),
    summary: { images: imageCount, audio: audioCount, bytes, rejected: [...IMAGE_REJECT] },
    words
};
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(report.summary, null, 2));
