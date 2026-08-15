import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const prj = path.join(repoRoot, 'prj');
const vocabRoot = path.join(prj, 'assets', 'vocab');
const generatedAt = new Date().toISOString();

const LEVELS = {
    L1: { difficulty: 1, difficultyBand: 'foundation', title: '起步', titleEn: 'foundation' },
    L2: { difficulty: 2, difficultyBand: 'expanding', title: '扩展', titleEn: 'expanding' },
    L3: { difficulty: 3, difficultyBand: 'consolidating', title: '巩固', titleEn: 'consolidating' },
    L4: { difficulty: 4, difficultyBand: 'challenge', title: '挑战', titleEn: 'challenge' },
    L5: { difficulty: 5, difficultyBand: 'mixed', title: '综合', titleEn: 'mixed' },
    'MC-D1': { difficulty: 1, difficultyBand: 'foundation', title: '入门', titleEn: 'foundation' },
    'MC-D2': { difficulty: 2, difficultyBand: 'expanding', title: '进阶', titleEn: 'expanding' }
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
    return String(text || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'word';
}

function copyMedia(fromRel, destDir, destName) {
    const from = path.join(prj, String(fromRel || '').replace(/^\//, ''));
    if (!fromRel || !fs.existsSync(from)) return '';
    ensureDir(destDir);
    const name = destName || path.basename(from);
    fs.copyFileSync(from, path.join(destDir, name));
    return name;
}

function distractorsFor(item, bank) {
    const same = bank.filter((row) => row.text !== item.text && row.theme === item.theme).map((row) => row.text);
    const others = bank.filter((row) => row.text !== item.text && row.theme !== item.theme).map((row) => row.text);
    const picked = [];
    same.concat(others).forEach((word) => {
        if (picked.length >= 6) return;
        if (picked.indexOf(word) < 0) picked.push(word);
    });
    return picked;
}

function toCard(item, bank, pack, mediaCounts) {
    const level = LEVELS[item.level] || LEVELS.L1;
    const extra = item.extra && typeof item.extra === 'object' ? item.extra : {};
    const media = item.media && typeof item.media === 'object' ? item.media : {};
    const word = String(item.text || '');
    const imageName = copyMedia(media.image, path.join(pack.dir, 'media', 'semantic'), slug(word) + path.extname(media.image || '.png'));
    const audioName = copyMedia(media.audio, path.join(pack.dir, 'media', 'audio'), slug(word) + path.extname(media.audio || '.mp3'));
    if (imageName) mediaCounts.semanticImage += 1;
    if (audioName) mediaCounts.audio += 1;
    const image = imageName ? 'media/semantic/' + imageName : '';
    const audio = audioName ? 'media/audio/' + audioName : '';
    return {
        id: String(item.id || (pack.idPrefix + slug(word))),
        word: word,
        translation: String(item.zh || ''),
        partOfSpeech: '',
        phonetic: '',
        example: String(item.phrase || ''),
        exampleZh: String(item.phraseZh || ''),
        phrase: String(extra.groupEn || item.phrase || ''),
        phraseTranslation: String(extra.group || item.phraseZh || ''),
        category: String(extra.category || item.theme || ''),
        stage: pack.stage,
        difficulty: level.difficulty,
        difficultyBand: level.difficultyBand,
        gamePolicy: {
            recognitionGame: 'word-racer',
            typingGame: 'creeper-typing'
        },
        image: image,
        imageFallback: '',
        audio: audio,
        distractors: distractorsFor(item, bank),
        sourceIds: [pack.sourceId],
        sourceProviders: ['personal-workbench'],
        sourceModuleId: pack.sourceId,
        curriculumLevel: String(item.level || ''),
        minecraftBand: pack.stage === 'minecraft' ? String(item.level || '') : '',
        tags: [pack.stage, String(item.theme || ''), String(item.level || '')].filter(Boolean),
        quality: {
            hasExample: Boolean(item.phrase),
            hasPhonetic: false,
            hasImage: Boolean(image),
            hasImageFallback: false,
            hasAudio: Boolean(audio),
            hasDistractors: true
        },
        fallback: {
            image: !image,
            imageAsset: '',
            audio: !audio
        }
    };
}

function chunk(list, size) {
    const groups = [];
    let index = 0;
    for (index = 0; index < list.length; index += size) groups.push(list.slice(index, index + size));
    return groups;
}

function chapterKey(card, pack) {
    if (pack.chapterBy === 'theme') return card.category || '未分组';
    return card.curriculumLevel || ('L' + card.difficulty);
}

function chapterMeta(key, pack, cards) {
    if (pack.chapterBy === 'theme') {
        const first = cards[0] || {};
        return {
            id: pack.folder + '-' + slug(key),
            title: key,
            titleEn: slug(key),
            difficulty: first.difficulty || 1,
            difficultyBand: first.difficultyBand || 'foundation'
        };
    }
    const level = LEVELS[key] || LEVELS.L1;
    return {
        id: pack.folder + '-' + level.difficultyBand,
        title: level.title,
        titleEn: level.titleEn,
        difficulty: level.difficulty,
        difficultyBand: level.difficultyBand
    };
}

function buildChapters(cards, pack) {
    const buckets = {};
    cards.forEach((card) => {
        const key = chapterKey(card, pack);
        if (!buckets[key]) buckets[key] = [];
        buckets[key].push(card);
    });
    const order = Object.keys(buckets).sort(function (left, right) {
        if (pack.chapterBy === 'theme') return buckets[right].length - buckets[left].length || left.localeCompare(right);
        const leftMeta = LEVELS[left] || { difficulty: 99 };
        const rightMeta = LEVELS[right] || { difficulty: 99 };
        return leftMeta.difficulty - rightMeta.difficulty || left.localeCompare(right);
    });
    return order.map(function (key) {
        const levelCards = buckets[key];
        const meta = chapterMeta(key, pack, levelCards);
        const groups = chunk(levelCards, 10).map(function (items, index) {
            const categories = [];
            items.forEach(function (card) {
                if (card.category && categories.indexOf(card.category) < 0) categories.push(card.category);
            });
            return {
                id: meta.id + '-' + String(index + 1).padStart(3, '0'),
                title: meta.title + ' · 第 ' + (index + 1) + ' 组',
                cardIds: items.map(function (card) { return card.id; }),
                cardCount: items.length,
                difficulty: meta.difficulty,
                difficultyBand: meta.difficultyBand,
                gamePolicy: {
                    recognitionGame: 'word-racer',
                    typingGame: 'creeper-typing'
                },
                stages: [pack.stage],
                categories: categories
            };
        });
        return {
            id: meta.id,
            title: meta.title,
            titleEn: meta.titleEn,
            summary: pack.chapterSummary(meta),
            difficulty: meta.difficulty,
            difficultyBand: meta.difficultyBand,
            gamePolicy: {
                recognitionGame: 'word-racer',
                typingGame: 'creeper-typing'
            },
            cardCount: levelCards.length,
            groups: groups
        };
    });
}

function writeCsv(file, cards) {
    const headers = ['id', 'word', 'translation', 'category', 'curriculumLevel', 'example', 'exampleZh', 'image', 'audio'];
    const lines = [headers.join(',')].concat(cards.map(function (card) {
        return headers.map(function (key) {
            const text = String(card[key] == null ? '' : card[key]);
            return /[",\n\r]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
        }).join(',');
    }));
    fs.writeFileSync(file, '\uFEFF' + lines.join('\r\n') + '\r\n');
}

function exportPack(pack, bank) {
    if (fs.existsSync(pack.dir)) fs.rmSync(pack.dir, { recursive: true, force: true });
    ensureDir(pack.dir);
    const mediaCounts = { semanticImage: 0, imageFallback: 0, audio: 0 };
    const cards = bank.map(function (item) { return toCard(item, bank, pack, mediaCounts); });
    const chapters = buildChapters(cards, pack);
    const groupCount = chapters.reduce(function (sum, chapter) { return sum + chapter.groups.length; }, 0);
    const catalog = {
        version: 1,
        generatedAt: generatedAt,
        buildIdentity: {
            batchId: pack.folder,
            manifestHash: '',
            inputHash: '',
            builderVersion: 'export-vocab-packages@1'
        },
        cardCount: cards.length,
        cards: cards
    };
    const chapterDoc = {
        version: 2,
        generatedAt: generatedAt,
        buildIdentity: catalog.buildIdentity,
        catalog: 'catalog.json',
        chapters: chapters
    };
    const hash = crypto.createHash('sha256').update(JSON.stringify({ cards: cards.map((card) => card.id), chapters: chapters.map((chapter) => chapter.id) })).digest('hex');
    catalog.buildIdentity.manifestHash = hash;
    catalog.buildIdentity.inputHash = hash;
    chapterDoc.buildIdentity = catalog.buildIdentity;
    const manifest = {
        schema: 'wordquest.vocab-release.v1',
        packageVersion: '2026.08.15',
        catalogSchema: 'wordquest.vocab-runtime.v1',
        protocol: 'wordquest.game.v2',
        generatedAt: generatedAt,
        buildIdentity: catalog.buildIdentity,
        catalogFile: 'catalog.json',
        chaptersFile: 'chapters.json',
        cardCount: cards.length,
        chapterCount: chapters.length,
        groupCount: groupCount,
        mediaCounts: mediaCounts,
        mediaFileCount: mediaCounts.semanticImage + mediaCounts.audio,
        packageContents: ['README.md', 'manifest.json', 'catalog.json', 'chapters.json', '词表.csv', 'media/'],
        sourceDatabaseIncluded: false,
        auditIncluded: false,
        sourceSnapshotsIncluded: false,
        consumerRule: 'consume catalog.json; project CardSnapshot; do not read source SQLite',
        edition: pack.edition,
        title: pack.title
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
        '## Files',
        '',
        '- catalog.json: runtime vocabulary cards.',
        '- chapters.json: chapters, groups, and card order.',
        '- media/: package-local images and audio.',
        '- manifest.json: schema, version, counts.',
        '- 词表.csv: spreadsheet view.',
        '',
        '## Consumer usage',
        '',
        '```js',
        'const catalog = await fetch("./' + pack.folder + '/catalog.json").then((r) => r.json());',
        'const chapters = await fetch("./' + pack.folder + '/chapters.json").then((r) => r.json());',
        'const card = catalog.cards[0];',
        '// card.image / card.audio are URLs relative to this package.',
        '```',
        '',
        '## Counts',
        '',
        '- cards: ' + cards.length,
        '- chapters: ' + chapters.length,
        '- groups: ' + groupCount,
        '- images: ' + mediaCounts.semanticImage,
        '- audio: ' + mediaCounts.audio,
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
        images: mediaCounts.semanticImage,
        audio: mediaCounts.audio
    };
}

const core = readJson(path.join(prj, 'data', 'preschool', '英语', 'vocabulary-bank.json'));
const minecraft = readJson(path.join(prj, 'data', 'preschool', '英语', 'minecraft-bank.json'));

const coreStat = exportPack({
    folder: 'core-english-2026.08.15',
    dir: path.join(vocabRoot, 'core-english-2026.08.15'),
    title: '正常版 · 生活英语',
    edition: 'core',
    stage: 'kindergarten',
    idPrefix: 'vocab-',
    sourceId: 'personal-workbench-core-597',
    chapterBy: 'theme',
    blurb: '工作台每日英语用的 597 词。格式与 wordquest-vocab-2026.08.15 相同，可单独拷走。',
    chapterSummary: function (meta) { return '主题「' + meta.title + '」：认词、听读和生活例句。'; }
}, core);

const mcStat = exportPack({
    folder: 'minecraft-english-2026.08.15',
    dir: path.join(vocabRoot, 'minecraft-english-2026.08.15'),
    title: '我的世界版 · 兴趣英语',
    edition: 'minecraft',
    stage: 'minecraft',
    idPrefix: 'mc-',
    sourceId: 'personal-workbench-minecraft-324',
    chapterBy: 'level',
    blurb: 'Minecraft 兴趣词 324 条（入门 + 进阶）。不和正常版混级。格式与 wordquest-vocab-2026.08.15 相同。',
    chapterSummary: function (meta) { return '按 ' + meta.title + ' 认方块、生物和工具词。'; }
}, minecraft);

const index = {
    generatedAt: generatedAt,
    packages: [coreStat, mcStat],
    referenceFormat: 'wordquest-vocab-2026.08.15'
};
writeJson(path.join(vocabRoot, 'packages.json'), index);
fs.writeFileSync(path.join(vocabRoot, 'README.md'), [
    '# 英语词库包',
    '',
    '格式对齐 `wordquest-vocab-2026.08.15`（manifest + catalog + chapters + media）。',
    '',
    '| 文件夹 | 版本 | 词数 | 图 | 音频 |',
    '| --- | --- | --- | --- | --- |',
    '| `core-english-2026.08.15/` | 正常版 · 生活英语 | ' + coreStat.cards + ' | ' + coreStat.images + ' | ' + coreStat.audio + ' |',
    '| `minecraft-english-2026.08.15/` | 我的世界版 · 兴趣英语 | ' + mcStat.cards + ' | ' + mcStat.images + ' | ' + mcStat.audio + ' |',
    '| `wordquest-vocab-2026.08.15/` | 原始参考包（不入库） | 2289 | — | — |',
    '',
    '每包用法：读该目录下的 `catalog.json`，图片和音频路径相对该包。',
    ''
].join('\n'));

console.log(JSON.stringify(index, null, 2));
