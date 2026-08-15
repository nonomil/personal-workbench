import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

await import('../prj/preschool-english-vocab-data.js');
await import('../prj/preschool-english-data.js');
await import('../prj/preschool-english-vocab.js');
const vocab = globalThis.PersonalWorkbenchPreschoolEnglishVocab;
const loop = vocab.getDailyLoopBank();

const SHAPES = {
    me: { color: '#7ec8e3', d: 'M64 40c12 0 22 10 22 22s-10 22-22 22-22-10-22-22 10-22 22-22zm-18 52h36c10 16-6 28-18 28s-28-12-18-28z' },
    we: { color: '#8fd18b', d: 'M40 48c10 0 18 8 18 18s-8 18-18 18-18-8-18-18 8-18 18-18zm48 0c10 0 18 8 18 18s-8 18-18 18-18-8-18-18 8-18 18-18zM28 96h72c8 14-8 24-20 24H48c-12 0-28-10-20-24z' },
    my: { color: '#f2b6c6', d: 'M36 44h56l8 20H28zM40 68h48v36H40z' },
    go: { color: '#f0c14b', d: 'M28 64l56-24v48zM88 52h16v24H88z' },
    see: { color: '#7ec8e3', d: 'M20 64c16-24 72-24 88 0-16 24-72 24-88 0zm44-12a12 12 0 110 24 12 12 0 010-24z' },
    look: { color: '#7ec8e3', d: 'M24 64c14-22 66-22 80 0-14 22-66 22-80 0zm40-10a10 10 0 110 20 10 10 0 010-20zM96 36l8 12' },
    play: { color: '#f0c14b', d: 'M40 36l48 28-48 28z' },
    jump: { color: '#8fd18b', d: 'M40 96c8-28 20-44 28-44s12 8 20 8 12-16 20-8c-8 20-16 40-28 52H40z' },
    come: { color: '#c9a27e', d: 'M96 64L40 40v48zM24 52h16v24H24z' },
    help: { color: '#e07a5f', d: 'M56 28h16v28h28v16H72v28H56V72H28V56h28z' },
    big: { color: '#7aa2e3', d: 'M20 96h88L64 24z' },
    little: { color: '#7aa2e3', d: 'M48 88h32L64 56z' },
    up: { color: '#8fd18b', d: 'M64 24l32 40H32zM56 64h16v40H56z' },
    down: { color: '#8fd18b', d: 'M64 104L32 64h64zM56 24h16v40H56z' },
    one: { color: '#5c7350', d: 'M60 28h16v72H48v-12h12z' },
    two: { color: '#5c7350', d: 'M40 40c0-12 32-16 36 8-4 16-24 20-24 36h40v12H36V80c8-12 28-16 28-32 0-8-8-8-16-4z' },
    can: { color: '#e0ac3e', d: 'M44 36h40l8 64H36zM52 28h24v8H52z' },
    eat: { color: '#e07a5f', d: 'M36 28c8 20 8 48 0 72M52 28c0 24 16 32 16 56 0 12-8 16-16 16' },
    please: { color: '#f2b6c6', d: 'M40 56c0-16 36-16 36 8 0 20-16 24-16 40h-8c0-16-12-20-12-40z' },
    yes: { color: '#2d8748', d: 'M32 68l20 20 44-48' },
    good: { color: '#2d8748', d: 'M36 72c8 16 32 20 48 4 8-8 4-20-4-20-12 0-16 12-28 12s-16-16-24-8c-4 4-2 8 8 12z' },
    thank: { color: '#f2b6c6', d: 'M40 48c12-16 36-16 48 0-8 24-40 24-48 0zm8 36h32v16H48z' },
    walk: { color: '#c9a27e', d: 'M56 28a10 10 0 110 20 10 10 0 010-20zM48 52l-8 28 16 4 8-16 12 16 12-8-16-24z' },
    stop: { color: '#e07a5f', d: 'M40 28h48v16H40zM56 44h16v56H56z' },
    hello: { color: '#f0c14b', d: 'M40 56c0-20 48-20 48 8 0 20-16 28-24 28s-24-8-24-36zM52 92h24v12H52z' },
    goodbye: { color: '#7ec8e3', d: 'M28 48h28v8H36v32h20v8H28zM72 48h28v8H80v32h20v8H72z' },
    mom: { color: '#f2b6c6', d: 'M48 36c10 0 16 10 16 18s-6 16-16 16-16-8-16-16 6-18 16-18zm32 8c8 0 14 8 14 16s-6 14-14 14-14-6-14-14 6-16 14-16zM28 92c8-16 56-16 72 0v8H28z' },
    dad: { color: '#7aa2e3', d: 'M64 32c12 0 20 10 20 22s-8 20-20 20-20-8-20-20 8-22 20-22zM32 96c10-18 54-18 64 0v8H32z' },
    boy: { color: '#7aa2e3', d: 'M64 30c10 0 16 10 16 18s-6 16-16 16-16-8-16-16 6-18 16-18zM44 96c6-20 34-20 40 0v8H44z' },
    girl: { color: '#f2b6c6', d: 'M64 30c10 0 16 10 16 18s-6 16-16 16-16-8-16-16 6-18 16-18zM40 96c4-16 16-24 24-24s20 8 24 24z' },
    friend: { color: '#8fd18b', d: 'M44 40c8 0 14 8 14 16s-6 14-14 14-14-6-14-14 6-16 14-16zm40 0c8 0 14 8 14 16s-6 14-14 14-14-6-14-14 6-16 14-16zM28 96c8-16 28-16 36-6 8-10 28-10 36 6v8H28z' },
    family: { color: '#c9a27e', d: 'M40 44c8 0 12 8 12 14s-4 12-12 12-12-6-12-12 4-14 12-14zm48 0c8 0 12 8 12 14s-4 12-12 12-12-6-12-12 4-14 12-14zm-24 12c8 0 12 8 12 14s-4 12-12 12-12-6-12-12 4-14 12-14zM24 100c8-14 80-14 80 0v6H24z' },
    drink: { color: '#7ec8e3', d: 'M48 28h32l-6 72H54zM80 32h16v8H80z' },
    water: { color: '#7ec8e3', d: 'M64 24c20 28 28 44 28 56a28 28 0 11-56 0c0-12 8-28 28-56z' },
    juice: { color: '#f0c14b', d: 'M48 36h32l-4 64H52zM44 36h40v8H44z' },
    sun: { color: '#f0c14b', d: 'M64 40a24 24 0 110 48 24 24 0 010-48zM64 16v12M64 100v12M16 64h12M100 64h12M30 30l8 8M90 90l8 8M30 98l8-8M90 38l8-8' },
    moon: { color: '#c9d6e8', d: 'M72 28a32 32 0 100 64 26 26 0 110-64z' },
    tree: { color: '#2d8748', d: 'M64 20c24 8 28 36 8 48 16 4 20 20 0 28H56c-20-8-16-24 0-28-20-12-16-40 8-48zM58 96h12v16H58z' },
    school: { color: '#e07a5f', d: 'M20 68l44-28 44 28v40H20zM56 80h16v28H56z' },
    home: { color: '#e0ac3e', d: 'M20 64l44-32 44 32v44H20zM52 84h24v24H52z' }
};

