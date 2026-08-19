import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pre = path.join(repoRoot, 'prj', 'data', 'preschool');
const indexPath = path.join(pre, 'banks-index.json');

const REQUIRED = ['id', 'kind', 'text', 'theme', 'level', 'media'];
const REQUIRED_MATH = ['id', 'level', 'prompt', 'answer'];
const KIND_EXTRA = {
    english: ['zh', 'phrase', 'phraseZh'],
    literacy: [],
    pinyin: [],
    phonics: [],
    math: []
};

export function validateBanks() {
    const errors = [];
    if (!fs.existsSync(indexPath)) {
        return { ok: false, errors: ['missing banks-index.json'] };
    }
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    const banks = Array.isArray(index.banks) ? index.banks : [];
    const seenIds = new Set();
    const summary = [];
    for (const entry of banks) {
        const file = path.join(pre, entry.path);
        if (!fs.existsSync(file)) {
            errors.push(entry.id + ': missing file ' + entry.path);
            continue;
        }
        const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (!Array.isArray(rows)) {
            errors.push(entry.id + ': bank is not an array');
            continue;
        }
        if (typeof entry.expected === 'number' && rows.length !== entry.expected) {
            errors.push(entry.id + ': count ' + rows.length + ' !== ' + entry.expected);
        }
        if (entry.count && rows.length !== entry.count) {
            errors.push(entry.id + ': index count ' + entry.count + ' !== file ' + rows.length);
        }
        const extraRequired = KIND_EXTRA[entry.kind] || [];
        const required = entry.kind === 'math' ? REQUIRED_MATH : REQUIRED;
        rows.forEach((row, indexNo) => {
            const label = entry.id + '[' + indexNo + ']';
            if (!row || typeof row !== 'object' || Array.isArray(row)) {
                errors.push(label + ': expected object row');
                return;
            }
            required.concat(extraRequired).forEach((key) => {
                if (row[key] == null || row[key] === '') {
                    if (key === 'theme' && entry.kind === 'phonics') return;
                    errors.push(label + ': missing ' + key);
                }
            });
            if (!row.id) return;
            if (seenIds.has(row.id)) errors.push(label + ': duplicate id ' + row.id);
            seenIds.add(row.id);
            const media = row.media && typeof row.media === 'object' ? row.media : {};
            ['image', 'art', 'audio'].forEach((key) => {
                const value = String(media[key] || '');
                if (/https?:/i.test(value)) errors.push(label + ': http in media.' + key);
            });
            ['image', 'audio'].forEach((key) => {
                const value = String(media[key] || '').trim();
                if (!value) return;
                const abs = path.join(repoRoot, 'prj', value.replace(/^\.?\/+/, ''));
                if (!fs.existsSync(abs)) errors.push(label + ': missing file ' + value);
            });
        });
        summary.push({ id: entry.id, count: rows.length, expected: entry.expected });
    }
    return { ok: errors.length === 0, errors: errors, summary: summary };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
    const result = validateBanks();
    if (!result.ok) {
        console.error(JSON.stringify(result, null, 2));
        process.exit(1);
    }
    console.log(JSON.stringify(result, null, 2));
}
