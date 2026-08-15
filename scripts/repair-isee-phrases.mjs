import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bankPath = path.join(repoRoot, 'prj', 'data', 'preschool', '英语', 'vocabulary-bank.json');
const kinderPath = 'G:/StudyCode/卡片式单词学习游戏记忆系统/data/vocab/单词库_分级/01_幼儿园/幼儿园完整词库.js';

const MONTHS = new Set(['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']);
const PHRASE = {
    age: ['What is your age?', '你几岁了？'],
    'after school': ['I play after school.', '放学后我去玩。'],
    'be back': ['I will be back soon.', '我很快回来。'],
    birthday: ['Happy birthday!', '生日快乐！'],
    bite: ['Do not bite the apple.', '不要咬苹果。'],
    bookshop: ['We go to the bookshop.', '我们去书店。'],
    card: ['This is my card.', '这是我的卡片。'],
    christmas: ['Merry Christmas!', '圣诞快乐！'],
    'christmas tree': ['I see a Christmas tree.', '我看见一棵圣诞树。'],
    class: ['Our class is fun.', '我们班很好玩。'],
    'cleaning the room': ['I am cleaning the room.', '我在打扫房间。'],
    cola: ['I drink cola.', '我喝可乐。'],
    colour: ['What colour is it?', '这是什么颜色？'],
    'computer class': ['I have computer class.', '我有电脑课。'],
    'cooking dinner': ['Mom is cooking dinner.', '妈妈在做晚饭。'],
    delicious: ['The cake is delicious.', '蛋糕很好吃。'],
    'dining room': ['We eat in the dining room.', '我们在餐厅吃饭。'],
    'draw pictures': ['I like to draw pictures.', '我喜欢画画。'],
    'eat breakfast': ['I eat breakfast.', '我吃早饭。'],
    'eat dinner': ['I eat dinner.', '我吃晚饭。'],
    'eat lunch': ['I eat lunch.', '我吃午饭。'],
    'every day': ['I brush my teeth every day.', '我每天刷牙。'],
    everyone: ['Everyone is happy.', '大家都开心。'],
    'father christmas': ['Father Christmas is coming.', '圣诞老人来了。'],
    favourite: ['Red is my favourite.', '红色是我最喜欢的。'],
    'feeding the fish': ['I am feeding the fish.', '我在喂鱼。'],
    floor: ['Sit on the floor.', '坐在地板上。'],
    'fly a kite': ['I fly a kite.', '我放风筝。'],
    'for rent': ['This house is for rent.', '这房子在出租。'],
    grade: ['I am in this grade.', '我在这个年级。'],
    handsome: ['He is handsome.', '他很帅。'],
    kick: ['Kick the ball.', '踢球。'],
    'listening to music': ['I am listening to music.', '我在听音乐。'],
    'look for': ['I look for my bag.', '我在找书包。'],
    'look forward to': ['I look forward to playtime.', '我盼着课间。'],
    'make a model plane': ['I make a model plane.', '我做飞机模型。'],
    'make a snowman': ['We make a snowman.', '我们堆雪人。'],
    man: ['The man is tall.', '那个男人很高。'],
    meat: ['I do not eat meat.', '我不吃肉。'],
    merry: ['Merry Christmas!', '圣诞快乐！'],
    'new year': ['Happy New Year!', '新年快乐！'],
    party: ['We have a party.', '我们开派对。'],
    'play chess': ['Dad can play chess.', '爸爸会下棋。'],
    'play sports': ['I play sports.', '我做运动。'],
    'play with': ['Come play with me.', '来和我玩。'],
    present: ['This present is for you.', '这个礼物给你。'],
    'read books': ['I read books.', '我看书。'],
    'ride a bike': ['I ride a bike.', '我骑自行车。'],
    'shopping list': ['This is my shopping list.', '这是购物单。'],
    'sing songs': ['We sing songs.', '我们唱歌。'],
    study: ['I study at home.', '我在家学习。'],
    summary: ['This is a short summary.', '这是一小段总结。'],
    tail: ['The dog has a tail.', '狗有尾巴。'],
    thanks: ['Thanks for your help.', '谢谢你帮忙。'],
    thin: ['The cat is thin.', '这只猫很瘦。'],
    'walking the dog': ['I am walking the dog.', '我在遛狗。'],
    'watching tv': ['I am watching TV.', '我在看电视。'],
    'watering the plants': ['I am watering the plants.', '我在浇花。'],
    woman: ['The woman is kind.', '那位阿姨很好。'],
    year: ['This is a new year.', '这是新的一年。'],
    basketball: ['I play basketball.', '我打篮球。'],
    bathroom: ['Wash hands in the bathroom.', '在卫生间洗手。'],
    bedroom: ['This is my bedroom.', '这是我的卧室。'],
    cheap: ['This book is cheap.', '这本书很便宜。'],
    coffee: ['Dad drinks coffee.', '爸爸喝咖啡。'],
    cough: ['I have a cough.', '我咳嗽了。'],
    dear: ['Dear mom, I love you.', '亲爱的妈妈，我爱你。'],
    difficult: ['This is difficult.', '这个有点难。']
};

