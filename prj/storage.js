(function (global) {
    'use strict';

    const config = global.PersonalWorkbenchConfig || {};
    const variant = config.variant || 'adult';
    const STORAGE_KEY = config.current && config.current.storageKey ? config.current.storageKey : 'petbank_huchuliang_workbench_state_v1';
    const SCHEMA_VERSION = 6;
    const PRESCHOOL_DAY_PLAN_VERSION = 3;
    const PRESCHOOL_THEME_IDS = ['garden-defense', 'voxel-adventure', 'platform-quest'];
    const PRESCHOOL_DAILY_ITEMS = [
        { id: 'story', title: '完成今日识字', category: '识字', priority: 'high', minutes: 10, required: true, initialDone: true, initialProgress: 40, practiceLessonId: 'preschool-chinese-1' },
        { id: 'count', title: '朗读一首古诗', category: '古诗', priority: 'high', minutes: 10, required: true, initialDone: false, initialProgress: 0, practiceLessonId: 'preschool-poetry-1' },
        { id: 'hello', title: '数学闯关一关', category: '数学', priority: 'high', minutes: 10, required: true, initialDone: false, initialProgress: 0, practiceLessonId: 'preschool-math-1' },
        { id: 'draw', title: '学习今日英语', category: '英语', priority: 'medium', minutes: 8, required: false, initialDone: false, initialProgress: 0, practiceLessonId: 'preschool-english-phonics-1' },
        { id: 'move', title: '做一项运动', category: '运动', priority: 'low', minutes: 15, required: false, initialDone: false, initialProgress: 0, practiceLessonId: '' },
        { id: 'tidy', title: '专注力训练一题', category: '专注', priority: 'medium', minutes: 10, required: false, initialDone: false, initialProgress: 0, practiceLessonId: 'preschool-focus-1' }
    ];

    function normalizePreschoolTheme(value) {
        const candidate = String(value || '').trim();
        return PRESCHOOL_THEME_IDS.includes(candidate) ? candidate : 'garden-defense';
    }

    function localDate(date) {
        const value = date instanceof Date ? date : new Date(date || Date.now());
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, '0');
        const day = String(value.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function dateOffset(days) {
        const value = new Date();
        value.setDate(value.getDate() + days);
        return localDate(value);
    }

    function createId(prefix) {
        if (global.crypto && typeof global.crypto.randomUUID === 'function') {
            return `${prefix}-${global.crypto.randomUUID()}`;
        }
        return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function createPreschoolTasks(now, date) {
        return PRESCHOOL_DAILY_ITEMS.map(function (item) {
            return {
                id: `preschool-task-${item.id}`,
                title: item.title,
                category: item.category,
                required: item.required,
                status: item.initialDone ? 'done' : 'todo',
                priority: item.priority,
                progress: item.initialDone ? 100 : item.initialProgress,
                dueDate: date,
                estimateMinutes: item.minutes,
                createdAt: now,
                completedAt: item.initialDone ? now : null
            };
        });
    }

    function createPreschoolPlans(now, date, initialState) {
        return PRESCHOOL_DAILY_ITEMS.map(function (item, index) {
            const done = initialState && Object.prototype.hasOwnProperty.call(initialState, item.id) ? Boolean(initialState[item.id]) : Boolean(item.initialDone);
            return {
                id: `preschool-plan-${item.id}`,
                date: date,
                title: item.title,
                category: item.category,
                required: item.required,
                practiceLessonId: item.practiceLessonId || '',
                completionSource: done ? 'seed' : '',
                completionRewardId: '',
                done: done,
                order: index + 1,
                createdAt: now,
                completedAt: done ? now : null
            };
        });
    }

    function getPreschoolPlanRewardId(plan) {
        if (!plan || !plan.id || !plan.date) return '';
        return `plan:${plan.id}:${plan.date}`;
    }

    function createGrowthSeed() {
        let growth;
        if (global.PersonalWorkbenchChildGrowth && typeof global.PersonalWorkbenchChildGrowth.createDefaultGrowth === 'function') {
            growth = global.PersonalWorkbenchChildGrowth.createDefaultGrowth();
        } else {
            growth = {
                sunlight: 0,
                totalSunlightEarned: 0,
                awardedIds: [],
                claimedRewardIds: [],
                checkinDates: [],
                claimedStreakRewardIds: [],
                voiceEnabled: false,
                plant: { stage: 0, waterCount: 0, lastWateredDate: '' },
                unicorn: { name: '星芒', xp: 0, level: 1, activeStyleId: 'style-classic', unlockedStyleIds: ['style-classic'] },
                zombie: { active: false, defeated: 0, lastSpawnDate: '' }
            };
        }
        if (variant === 'preschool' && global.PersonalWorkbenchPreschoolGarden && typeof global.PersonalWorkbenchPreschoolGarden.normalize === 'function') {
            return global.PersonalWorkbenchPreschoolGarden.normalize(growth);
        }
        return growth;
    }

    function preschoolTaskTemplateById(id) {
        const key = String(id || '');
        if (key.startsWith('preschool-task-')) return PRESCHOOL_DAILY_ITEMS.find(item => `preschool-task-${item.id}` === key) || null;
        if (key.startsWith('preschool-plan-')) return PRESCHOOL_DAILY_ITEMS.find(item => `preschool-plan-${item.id}` === key) || null;
        return null;
    }

    function synchronizePreschoolTemplates(state) {
        if (variant !== 'preschool') return state;
        state.tasks = state.tasks.map(function (item) {
            const template = preschoolTaskTemplateById(item.id);
            if (!template) return item;
            return Object.assign({}, item, {
                // The seed catalog supplies defaults only. Once a child or parent
                // edits a task, the snapshot is the source of truth and must win
                // over the historical template.
                title: typeof item.title === 'string' && item.title.trim() ? item.title : template.title,
                category: typeof item.category === 'string' && item.category.trim() ? item.category : template.category,
                required: typeof item.required === 'boolean' ? item.required : template.required,
                priority: item.priority || template.priority,
                estimateMinutes: Number(item.estimateMinutes) > 0 ? item.estimateMinutes : template.minutes
            });
        });
        state.dailyPlans = state.dailyPlans.map(function (item, index) {
            const template = preschoolTaskTemplateById(item.id);
            if (!template) return item;
            return Object.assign({}, item, {
                // Do not re-seed titles, categories, required flags, or order on
                // every save. Those fields are intentionally editable/deletable.
                title: typeof item.title === 'string' && item.title.trim() ? item.title : template.title,
                category: typeof item.category === 'string' && item.category.trim() ? item.category : template.category,
                required: typeof item.required === 'boolean' ? item.required : template.required,
                practiceLessonId: typeof item.practiceLessonId === 'string' ? item.practiceLessonId : (template.practiceLessonId || ''),
                completionSource: typeof item.completionSource === 'string' ? item.completionSource : '',
                completionRewardId: typeof item.completionRewardId === 'string' ? item.completionRewardId : '',
                order: Number(item.order) > 0 ? item.order : index + 1
            });
        });
        return state;
    }

    function createAdultSeed(now) {
        if (variant !== 'adult') {
            return { language: 'zh-CN', lifeEntries: [], habits: [], milestones: [], archive: [] };
        }
        const today = localDate();
        return {
            language: 'zh-CN',
            lifeEntries: [
                { id: 'life-learning', area: '学习', title: '整理本周学习材料', note: '把正在看的文章、课程和下一步放在一个入口。', status: 'active', date: today, attachments: [], createdAt: now, updatedAt: now },
                { id: 'life-fitness', area: '健身', title: '本周完成 3 次有氧训练', note: '先安排时间，再追求强度。', status: 'active', date: dateOffset(5), attachments: [], createdAt: now, updatedAt: now },
                { id: 'life-beauty', area: '美妆护肤', title: '晚间护肤流程', note: '洁面 → 保湿 → 记录皮肤状态。', status: 'planned', date: today, attachments: [], createdAt: now, updatedAt: now },
                { id: 'life-finance', area: '理财', title: '完成本月预算复盘', note: '先看固定支出，再决定可自由分配的金额。', status: 'planned', date: dateOffset(7), attachments: [], createdAt: now, updatedAt: now },
                { id: 'life-shopping', area: '购物', title: '补充日常消耗品', note: '只买清单上的东西。', status: 'planned', date: dateOffset(2), attachments: [], createdAt: now, updatedAt: now },
                { id: 'life-inspiration', area: '灵感', title: '记录一个可验证的想法', note: '灵感先留下，周末再判断是否值得投入。', status: 'active', date: today, attachments: [], createdAt: now, updatedAt: now }
            ],
            habits: [
                { id: 'habit-reading', title: '晨间阅读 20 分钟', area: '学习', cadence: 'daily', checkedDates: [today], createdAt: now },
                { id: 'habit-movement', title: '走路或训练 30 分钟', area: '健身', cadence: 'daily', checkedDates: [], createdAt: now },
                { id: 'habit-skincare', title: '完成晚间护肤', area: '美妆护肤', cadence: 'daily', checkedDates: [], createdAt: now },
                { id: 'habit-expense', title: '记一笔今日支出', area: '理财', cadence: 'daily', checkedDates: [], createdAt: now }
            ],
            milestones: [
                { id: 'milestone-project', title: '项目阶段稿提交', kind: 'ddl', area: '学习', date: dateOffset(2), note: '先完成结构，再补细节。', createdAt: now },
                { id: 'milestone-exam', title: '英语能力测试', kind: 'exam', area: '学习', date: dateOffset(12), note: '本周先安排两次模拟练习。', createdAt: now },
                { id: 'milestone-checkup', title: '年度体检预约', kind: 'ddl', area: '生活', date: dateOffset(18), note: '', createdAt: now }
            ],
            archive: [
                { id: 'archive-seed', sourceType: 'task', sourceId: 'task-project', title: '整理本周项目灵感', category: '实践', completedAt: dateOffset(-1), archivedAt: now }
            ]
        };
    }

    function createSeedState() {
        const now = new Date().toISOString();
        const state = {
            schemaVersion: SCHEMA_VERSION,
            profileId: 'local-default',
            revision: 1,
            updatedAt: now,
            preschoolTheme: variant === 'preschool' ? 'garden-defense' : '',
            preschoolDayPlanVersion: variant === 'preschool' ? PRESCHOOL_DAY_PLAN_VERSION : 0,
            preschoolPlanSeedDates: variant === 'preschool' ? [dateOffset(0)] : [],
            tasks: [
                { id: 'task-english', title: '完成英语词卡复习', category: '学习', status: 'doing', priority: 'high', progress: 68, dueDate: dateOffset(0), estimateMinutes: 35, createdAt: now, completedAt: null },
                { id: 'task-reading', title: '读完《纳瓦尔宝典》一章', category: '阅读', status: 'todo', priority: 'medium', progress: 35, dueDate: dateOffset(1), estimateMinutes: 40, createdAt: now, completedAt: null },
                { id: 'task-project', title: '整理本周项目灵感', category: '实践', status: 'done', priority: 'medium', progress: 100, dueDate: dateOffset(-1), estimateMinutes: 25, createdAt: now, completedAt: now },
                { id: 'task-exercise', title: '完成一次户外运动', category: '运动', status: 'todo', priority: 'low', progress: 0, dueDate: dateOffset(2), estimateMinutes: 30, createdAt: now, completedAt: null }
            ],
            dailyPlans: [
                { id: 'plan-1', date: dateOffset(0), title: '完成今日英语词卡', category: '学习', done: true, order: 1, createdAt: now, completedAt: now },
                { id: 'plan-2', date: dateOffset(0), title: '阅读 30 分钟', category: '阅读', done: false, order: 2, createdAt: now, completedAt: null },
                { id: 'plan-3', date: dateOffset(0), title: '整理一条值得复用的灵感', category: '实践', done: false, order: 3, createdAt: now, completedAt: null },
                { id: 'plan-4', date: dateOffset(0), title: '晚间复盘：写下明天的第一步', category: '自控', done: false, order: 4, createdAt: now, completedAt: null }
            ],
            readingLogs: [
                { id: 'reading-1', date: dateOffset(0), title: '纳瓦尔宝典', minutes: 24, pages: 18, note: '关于长期主义的一段', createdAt: now },
                { id: 'reading-2', date: dateOffset(-1), title: 'AI 产品观察', minutes: 36, pages: 12, note: '记录了三个可验证的想法', createdAt: now },
                { id: 'reading-3', date: dateOffset(-3), title: '学习科学笔记', minutes: 42, pages: 24, note: '间隔重复和主动回忆', createdAt: now },
                { id: 'reading-4', date: dateOffset(-6), title: '设计心理学', minutes: 28, pages: 16, note: '', createdAt: now }
            ],
            focusSessions: [
                { id: 'focus-1', date: dateOffset(0), minutes: 32, source: '学习', createdAt: now },
                { id: 'focus-2', date: dateOffset(-1), minutes: 48, source: '阅读', createdAt: now },
                { id: 'focus-3', date: dateOffset(-2), minutes: 25, source: '任务', createdAt: now },
                { id: 'focus-4', date: dateOffset(-3), minutes: 61, source: '学习', createdAt: now },
                { id: 'focus-5', date: dateOffset(-4), minutes: 38, source: '阅读', createdAt: now },
                { id: 'focus-6', date: dateOffset(-5), minutes: 52, source: '任务', createdAt: now },
                { id: 'focus-7', date: dateOffset(-6), minutes: 45, source: '学习', createdAt: now }
            ],
            goals: [
                { id: 'goal-1', title: '建立稳定的英语输入习惯', period: '本季度', description: '每周完成 4 次词卡复习，形成可持续节奏。', progress: 62, target: 12, current: 7, color: 'orange', createdAt: now, updatedAt: now },
                { id: 'goal-2', title: '读完 12 本有启发的书', period: '今年', description: '不追求数量，留下真正改变行动的内容。', progress: 42, target: 12, current: 5, color: 'lime', createdAt: now, updatedAt: now },
                { id: 'goal-3', title: '做一个可以长期使用的作品', period: '长期', description: '从一条想法开始，持续把它做得更清楚。', progress: 28, target: 1, current: 0.28, color: 'blue', createdAt: now, updatedAt: now }
            ],
            reviews: [
                { id: 'review-1', date: dateOffset(-1), title: '今天把最难的一步先做了', mood: 'steady', body: '先完成一小段，再进入状态，比等待完整时间更有效。', nextAction: '明天继续从 20 分钟开始。', createdAt: now },
                { id: 'review-2', date: dateOffset(-4), title: '输入太多，输出太少', mood: 'notice', body: '收藏了不少内容，但还没有转成自己的表达。', nextAction: '挑一条写成短笔记。', createdAt: now }
            ],
            growth: createGrowthSeed(),
            mistakes: [],
            courseProgress: { completedLessonIds: [] },
            adult: createAdultSeed(now)
        };
        if (variant === 'preschool') {
            return Object.assign(state, {
                tasks: createPreschoolTasks(now, dateOffset(0)),
                dailyPlans: createPreschoolPlans(now, dateOffset(0)),
                readingLogs: [{ id: 'preschool-reading-1', date: dateOffset(0), title: '今天的绘本', minutes: 10, pages: 4, note: '我找到了一只小动物。', createdAt: now }],
                focusSessions: [
                    { id: 'preschool-focus-1', date: dateOffset(0), minutes: 10, source: '语文', createdAt: now },
                    { id: 'preschool-focus-2', date: dateOffset(-1), minutes: 8, source: '数学', createdAt: now },
                    { id: 'preschool-focus-3', date: dateOffset(-2), minutes: 10, source: '英语', createdAt: now }
                ],
                goals: [{ id: 'preschool-goal-1', title: '每天学一会儿', period: '本周', description: '每天完成一张小卡片。', progress: 42, target: 7, current: 3, color: 'orange', createdAt: now, updatedAt: now }],
                reviews: [{ id: 'preschool-review-1', date: dateOffset(-1), title: '我今天会了', mood: 'steady', body: '我会说 Hello，还会数水果。', nextAction: '明天再学一张。', createdAt: now }],
                growth: Object.assign(createGrowthSeed(), {
                    sunlight: 40,
                    totalSunlightEarned: 40,
                    awardedIds: ['plan:preschool-plan-story', 'task:preschool-task-hello', `daily-checkin:${dateOffset(0)}`],
                    checkinDates: [dateOffset(0)],
                    unicorn: Object.assign(createGrowthSeed().unicorn, { xp: 40 })
                }),
                mistakes: [],
                courseProgress: { completedLessonIds: ['preschool-chinese-1'] }
            });
        }
        if (variant === 'child') {
            return Object.assign(state, {
                tasks: [
                    { id: 'child-task-reading', title: '语文绘本阅读 20 分钟', category: '阅读', status: 'doing', priority: 'high', progress: 55, dueDate: dateOffset(0), estimateMinutes: 20, createdAt: now, completedAt: null },
                    { id: 'child-task-math', title: '完成一页数学口算', category: '学习', status: 'todo', priority: 'high', progress: 20, dueDate: dateOffset(0), estimateMinutes: 15, createdAt: now, completedAt: null },
                    { id: 'child-task-english', title: '复习 20 张英语词卡', category: '学习', status: 'done', priority: 'medium', progress: 100, dueDate: dateOffset(0), estimateMinutes: 20, createdAt: now, completedAt: now },
                    { id: 'child-task-tidy', title: '整理自己的学习桌', category: '自控', status: 'todo', priority: 'low', progress: 0, dueDate: dateOffset(1), estimateMinutes: 10, createdAt: now, completedAt: null }
                ],
                dailyPlans: [
                    { id: 'child-plan-reading', date: dateOffset(0), title: '晨读打卡：读一个小故事', category: '阅读', done: true, order: 1, createdAt: now, completedAt: now },
                    { id: 'child-plan-math', date: dateOffset(0), title: '数学口算小关卡', category: '学习', done: false, order: 2, createdAt: now, completedAt: null },
                    { id: 'child-plan-english', date: dateOffset(0), title: '英语词卡复习', category: '学习', done: false, order: 3, createdAt: now, completedAt: null },
                    { id: 'child-plan-move', date: dateOffset(0), title: '户外运动 30 分钟', category: '运动', done: false, order: 4, createdAt: now, completedAt: null }
                ],
                readingLogs: [
                    { id: 'child-reading-1', date: dateOffset(0), title: '神奇校车：穿越飓风', minutes: 20, pages: 16, note: '我学会了一个新的自然知识', createdAt: now },
                    { id: 'child-reading-2', date: dateOffset(-1), title: '小王子', minutes: 25, pages: 12, note: '今天最喜欢的角色', createdAt: now },
                    { id: 'child-reading-3', date: dateOffset(-3), title: '十万个为什么', minutes: 18, pages: 10, note: '记下一个想继续研究的问题', createdAt: now }
                ],
                focusSessions: [
                    { id: 'child-focus-1', date: dateOffset(0), minutes: 20, source: '学习', createdAt: now },
                    { id: 'child-focus-2', date: dateOffset(-1), minutes: 35, source: '阅读', createdAt: now },
                    { id: 'child-focus-3', date: dateOffset(-2), minutes: 25, source: '学习', createdAt: now },
                    { id: 'child-focus-4', date: dateOffset(-3), minutes: 30, source: '运动', createdAt: now },
                    { id: 'child-focus-5', date: dateOffset(-4), minutes: 18, source: '阅读', createdAt: now },
                    { id: 'child-focus-6', date: dateOffset(-5), minutes: 22, source: '学习', createdAt: now },
                    { id: 'child-focus-7', date: dateOffset(-6), minutes: 28, source: '学习', createdAt: now }
                ],
                goals: [
                    { id: 'child-goal-1', title: '暑假学习小达人', period: '暑假', description: '每周完成 5 天学习打卡，点亮一枚新徽章。', progress: 58, target: 20, current: 12, color: 'orange', createdAt: now, updatedAt: now },
                    { id: 'child-goal-2', title: '读完 10 本喜欢的书', period: '本学期', description: '读完就记录，留下自己的发现。', progress: 40, target: 10, current: 4, color: 'lime', createdAt: now, updatedAt: now },
                    { id: 'child-goal-3', title: '养成自己的好习惯', period: '长期', description: '每天整理书桌、运动和早睡，慢慢变成超能力。', progress: 32, target: 30, current: 10, color: 'blue', createdAt: now, updatedAt: now }
                ],
                reviews: [
                    { id: 'child-review-1', date: dateOffset(-1), title: '我把最难的口算先做完了', mood: 'steady', body: '开始以后没有想象中难，我还给自己画了一颗星。', nextAction: '明天先读 10 分钟再做数学。', createdAt: now },
                    { id: 'child-review-2', date: dateOffset(-4), title: '今天发现一个好问题', mood: 'notice', body: '为什么云会飘？我把问题记在了阅读记录里。', nextAction: '周末找一本自然科学的书。', createdAt: now }
                ],
                growth: Object.assign(createGrowthSeed(), {
                    sunlight: 80,
                    totalSunlightEarned: 80,
                    awardedIds: ['plan:child-plan-reading', 'task:child-task-english', `daily-checkin:${dateOffset(0)}`],
                    checkinDates: [dateOffset(0)],
                    unicorn: Object.assign(createGrowthSeed().unicorn, { xp: 80 })
                }),
                mistakes: [
                    { id: 'child-mistake-1', date: dateOffset(-1), subject: '数学', question: '两位数进位加法：27 + 18', mistakeReason: '个位相加后忘记把 1 加到十位。', correctAnswer: '先算 7 + 8 = 15，写 5 进 1，再算 2 + 1 + 1 = 4。', reviewDate: dateOffset(1), status: 'todo', createdAt: now },
                    { id: 'child-mistake-2', date: dateOffset(-4), subject: '英语', question: 'There is / There are 的区别', mistakeReason: '看到复数名词时还是习惯写 there is。', correctAnswer: '一个用 There is，多个用 There are，先看后面的名词。', reviewDate: dateOffset(0), status: 'mastered', createdAt: now }
                ],
                courseProgress: { completedLessonIds: ['course-chinese-1', 'course-english-1'] }
            });
        }
        return state;
    }

    function asArray(value) {
        return Array.isArray(value) ? value : [];
    }

    function asStringArray(value) {
        return asArray(value).filter(item => typeof item === 'string' && item).slice(0, 2000);
    }

    function clampNumber(value, min, max, fallback) {
        const number = Number(value);
        if (!Number.isFinite(number)) return fallback;
        return Math.max(min, Math.min(max, number));
    }

    function normalizeGrowth(value) {
        let growth;
        if (global.PersonalWorkbenchChildGrowth && typeof global.PersonalWorkbenchChildGrowth.normalize === 'function') {
            growth = global.PersonalWorkbenchChildGrowth.normalize(value);
        } else {
            const source = value && typeof value === 'object' ? value : {};
            growth = {
                sunlight: clampNumber(source.sunlight, 0, 100000, 0),
                totalSunlightEarned: clampNumber(source.totalSunlightEarned, 0, 100000, clampNumber(source.sunlight, 0, 100000, 0)),
                awardedIds: asStringArray(source.awardedIds),
                claimedRewardIds: asStringArray(source.claimedRewardIds),
                checkinDates: asStringArray(source.checkinDates),
                claimedStreakRewardIds: asStringArray(source.claimedStreakRewardIds),
                voiceEnabled: Boolean(source.voiceEnabled),
                plant: Object.assign({ stage: 0, waterCount: 0, lastWateredDate: '' }, source.plant || {}),
                unicorn: Object.assign({ name: '星芒', xp: 0, level: 1, activeStyleId: 'style-classic', unlockedStyleIds: ['style-classic'] }, source.unicorn || {}),
                zombie: Object.assign({ active: false, defeated: 0, lastSpawnDate: '' }, source.zombie || {})
            };
        }
        if (variant === 'preschool' && global.PersonalWorkbenchPreschoolGarden && typeof global.PersonalWorkbenchPreschoolGarden.normalize === 'function') {
            return global.PersonalWorkbenchPreschoolGarden.normalize(growth);
        }
        return growth;
    }

    function normalizeCourseProgress(value) {
        if (global.PersonalWorkbenchChildCourses && typeof global.PersonalWorkbenchChildCourses.normalize === 'function') {
            return global.PersonalWorkbenchChildCourses.normalize(value);
        }
        const source = value && typeof value === 'object' ? value : {};
        return { completedLessonIds: asStringArray(source.completedLessonIds) };
    }

    function normalizeAdult(value) {
        const source = value && typeof value === 'object' ? value : {};
        const defaultAdult = createAdultSeed(new Date().toISOString());
        const normalizeList = function (input, fallback) {
            return Array.isArray(input) ? input : fallback;
        };
        return {
            language: source.language === 'en-US' ? 'en-US' : 'zh-CN',
            lifeEntries: normalizeList(source.lifeEntries, defaultAdult.lifeEntries).map(function (item) {
                return Object.assign({ id: createId('life'), area: '灵感', title: '未命名生活记录', note: '', status: 'planned', date: localDate(), attachments: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, item, {
                    attachments: Array.isArray(item.attachments) ? item.attachments.slice(0, 12).map(function (attachment) {
                        return { name: String(attachment.name || '').slice(0, 160), type: String(attachment.type || '').slice(0, 80), size: Math.max(0, Number(attachment.size) || 0) };
                    }).filter(function (attachment) { return attachment.name; }) : []
                });
            }),
            habits: normalizeList(source.habits, defaultAdult.habits).map(function (item) {
                return Object.assign({ id: createId('habit'), title: '未命名习惯', area: '其它', cadence: 'daily', checkedDates: [], createdAt: new Date().toISOString() }, item, {
                    checkedDates: asStringArray(item.checkedDates).slice(-370)
                });
            }),
            milestones: normalizeList(source.milestones, defaultAdult.milestones).map(function (item) {
                return Object.assign({ id: createId('milestone'), title: '未命名节点', kind: 'ddl', area: '学习', date: localDate(), note: '', createdAt: new Date().toISOString() }, item);
            }),
            archive: normalizeList(source.archive, defaultAdult.archive).map(function (item) {
                return Object.assign({ id: createId('archive'), sourceType: 'task', sourceId: '', title: '已完成事项', category: '其它', completedAt: localDate(), archivedAt: new Date().toISOString() }, item);
            })
        };
    }

    function ensurePreschoolDailyPlans(state) {
        if (variant !== 'preschool') return state;
        const today = localDate();
        const seededDates = Array.isArray(state.preschoolPlanSeedDates) ? state.preschoolPlanSeedDates : [];
        synchronizePreschoolTemplates(state);
        const todayPlans = state.dailyPlans.filter(item => item.date === today);
        const migrationNeeded = Number(state.preschoolDayPlanVersion) < PRESCHOOL_DAY_PLAN_VERSION;
        if (!todayPlans.length && !seededDates.includes(today)) {
            const now = new Date().toISOString();
            state.tasks = state.tasks.concat(createPreschoolTasks(now, today).map(function (item) {
                return Object.assign({}, item, { status: 'todo', progress: 0, completedAt: null });
            }));
            state.dailyPlans = state.dailyPlans.concat(createPreschoolPlans(now, today, PRESCHOOL_DAILY_ITEMS.reduce(function (result, item) { result[item.id] = false; return result; }, {})));
            seededDates.push(today);
        } else if (migrationNeeded) {
            const existingPlanIds = new Set(state.dailyPlans.map(item => item.id));
            const existingTaskIds = new Set(state.tasks.map(item => item.id));
            const now = new Date().toISOString();
            PRESCHOOL_DAILY_ITEMS.forEach(function (item, index) {
                const planId = `preschool-plan-${item.id}`;
                const taskId = `preschool-task-${item.id}`;
                if (!existingPlanIds.has(planId) && !state.dailyPlans.some(entry => entry.date === today && entry.title === item.title)) {
                    state.dailyPlans.push({ id: planId, date: today, title: item.title, category: item.category, required: item.required, practiceLessonId: item.practiceLessonId || '', completionSource: '', completionRewardId: '', done: false, order: index + 1, createdAt: now, completedAt: null });
                }
                if (!existingTaskIds.has(taskId) && !state.tasks.some(entry => entry.title === item.title)) {
                    state.tasks.push(Object.assign({}, createPreschoolTasks(now, today).find(entry => entry.id === taskId), { status: 'todo', progress: 0, completedAt: null }));
                }
            });
            if (!seededDates.includes(today)) seededDates.push(today);
        }
        state.preschoolPlanSeedDates = Array.from(new Set(seededDates)).filter(item => /^\d{4}-\d{2}-\d{2}$/.test(String(item))).sort().slice(-30);
        state.preschoolDayPlanVersion = PRESCHOOL_DAY_PLAN_VERSION;
        return state;
    }

    function normalizeState(input) {
        const source = input && typeof input === 'object' ? input : {};
        const seed = createSeedState();
        const state = {
            schemaVersion: SCHEMA_VERSION,
            profileId: typeof source.profileId === 'string' && source.profileId ? source.profileId : 'local-default',
            revision: Number.isInteger(source.revision) && source.revision >= 0 ? source.revision : 0,
            updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : new Date().toISOString(),
            preschoolTheme: variant === 'preschool' ? normalizePreschoolTheme(source.preschoolTheme) : '',
            preschoolDayPlanVersion: Number(source.preschoolDayPlanVersion) || 0,
            preschoolPlanSeedDates: asArray(source.preschoolPlanSeedDates).filter(item => /^\d{4}-\d{2}-\d{2}$/.test(String(item))),
            tasks: asArray(source.tasks),
            dailyPlans: asArray(source.dailyPlans),
            readingLogs: asArray(source.readingLogs),
            focusSessions: asArray(source.focusSessions),
            goals: asArray(source.goals),
            reviews: asArray(source.reviews),
            growth: normalizeGrowth(source.growth),
            mistakes: asArray(source.mistakes),
            courseProgress: normalizeCourseProgress(source.courseProgress),
            adult: normalizeAdult(source.adult)
        };

        if (!Object.prototype.hasOwnProperty.call(source, 'tasks') && !Object.prototype.hasOwnProperty.call(source, 'dailyPlans')) {
            return seed;
        }

        state.tasks = state.tasks.map(function (item) {
            const template = variant === 'preschool' ? preschoolTaskTemplateById(item.id) : null;
            return Object.assign({ id: createId('task'), title: '未命名任务', category: '学习', required: template ? template.required : false, status: 'todo', priority: 'medium', progress: 0, dueDate: '', estimateMinutes: 25, createdAt: state.updatedAt, completedAt: null }, item, {
                progress: clampNumber(item.progress, 0, 100, 0)
            });
        });
        state.dailyPlans = state.dailyPlans.map(function (item, index) {
            const template = variant === 'preschool' ? preschoolTaskTemplateById(item.id) : null;
            return Object.assign({ id: createId('plan'), date: localDate(), title: '未命名计划', category: '学习', required: template ? template.required : false, practiceLessonId: template ? (template.practiceLessonId || '') : '', completionSource: '', completionRewardId: '', done: false, order: index + 1, createdAt: state.updatedAt, completedAt: null }, item, {
                done: Boolean(item.done),
                practiceLessonId: typeof item.practiceLessonId === 'string' ? item.practiceLessonId : (template ? (template.practiceLessonId || '') : ''),
                completionSource: typeof item.completionSource === 'string' ? item.completionSource : '',
                completionRewardId: typeof item.completionRewardId === 'string' ? item.completionRewardId : ''
            });
        });
        state.readingLogs = state.readingLogs.map(function (item) {
            return Object.assign({ id: createId('reading'), date: localDate(), title: '未命名阅读', minutes: 0, pages: 0, note: '', createdAt: state.updatedAt }, item, {
                minutes: clampNumber(item.minutes, 0, 1440, 0),
                pages: clampNumber(item.pages, 0, 100000, 0)
            });
        });
        state.focusSessions = state.focusSessions.map(function (item) {
            return Object.assign({ id: createId('focus'), date: localDate(), minutes: 0, source: '其它', createdAt: state.updatedAt }, item, {
                minutes: clampNumber(item.minutes, 0, 1440, 0)
            });
        });
        state.goals = state.goals.map(function (item) {
            return Object.assign({ id: createId('goal'), title: '未命名目标', period: '长期', description: '', progress: 0, target: 1, current: 0, color: 'orange', createdAt: state.updatedAt, updatedAt: state.updatedAt }, item, {
                progress: clampNumber(item.progress, 0, 100, 0)
            });
        });
        state.reviews = state.reviews.map(function (item) {
            return Object.assign({ id: createId('review'), date: localDate(), title: '未命名复盘', mood: 'steady', body: '', nextAction: '', createdAt: state.updatedAt }, item);
        });
        state.mistakes = state.mistakes.map(function (item) {
            return Object.assign({ id: createId('mistake'), date: localDate(), subject: '其它', question: '未命名错题', mistakeReason: '', correctAnswer: '', reviewDate: localDate(), status: 'todo', createdAt: state.updatedAt }, item, {
                status: item.status === 'mastered' ? 'mastered' : 'todo'
            });
        });
        synchronizePreschoolTemplates(state);
        return ensurePreschoolDailyPlans(state);
    }

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    const repository = {
        key: STORAGE_KEY,
        load: function () {
            try {
                const raw = global.localStorage && global.localStorage.getItem(STORAGE_KEY);
                if (!raw) {
                    const seed = createSeedState();
                    this.save(seed);
                    return seed;
                }
                const parsed = JSON.parse(raw);
                const normalized = normalizeState(parsed);
                if (normalized.schemaVersion !== parsed.schemaVersion || normalized.revision !== parsed.revision || normalized.preschoolTheme !== parsed.preschoolTheme || normalized.preschoolDayPlanVersion !== parsed.preschoolDayPlanVersion || JSON.stringify(normalized.preschoolPlanSeedDates) !== JSON.stringify(parsed.preschoolPlanSeedDates)) this.save(normalized);
                return normalized;
            } catch (error) {
                console.warn('[PersonalWorkbenchStorage] 读取本地快照失败，已使用初始数据', error);
                return createSeedState();
            }
        },
        save: function (nextState) {
            try {
                const state = normalizeState(nextState);
                state.revision = Math.max(0, Number(state.revision) || 0);
                state.updatedAt = new Date().toISOString();
                global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
                return { ok: true, state: state };
            } catch (error) {
                console.warn('[PersonalWorkbenchStorage] 写入本地快照失败', error);
                return { ok: false, error: error };
            }
        },
        update: function (mutator, baseState) {
            // A visible page can hold a normalized snapshot that is newer than
            // the last localStorage write (for example after a migration or a
            // second tab edits the same workbench). Use that snapshot when the
            // caller supplies it, otherwise preserve the original load-first
            // behavior for standalone repository consumers.
            const current = baseState && typeof baseState === 'object' ? clone(baseState) : this.load();
            const next = clone(current);
            mutator(next);
            next.revision = (Number(current.revision) || 0) + 1;
            return this.save(next);
        },
        replace: function (nextState) {
            const normalized = normalizeState(nextState);
            normalized.revision = (Number(this.load().revision) || 0) + 1;
            return this.save(normalized);
        },
        exportJson: function () {
            return JSON.stringify(this.load(), null, 2);
        },
        reset: function () {
            try {
                global.localStorage.removeItem(STORAGE_KEY);
                const seed = createSeedState();
                return this.save(seed);
            } catch (error) {
                console.warn('[PersonalWorkbenchStorage] 重置本地快照失败', error);
                return { ok: false, error: error };
            }
        }
    };

    global.PersonalWorkbenchStorage = {
        STORAGE_KEY: STORAGE_KEY,
        SCHEMA_VERSION: SCHEMA_VERSION,
        PRESCHOOL_THEME_IDS: PRESCHOOL_THEME_IDS.slice(),
        localDate: localDate,
        dateOffset: dateOffset,
        createId: createId,
        createSeedState: createSeedState,
        normalizeState: normalizeState,
        getPreschoolPlanRewardId: getPreschoolPlanRewardId,
        repository: repository
    };
})(typeof window !== 'undefined' ? window : globalThis);
