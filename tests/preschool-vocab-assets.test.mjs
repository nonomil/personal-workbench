import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bankPath = path.join(repoRoot, 'prj', 'data', 'preschool', '英语', 'vocabulary-bank.json');
const reportPath = path.join(repoRoot, '.tmp-analysis', 'wordquest-extract-report.json');
const imgDir = path.join(repoRoot, 'prj', 'assets', 'img', 'vocab');
const audioDir = path.join(repoRoot, 'prj', 'assets', 'audio', 'vocab');

function readBank() {
    return JSON.parse(fs.readFileSync(bankPath, 'utf8'));
}

test('extract report lists 101 kept images and 33 audio files totaling under 5MB', () => {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    assert.equal(report.summary.images, 101);
    assert.equal(report.summary.audio, 33);
    assert.equal(report.words.length, 108);
    assert.deepEqual(report.summary.rejected.slice().sort(), ['friend', 'hello', 'look', 'play', 'sun', 'tree', 'water']);
    assert.ok(report.summary.bytes < 5 * 1024 * 1024, `expected <5MB, got ${report.summary.bytes}`);
    assert.equal(report.words.filter((row) => row.image).length, 101);
    assert.equal(report.words.filter((row) => row.audio).length, 33);
});

test('extracted vocab media files exist with lowercase word names', () => {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    const pngs = fs.readdirSync(imgDir).filter((name) => name.endsWith('.png'));
    const mp3s = fs.readdirSync(audioDir).filter((name) => name.endsWith('.mp3'));
    assert.equal(pngs.length, 101);
    assert.equal(mp3s.length, 33);
    for (const row of report.words) {
        assert.match(row.text, /^[a-z]+$/);
        if (row.image) assert.equal(fs.existsSync(path.join(repoRoot, 'prj', row.image)), true, row.image);
        if (row.audio) assert.equal(fs.existsSync(path.join(repoRoot, 'prj', row.audio)), true, row.audio);
    }
});

test('english bank stays at 597 and backfills local image/audio only', () => {
    const bank = readBank();
    assert.equal(bank.length, 597);
    const mediaOf = (row, key) => String((row.media && row.media[key]) || row[key] || '');
    const withImage = bank.filter((row) => mediaOf(row, 'image'));
    const withAudio = bank.filter((row) => mediaOf(row, 'audio'));
    assert.equal(withImage.length, 101);
    assert.equal(withAudio.length, 33);
    for (const row of withImage) {
        const image = mediaOf(row, 'image');
        assert.equal(image, `assets/img/vocab/${row.text.toLowerCase()}.png`);
        assert.doesNotMatch(image, /^https?:/i);
        assert.equal(fs.existsSync(path.join(repoRoot, 'prj', image)), true);
    }
    for (const row of withAudio) {
        const audio = mediaOf(row, 'audio');
        assert.equal(audio, `assets/audio/vocab/${row.text.toLowerCase()}.mp3`);
        assert.doesNotMatch(audio, /^https?:/i);
        assert.equal(fs.existsSync(path.join(repoRoot, 'prj', audio)), true);
    }
    const black = bank.find((row) => row.text === 'black');
    const about = bank.find((row) => row.text === 'about');
    const sun = bank.find((row) => row.text === 'sun');
    assert.equal(mediaOf(black, 'image'), 'assets/img/vocab/black.png');
    assert.equal(mediaOf(black, 'audio'), 'assets/audio/vocab/black.mp3');
    assert.equal(mediaOf(about, 'image'), '');
    assert.ok(!mediaOf(about, 'audio'));
    assert.equal(mediaOf(sun, 'image'), '');
    assert.equal(mediaOf(sun, 'audio'), 'assets/audio/vocab/sun.mp3');
});

test('wordquest original pack is gitignored', () => {
    const ignore = fs.readFileSync(path.join(repoRoot, '.gitignore'), 'utf8');
    assert.match(ignore, /prj\/assets\/vocab\/wordquest-vocab-2026\.08\.15\//);
});

test('parseBank keeps image and audio for flashcards', async () => {
    await import('../prj/preschool-english-vocab-data.js');
    await import('../prj/preschool-english-vocab.js');
    const vocab = globalThis.PersonalWorkbenchPreschoolEnglishVocab;
    const parsed = vocab.parseBank(readBank());
    const byText = Object.fromEntries(parsed.map((item) => [item.text, item]));
    assert.equal(parsed.length, 597);
    assert.equal(byText.black.image, 'assets/img/vocab/black.png');
    assert.equal(byText.black.audio, 'assets/audio/vocab/black.mp3');
    assert.equal(byText.about.image, '');
    assert.equal(byText.about.audio, '');
});

test('english flashcards prefer local bitmap and play local audio when present', () => {
    const app = fs.readFileSync(path.join(repoRoot, 'prj', 'app.js'), 'utf8');
    const html = fs.readFileSync(path.join(repoRoot, 'prj', 'preschool-workbench', 'index.html'), 'utf8');
    const styles = fs.readFileSync(path.join(repoRoot, 'prj', 'css', 'preschool', '35-course-flashcards.css'), 'utf8');
    assert.match(app, /item\.image/);
    assert.match(app, /assets\/img\/vocab\//);
    assert.match(app, /preschool-card-photo/);
    assert.match(app, /data-audio=/);
    assert.match(app, /function playVocabAudio\(/);
    assert.match(app, /new Audio\(/);
    assert.match(app, /speakLiteracy\(/);
    assert.match(styles, /preschool-card-photo/);
    assert.match(html, /preschool-english-vocab-data\.js\?v=20260815-english-auto-v1/);
    assert.match(html, /preschool-english-vocab\.js\?v=20260816-english-uplift-v2/);
    assert.match(html, /app\.js\?v=20260816-literacy-ui-v1/);
    assert.match(html, /35-course-flashcards\.css\?v=20260815-vocab-a1-v1|preschool-workbench\.css\?v=20260816-english-uplift-v2/);
});