const kinderCode = fs.readFileSync(kinderPath, 'utf8');
const kinderCtx = {};
vm.runInNewContext(kinderCode + '\nthis.list = MERGED_KINDERGARTEN_VOCAB;', kinderCtx);
const kinder = new Map();
for (const card of kinderCtx.list || []) {
    const key = String(card.standardized || card.word || '').toLowerCase().trim();
    if (!key || kinder.has(key)) continue;
    kinder.set(key, {
        phrase: String(card.phrase || '').trim(),
        phraseZh: String(card.phraseTranslation || '').trim()
    });
}

function isFake(phrase, text) {
    const p = String(phrase || '').trim();
    const t = String(text || '').trim();
    if (p.toLowerCase() === t.toLowerCase()) return true;
    const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('^I see an? ' + escaped + '\\.?$', 'i').test(p);
}

function titleCase(text) {
    return String(text || '').replace(/\b\w/g, (ch) => ch.toUpperCase());
}

const bank = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
let fixed = 0;
for (const item of bank) {
    const key = String(item.text || '').toLowerCase().trim();
    if (key === 'age') item.theme = '生活';
    if (!isFake(item.phrase, item.text)) continue;
    const forced = PHRASE[key];
    const ref = kinder.get(key);
    if (forced) {
        item.phrase = forced[0];
        item.phraseZh = forced[1];
    } else if (ref && ref.phrase && ref.phrase.toLowerCase().includes(key.split(' ')[0]) && !/^I see an? /i.test(ref.phrase)) {
        item.phrase = /[.!?]$/.test(ref.phrase) ? ref.phrase : ref.phrase + '.';
        item.phraseZh = ref.phraseZh || ('这是' + (item.zh || key) + '。');
    } else if (MONTHS.has(key)) {
        item.phrase = 'My birthday is in ' + titleCase(key) + '.';
        item.phraseZh = '我的生日在' + (item.zh || titleCase(key)) + '。';
    } else if (/\s/.test(key)) {
        item.phrase = 'I ' + key + '.';
        item.phraseZh = '我' + (item.zh || key) + '。';
    } else {
        const article = /^[aeiou]/.test(key) ? 'an' : 'a';
        item.phrase = 'This is ' + article + ' ' + key + '.';
        item.phraseZh = '这是' + (item.zh || key) + '。';
    }
    if (!item.phrase.toLowerCase().includes(key)) {
        item.phrase = 'I know ' + key + '.';
        item.phraseZh = '我认识' + (item.zh || key) + '。';
    }
    fixed += 1;
}

fs.writeFileSync(bankPath, JSON.stringify(bank, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ total: bank.length, fixed }, null, 2));
