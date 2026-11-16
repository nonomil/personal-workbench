(function (global) {
    'use strict';

    const ROOT = './assets/reused/learning/';
    function option(id, label) { return { id, label, image: ROOT + id + '.png' }; }
    const image = {
        apple: option('apple', '苹果'), banana: option('banana', '香蕉'), cat: option('cat', '小猫'),
        dog: option('dog', '小狗'), fish: option('fish', '小鱼'), flower: option('flower', '花朵'),
        hill: option('hill', '小山'), river: option('river', '小河')
    };
    const cards = [
        { id: 'hanzi-mountain', track: 'hanzi', key: '山', display: '山', prompt: '“山”是哪一张图？', answer: 'hill', speech: { text: '山', lang: 'zh-CN', rate: 0.78 }, options: [image.hill, image.river, image.flower] },
        { id: 'word-apple', track: 'word', key: 'apple', display: 'apple', prompt: 'apple 是哪一张图？', answer: 'apple', speech: { text: 'apple', lang: 'en-US', rate: 0.82 }, options: [image.apple, image.banana, image.cat] },
        { id: 'hanzi-water', track: 'hanzi', key: '水', display: '水', prompt: '“水”是哪一张图？', answer: 'river', speech: { text: '水', lang: 'zh-CN', rate: 0.78 }, options: [image.flower, image.river, image.hill] },
        { id: 'word-banana', track: 'word', key: 'banana', display: 'banana', prompt: 'banana 是哪一张图？', answer: 'banana', speech: { text: 'banana', lang: 'en-US', rate: 0.82 }, options: [image.cat, image.apple, image.banana] },
        { id: 'hanzi-flower', track: 'hanzi', key: '花', display: '花', prompt: '“花”是哪一张图？', answer: 'flower', speech: { text: '花', lang: 'zh-CN', rate: 0.78 }, options: [image.river, image.flower, image.fish] },
        { id: 'word-dog', track: 'word', key: 'dog', display: 'dog', prompt: 'dog 是哪一张图？', answer: 'dog', speech: { text: 'dog', lang: 'en-US', rate: 0.82 }, options: [image.dog, image.cat, image.fish] },
        { id: 'hanzi-fish', track: 'hanzi', key: '鱼', display: '鱼', prompt: '“鱼”是哪一张图？', answer: 'fish', speech: { text: '鱼', lang: 'zh-CN', rate: 0.78 }, options: [image.cat, image.fish, image.flower] },
        { id: 'word-cat', track: 'word', key: 'cat', display: 'cat', prompt: 'cat 是哪一张图？', answer: 'cat', speech: { text: 'cat', lang: 'en-US', rate: 0.82 }, options: [image.flower, image.dog, image.cat] },
        { id: 'hanzi-apple', track: 'hanzi', key: '苹', display: '苹', prompt: '“苹”是哪一张图？', answer: 'apple', speech: { text: '苹', lang: 'zh-CN', rate: 0.78 }, options: [image.cat, image.apple, image.banana] },
        { id: 'word-flower', track: 'word', key: 'flower', display: 'flower', prompt: 'flower 是哪一张图？', answer: 'flower', speech: { text: 'flower', lang: 'en-US', rate: 0.82 }, options: [image.hill, image.flower, image.river] }
    ];

    global.PlatformLearningCards = Object.freeze({ cards: Object.freeze(cards) });
}(typeof window !== 'undefined' ? window : globalThis));
