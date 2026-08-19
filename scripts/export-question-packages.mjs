import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const prj = path.join(repoRoot, 'prj');
const pre = path.join(prj, 'data', 'preschool');
const vocabRoot = path.join(prj, 'assets', 'vocab');
const generatedAt = new Date().toISOString();

const LEVELS = {
    L1: { difficulty: 1, difficultyBand: 'foundation', title: '起步', titleEn: 'foundation' },
    L2: { difficulty: 2, difficultyBand: 'expanding', title: '扩展', titleEn: 'expanding' },
    L3: { difficulty: 3, difficultyBand: 'consolidating', title: '巩固', titleEn: 'consolidating' },
    L4: { difficulty: 4, difficultyBand: 'challenge', title: '挑战', titleEn: 'challenge' },
    L5: { difficulty: 5, difficultyBand: 'mixed', title: '综合', titleEn: 'mixed' }
};

function readJson(file) {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

function slug(text) {
    return String(text || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';
}

function extraOf(item) {
    return item && item.extra && typeof item.extra === 'object' ? item.extra : {};
}

function normalizeRow(item) {
    const extra = extraOf(item);
    const kind = String(item.kind || (item.skillId ? 'math' : '')).trim();
    if (kind === 'literacy') {
        const words = Array.isArray(extra.words) ? extra.words : [];
        return {
            id: item.id,
            kind: 'literacy',
            text: String(item.text || item.char || ''),
            zh: String(extra.pinyin || ''),
            theme: String(item.theme || ''),
            level: String(item.level || 'L1'),
            phrase: words.join(' '),
            phraseZh: String(extra.explain || ''),
            phonetic: String(extra.pinyin || ''),
            media: item.media || {}
        };
    }
    if (kind === 'pinyin') {
        return {
            id: item.id,
            kind: 'pinyin',
            text: String(item.text || extra.initial || ''),
            zh: String(extra.sample || item.zh || ''),
            theme: String(item.theme || extra.group || extra.kind || ''),
            level: String(item.level || 'L1'),
            phrase: String(extra.sample || ''),
            phraseZh: String(extra.pinyin || ''),
            phonetic: String(extra.pinyin || extra.initial || item.text || ''),
            media: item.media || {}
        };
    }
    if (kind === 'phonics') {
        const graphemes = Array.isArray(item.graphemes) ? item.graphemes : (extra.graphemes || []);
        return {
            id: item.id,
            kind: 'phonics',
            text: String(item.text || extra.letter || ''),
            zh: String(item.zh || extra.keyword || ''),
            theme: String(item.theme || extra.group || extra.stageId || ''),
            level: String(item.level || 'L1'),
            phrase: graphemes.join('-'),
            phraseZh: String(extra.sound || extra.keyword || item.zh || ''),
            phonetic: graphemes.join('-'),
            media: item.media || {}
        };
    }
    const prompt = String(item.prompt || '');
    const left = Number(item.left);
    const right = Number(item.right);
    const op = String(item.op || '');
    const stem = prompt || (Number.isFinite(left) && Number.isFinite(right) && op ? String(left) + op + String(right) : String(item.id || ''));
    return {
        id: item.id,
        kind: 'math',
        text: stem,
        zh: String(item.answer ?? ''),
        theme: String(item.skillId || 'math'),
        level: String(item.level || 'L1'),
        phrase: stem,
        phraseZh: String(item.answer ?? ''),
        phonetic: '',
        answer: item.answer,
        media: item.media || {}
    };
}

function distractorsFor(item, bank) {
    const same = bank.filter((row) => row.text !== item.text && row.theme === item.theme).map((row) => row.text);
    const others = bank.filter((row) => row.text !== item.text).map((row) => row.text);
    const picked = [];
    same.concat(others).forEach((word) => {
        if (picked.length >= 6) return;
        if (word && picked.indexOf(word) < 0) picked.push(word);
    });
    return picked;
}

function toCard(item, bank, pack) {
    const level = LEVELS[item.level] || LEVELS.L1;
    const word = String(item.text || '');
    return {
        id: String(item.id || (pack.idPrefix + slug(word))),
        kind: item.kind,
        word: word,
        translation: String(item.zh || ''),
        partOfSpeech: '',
        phonetic: String(item.phonetic || ''),
        example: String(item.phrase || ''),
        exampleZh: String(item.phraseZh || ''),
        phrase: String(item.phrase || ''),
        phraseTranslation: String(item.phraseZh || ''),
        category: String(item.theme || ''),
        stage: pack.stage,
        difficulty: level.difficulty,
        difficultyBand: level.difficultyBand,
        gamePolicy: {
            recognitionGame: pack.recognitionGame,
            typingGame: pack.typingGame
        },
        image: '',
        imageFallback: '',
        audio: '',
        distractors: distractorsFor(item, bank),
        sourceIds: [pack.sourceId],
        sourceProviders: ['personal-workbench'],
        sourceModuleId: pack.sourceId,
        curriculumLevel: String(item.level || 'L1'),
        minecraftBand: '',
        answer: item.answer,
        tags: [item.kind, pack.stage, String(item.theme || ''), String(item.level || '')].filter(Boolean),
        quality: {
            hasExample: Boolean(item.phrase),
            hasPhonetic: Boolean(item.phonetic),
            hasImage: false,
            hasImageFallback: false,
            hasAudio: false,
            hasDistractors: true
        },
        fallback: {
            image: true,
            imageAsset: '',
            audio: true
        }
    };
}

function chunk(list, size) {
    const groups = [];
    for (let index = 0; index < list.length; index += size) groups.push(list.slice(index, index + size));
    return groups;
}

function buildChapters(cards, pack) {
    const buckets = {};
    cards.forEach((card) => {
        const key = card.curriculumLevel || 'L1';
        if (!buckets[key]) buckets[key] = [];
        buckets[key].push(card);
    });
    return Object.keys(buckets).sort(function (left, right) {
        return (LEVELS[left] || { difficulty: 99 }).difficulty - (LEVELS[right] || { difficulty: 99 }).difficulty;
    }).map(function (key) {
        const levelCards = buckets[key];
        const meta = LEVELS[key] || LEVELS.L1;
        const chapterId = pack.folder + '-' + meta.difficultyBand;
        const groups = chunk(levelCards, 10).map(function (items, index) {
            return {
                id: chapterId + '-' + String(index + 1).padStart(3, '0'),
                title: meta.title + ' · 第 ' + (index + 1) + ' 组',
                cardIds: items.map(function (card) { return card.id; }),
                cardCount: items.length,
                difficulty: meta.difficulty,
                difficultyBand: meta.difficultyBand,
                gamePolicy: {
                    recognitionGame: pack.recognitionGame,
                    typingGame: pack.typingGame
                },
                stages: [pack.stage],
                categories: items.map(function (card) { return card.category; }).filter(Boolean).filter(function (name, i, all) { return all.indexOf(name) === i; })
            };
        });
        return {
            id: chapterId,
            title: meta.title,
            titleEn: meta.titleEn,
            summary: pack.chapterSummary(meta),
            difficulty: meta.difficulty,
            difficultyBand: meta.difficultyBand,
            gamePolicy: {
                recognitionGame: pack.recognitionGame,
                typingGame: pack.typingGame
            },
            cardCount: levelCards.length,
            groups: groups
        };
    });
}

function writeCsv(file, cards) {
    const headers = ['id', 'kind', 'word', 'translation', 'category', 'curriculumLevel', 'example', 'exampleZh', 'phonetic'];
    const lines = [headers.join(',')].concat(cards.map(function (card) {
        return headers.map(function (key) {
            const text = String(card[key] == null ? '' : card[key]);
            return /[",\n\r]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
        }).join(',');
    }));
    fs.writeFileSync(file, '\uFEFF' + lines.join('\r\n') + '\r\n');
}

function exportPack(pack, rows) {
    if (fs.existsSync(pack.dir)) fs.rmSync(pack.dir, { recursive: true, force: true });
    ensureDir(pack.dir);
    const bank = rows.map(normalizeRow);
    const cards = bank.map(function (item) { return toCard(item, bank, pack); });
    const chapters = buildChapters(cards, pack);
    const groupCount = chapters.reduce(function (sum, chapter) { return sum + chapter.groups.length; }, 0);
    const catalog = {
        version: 1,
        generatedAt: generatedAt,
        buildIdentity: {
            batchId: pack.folder,
            manifestHash: '',
            inputHash: '',
            builderVersion: 'export-question-packages@1'
        },
        cardCount: cards.length,
        cards: cards
    };
    const hash = crypto.createHash('sha256').update(JSON.stringify({
        cards: cards.map((card) => card.id),
        chapters: chapters.map((chapter) => chapter.id)
    })).digest('hex');
    catalog.buildIdentity.manifestHash = hash;
    catalog.buildIdentity.inputHash = hash;
    const chapterDoc = {
        version: 2,
        generatedAt: generatedAt,
        buildIdentity: catalog.buildIdentity,
        catalog: 'catalog.json',
        chapters: chapters
    };
    const manifest = {
        schema: 'wordquest.vocab-release.v1',
        packageVersion: '2026.08.19',
        catalogSchema: 'wordquest.vocab-runtime.v1',
        protocol: 'wordquest.game.v2',
        generatedAt: generatedAt,
        buildIdentity: catalog.buildIdentity,
        catalogFile: 'catalog.json',
        chaptersFile: 'chapters.json',
        cardCount: cards.length,
        chapterCount: chapters.length,
        groupCount: groupCount,
        mediaCounts: { semanticImage: 0, imageFallback: 0, audio: 0 },
        mediaFileCount: 0,
        packageContents: ['README.md', 'manifest.json', 'catalog.json', 'chapters.json', '词表.csv'],
        sourceDatabaseIncluded: false,
        auditIncluded: false,
        sourceSnapshotsIncluded: false,
        consumerRule: 'consume catalog.json; project CardSnapshot; do not read source SQLite',
        edition: pack.edition,
        title: pack.title,
        subject: pack.kind
    };
    writeJson(path.join(pack.dir, 'catalog.json'), catalog);
    writeJson(path.join(pack.dir, 'chapters.json'), chapterDoc);
    writeJson(path.join(pack.dir, 'manifest.json'), manifest);
    writeCsv(path.join(pack.dir, '词表.csv'), cards);
    fs.writeFileSync(path.join(pack.dir, 'README.md'), [
        '# ' + pack.title,
        '',
        pack.blurb,
        '',
        '源库：`prj/data/preschool/`。本包只是和英语词库相同的 catalog 包装，不另造题。',
        '',
        '## Files',
        '',
        '- catalog.json: runtime cards (`word` / `translation` / `kind`).',
        '- chapters.json: chapters, groups, and card order.',
        '- manifest.json: schema, version, counts.',
        '- 词表.csv: spreadsheet view.',
        '',
        '## Consumer usage',
        '',
        '```js',
        'const catalog = await fetch("./' + pack.folder + '/catalog.json").then((r) => r.json());',
        'const card = catalog.cards[0];',
        '// card.word / card.translation / card.kind',
        '```',
        '',
        '## Counts',
        '',
        '- cards: ' + cards.length,
        '- chapters: ' + chapters.length,
        '- groups: ' + groupCount,
        '',
        'Catalog schema: wordquest.vocab-runtime.v1',
        'Package schema: wordquest.vocab-release.v1',
        ''
    ].join('\n'));
    return {
        folder: pack.folder,
        title: pack.title,
        cards: cards.length,
        chapters: chapters.length,
        groups: groupCount,
        images: 0,
        audio: 0,
        subject: pack.kind
    };
}

function existingEnglishStats() {
    const current = readJson(path.join(vocabRoot, 'packages.json'));
    return (current.packages || []).filter(function (row) {
        return row.folder === 'core-english-2026.08.15' || row.folder === 'minecraft-english-2026.08.15';
    });
}

const literacy = exportPack({
    folder: 'core-literacy-2026.08.19',
    dir: path.join(vocabRoot, 'core-literacy-2026.08.19'),
    title: '识字 · 1500 字',
    edition: 'literacy',
    kind: 'literacy',
    stage: 'kindergarten',
    idPrefix: 'zh-',
    sourceId: 'personal-workbench-literacy-1500',
    recognitionGame: 'word-tablet',
    typingGame: 'char-choice',
    blurb: '工作台识字 1500 字，按 L1–L5 分章。格式与 core-english 相同。',
    chapterSummary: function (meta) { return '识字 ' + meta.title + '：认字、拼音和组词。'; }
}, readJson(path.join(pre, '识字', 'character-bank.json')));

const pinyin = exportPack({
    folder: 'core-pinyin-2026.08.19',
    dir: path.join(vocabRoot, 'core-pinyin-2026.08.19'),
    title: '拼音 · 声韵 63',
    edition: 'pinyin',
    kind: 'pinyin',
    stage: 'kindergarten',
    idPrefix: 'py-',
    sourceId: 'personal-workbench-pinyin-63',
    recognitionGame: 'sound-pick',
    typingGame: 'pinyin-choice',
    blurb: '工作台拼音 63 个声韵。格式与 core-english 相同。',
    chapterSummary: function (meta) { return '拼音 ' + meta.title + '：听音选声母/韵母。'; }
}, readJson(path.join(pre, '识字', 'pinyin-initial-bank.json')));

const phonicsRows = readJson(path.join(pre, 'english', 'phonics', 'word-bank.json'))
    .concat(readJson(path.join(pre, 'english', 'phonics', 'letter-bank.json')));
const phonics = exportPack({
    folder: 'core-phonics-2026.08.19',
    dir: path.join(vocabRoot, 'core-phonics-2026.08.19'),
    title: '自然拼读 · 词+字母',
    edition: 'phonics',
    kind: 'phonics',
    stage: 'kindergarten',
    idPrefix: 'ph-',
    sourceId: 'personal-workbench-phonics-120',
    recognitionGame: 'listen-blend',
    typingGame: 'cvc-spell',
    blurb: '工作台自然拼读 94 词 + 26 字母。格式与 core-english 相同。',
    chapterSummary: function (meta) { return '拼读 ' + meta.title + '：字母音和 CVC。'; }
}, phonicsRows);

const math = exportPack({
    folder: 'core-math-2026.08.19',
    dir: path.join(vocabRoot, 'core-math-2026.08.19'),
    title: '口算 · 静题 50',
    edition: 'math',
    kind: 'math',
    stage: 'kindergarten',
    idPrefix: 'math-',
    sourceId: 'personal-workbench-math-50',
    recognitionGame: 'count-pick',
    typingGame: 'kou-suan',
    blurb: '工作台口算静题 50 道。L3+ 现算不在本包，由引擎生成。格式与 core-english 相同。',
    chapterSummary: function (meta) { return '口算 ' + meta.title + '：数数、比较和加减。'; }
}, readJson(path.join(pre, '数学', 'problem-bank.json')));

const index = {
    generatedAt: generatedAt,
    packages: existingEnglishStats().concat([literacy, pinyin, phonics, math]),
    referenceFormat: 'wordquest-vocab-2026.08.15'
};
writeJson(path.join(vocabRoot, 'packages.json'), index);

const rows = index.packages.map(function (row) {
    return '| `' + row.folder + '/` | ' + row.title + ' | ' + row.cards + ' | ' + (row.images || 0) + ' | ' + (row.audio || 0) + ' |';
});
fs.writeFileSync(path.join(vocabRoot, 'README.md'), [
    '# 学习题库包',
    '',
    '格式对齐 `wordquest-vocab-2026.08.15`（manifest + catalog + chapters）。英语包带 media；其余科从工作台 JSON 导出，不另造题。',
    '',
    '| 文件夹 | 版本 | 卡片 | 图 | 音频 |',
    '| --- | --- | --- | --- | --- |',
    rows.join('\n'),
    '| `wordquest-vocab-2026.08.15/` | 原始参考包（不入库） | 2289 | — | — |',
    '',
    '每包用法：读该目录下的 `catalog.json`。游戏侧用 `kind` 区分科目。',
    ''
].join('\n'));

console.log(JSON.stringify(index, null, 2));
