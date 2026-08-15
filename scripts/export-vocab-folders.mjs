import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const prj = path.join(repoRoot, 'prj');
const outRoot = path.join(repoRoot, '词库导出');

function readJson(file) {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function csvCell(value) {
    const text = String(value == null ? '' : value);
    if (/[",\n\r]/.test(text)) return '"' + text.replace(/"/g, '""') + '"';
    return text;
}

function writeCsv(file, rows, headers) {
    const lines = [headers.join(',')].concat(rows.map((row) => headers.map((key) => csvCell(row[key])).join(',')));
    fs.writeFileSync(file, '\uFEFF' + lines.join('\r\n') + '\r\n');
}

function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

function copyIfExists(from, to) {
    if (!from || !fs.existsSync(from)) return false;
    ensureDir(path.dirname(to));
    fs.copyFileSync(from, to);
    return true;
}

function flatten(item) {
    const media = item.media && typeof item.media === 'object' ? item.media : {};
    const extra = item.extra && typeof item.extra === 'object' ? item.extra : {};
    return {
        id: String(item.id || ''),
        word: String(item.text || ''),
        zh: String(item.zh || ''),
        theme: String(item.theme || ''),
        level: String(item.level || ''),
        phrase: String(item.phrase || ''),
        phraseZh: String(item.phraseZh || ''),
        art: String(media.art || ''),
        category: String(extra.category || ''),
        group: String(extra.group || ''),
        sourceImage: String(media.image || ''),
        sourceAudio: String(media.audio || '')
    };
}

function exportBank(name, bank, dest) {
    ensureDir(dest);
    const imagesDir = path.join(dest, '图片');
    const audioDir = path.join(dest, '音频');
    ensureDir(imagesDir);
    ensureDir(audioDir);

    const rows = bank.map((item) => {
        const row = flatten(item);
        const slug = row.word.toLowerCase().replace(/[^a-z0-9-]+/g, '-') || row.id;
        const imageName = path.basename(row.sourceImage || '') || (slug + '.png');
        const audioName = path.basename(row.sourceAudio || '') || (slug + '.mp3');
        const imageFrom = row.sourceImage ? path.join(prj, row.sourceImage.replace(/^assets\//, 'assets/')) : '';
        const audioFrom = row.sourceAudio ? path.join(prj, row.sourceAudio.replace(/^assets\//, 'assets/')) : '';
        const hasImage = copyIfExists(imageFrom, path.join(imagesDir, imageName));
        const hasAudio = copyIfExists(audioFrom, path.join(audioDir, audioName));
        return {
            id: row.id,
            word: row.word,
            zh: row.zh,
            theme: row.theme,
            level: row.level,
            phrase: row.phrase,
            phraseZh: row.phraseZh,
            category: row.category,
            group: row.group,
            art: row.art,
            image: hasImage ? ('图片/' + imageName) : '',
            audio: hasAudio ? ('音频/' + audioName) : '',
            hasImage: hasImage ? 'yes' : 'no',
            hasAudio: hasAudio ? 'yes' : 'no'
        };
    });

    const headers = ['id', 'word', 'zh', 'theme', 'level', 'phrase', 'phraseZh', 'category', 'group', 'image', 'audio', 'art', 'hasImage', 'hasAudio'];
    writeCsv(path.join(dest, '词表.csv'), rows, headers);
    fs.writeFileSync(path.join(dest, '词表.json'), JSON.stringify(rows, null, 2));

    const byTheme = {};
    rows.forEach((row) => {
        const key = row.theme || '未分组';
        if (!byTheme[key]) byTheme[key] = [];
        byTheme[key].push(row);
    });
    const themeDir = path.join(dest, '按主题');
    ensureDir(themeDir);
    Object.keys(byTheme).sort().forEach((theme) => {
        writeCsv(path.join(themeDir, theme + '.csv'), byTheme[theme], headers);
    });

    const imageCount = rows.filter((row) => row.hasImage === 'yes').length;
    const audioCount = rows.filter((row) => row.hasAudio === 'yes').length;
    const readme = [
        '# ' + name,
        '',
        '- 词条：' + rows.length,
        '- 有图：' + imageCount,
        '- 有音频：' + audioCount,
        '- 无图：' + (rows.length - imageCount) + '（工作台里用 emoji 卡面）',
        '',
        '打开 `词表.csv` 可用 Excel；`词表.json` 给程序用。图片和音频在同级文件夹，路径已写在表里。',
        ''
    ].join('\n');
    fs.writeFileSync(path.join(dest, 'README.md'), readme);
    return { name, words: rows.length, images: imageCount, audio: audioCount, themes: Object.keys(byTheme).length };
}

if (fs.existsSync(outRoot)) fs.rmSync(outRoot, { recursive: true, force: true });
ensureDir(outRoot);

const core = readJson(path.join(prj, 'data', 'preschool', '英语', 'vocabulary-bank.json'));
const minecraft = readJson(path.join(prj, 'data', 'preschool', '英语', 'minecraft-bank.json'));

const coreStat = exportBank('正常版 · 生活英语', core, path.join(outRoot, '正常版'));
const mcStat = exportBank('我的世界版 · 兴趣英语', minecraft, path.join(outRoot, '我的世界版'));

const summary = {
    exportedAt: '2026-08-15',
    source: {
        core: 'prj/data/preschool/英语/vocabulary-bank.json',
        minecraft: 'prj/data/preschool/英语/minecraft-bank.json'
    },
    正常版: coreStat,
    我的世界版: mcStat
};
fs.writeFileSync(path.join(outRoot, 'manifest.json'), JSON.stringify(summary, null, 2));
fs.writeFileSync(path.join(outRoot, 'README.md'), [
    '# 英语词库导出',
    '',
    '从工作台已接入的两套词库整理出来，互不混级。',
    '',
    '| 文件夹 | 内容 | 词数 | 有图 | 有音频 |',
    '| --- | --- | --- | --- | --- |',
    '| `正常版/` | 生活英语，工作台每日英语用这套 | ' + coreStat.words + ' | ' + coreStat.images + ' | ' + coreStat.audio + ' |',
    '| `我的世界版/` | Minecraft 兴趣词，英语专区单独入口 | ' + mcStat.words + ' | ' + mcStat.images + ' | ' + mcStat.audio + ' |',
    '',
    '每套里面都有：',
    '',
    '- `词表.csv` / `词表.json`',
    '- `按主题/` 拆开的表',
    '- `图片/` `音频/`（有素材的才拷进来）',
    '',
    '源数据仍在 `prj/data/preschool/英语/`，这里只是整理后的独立副本。',
    ''
].join('\n'));

console.log(JSON.stringify(summary, null, 2));
