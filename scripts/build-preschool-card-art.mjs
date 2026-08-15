import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const extracted = JSON.parse(fs.readFileSync(path.join(repoRoot, '.tmp-analysis', 'card-emoji-map.json'), 'utf8'));

const EXTRA = {
    pink: '🌸', purple: '💜', yellow: '💛', white: '⚪', brown: '🤎',
    bear: '🐻', bee: '🐝', butterfly: '🦋', chicken: '🐔', cow: '🐮', duck: '🦆',
    elephant: '🐘', fox: '🦊', frog: '🐸', giraffe: '🦒', horse: '🐴', monkey: '🐵',
    mouse: '🐭', pig: '🐷', rabbit: '🐰', sheep: '🐑', tiger: '🐯', snake: '🐍', turtle: '🐢',
    hair: '💇', cake: '🎂', candy: '🍬', cookie: '🍪', egg: '🥚', 'ice cream': '🍦',
    'ice-cream': '🍦', juice: '🧃', tea: '🍵', vegetable: '🥬', vegetables: '🥬', water: '💧',
    cloud: '☁️', rain: '🌧️', wind: '💨', rainy: '🌧️', cloudy: '☁️', sunny: '☀️', snowy: '❄️', windy: '🌬️',
    boy: '👦', girl: '👧', children: '🧒', man: '👨', woman: '👩', baby: '👶',
    birthday: '🎂', card: '🃏', class: '🏫', classroom: '🏫', classmate: '👫',
    'christmas': '🎄', 'christmas tree': '🎄', 'father christmas': '🎅', 'new year': '🎆',
    cola: '🥤', colour: '🎨', color: '🎨', computer: '💻', 'computer class': '💻',
    'cooking dinner': '🍳', 'cleaning the room': '🧹', 'dining room': '🍽️',
    'draw pictures': '🖍️', 'eat breakfast': '🍳', 'eat dinner': '🍽️', 'eat lunch': '🍱',
    'every day': '📅', everyone: '👨‍👩‍👧‍👦', favourite: '⭐', 'feeding the fish': '🐠',
    floor: '🪵', 'fly a kite': '🪁', 'fly kites': '🪁', 'for rent': '🏠',
    'go to bed': '🛏️', grade: '🎒', grass: '🌿', handsome: '😎', hospital: '🏥',
    'how old': '🎂', 'in one hour': '⏰', kick: '⚽', "let's": '🤝',
    'listening to music': '🎧', 'look for': '🔍', 'look forward to': '✨', lost: '😢',
    'make a model plane': '✈️', 'make a snowman': '⛄', meat: '🥩', merry: '😄',
    name: '🏷️', party: '🎉', pet: '🐾', 'play chess': '♟️', 'play sports': '🏅',
    'play with': '🧸', playground: '🛝', playtime: '🛝', potato: '🥔', present: '🎁',
    'read books': '📖', really: '😮', 'ride a bike': '🚲', room: '🚪', season: '🍂',
    'shopping list': '🛒', should: '👉', 'sing songs': '🎤', study: '📚', summary: '📝',
    supermarket: '🛒', 't-shirt': '👕', tail: '🐕', thanks: '🙏', 'the matter': '❓',
    thin: '📏', third: '🥉', second: '🥈', time: '⏰', toilet: '🚽', tomato: '🍅',
    tomorrow: '📆', tongue: '👅', twelve: '🕛', uncle: '👨', 'wake up': '⏰',
    'walking the dog': '🐕', 'watching tv': '📺', 'watch tv': '📺', 'water bottle': '🍼',
    'watering the plants': '🪴', wear: '👕', weather: '🌈', week: '📅', welcome: '🤗',
    wow: '🤩', year: '📆', zoo: '🦁', art: '🎨', autumn: '🍁', basketball: '🏀',
    bathroom: '🛁', bedroom: '🛏️', boat: '⛵', breakfast: '🥐', brother: '👦',
    "can't": '🙅', cheap: '💰', chinese: '🀄', coat: '🧥', coffee: '☕', cool: '😎',
    cough: '🤧', cute: '🥰', dad: '👨', dear: '💌', difficult: '🧩', dinner: '🍽️',
    easy: '😊', english: '🔤', evening: '🌆', expensive: '💎', family: '👨‍👩‍👧',
    fan: '🪭', fat: '🍩', father: '👨', fever: '🤒', fine: '👍', flower: '🌸',
    football: '⚽', fridge: '🧊', friend: '🤗', fruit: '🍎', 'get up': '⏰',
    glass: '🥛', gloves: '🧤', 'go home': '🏠', 'go skating': '⛸️', 'go swimming': '🏊',
    'go to school': '🏫', grandma: '👵', grandpa: '👴', grandfather: '👴', grandmother: '👵',
    great: '🌟', hamburger: '🍔', 'have lessons': '📘', headache: '🤕', hear: '👂',
    hill: '⛰️', home: '🏠', homework: '📝', ill: '🤒', jacket: '🧥', kitchen: '🍳',
    lake: '🏞️', leg: '🦵', lesson: '📘', 'living room': '🛋️', lunch: '🍱', mango: '🥭',
    match: '⚽', maths: '🔢', matter: '❓', mom: '👩', morning: '🌅', mother: '👩',
    music: '🎵', night: '🌙', park: '🏞️', pe: '🏃', picnic: '🧺', picture: '🖼️',
    pineapple: '🍍', 'play football': '⚽', river: '🌊', sad: '😢', salad: '🥗',
    sandwich: '🥪', school: '🏫', science: '🔬', shoes: '👟', sister: '👧', skate: '⛸️',
    snack: '🍪', sofa: '🛋️', speak: '🗣️', spring: '🌷', sticker: '⭐',
    'stomach ache': '🤢', student: '🧑‍🎓', subject: '📚', summer: '🌻', sure: '👌',
    sweater: '🧶', swim: '🏊', 'table tennis': '🏓', 'take care': '💝', teacher: '👩‍🏫',
    timetable: '📅', tired: '😴', tree: '🌳', trousers: '👖', umbrella: '☂️',
    usually: '🔁', whose: '🤷', winter: '⛄', wonderful: '🌈', yuan: '💴',
    behind: '🙈', body: '🧍', bookshop: '📚', library: '📚', age: '🧒',
    'after school': '🏫', bite: '😬', 'be back': '👋', ok: '👌',
    january: '📅', february: '📅', march: '📅', april: '📅', june: '📅', july: '📅',
    august: '📅', september: '📅', october: '📅', november: '📅', december: '📅',
    monday: '📅', tuesday: '📅', wednesday: '📅', thursday: '📅', friday: '📅',
    saturday: '📅', sunday: '📅',
    eleven: '1️⃣', thirteen: '1️⃣', fourteen: '1️⃣', fifteen: '1️⃣', sixteen: '1️⃣',
    seventeen: '1️⃣', eighteen: '1️⃣', nineteen: '1️⃣', thirty: '3️⃣', forty: '4️⃣', fifty: '5️⃣',
    ate: '🍽️', buy: '🛒', call: '📞', clean: '🧼', cold: '🥶', cut: '✂️',
    fall: '🍂', fast: '⚡', fly: '🕊️', grow: '🌱', hold: '🤲', hot: '🥵', hurt: '🩹',
    laugh: '😂', open: '📬', pick: '🌼', pretty: '💅', pull: '🪢', put: '📥',
    ran: '🏃', ride: '🚲', round: '🔵', saw: '👀', say: '💬', show: '👉',
    start: '🚦', stop: '🛑', take: '👜', think: '💭', today: '📆', together: '🤝',
    try: '💪', under: '⬇️', wash: '🧼', want: '🙋', warm: '🧣', work: '💼',
    wish: '🌠', come: '🚶', dance: '💃', draw: '🖍️', drink: '🥤', eat: '🍽️',
    find: '🔍', go: '🚶', help: '🤝', jump: '🦘', look: '👀', make: '🛠️',
    play: '🎮', read: '📖', run: '🏃', said: '💬', sing: '🎤', sit: '🪑',
    sleep: '😴', stand: '🧍', walk: '🚶', write: '✍️',
    bag: '🎒', ball: '⚽', bed: '🛏️', big: '🐘', bike: '🚲', blocks: '🧱',
    book: '📖', box: '📦', bubble: '🫧', bye: '👋', chair: '🪑', clock: '🕐',
    down: '⬇️', four: '4️⃣', hat: '🎩', here: '📍', hi: '👋', kite: '🪁',
    like: '❤️', little: '🐣', me: '😊', new: '✨', nice: '😊', nine: '9️⃣',
    okay: '👌', one: '1️⃣', pencil: '✏️', plane: '✈️', please: '🙏', puzzle: '🧩',
    ruler: '📏', schoolbag: '🎒', seven: '7️⃣', she: '👧', shirt: '👕', shoe: '👟',
    shorts: '🩳', six: '6️⃣', socks: '🧦', tall: '🦒', ten: '🔟', thank: '🙏',
    they: '👫', thirsty: '🥤', up: '⬆️', where: '📍',
    face: '😊', bad: '😟', blackboard: '⬛', cousin: '🧒',
    a: '🅰️', i: '😊', the: '👉', and: '➕', or: '🔀', is: '✅', are: '✅',
    am: '😊', can: '💪', do: '🙌', what: '❓', who: '👤', why: '🤔', when: '⏰',
    how: '❓', yes: '✅', no: '🚫', not: '🚫', good: '👍', happy: '😄'
};