function svgFor(word, shape) {
    const fill = shape.color || '#8fd18b';
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="256" height="256">
  <rect width="128" height="128" rx="28" fill="#fff8ee"/>
  <circle cx="20" cy="22" r="8" fill="#eef6d8"/>
  <circle cx="110" cy="18" r="6" fill="#ffe7b8"/>
  <path d="${shape.d}" fill="${fill}" stroke="#23422c" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
</svg>
`;
}

function defaultShape(word) {
    const palette = ['#8fd18b', '#7ec8e3', '#f0c14b', '#f2b6c6', '#e07a5f', '#c9a27e'];
    const color = palette[word.length % palette.length];
    return { color: color, d: 'M36 40h56v48H36zM52 28h24v12H52z' };
}

const vocabDir = path.join(repoRoot, 'prj', 'assets', 'img', 'vocab');
const genDir = path.join(repoRoot, 'prj', 'assets', 'generated', 'english-vocab');
fs.mkdirSync(vocabDir, { recursive: true });
fs.mkdirSync(genDir, { recursive: true });

const missing = [];
for (const item of loop) {
    const png = path.join(vocabDir, item.text + '.png');
    const svg = path.join(vocabDir, item.text + '.svg');
    const hasFile = fs.existsSync(png) || fs.existsSync(svg);
    if (hasFile) continue;
    const shape = SHAPES[item.text] || defaultShape(item.text);
    const body = svgFor(item.text, shape);
    fs.writeFileSync(svg, body);
    fs.writeFileSync(path.join(genDir, item.text + '.svg'), body);
    missing.push(item.text);
}

const bosses = {
    'goblin-king': { color: '#8fd18b', d: 'M40 44c0-16 48-16 48 8 0 16-8 24-16 28v8H56v-8c-8-4-16-12-16-28zm-8 56h64v12H32z' },
    'shadow-knight': { color: '#6b7b8c', d: 'M40 28h48l8 20H32zM44 48h40v44H44zM36 92h56v12H36z' },
    'dragon-lord': { color: '#e07a5f', d: 'M28 72c16-28 56-28 72 0-8 20-24 28-36 28s-28-8-36-28zm20-24 12-20 12 20z' },
    hero: { color: '#7aa2e3', d: 'M64 28c12 0 20 10 20 20s-8 20-20 20-20-10-20-20 8-20 20-20zM40 96c8-20 40-20 48 0v8H40z' },
    'skill-fire': { color: '#e07a5f', d: 'M64 24c16 20 24 36 24 52a24 24 0 11-48 0c0-16 8-32 24-52z' },
    'skill-zap': { color: '#f0c14b', d: 'M72 20L40 68h24L52 108l40-56H68z' },
    'skill-ice': { color: '#7ec8e3', d: 'M64 20v88M28 64h72M40 36l48 56M88 36L40 92' },
    'skill-heal': { color: '#8fd18b', d: 'M56 28h16v28h28v16H72v28H56V72H28V56h28z' },
    'eq-wood': { color: '#c9a27e', d: 'M36 88l48-48 8 8-48 48z' },
    'eq-dagger': { color: '#9aa4b2', d: 'M40 88l44-44 8 8-44 44zM36 92l8 8' },
    'eq-iron': { color: '#8a93a0', d: 'M32 84l52-52 12 12-52 52z' },
    'eq-axe': { color: '#c9842a', d: 'M40 36h36l-8 28H48zM60 64v40' },
    'eq-bow': { color: '#8fd18b', d: 'M36 24c32 16 32 64 0 80M36 24l56 40-56 40' },
    'eq-hammer': { color: '#6b7b8c', d: 'M40 28h48v24H40zM58 52h12v52H58z' },
    'bg-grass': { color: '#8fd18b', d: 'M0 80h128v48H0zM20 80c8-16 20-16 28 0M60 80c8-20 24-20 32 0M96 80c8-14 20-14 28 0' },
    'bg-castle': { color: '#c9a27e', d: 'M16 96h96v16H16zM24 48h20v48H24zM54 32h20v64H54zM84 48h20v48H84z' }
};

const bossDir = path.join(repoRoot, 'prj', 'assets', 'generated', 'wordboss', 'published');
fs.mkdirSync(bossDir, { recursive: true });
for (const [name, shape] of Object.entries(bosses)) {
    fs.writeFileSync(path.join(bossDir, name + '.svg'), svgFor(name, shape));
}

const manifest = {
    generatedAt: '2026-08-16',
    tool: 'project-svg-builder',
    license: 'project-original',
    vocab: missing.map((text) => ({ text: text, file: 'assets/img/vocab/' + text + '.svg' })),
    wordboss: Object.keys(bosses).map((name) => ({ id: name, file: 'assets/generated/wordboss/published/' + name + '.svg' }))
};
fs.writeFileSync(path.join(repoRoot, 'prj', 'assets', 'generated', 'english-vocab', 'manifest.json'), JSON.stringify(manifest, null, 2));
fs.writeFileSync(path.join(repoRoot, 'prj', 'assets', 'generated', 'wordboss', 'manifest.json'), JSON.stringify({ generatedAt: manifest.generatedAt, tool: manifest.tool, license: manifest.license, items: manifest.wordboss }, null, 2));
console.log(JSON.stringify({ createdVocab: missing.length, words: missing, wordboss: Object.keys(bosses).length }));
