import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const wqRoot = path.join(repoRoot, 'prj', 'assets', 'vocab', 'wordquest-vocab-2026.08.15');
const outBank = path.join(repoRoot, 'prj', 'data', 'preschool', '英语', 'minecraft-bank.json');
const imgDir = path.join(repoRoot, 'prj', 'assets', 'img', 'vocab-mc');
const audioDir = path.join(repoRoot, 'prj', 'assets', 'audio', 'vocab-mc');
const indexPath = path.join(repoRoot, 'prj', 'data', 'preschool', 'banks-index.json');

const THEME_ZH = {
    biome: '生物群系',
    block: '方块',
    color: '颜色',
    food: '食物',
    item: '物品',
    mob: '生物',
    place: '地点',
    plant: '植物',
    tool: '工具',
    advancement: '成就',
    effect: '效果',
    structure: '建筑',
    weapon: '武器'
};

const EXAMPLE_ZH = {
    'A X crosses the bridge slowly.': '一只X慢慢走过桥。',
    'A X path leads to the garden.': '一条X小路通向花园。',
    'A X rests beside the river.': '一只X在河边休息。',
    'A glowing icon shows the X.': '发光的图标标出了X。',
    'A path winds around the X.': '小路绕着X弯过去。',
    'A torch shines on the X at night.': '夜里火把照亮了X。',
    'I check the X before entering the cave.': '进洞前我先检查X。',
    'I check the X before leaving camp.': '离开营地前我先检查X。',
    'I check the X beside the campfire.': '我在篝火旁检查X。',
    'I collect the X before sunset.': '日落前我把X收好。',
    'I count the X before we start building.': '开工前我先数一数X。',
    'I eat the X beside the warm fire.': '我在暖和的火堆旁吃X。',
    'I find the X beside the crafting table.': '我在工作台旁边找到X。',
    'I hold the X when night falls.': '天黑时我拿着X。',
    'I leave food for the X.': '我给X留一点食物。',
    'I lend the X to my teammate.': '我把X借给队友。',
    'I notice the X during the challenge.': '挑战时我注意到X。',
    'I pick up the X near the path.': '我在小路边捡起X。',
    'I place the X beside the doorway.': '我把X放在门口。',
    'I place the X in my adventure chest.': '我把X放进冒险箱子。',
    'I plant the X beside the farm.': '我在农场边种下X。',
    'I plant the X near the village well.': '我在村子水井旁种下X。',
    'I put the X in the camp chest.': '我把X放进营地箱子。',
    'I replace the broken X near camp.': '我在营地旁换掉坏掉的X。',
    'I return the X after the mission.': '任务结束后我把X还回去。',
    'I share the X with my teammate.': '我和队友一起用X。',
    'I show the X to my teammate at camp.': '我在营地把X给队友看。',
    'I spot a X near the village.': '我在村子附近看见X。',
    'I stack the X to make a small wall.': '我把X叠成一堵小墙。',
    'I use the X during our mission.': '任务里我用到了X。',
    'I use the X to gather materials.': '我用X去收集材料。',
    'I water the X in the morning.': '早上我给X浇水。',
    'My teammate passes me the X.': '队友把X递给我。',
    'Our camp sits at the edge of the X.': '我们的营地在X边上。',
    'Our map marks a X nearby.': '地图上标着附近有X。',
    'Our team earns X today.': '今天我们队得到了X。',
    'Rain falls softly on the X.': '雨轻轻落在X上。',
    'Rain helps the X grow.': '雨水帮助X长大。',
    'The X fades after a short time.': '过一会儿X就消失了。',
    'The X fills my hunger bar.': 'X让我填饱肚子。',
    'The X follows us along the path.': 'X跟着我们走在路上。',
    'The X gives our base a new shape.': 'X让基地有了新样子。',
    'The X gives our garden a bright color.': 'X让花园更鲜艳。',
    'The X helps me cross the cave.': 'X帮我穿过山洞。',
    'The X helps us finish the small task.': 'X帮我们做完这件小事。',
    'The X helps us reach the high ledge.': 'X帮我们爬上高台。',
    'The X hides behind a tree.': 'X躲在树后面。',
    'The X is full of new plants to discover.': 'X里有很多新植物可以看。',
    'The X is ready for our next adventure.': 'X已经准备好下一次冒险。',
    'The X keeps our little house strong.': 'X让小屋更结实。',
    'The X makes the garden feel cheerful.': 'X让花园看起来很开心。',
    'The X protects our team on the trail.': 'X在路上保护着我们。',
    'The X stays in its display frame.': 'X待在展示框里。',
    'The X stays safe in my backpack.': 'X安全地待在我的背包里。',
    'The X torch glows beside the door.': 'X火把在门边发着光。',
    'The X visits our camp at dawn.': '天亮时X来到我们的营地。',
    'The builder stores the X in a chest.': '建造的人把X放进箱子。',
    'The potion gives me X.': '这瓶药水给了我X。',
    'We build a lookout in the X.': '我们在X里建了一个瞭望台。',
    'We build a safe step with the X.': '我们用X搭出安全的台阶。',
    'We choose X wool for the cozy room.': '我们选X羊毛布置温暖的房间。',
    'We choose the X for a careful rescue.': '这次小心救援我们选了X。',
    'We choose the X for the garden wall.': '花园围墙我们选用X。',
    'We discover the X beyond the river.': '我们在河对岸发现了X。',
    'We draw the X in our adventure book.': '我们把X画进冒险本。',
    'We enter the X with bright torches.': '我们举着亮火把走进X。',
    'We explore the X after breakfast.': '吃完早饭我们去探索X。',
    'We hear a X behind the trees.': '树后面传来X的声音。',
    'We keep the X in a quiet corner.': '我们把X放在安静的角落。',
    'We listen for new sounds in the X.': '我们在X里听有没有新声音。',
    'We make a picnic with the X.': '我们用X做一次野餐。',
    'We make a small path with the X.': '我们用X铺出一条小路。',
    'We mark the X on our map.': '我们在地图上标出X。',
    'We prepare the X before sunset.': '日落前我们把X准备好。',
    'We save the X for the long walk.': '我们把X留给走远路的时候。',
    'We share the X when the team needs it.': '队友需要时我们一起用X。',
    'We use the X to mark the path home.': '我们用X标出回家的路。'
};

