(function (global) {
    'use strict';
    global.PersonalWorkbenchWordbossSkills = [
        { id: 'fire', name: '火球', damage: 12, cost: 0, effect: 'hit', art: '../../assets/generated/wordboss/published/skill-fire.svg' },
        { id: 'zap', name: '雷击', damage: 18, cost: 0, effect: 'hit', minLen: 4, art: '../../assets/generated/wordboss/published/skill-zap.svg' },
        { id: 'ice', name: '冰冻', damage: 8, cost: 0, effect: 'freeze', art: '../../assets/generated/wordboss/published/skill-ice.svg' },
        { id: 'heal', name: '治疗', damage: 0, heal: 16, cost: 0, effect: 'heal', art: '../../assets/generated/wordboss/published/skill-heal.svg' }
    ];
    global.PersonalWorkbenchWordbossEquips = [
        { id: 'wood', name: '木剑', bonus: 4, price: 20, art: '../../assets/generated/wordboss/published/eq-wood.svg' },
        { id: 'dagger', name: '匕首', bonus: 6, price: 30, art: '../../assets/generated/wordboss/published/eq-dagger.svg' },
        { id: 'iron', name: '铁剑', bonus: 10, price: 50, art: '../../assets/generated/wordboss/published/eq-iron.svg' },
        { id: 'axe', name: '战斧', bonus: 12, price: 70, art: '../../assets/generated/wordboss/published/eq-axe.svg' },
        { id: 'bow', name: '木弓', bonus: 8, price: 40, art: '../../assets/generated/wordboss/published/eq-bow.svg' },
        { id: 'hammer', name: '战锤', bonus: 14, price: 90, art: '../../assets/generated/wordboss/published/eq-hammer.svg' }
    ];
})(typeof window !== 'undefined' ? window : globalThis);
