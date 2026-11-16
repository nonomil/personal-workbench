(function (global) {
    'use strict';

    const IMAGE_ROOT = './assets/reused/learning/';

    function option(id, label) {
        return { id, label, image: `${IMAGE_ROOT}${id}.png` };
    }

    const OPTIONS = {
        hill: option('hill', '小山'),
        river: option('river', '小河'),
        flower: option('flower', '花朵'),
        fish: option('fish', '小鱼'),
        cat: option('cat', '小猫'),
        apple: option('apple', '苹果'),
        banana: option('banana', '香蕉'),
        dog: option('dog', '小狗')
    };

    const cards = [
        { id: 'hanzi-mountain', track: 'hanzi', key: '山', display: '山', prompt: '“山”是哪一张图？', answer: 'hill', speech: { kind: 'hanzi', text: '山', lang: 'zh-CN', rate: 0.78 }, options: [OPTIONS.hill, OPTIONS.river, OPTIONS.flower] },
        { id: 'word-apple', track: 'word', key: 'apple', display: 'apple', prompt: 'apple 是哪一张图？', answer: 'apple', speech: { kind: 'word', text: 'apple', lang: 'en-US', rate: 0.82 }, options: [OPTIONS.apple, OPTIONS.banana, OPTIONS.cat] },
        { id: 'hanzi-water', track: 'hanzi', key: '水', display: '水', prompt: '“水”是哪一张图？', answer: 'river', speech: { kind: 'hanzi', text: '水', lang: 'zh-CN', rate: 0.78 }, options: [OPTIONS.flower, OPTIONS.river, OPTIONS.hill] },
        { id: 'word-banana', track: 'word', key: 'banana', display: 'banana', prompt: 'banana 是哪一张图？', answer: 'banana', speech: { kind: 'word', text: 'banana', lang: 'en-US', rate: 0.82 }, options: [OPTIONS.cat, OPTIONS.apple, OPTIONS.banana] },
        { id: 'hanzi-flower', track: 'hanzi', key: '花', display: '花', prompt: '“花”是哪一张图？', answer: 'flower', speech: { kind: 'hanzi', text: '花', lang: 'zh-CN', rate: 0.78 }, options: [OPTIONS.river, OPTIONS.flower, OPTIONS.fish] },
        { id: 'word-dog', track: 'word', key: 'dog', display: 'dog', prompt: 'dog 是哪一张图？', answer: 'dog', speech: { kind: 'word', text: 'dog', lang: 'en-US', rate: 0.82 }, options: [OPTIONS.dog, OPTIONS.cat, OPTIONS.fish] },
        { id: 'hanzi-fish', track: 'hanzi', key: '鱼', display: '鱼', prompt: '“鱼”是哪一张图？', answer: 'fish', speech: { kind: 'hanzi', text: '鱼', lang: 'zh-CN', rate: 0.78 }, options: [OPTIONS.cat, OPTIONS.fish, OPTIONS.flower] },
        { id: 'word-cat', track: 'word', key: 'cat', display: 'cat', prompt: 'cat 是哪一张图？', answer: 'cat', speech: { kind: 'word', text: 'cat', lang: 'en-US', rate: 0.82 }, options: [OPTIONS.flower, OPTIONS.dog, OPTIONS.cat] },
        { id: 'hanzi-apple', track: 'hanzi', key: '苹', display: '苹', prompt: '“苹”是哪一张图？', answer: 'apple', speech: { kind: 'hanzi', text: '苹', lang: 'zh-CN', rate: 0.78 }, options: [OPTIONS.cat, OPTIONS.apple, OPTIONS.banana] },
        { id: 'word-flower', track: 'word', key: 'flower', display: 'flower', prompt: 'flower 是哪一张图？', answer: 'flower', speech: { kind: 'word', text: 'flower', lang: 'en-US', rate: 0.82 }, options: [OPTIONS.hill, OPTIONS.flower, OPTIONS.river] }
    ];

    global.VoxelLearningCards = Object.freeze({ cards: Object.freeze(cards.slice()) });
}(typeof window !== 'undefined' ? window : globalThis));