const OVERRIDES = {
    face: '😊',
    bad: '😟',
    blackboard: '⬛',
    white: '⚪',
    classmate: '👫'
};

const wordMap = Object.assign({}, extracted.wordMap, EXTRA, OVERRIDES);

const file = `(function (global) {
    'use strict';

    const WORD_EMOJI = ${JSON.stringify(wordMap)};
    const THEME_EMOJI = {
        '颜色': '🎨', '动物': '🐾', '身体': '🧍', '食物': '🍎', '自然': '🌿', '学校': '🏫',
        '家人': '👨‍👩‍👧', '生活': '🏠', '高频词': '💬', '动作': '🏃', '物品': '🧸', '描述': '✨', '表达': '🗣️',
        life: '🏠', number: '🔢', self: '😊', quantity: '🔢', nature: '🌿', action: '🏃',
        school: '🏫', family: '👨‍👩‍👧', animal: '🐾', color: '🎨', body: '🧍', food: '🍎'
    };
    const CHAR_EMOJI = {
        '人': '🧑', '大': '🐘', '小': '🐣', '山': '⛰️', '水': '💧', '火': '🔥', '木': '🌳', '日': '☀️', '月': '🌙',
        '天': '🌤️', '雨': '🌧️', '风': '💨', '云': '☁️', '花': '🌸', '草': '🌿', '树': '🌳', '鸟': '🐦', '鱼': '🐟',
        '马': '🐴', '牛': '🐮', '羊': '🐑', '狗': '🐶', '猫': '🐱', '虫': '🐛', '口': '👄', '手': '✋', '足': '🦶',
        '目': '👀', '耳': '👂', '心': '❤️', '头': '🧑', '牙': '🦷', '米': '🍚', '饭': '🍚', '果': '🍎', '菜': '🥬',
        '茶': '🍵', '奶': '🥛', '家': '🏠', '门': '🚪', '车': '🚗', '船': '⛵', '书': '📖', '笔': '✏️', '学': '🎒',
        '校': '🏫', '爸': '👨', '妈': '👩', '爷': '👴', '奶': '👵', '哥': '👦', '姐': '👧', '弟': '👦', '妹': '👧',
        '我': '😊', '你': '👋', '他': '👦', '爱': '❤️', '好': '👍', '吃': '🍽️', '喝': '🥤', '走': '🚶', '跑': '🏃',
        '跳': '🦘', '看': '👀', '听': '👂', '说': '💬', '写': '✍️', '读': '📖', '玩': '🧸', '笑': '😄', '哭': '😢',
        '红': '🔴', '黄': '🟡', '蓝': '🔵', '绿': '🟢', '白': '⚪', '黑': '⬛', '一': '1️⃣', '二': '2️⃣', '三': '3️⃣',
        '四': '4️⃣', '五': '5️⃣', '六': '6️⃣', '七': '7️⃣', '八': '8️⃣', '九': '9️⃣', '十': '🔟', '春': '🌷', '夏': '🌻',
        '秋': '🍁', '冬': '⛄', '星': '⭐', '光': '✨', '电': '⚡', '石': '🪨', '土': '🟤', '田': '🌾', '金': '🥇',
        '银': '🥈', '衣': '👕', '帽': '🧢', '鞋': '👟', '床': '🛏️', '桌': '🪑', '椅': '🪑', '灯': '💡', '钟': '⏰',
        '球': '⚽', '歌': '🎤', '画': '🖼️', '诗': '📜', '字': '🔤', '词': '💬', '音': '🔊', '色': '🎨'
    };
    const PINYIN_KIND = { initial: '👄', final: '🎵', whole: '🔤' };
    const PINYIN_GROUP = { lips: '👄', tongue: '👅', teeth: '🦷', nose: '👃', throat: '🗣️' };
    const COLOR_FILL = {
        black: '#2b2b2b', blue: '#3d8be0', brown: '#a56a3a', green: '#3fa25c',
        orange: '#f09137', pink: '#f4a4c4', purple: '#8b6ad6', red: '#e25555',
        white: '#f7f7f7', yellow: '#f2c94c'
    };
    const KIND_BG = {
        english: '#e9f3ff', literacy: '#eefae4', pinyin: '#fff3e4', phonics: '#ffeef3',
        math: '#fff7dc', poetry: '#e9f3ff'
    };

    function keyOf(value) {
        return String(value || '').trim().toLowerCase();
    }

    function escapeXml(value) {
        return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function resolveEmoji(spec) {
        const text = keyOf(spec && (spec.text || spec.char || spec.main));
        if (WORD_EMOJI[text]) return WORD_EMOJI[text];
        const parts = text.split(/[\\s-]+/).filter(Boolean);
        for (let i = parts.length - 1; i >= 0; i -= 1) {
            if (WORD_EMOJI[parts[i]]) return WORD_EMOJI[parts[i]];
        }
        if (spec && spec.char && CHAR_EMOJI[spec.char]) return CHAR_EMOJI[spec.char];
        if (spec && spec.theme && THEME_EMOJI[spec.theme]) return THEME_EMOJI[spec.theme];
        if (spec && spec.kind === 'pinyin') return PINYIN_GROUP[spec.group] || PINYIN_KIND[spec.pinyinKind] || '🔤';
        if (spec && spec.kind === 'math') return '🔢';
        if (spec && spec.kind === 'poetry') return '📜';
        return THEME_EMOJI[(spec && spec.theme) || ''] || '⭐';
    }

    function frame(bg, inner) {
        return '<svg class="preschool-card-art" viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true"><rect width="160" height="160" rx="36" fill="' + bg + '"/>' + inner + '</svg>';
    }

    function emojiArt(emoji, bg) {
        return frame(bg, '<text x="80" y="104" text-anchor="middle" font-size="72">' + escapeXml(emoji) + '</text>');
    }

    function colorArt(text) {
        const fill = COLOR_FILL[text];
        if (!fill) return '';
        const stroke = text === 'white' ? '#c8d2c0' : '#ffffff';
        return frame('#fff7dc', '<circle cx="80" cy="80" r="48" fill="' + fill + '" stroke="' + stroke + '" stroke-width="8"/>');
    }

    function numberArt(value) {
        const count = Math.max(1, Math.min(10, Number(value) || 0));
        if (!count) return '';
        const dots = [];
        const cols = count <= 4 ? 2 : count <= 9 ? 3 : 4;
        const rows = Math.ceil(count / cols);
        const gap = 28;
        const startX = 80 - ((cols - 1) * gap) / 2;
        const startY = 80 - ((rows - 1) * gap) / 2;
        for (let i = 0; i < count; i += 1) {
            const x = startX + (i % cols) * gap;
            const y = startY + Math.floor(i / cols) * gap;
            dots.push('<circle cx="' + x + '" cy="' + y + '" r="10" fill="#f09137"/>');
        }
        return frame('#fff7dc', dots.join(''));
    }

    function render(spec) {
        const item = spec && typeof spec === 'object' ? spec : {};
        const text = keyOf(item.text || item.char || item.main);
        const bg = KIND_BG[item.kind] || '#eefae4';
        if (item.kind === 'english' || item.kind === 'phonics') {
            const swatch = colorArt(text);
            if (swatch) return swatch;
        }
        if (item.kind === 'math') {
            const match = String(item.main || item.text || item.answer || '').match(/\\d+/);
            if (match && Number(match[0]) <= 10) return numberArt(match[0]);
        }
        return emojiArt(resolveEmoji(item), bg);
    }

    global.PersonalWorkbenchPreschoolCardArt = {
        render: render,
        resolveEmoji: resolveEmoji
    };
})(typeof window !== 'undefined' ? window : globalThis);
`;

const out = path.join(repoRoot, 'prj', 'preschool-card-art.js');
fs.writeFileSync(out, file, 'utf8');
const covered = Object.keys(wordMap).length;
console.log(JSON.stringify({ out, bytes: file.length, wordKeys: covered }, null, 2));
