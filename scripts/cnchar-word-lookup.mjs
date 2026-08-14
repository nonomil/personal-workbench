import cnchar from 'cnchar';
import cncharWords from 'cnchar-words';
import fs from 'node:fs';

cnchar.use(cncharWords);

const banned = new Set(['坡', '始', '游', '她', '店']);
const arg = process.argv[2] || '{}';
const payload = arg.startsWith('@')
    ? JSON.parse(fs.readFileSync(arg.slice(1), 'utf8'))
    : JSON.parse(arg);
const chars = Array.isArray(payload.chars) ? payload.chars : [];
const allowed = new Set(Array.isArray(payload.allowed) ? payload.allowed : chars);
const out = {};

for (const char of chars) {
    const raw = cnchar.words(char) || [];
    const words = [];
    const seen = new Set();
    for (const word of raw) {
        const text = String(word || '').trim();
        if (!text || seen.has(text) || text.length < 2 || text.length > 4) continue;
        if (!text.includes(char) || text === '山寨') continue;
        if ([...text].some((c) => banned.has(c))) continue;
        if ([...text].some((c) => /[\u4e00-\u9fff]/.test(c) && !allowed.has(c))) continue;
        seen.add(text);
        words.push(text);
        if (words.length >= 4) break;
    }
    out[char] = words;
}

process.stdout.write(JSON.stringify(out));