const PHRASE_ZH = {
    'X wool': 'X羊毛',
    'complete X': '完成X',
    'eat X': '吃X',
    'explore the X': '去探索X',
    'find a X': '找到一个X',
    'get the X effect': '获得X效果',
    'grow X': '种下X',
    'near the X': '在X旁边',
    'place X': '放好X',
    'spot a X': '看见X',
    'use a X': '用一把X',
    'use the X': '用一用X'
};

function escapeWord(word) {
    return String(word || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function templatize(text, word) {
    return String(text || '').replace(new RegExp(escapeWord(word), 'ig'), 'X');
}

function fillTemplate(template, word) {
    return String(template || '').replace(/X/g, word);
}

function slug(word) {
    return String(word || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'word';
}

function resetDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
    for (const name of fs.readdirSync(dir)) {
        fs.rmSync(path.join(dir, name), { force: true });
    }
}

const catalog = JSON.parse(fs.readFileSync(path.join(wqRoot, 'catalog.json'), 'utf8'));
const cards = (catalog.cards || []).filter((card) => {
    return String(card.stage || '').toLowerCase() === 'minecraft'
        && (Number(card.difficulty) === 1 || Number(card.difficulty) === 2);
});
if (cards.length !== 324) throw new Error('expected 324 difficulty 1-2 minecraft cards, got ' + cards.length);

resetDir(imgDir);
resetDir(audioDir);

const seen = new Set();
const bank = [];
for (const card of cards) {
    const text = String(card.word || '').trim().toLowerCase();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    const exampleTpl = templatize(card.example, card.word);
    const phraseTpl = templatize(card.phrase, card.word);
    if (!EXAMPLE_ZH[exampleTpl]) throw new Error('missing example zh for: ' + exampleTpl);
    if (!PHRASE_ZH[phraseTpl]) throw new Error('missing phrase zh for: ' + phraseTpl);
    const imageName = slug(text) + '.png';
    const imageRel = 'assets/img/vocab-mc/' + imageName;
    const imageSrc = path.join(wqRoot, card.image || '');
    if (!fs.existsSync(imageSrc)) throw new Error('missing image ' + card.image);
    fs.copyFileSync(imageSrc, path.join(imgDir, imageName));
    let audioRel = '';
    if (card.audio) {
        const audioName = slug(text) + '.mp3';
        const audioSrc = path.join(wqRoot, card.audio);
        if (!fs.existsSync(audioSrc)) throw new Error('missing audio ' + card.audio);
        fs.copyFileSync(audioSrc, path.join(audioDir, audioName));
        audioRel = 'assets/audio/vocab-mc/' + audioName;
    }
    bank.push({
        id: 'mc-' + slug(text),
        kind: 'english',
        text: text,
        zh: String(card.translation || '').trim(),
        theme: THEME_ZH[card.category] || '物品',
        level: Number(card.difficulty) === 1 ? 'MC-D1' : 'MC-D2',
        phrase: String(card.example || '').trim(),
        phraseZh: fillTemplate(EXAMPLE_ZH[exampleTpl], text),
        media: {
            image: imageRel,
            art: 'none',
            audio: audioRel
        },
        source: 'wordquest-mc',
        extra: {
            category: String(card.category || ''),
            group: fillTemplate(PHRASE_ZH[phraseTpl], text),
            groupEn: String(card.phrase || '').trim()
        }
    });
}

bank.sort((a, b) => {
    if (a.level !== b.level) return a.level.localeCompare(b.level);
    if (a.theme !== b.theme) return a.theme.localeCompare(b.theme, 'zh');
    return a.text.localeCompare(b.text);
});

if (bank.length !== 324) throw new Error('unique minecraft words must stay 324, got ' + bank.length);
fs.mkdirSync(path.dirname(outBank), { recursive: true });
fs.writeFileSync(outBank, JSON.stringify(bank, null, 2) + '\n', 'utf8');

const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
const levels = { 'MC-D1': 0, 'MC-D2': 0 };
for (const row of bank) levels[row.level] += 1;
const entry = {
    id: 'minecraft',
    kind: 'english',
    path: '英语/minecraft-bank.json',
    count: 324,
    expected: 324,
    schemaVersion: 1,
    levels: levels
};
index.banks = (index.banks || []).filter((item) => item.id !== 'minecraft').concat([entry]);
fs.writeFileSync(indexPath, JSON.stringify(index, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ count: bank.length, levels: levels, audio: bank.filter((row) => row.media.audio).length }, null, 2));
