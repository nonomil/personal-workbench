import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bankPath = path.join(repoRoot, 'prj', 'data', 'preschool', '英语', 'vocabulary-bank.json');
const kinderPath = 'G:/StudyCode/卡片式单词学习游戏记忆系统/data/vocab/单词库_分级/01_幼儿园/幼儿园完整词库.js';

const ZH = {
    aunt: '阿姨',
    uncle: '叔叔',
    grandfather: '爷爷',
    grandmother: '奶奶',
    cousin: '表亲',
    behind: '在后面',
    children: '孩子们',
    feet: '脚',
    lost: '丢了',
    playtime: '课间休息',
    'the matter': '怎么了',
    should: '应该',
    really: '真的',
    second: '第二',
    third: '第三',
    'wake up': '起床',
    card: '卡片',
    class: '班级',
    bad: '不好',
    merry: '开心',
    party: '派对',
    potato: '土豆',
    rainy: '下雨',
    cloudy: '多云',
    snowy: '下雪',
    windy: '有风',
    delicious: '好吃',
    'listening to music': '听音乐',
    "let's": '我们一起',
    ok: '好的',
    wow: '哇',
    'play with': '一起玩',
    or: '或者',
    art: '美术',
    chinese: '中文',
    evening: '傍晚',
    snack: '点心',
    clean: '干净',
    tomato: '番茄',
    toilet: '厕所',
    'water bottle': '水壶',
    sunny: '晴天',
    cap: '帽子',
    cookie: '饼干',
    orange: '橙子',
    dress: '连衣裙',
    skirt: '裙子',
    desk: '书桌',
    happy: '开心',
    sad: '难过'
};

const PHRASE = {
    or: ['Do you want red or blue?', '你要红色还是蓝色？'],
    aunt: ['This is my aunt.', '这是我的阿姨。'],
    uncle: ['This is my uncle.', '这是我的叔叔。'],
    grandfather: ['I love my grandfather.', '我爱我的爷爷。'],
    grandmother: ['I love my grandmother.', '我爱我的奶奶。'],
    cousin: ['He is my cousin.', '他是我的表亲。'],
    behind: ['The cat is behind the box.', '猫在盒子后面。'],
    children: ['The children are playing.', '孩子们在玩。'],
    feet: ['I have two feet.', '我有两只脚。'],
    lost: ['I lost my hat.', '我把帽子弄丢了。'],
    playtime: ['It is playtime now.', '现在是课间休息。'],
    'the matter': ['What is the matter?', '怎么了？'],
    should: ['We should wash hands.', '我们应该洗手。'],
    really: ['Is it really true?', '这是真的吗？'],
    second: ['I am in second place.', '我是第二名。'],
    third: ['This is the third book.', '这是第三本书。'],
    'wake up': ['I wake up in the morning.', '我早上起床。'],
    ok: ['OK, I can help.', '好的，我可以帮忙。'],
    wow: ['Wow, a big rainbow!', '哇，好大的彩虹！']
};

const kinderCode = fs.readFileSync(kinderPath, 'utf8');
const kinderCtx = {};
vm.runInNewContext(kinderCode + '\nthis.list = MERGED_KINDERGARTEN_VOCAB;', kinderCtx);
const kinder = new Map();
for (const card of kinderCtx.list || []) {
    const key = String(card.standardized || card.word || '').toLowerCase().trim();
    if (!key || kinder.has(key)) continue;
    kinder.set(key, {
        zh: String(card.chinese || '').trim(),
        phrase: String(card.phrase || '').trim(),
        phraseZh: String(card.phraseTranslation || '').trim()
    });
}

function kidZh(text) {
    return String(text || '')
        .replace(/（的复数）|（复数）|的过去式|（2nd）|（3rd）/g, '')
        .replace(/[；;].*$/, '')
        .replace(/[（(].*?[）)]/g, '')
        .replace(/……/g, '')
        .replace(/^在或向后面$/, '在后面')
        .trim();
}

const bank = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
let zhFixed = 0;
let phraseFixed = 0;
for (const item of bank) {
    const key = String(item.text || '').toLowerCase().trim();
    const ref = kinder.get(key);
    const override = ZH[key];
    const nextZh = override || (item.zh && /[；…（）()]|的复数|课件/.test(item.zh) ? (ref && ref.zh) || kidZh(item.zh) : item.zh);
    if (nextZh && nextZh !== item.zh) {
        item.zh = nextZh;
        zhFixed += 1;
    }
    const same = String(item.phrase || '').trim().toLowerCase() === key;
    const forced = PHRASE[key];
    if (forced) {
        item.phrase = forced[0];
        item.phraseZh = forced[1];
        phraseFixed += 1;
    } else if (same && ref && ref.phrase && ref.phrase.toLowerCase() !== key && ref.phrase.toLowerCase().includes(key.split(' ')[0])) {
        item.phrase = ref.phrase.endsWith('.') || ref.phrase.endsWith('!') || ref.phrase.endsWith('?') ? ref.phrase : ref.phrase + '.';
        item.phraseZh = ref.phraseZh || item.zh;
        phraseFixed += 1;
    } else if (same) {
        const word = item.text;
        item.phrase = /^(i|we|you|they|he|she|it|this|that|what|where|when|who|how|do|can|let)/i.test(word)
            ? word.charAt(0).toUpperCase() + word.slice(1) + ' is a useful word.'
            : 'I see ' + (/^[aeiou]/.test(word) ? 'an ' : 'a ') + word + '.';
        item.phraseZh = '我看见' + (item.zh || word) + '。';
        phraseFixed += 1;
    }
    if (item.theme === '学校' && /aunt|uncle|grandfather|grandmother|cousin/.test(key)) {
        item.theme = '家人';
    }
}

fs.writeFileSync(bankPath, JSON.stringify(bank, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ total: bank.length, zhFixed, phraseFixed }, null, 2));
