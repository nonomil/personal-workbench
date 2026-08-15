(function (global) {
    'use strict';

    const storage = global.PersonalWorkbenchStorage;
    const workbenchConfig = global.PersonalWorkbenchConfig || {};
    const repository = storage.repository;
    const pageContent = document.getElementById('page-content');
    const entryDialog = document.getElementById('entry-dialog');
    const entryForm = document.getElementById('entry-form');
    const lessonDialog = document.getElementById('lesson-dialog');
    const lessonDialogContent = document.getElementById('lesson-dialog-content');
    const dialogTitle = document.getElementById('dialog-title');
    const dialogEyebrow = document.getElementById('dialog-eyebrow');
    const toastStack = document.getElementById('toast-stack');
    const pageName = document.getElementById('topbar-page-name');
    const sidebar = document.getElementById('sidebar');
    const sidebarScrim = document.getElementById('sidebar-scrim');
    const importFile = document.getElementById('import-file');
    const api = global.PersonalWorkbenchApi && typeof global.PersonalWorkbenchApi.createRemoteAdapter === 'function'
        ? global.PersonalWorkbenchApi.createRemoteAdapter({})
        : null;
    const familyRepository = global.PersonalWorkbenchFamily && global.PersonalWorkbenchFamily.repository;
    const accountView = { households: [], children: [], selectedHouseholdId: '', loading: false, error: '', lastSyncAt: '', lastRemoteRevision: 0 };
    const PRESCHOOL_COPY = {
        overviewDescription: '先行动，再玩耍；每一步都算数。',
        plansTitle: '任务清单',
        plansEyebrow: 'TODAY / LIST',
        calendarTitle: '日历点亮',
        calendarEyebrow: 'ACTION / CALENDAR',
        calendarDescription: '完成任务会留下点亮记录，回头看看自己的坚持。',
        addPlanLabel: '创建任务',
        themeSummaries: {
            'garden-defense': '阳光、植物与今日行动',
            'voxel-adventure': '方块基地、晶体与关卡路径',
            'platform-quest': '平台、金币与奖励宝箱'
        }
    };
    const PRESCHOOL_NAV_LABELS = { calendar: '日历点亮' };

    const BASE_PAGE_META = workbenchConfig.pageMeta || {
        overview: { title: '概览', eyebrow: 'TODAY / OVERVIEW', heading: '今天，做一点可持续的进步', description: '把最重要的一步先做完，剩下的交给节奏。' },
        plans: { title: '今日计划', eyebrow: 'TODAY / PLAN', heading: '今天要完成什么', description: '只保留今天真正值得完成的几件事。' },
        tasks: { title: '学习任务', eyebrow: 'WORKSPACE / TASKS', heading: '把正在推进的事看清楚', description: '任务有方向、进度和下一步，才会慢慢变轻。' },
        mistakes: { title: '错题本', eyebrow: 'LEARN / REVIEW', heading: '把卡住的题变成下一次会做', description: '记录错因和正确思路，复习时只看最需要的几道。' },
        reading: { title: '阅读记录', eyebrow: 'INPUT / READING', heading: '把输入变成自己的积累', description: '记录时间，也留下真正值得回看的内容。' },
        goals: { title: '成长目标', eyebrow: 'DIRECTION / GOALS', heading: '给长期目标一个可见的进度', description: '目标不用每天催促，但需要经常被看见。' },
        life: { title: '生活分区', eyebrow: 'LIFE OS / AREAS', heading: '把生活也放进工作台', description: '学习、健身、护肤和生活清单，按自己的节奏轻量维护。' },
        archive: { title: '归档与统计', eyebrow: 'LIFE OS / ARCHIVE', heading: '看见已经完成的时间', description: '完成的事项自动沉淀，年度统计只用来理解节奏，不用制造压力。' },
        rewards: { title: '奖励中心', eyebrow: 'GROW / REWARDS', heading: '用阳光换一个期待', description: '完成真实的学习和生活行动，再选择一个值得期待的小奖励。' },
        reviews: { title: '复盘箱', eyebrow: 'REFLECT / REVIEW', heading: '把经历整理成下一步', description: '记下发生了什么，再决定下一步怎么做。' }
    };
    const ACTION_COPY_VARIANT = workbenchConfig.variant === 'preschool' || workbenchConfig.variant === 'child';
    const PAGE_META = ACTION_COPY_VARIANT
        ? Object.assign({}, BASE_PAGE_META, {
            overview: Object.assign({}, BASE_PAGE_META.overview, { description: PRESCHOOL_COPY.overviewDescription }),
            plans: Object.assign({}, BASE_PAGE_META.plans, {
                title: PRESCHOOL_COPY.plansTitle,
                eyebrow: PRESCHOOL_COPY.plansEyebrow,
                heading: '任务清单',
                description: '在这里创建、改名或删除今天的任务。勾选完成请回首页。'
            }),
            calendar: BASE_PAGE_META.calendar ? Object.assign({}, BASE_PAGE_META.calendar, {
                title: PRESCHOOL_COPY.calendarTitle,
                eyebrow: PRESCHOOL_COPY.calendarEyebrow,
                description: PRESCHOOL_COPY.calendarDescription
            }) : BASE_PAGE_META.calendar
        })
        : BASE_PAGE_META;

    const CATEGORY_COLORS = { 学习: 'orange', 阅读: 'blue', 实践: 'lime', 运动: 'gold', 自控: 'orange', 其它: 'blue' };
    const PRIORITY_LABELS = { high: '高优先', medium: '常规', low: '低优先' };
    const STATUS_LABELS = { todo: '待开始', doing: '进行中', done: '已完成' };
    const ui = { page: getPageFromHash(), courseId: getCourseIdFromHash(), courseNavExpanded: getPageFromHash() === 'courses', taskFilter: 'all', dialogType: '', dialogId: '', dialogArea: '', dialogDate: '', lessonSession: null, courseCards: null, courseClassic: getCourseTabFromHash() === 'menu', courseTab: getCourseTabFromHash(), mediaBvid: '', summerLibraryCategory: 'daily', summerLibraryItem: 0, battleEffect: null, growthWorld: '', badgeBoxOpen: false, badgeFilter: 'all' };
    let lessonMotionTimerId = 0;
    let lessonSimonTimerId = 0;
    let focusPlayClockId = 0;
    const isPreschool = workbenchConfig.variant === 'preschool';
    const isChild = workbenchConfig.variant === 'child' || isPreschool;
    const isAdult = workbenchConfig.variant === 'adult';
    const summerLibrary = global.PetBankSummerDailyLearning || {};
    const SUMMER_LIBRARY_CATEGORIES = [
        { id: 'daily', label: '每日学习单', icon: 'sun', source: 'morningReading' },
        { id: 'morningReading', label: '60 天晨读', icon: 'volume-2', source: 'morningReading' },
        { id: 'literacy', label: '45 天识字', icon: 'book-open', source: 'literacy' },
        { id: 'poems', label: '古诗词', icon: 'feather', source: 'poems' },
        { id: 'classics', label: '经典短句', icon: 'heart', source: 'classics' },
        { id: 'weeklyReview', label: '每周复盘', icon: 'calendar-check-2', source: 'weeklyReview' }
    ];
    const preschoolGarden = global.PersonalWorkbenchPreschoolGarden;
    const PIXEL_ASSET_BASE = '../assets/generated/preschool-pixel/reference/gpt-output-20260730/published-gpt-v2/';
    const PIXEL_REFRESH_ASSET_BASE = '../assets/generated/preschool-pixel/refresh-20260731/published/';
    // 花园角色优先用已验收的 preschool-pvz-2d（比 world-rebuild 更接近塔防原版观感）
    const PRESCHOOL_PVZ_ASSET_BASE = '../assets/generated/preschool-pixel/pvz/';
    const PRESCHOOL_FOCUS_GAME_ASSETS = {
        'focus-schulte': '../assets/generated/preschool-focus-games/published/focus-schulte.png',
        'focus-sudoku': '../assets/generated/preschool-focus-games/published/focus-sudoku.png',
        'focus-memory': '../assets/generated/preschool-focus-games/published/focus-memory.png',
        'focus-simon': '../assets/generated/preschool-focus-games/published/focus-simon.png',
        'focus-search': '../assets/generated/preschool-focus-games/published/focus-search.png'
    };
    const PRESCHOOL_PVZ_ASSETS = {
        'sun-token': '../assets/generated/preschool-pvz-2d/published/pvz-sun-token.png',
        'treasure-chest': '../assets/generated/preschool-pixel/refresh-20260731/published/treasure-chest.png',
        'plant-sunflower': 'plant-sunflower.png?v=20260815-ref-v1',
        'plant-peashooter': 'plant-peashooter.png?v=20260815-ref-v1',
        'plant-wallnut': 'plant-wallnut.png?v=20260815-ref-v1',
        'plant-snowpea': 'plant-snowpea.png?v=20260815-ref-v1',
        'plant-cherrybomb': 'plant-cherrybomb.webp?v=20260815-ref-v1',
        'zombie-basic': 'zombie-basic.webp?v=20260815-ref-v1',
        'zombie-conehead': 'zombie-conehead.webp?v=20260815-ref-v1',
        'zombie-buckethead': 'zombie-buckethead.webp?v=20260815-ref-v1',
        'zombie-flag': 'zombie-flag.webp?v=20260815-ref-v1',
        'zombie-football': 'zombie-football.webp?v=20260815-ref-v1'
    };
    const PRESCHOOL_THEME_ASSET_FILES = {
        'voxel-adventure': {
            'voxel-companion': '../assets/generated/preschool-theme-assets/voxel-v1/published/voxel-companion.png',
            'voxel-grass-block': '../assets/generated/preschool-theme-assets/voxel-v1/published/voxel-grass-block.png',
            'voxel-stone-steps': '../assets/generated/preschool-theme-assets/voxel-v1/published/voxel-stone-steps.png',
            'voxel-chest': '../assets/generated/preschool-theme-assets/voxel-v1/published/voxel-chest.png',
            'voxel-purple-crystal': '../assets/generated/preschool-theme-assets/voxel-v1/published/voxel-purple-crystal.png',
            'voxel-water-channel': '../assets/generated/preschool-theme-assets/voxel-v1/published/voxel-water-channel.png',
            'voxel-bridge': '../assets/generated/preschool-theme-assets/voxel-v1/published/voxel-bridge.png',
            'voxel-block-tree': '../assets/generated/preschool-theme-assets/voxel-v1/published/voxel-block-tree.png'
        },
        'platform-quest': {
            'platform-explorer': '../assets/generated/preschool-theme-assets/platform-v1/published/platform-explorer.png',
            'platform-coin': '../assets/generated/preschool-theme-assets/platform-v1/published/platform-coin.png',
            'platform-brick': '../assets/generated/preschool-theme-assets/platform-v1/published/platform-brick.png',
            'platform-mystery-block': '../assets/generated/preschool-theme-assets/platform-v1/published/platform-mystery-block.png',
            'platform-pipe': '../assets/generated/preschool-theme-assets/platform-v1/published/platform-pipe.png',
            'platform-flag': '../assets/generated/preschool-theme-assets/platform-v1/published/platform-flag.png',
            'platform-grass-platform': '../assets/generated/preschool-theme-assets/platform-v1/published/platform-grass-platform.png',
            'platform-star-badge': '../assets/generated/preschool-theme-assets/platform-v1/published/platform-star-badge.png'
        }
    };
    const PIXEL_REFRESH_ASSETS = {
        'sun-token': 'sun-token.png',
        'water-drop-token': 'water-drop-token.png',
        'seedling-node': 'seedling-node.png',
        'cloud-invader': 'cloud-invader.png',
        'treasure-chest': 'treasure-chest.png',
        'star-companion': 'star-companion.png',
        'flower-checkpoint': 'flower-checkpoint.png',
        'carrot-reward': 'carrot-reward.png',
        'quest-flag-pedestal': 'quest-flag-pedestal.png',
        'plant-sunflower': '../../pvz/plant-sunflower.png',
        'plant-peashooter': '../../pvz/plant-peashooter.png',
        'plant-wallnut': '../../pvz/plant-wallnut.png',
        'plant-snowpea': '../../pvz/plant-snowpea.png',
        'plant-cherrybomb': '../../pvz/plant-cherrybomb.webp',
        'zombie-basic': '../../pvz/zombie-basic.webp',
        'zombie-conehead': '../../pvz/zombie-conehead.webp',
        'zombie-buckethead': '../../pvz/zombie-buckethead.webp',
        'zombie-flag': '../../pvz/zombie-flag.webp',
        'zombie-football': '../../pvz/zombie-football.webp'
    };
    const PIXEL_ASSET_FILES = {
        'sun-token': 'sun-token.png',
        'water-drop-token': 'water-drop-token.png',
        'storybook-token': 'storybook-token.png',
        'sun-smile-badge': 'sun-smile-badge.png',
        'treasure-chest': 'treasure-chest.png',
        'sunlight-crystal-cluster': 'sunlight-crystal-cluster.png',
        'growth-tree': 'growth-tree.png',
        'flower-checkpoint': 'flower-checkpoint.png',
        'seedling-node': 'seedling-node.png',
        'cloud-invader': 'cloud-invader.png',
        'quest-flag-pedestal': 'quest-flag-pedestal.png',
        'star-companion': 'star-companion.png',
        'castle-gate': 'castle-gate.png',
        'cat-helper': 'cat-helper.png',
        'fence': 'fence.png',
        'flower-pot': 'flower-pot.png',
        'grass-patch': 'grass-patch.png',
        'grass-platform': 'grass-platform.png',
        'map-sun': 'map-sun.png',
        'nav-chest': 'nav-chest.png',
        'nav-family': 'nav-family.png',
        'nav-flowers': 'nav-flowers.png',
        'nav-sprout': 'nav-sprout.png',
        'nav-storybook': 'nav-storybook.png',
        'nav-sun': 'nav-sun.png',
        'player-energy-bars': 'player-energy-bars.png',
        'river-bridge': 'river-bridge.png',
        'settings-gear': 'settings-gear.png',
        'small-tree': 'small-tree.png',
        'small-crystal': 'small-crystal.png',
        'streak-stars': 'streak-stars.png',
        'sun-progress-bar': 'sun-progress-bar.png',
        'task-book-icon': 'task-book-icon.png',
        'task-sun-icon': 'task-sun-icon.png',
        'task-water-icon': 'task-water-icon.png'
    };
    const PRESCHOOL_SOFT_ASSETS = {
        'sun-token': 'preschool-sun.webp',
        'map-sun': 'preschool-sun.webp',
        'sun-smile-badge': 'preschool-sun.webp',
        'streak-stars': 'preschool-star.webp',
        'sun-progress-bar': 'preschool-sun.webp',
        'small-crystal': 'preschool-gift.webp',
        'sunlight-crystal-cluster': 'preschool-gift.webp',
        'water-drop-token': 'preschool-watering-can.webp',
        'seedling-node': 'preschool-sprout.webp',
        'growth-tree': 'preschool-sprout.webp',
        'grass-patch': 'preschool-sprout.webp',
        'grass-platform': 'preschool-sprout.webp',
        'treasure-chest': 'preschool-gift.webp',
        'nav-chest': 'preschool-gift.webp',
        'star-companion': 'preschool-star.webp',
        'small-tree': 'preschool-sprout.webp',
        'storybook-token': 'preschool-storybook.webp',
        'task-book-icon': 'preschool-storybook.webp',
        'task-sun-icon': 'preschool-sun.webp',
        'task-water-icon': 'preschool-watering-can.webp',
        'flower-pot': 'preschool-sprout.webp',
        'flower-checkpoint': 'preschool-sprout.webp',
        'cat-helper': 'preschool-star.webp',
        'nav-family': 'preschool-star.webp',
        'nav-flowers': 'preschool-sprout.webp',
        'nav-sprout': 'preschool-sprout.webp',
        'nav-storybook': 'preschool-storybook.webp',
        'nav-sun': 'preschool-sun.webp',
        'quest-flag-pedestal': 'preschool-sprout.webp',
        'cloud-invader': 'preschool-bug.webp',
        'player-energy-bars': 'preschool-sprout.webp'
    };
    const PRESCHOOL_THEME_ASSET_ALIASES = {
        'garden-defense': {},
        'voxel-adventure': {
            'sun-token': 'voxel-purple-crystal',
            'map-sun': 'voxel-purple-crystal',
            'player-energy-bars': 'voxel-purple-crystal',
            'star-companion': 'voxel-companion',
            'small-crystal': 'voxel-purple-crystal',
            'treasure-chest': 'voxel-chest',
            'storybook-token': 'voxel-chest',
            'growth-tree': 'voxel-block-tree',
            'small-tree': 'voxel-block-tree',
            'grass-platform': 'voxel-grass-block',
            'grass-patch': 'voxel-grass-block',
            'river-bridge': 'voxel-bridge',
            'quest-flag-pedestal': 'voxel-bridge',
            'plant-sunflower': 'voxel-block-tree',
            'plant-peashooter': 'voxel-purple-crystal',
            'plant-wallnut': 'voxel-grass-block',
            'plant-wallnut-blue': 'voxel-stone-steps',
            'plant-snowpea': 'voxel-water-channel',
            'plant-cherrybomb': 'voxel-stone-steps',
            'zombie-basic': 'voxel-companion',
            'zombie-conehead': 'voxel-companion',
            'zombie-buckethead': 'voxel-companion'
        },
        'platform-quest': {
            'sun-token': 'platform-coin',
            'map-sun': 'platform-coin',
            'player-energy-bars': 'platform-star-badge',
            'star-companion': 'platform-explorer',
            'small-crystal': 'platform-star-badge',
            'treasure-chest': 'platform-mystery-block',
            'storybook-token': 'platform-brick',
            'growth-tree': 'platform-grass-platform',
            'small-tree': 'platform-grass-platform',
            'grass-platform': 'platform-grass-platform',
            'grass-patch': 'platform-grass-platform',
            'river-bridge': 'platform-pipe',
            'quest-flag-pedestal': 'platform-flag',
            'plant-sunflower': 'platform-grass-platform',
            'plant-peashooter': 'platform-explorer',
            'plant-wallnut': 'platform-brick',
            'plant-wallnut-blue': 'platform-mystery-block',
            'plant-snowpea': 'platform-pipe',
            'plant-cherrybomb': 'platform-mystery-block',
            'zombie-basic': 'platform-star-badge',
            'zombie-conehead': 'platform-star-badge',
            'zombie-buckethead': 'platform-star-badge'
        }
    };
    let state = repository.load();

    function getRequestedPreschoolTheme() {
        if (!isPreschool || typeof location === 'undefined') return '';
        const params = new URLSearchParams(location.search || '');
        const candidate = params.get('theme') || '';
        const themes = workbenchConfig.themes || {};
        return themes[candidate] ? candidate : '';
    }

    // The launcher passes the selected preschool world through the URL. Apply it
    // before the first render and persist it into the same snapshot so a refresh
    // or a later visit keeps the chosen world without creating another datastore.
    const requestedPreschoolTheme = getRequestedPreschoolTheme();
    if (requestedPreschoolTheme && requestedPreschoolTheme !== state.preschoolTheme) {
        state = Object.assign({}, state, { preschoolTheme: requestedPreschoolTheme });
        const persistedTheme = repository.save(state);
        if (persistedTheme.ok && persistedTheme.state) state = persistedTheme.state;
        else console.warn('[PersonalWorkbenchApp] 主题参数未能写入本地快照');
    }
    if (requestedPreschoolTheme && global.PersonalWorkbenchLauncher && typeof global.PersonalWorkbenchLauncher.rememberTheme === 'function') {
        global.PersonalWorkbenchLauncher.rememberTheme(requestedPreschoolTheme);
    }
    let preschoolCelebrationTimer = 0;
    let preschoolPeaTimer = 0;
    let preschoolHudPulseTimer = 0;
    let preschoolDefenseTimer = 0;
    let preschoolBattleEffectTimer = 0;
    let preschoolPointerDrag = null;
    let preschoolSuppressNextPlacementClick = false;
    let preschoolMusic = null;
    const PHONICS_REFERENCE_URL = '../data/preschool/english/phonics/reference-bank.json';
    let phonicsReferenceBank = null;
    let phonicsReferenceStatus = 'idle';

    function getPreschoolThemePlaybook() {
        const themeId = getPreschoolThemeId();
        if (themeId === 'voxel-adventure') {
            return {
                id: 'voxel-adventure',
                homeKicker: 'BLOCK BASE / TODAY',
                homeTitle: '今日方块基地',
                homeDescription: '完成任务收集晶体，铺好自己的方块路线。',
                homeDoneHint: '晶体已收集，基地更亮了',
                homeTodoHint: '完成任务，收集 +10 晶体',
                homeFootReady: '基地安全，等你来搭建',
                homeFootActive: '迷雾怪物正在靠近',
                homeFootNote: '首页负责练习和记录，完整探索在方块游戏里进行。',
                battleKicker: 'BLOCK BASE / DEFENSE',
                battleTitle: '方块基地防线',
                battleTitleActive: '迷雾怪物来捣乱了',
                battleReadyCopy: '完成任务收集晶体，种下方块设施守护基地。',
                battleActiveCopy: function (wave, health, foe) { return `第 ${wave || 1} 波 · ${foe} 还要 ${health} 次晶体冲击。`; },
                battleHowTitle: '三步守护方块基地',
                battleStep1: '完成一项任务',
                battleStep1Hint: '收集晶体，也会得到探索能量。',
                battleStep2: '召唤迷雾怪物练习',
                battleStep2Hint: '点击“来一波怪物”，看看下一只敌人是谁。',
                battleStep3: '使用方块设施技能',
                battleStep3Hint: '树苗产晶、晶体炮攻击、草方块挡路，每个设施都有自己的本领。',
                reward1: '+10 晶体',
                reward1Hint: '完成一项今日任务',
                reward2: '冲击 1 次',
                reward2Hint: '命中一次怪物生命',
                reward3: '通关宝箱',
                reward3Hint: '击退一波，去奖励箱挑选',
                currency: '晶体',
                energy: '探索能量',
                foeReady: '来一波怪物',
                exitGame: '去方块游戏',
                navGameLabel: '方块世界',
                worldGameHref: '../games/voxel-craft/index.html',
                lanePlants: ['voxel-block-tree', 'voxel-purple-crystal', 'voxel-grass-block'],
                laneFoes: ['voxel-companion', 'voxel-companion', 'voxel-companion']
            };
        }
        if (themeId === 'platform-quest') {
            return {
                id: 'platform-quest',
                homeKicker: 'QUEST WORLD / TODAY',
                homeTitle: '今日横版闯关',
                homeDescription: '完成任务收集金币，跳向终点旗子。',
                homeDoneHint: '金币已收集，平台点亮了',
                homeTodoHint: '完成任务，收集 +10 金币',
                homeFootReady: '赛道安全，等你来闯关',
                homeFootActive: '障碍正在靠近',
                homeFootNote: '首页负责练习和记录，完整闯关在平台游戏里进行。',
                battleKicker: 'QUEST WORLD / RUN',
                battleTitle: '横版闯关赛道',
                battleTitleActive: '障碍冲过来了',
                battleReadyCopy: '完成任务收集金币，布置平台关卡继续前进。',
                battleActiveCopy: function (wave, health, foe) { return `第 ${wave || 1} 关 · ${foe} 还要 ${health} 次冲刺。`; },
                battleHowTitle: '三步横版闯关',
                battleStep1: '完成一项任务',
                battleStep1Hint: '收集金币，也会得到冲刺能量。',
                battleStep2: '召唤障碍练习',
                battleStep2Hint: '点击“来一波障碍”，看看下一段赛道。',
                battleStep3: '使用关卡道具',
                battleStep3Hint: '平台支撑、探险员冲刺、砖块挡路，每个道具都有自己的本领。',
                reward1: '+10 金币',
                reward1Hint: '完成一项今日任务',
                reward2: '冲刺 1 次',
                reward2Hint: '命中一次障碍生命',
                reward3: '终点旗奖励',
                reward3Hint: '过一关，去奖励箱挑选',
                currency: '金币',
                energy: '冲刺能量',
                foeReady: '来一波障碍',
                exitGame: '去闯关游戏',
                navGameLabel: '横版闯关',
                worldGameHref: '../games/platform-quest/index.html',
                lanePlants: ['platform-grass-platform', 'platform-explorer', 'platform-brick'],
                laneFoes: ['platform-star-badge', 'platform-star-badge', 'platform-star-badge']
            };
        }
        return {
            id: 'garden-defense',
            homeKicker: 'SUN GARDEN / TODAY',
            homeTitle: '今日草坪战场',
            homeDescription: '点亮每一条任务战线，收集阳光守护花园。',
            homeDoneHint: '阳光已收集，战线已守住',
            homeTodoHint: '完成任务，收集 +10 阳光',
            homeFootReady: '花园安全，等你来点亮',
            homeFootActive: '正在靠近',
            homeFootNote: '首页负责练习和记录，完整战斗在花园游戏里进行。',
            battleKicker: 'SUN GARDEN / DEFENSE',
            battleTitle: '植物防守场',
            battleTitleActive: '来捣乱了',
            battleReadyCopy: '完成任务收集阳光，种下植物守护花园。',
            battleActiveCopy: function (wave, health, foe) { return `第 ${wave || 1} 波 · ${foe}还要 ${health} 次豌豆。`; },
            battleHowTitle: '三步守护花园',
            battleStep1: '完成一项任务',
            battleStep1Hint: '收集阳光，也会得到豌豆能量。',
            battleStep2: '召唤僵尸练习',
            battleStep2Hint: '点击“来一波僵尸”，看看下一位敌人是谁。',
            battleStep3: '使用植物技能',
            battleStep3Hint: '豌豆射手攻击，坚果墙阻挡，每个伙伴都有自己的本领。',
            reward1: '+10 阳光',
            reward1Hint: '完成一项今日任务',
            reward2: '发射 1 颗',
            reward2Hint: '命中一次僵尸生命',
            reward3: '通关奖励',
            reward3Hint: '击退一波，去阳光商城',
            currency: '阳光',
            energy: '豌豆能量',
            foeReady: '来一波僵尸',
            exitGame: '去花园游戏',
            navGameLabel: '植物大战',
            worldGameHref: '../games/garden-defense/index.html',
            lanePlants: ['plant-sunflower', 'plant-peashooter', 'plant-wallnut'],
            laneFoes: ['zombie-basic', 'zombie-conehead', 'zombie-buckethead']
        };
    }

    const PRESCHOOL_WORLD_GAME_LINKS = {
        'garden-defense': { href: '../games/garden-defense/index.html', label: '花园保卫', unit: '关', total: 12 },
        'voxel-adventure': { href: '../games/voxel-craft/index.html', label: '方块世界', unit: '任务', total: 18 },
        'platform-quest': { href: '../games/platform-quest/index.html', label: '横版闯关', unit: '关', total: 16 }
    };
    const DAILY_GAME_SUN_CAP = 80;

    function openPreschoolWorldGame(forcedThemeId) {
        if (!isPreschool) return false;
        const themeId = forcedThemeId && PRESCHOOL_WORLD_GAME_LINKS[forcedThemeId]
            ? forcedThemeId
            : (getPreschoolThemeId() || 'garden-defense');
        const link = PRESCHOOL_WORLD_GAME_LINKS[themeId];
        const playbook = getPreschoolThemePlaybook();
        const href = (link && link.href) || (playbook && playbook.worldGameHref);
        if (!href) return false;
        // 记忆主题，方便返回工作台时仍停在对应主题
        if (forcedThemeId && forcedThemeId !== getPreschoolThemeId() && workbenchConfig.themes && workbenchConfig.themes[forcedThemeId]) {
            commit(function (next) { next.preschoolTheme = forcedThemeId; }, '');
            if (global.PersonalWorkbenchLauncher && typeof global.PersonalWorkbenchLauncher.rememberTheme === 'function') {
                global.PersonalWorkbenchLauncher.rememberTheme(forcedThemeId);
            }
        }
        const from = encodeURIComponent(location.pathname + location.search + '#overview');
        const joiner = href.indexOf('?') === -1 ? '?' : '&';
        location.href = href + joiner + 'theme=' + encodeURIComponent(themeId) + '&from=' + from;
        return true;
    }

    function getDailyGameSunEarned(date) {
        const day = String(date || storage.localDate());
        const awarded = Array.isArray(state.growth && state.growth.awardedIds) ? state.growth.awardedIds : [];
        const prefix = `game-sun:${day}:`;
        return awarded.filter(function (id) {
            return String(id).indexOf(prefix) === 0;
        }).reduce(function (sum, id) {
            const parts = String(id).split(':');
            return sum + (Number(parts[parts.length - 1]) || 0);
        }, 0);
    }

    function getWorldGameProgressRows() {
        const worldGames = (state.growth && state.growth.worldGames && typeof state.growth.worldGames === 'object')
            ? state.growth.worldGames
            : {};
        return ['garden-defense', 'voxel-adventure', 'platform-quest'].map(function (id) {
            const meta = PRESCHOOL_WORLD_GAME_LINKS[id];
            const prog = worldGames[id] && typeof worldGames[id] === 'object' ? worldGames[id] : {};
            let done = 0;
            let detail = '';
            if (id === 'garden-defense') {
                done = Array.isArray(prog.clearedStages) ? prog.clearedStages.length : 0;
                const unlocked = Math.max(1, Number(prog.unlockedStage) || 1);
                detail = `解锁第 ${unlocked} 关 · 通关 ${done}/${meta.total}`;
            } else if (id === 'voxel-adventure') {
                // 横版关卡优先；兼容旧任务进度
                done = Array.isArray(prog.clearedLevels) ? prog.clearedLevels.length
                    : (Array.isArray(prog.questsDone) ? prog.questsDone.length : 0);
                const unlocked = Math.max(1, Number(prog.unlockedLevel) || 1);
                detail = `解锁第 ${unlocked} 关 · 完成 ${done}/${meta.total} 任务`;
            } else {
                done = Array.isArray(prog.clearedLevels) ? prog.clearedLevels.length : 0;
                const unlocked = Math.max(1, Number(prog.unlockedLevel) || 1);
                detail = `解锁第 ${unlocked} 关 · 通关 ${done}/${meta.total}`;
            }
            const percent = Math.max(0, Math.min(100, Math.round((done / meta.total) * 100)));
            return {
                id: id,
                label: meta.label,
                unit: meta.unit,
                total: meta.total,
                done: done,
                percent: percent,
                detail: detail
            };
        });
    }

    function getAdventureMetaView() {
        if (global.WorkbenchGameBridge && typeof global.WorkbenchGameBridge.getMetaSummary === 'function') {
            try {
                return global.WorkbenchGameBridge.getMetaSummary();
            } catch (e) {
                console.warn('[home] meta summary failed', e);
            }
        }
        return null;
    }

    function renderPreschoolHomeWorldProgress() {
        const today = storage.localDate();
        const earned = getDailyGameSunEarned(today);
        const cap = DAILY_GAME_SUN_CAP;
        const sunPct = Math.max(0, Math.min(100, Math.round((earned / cap) * 100)));
        const rows = getWorldGameProgressRows();
        const meta = getAdventureMetaView();
        const cards = rows.map(function (row) {
            const stamp = meta && meta.todayWorlds
                ? (meta.todayWorlds.find(function (w) { return w.id === row.id; }) || {}).played
                : false;
            return `<article class="preschool-world-progress-card theme-${escapeHtml(row.id)}">
                <div class="preschool-world-progress-head">
                    <strong>${escapeHtml(row.label)} ${stamp ? '✓' : ''}</strong>
                    <span>${row.done}/${row.total} ${escapeHtml(row.unit)}</span>
                </div>
                <div class="preschool-world-progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${row.percent}" aria-label="${escapeHtml(row.label)}进度">
                    <i style="width:${row.percent}%"></i>
                </div>
                <small>${escapeHtml(row.detail)}${stamp ? ' · 今日已游玩' : ' · 今日未玩'}</small>
                <button class="preschool-world-progress-go" type="button" data-action="open-world-game" data-theme-id="${escapeHtml(row.id)}">${icon('play')} 进入</button>
            </article>`;
        }).join('');

        let longTerm = '';
        if (meta) {
            const next = meta.nextRank;
            const rankPct = next
                ? Math.max(0, Math.min(100, Math.round((meta.adventurePoints / next.need) * 100)))
                : 100;
            const weekPct = Math.max(0, Math.min(100, Math.round((meta.weekly.playedDays / meta.weekly.goalPlayDays) * 100)));
            const stamps = (meta.todayWorlds || []).map(function (w) {
                const labels = { 'garden-defense': '花园', 'voxel-adventure': '方块', 'platform-quest': '闯关' };
                return `<span class="preschool-adventure-stamp ${w.played ? 'is-on' : ''}">${labels[w.id] || w.id}${w.played ? '✓' : ''}</span>`;
            }).join('');
            const badgePreview = (meta.badges || []).slice(0, 6).map(function (b) {
                return `<span class="preschool-adventure-badge ${b.unlocked ? 'is-on' : ''}" title="${escapeHtml(b.desc)}">${escapeHtml(b.title)}</span>`;
            }).join('');
            longTerm = `<div class="preschool-adventure-meta" aria-label="长期冒险成长">
                <div class="preschool-adventure-meta-main">
                    <span class="pixel-panel-kicker">LONG-TERM / ADVENTURE</span>
                    <h3>${escapeHtml(meta.adventureTitle || '萌芽旅人')} · Lv.${meta.adventureLevel || 1}</h3>
                    <p>累计冒险点 ${meta.adventurePoints || 0}${next ? ` · 下一级「${escapeHtml(next.title)}」还需 ${Math.max(0, next.need - meta.adventurePoints)} 点` : ' · 已达当前最高阶'}</p>
                    <div class="preschool-world-progress-bar" role="progressbar" aria-valuenow="${rankPct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${rankPct}%"></i></div>
                    <div class="preschool-adventure-stamps" aria-label="今日三界点亮记录">${stamps}</div>
                    <small>今日 ${meta.worldsTodayCount || 0}/3 世界 · 本周游玩 ${meta.weekly.playedDays}/${meta.weekly.goalPlayDays} 天${meta.weekly.tripleDone ? ' · 已完成三界日' : ''}</small>
                    <div class="preschool-world-progress-bar is-week" role="progressbar" aria-valuenow="${weekPct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${weekPct}%"></i></div>
                </div>
                <div class="preschool-adventure-meta-side">
                    <strong>徽章 ${meta.badgeUnlocked || 0}/${meta.badgeTotal || 0}</strong>
                    <div class="preschool-adventure-badges">${badgePreview}</div>
                    <small>加成：花园开局+${(meta.bonuses && meta.bonuses.gardenStartSun) || 0}阳光 · 横版金币+${(meta.bonuses && meta.bonuses.platformCoinBonus) || 0} · 晶体+${(meta.bonuses && meta.bonuses.voxelCrystalBonus) || 0}</small>
                </div>
            </div>`;
        }

        return `<section class="preschool-world-progress" aria-label="三世界成长进度">
            <div class="preschool-world-progress-banner">
                <div>
                    <span class="pixel-panel-kicker">WORLD GAMES / LONG-TERM</span>
                    <h2>三世界长期冒险</h2>
                    <p>每天玩一点、三界轮换、周目标与徽章。进度与阳光都写回工作台同一账本。</p>
                </div>
                <div class="preschool-world-daily-sun" aria-label="今日游戏阳光">
                    <span>${preschoolAsset('sun-token', '阳光')}</span>
                    <div>
                        <strong>今日游戏阳光 ${earned} / ${cap}</strong>
                        <div class="preschool-world-progress-bar is-sun" role="progressbar" aria-valuemin="0" aria-valuemax="${cap}" aria-valuenow="${earned}">
                            <i style="width:${sunPct}%"></i>
                        </div>
                        <small>${earned >= cap ? '今日游戏阳光已满' : `还可再赚 ${cap - earned} 阳光`}</small>
                    </div>
                </div>
            </div>
            ${longTerm}
            <div class="preschool-world-progress-grid">${cards}</div>
        </section>`;
    }

    const VOXEL_HOME_CELL_COLOR = {
        '.': '#b8e4ff',
        g: '#5aaa3a',
        d: '#8b5a2b',
        w: '#c47a3a',
        l: '#3d8c3a',
        p: '#e0b060',
        s: '#8a8f99',
        n: '#e6d08a',
        u: '#3d8ec9',
        c: '#3a3a3a',
        y: '#b56bff',
        b: '#4a4a52'
    };

    function renderPreschoolVoxelHomeCard() {
        const bridge = global.WorkbenchGameBridge;
        const live = bridge && typeof bridge.readState === 'function' ? bridge.readState() : null;
        const prog = ((live && live.growth && live.growth.worldGames)
            || (state.growth && state.growth.worldGames)
            || {})['voxel-adventure'] || {};
        const snap = prog.homeSnapshot && typeof prog.homeSnapshot === 'object' ? prog.homeSnapshot : null;
        const grid = snap && Array.isArray(snap.grid) ? snap.grid : [];
        const ready = grid.length > 0 && String(grid[0] || '').length > 0;
        let mosaic = '';
        if (ready) {
            const rows = grid.slice(0, 18);
            const cols = String(rows[0] || '').length;
            mosaic = `<div class="preschool-voxel-home-grid" style="--cols:${Math.max(1, cols)}" aria-hidden="true">${rows.map(function (line) {
                return String(line).split('').map(function (ch) {
                    return `<i style="background:${VOXEL_HOME_CELL_COLOR[ch] || '#d9e8f2'}"></i>`;
                }).join('');
            }).join('')}</div>`;
        } else {
            mosaic = '<p class="preschool-voxel-home-empty">还没有家园快照。去方块世界搭一搭，点「拍照」再回来看。</p>';
        }
        const blocks = ready ? (Number(snap.blocks) || 0) : 0;
        const date = ready && snap.date ? snap.date : '';
        return `<section class="preschool-voxel-home" aria-label="我的家园">
            <div class="preschool-voxel-home-copy">
                <span class="pixel-panel-kicker">VOXEL / MY HOME</span>
                <h2>我的家园</h2>
                <p>${ready ? `已用 ${blocks} 块${date ? ' · 更新于 ' + escapeHtml(date) : ''}` : '作品就是证据，搭好拍一张给家长看。'}</p>
                <button class="preschool-world-progress-go" type="button" data-action="open-world-game" data-theme-id="voxel-adventure">${icon('play')} 去方块世界</button>
            </div>
            <div class="preschool-voxel-home-frame">${mosaic}</div>
        </section>`;
    }

    function syncPreschoolGameNavLabels() {
        if (!isPreschool) return;
        const playbook = getPreschoolThemePlaybook();
        const label = playbook.navGameLabel || '植物大战';
        document.querySelectorAll('.nav-item[data-page="battle"] span, .preschool-mobile-nav-item[data-page="battle"] span').forEach(function (node) {
            node.textContent = label;
        });
        document.querySelectorAll('.preschool-mobile-nav-item[data-page="battle"]').forEach(function (node) {
            node.setAttribute('aria-label', label);
            node.setAttribute('title', label);
        });
        const usesWorld = Boolean(playbook.worldGameHref);
        document.querySelectorAll('.nav-item[data-page="battle"], .preschool-mobile-nav-item[data-page="battle"]').forEach(function (node) {
            if (usesWorld) {
                node.dataset.action = 'open-world-game';
            } else {
                node.dataset.action = 'navigate';
                node.dataset.page = 'battle';
            }
        });
    }

    function syncPreschoolCopyLabels() {
        if (!isPreschool) return;
        Object.keys(PRESCHOOL_NAV_LABELS).forEach(function (page) {
            const label = PRESCHOOL_NAV_LABELS[page];
            document.querySelectorAll('.nav-item[data-page="' + page + '"] span, .preschool-mobile-nav-item[data-page="' + page + '"] span').forEach(function (node) {
                node.textContent = label;
            });
        });
        document.querySelectorAll('.topbar-workbench-option[data-workbench-theme] small').forEach(function (node) {
            const themeId = node.closest('.topbar-workbench-option').getAttribute('data-workbench-theme');
            const summary = PRESCHOOL_COPY.themeSummaries[themeId];
            if (summary) node.textContent = summary;
        });
    }

    function getPreschoolThemeId() {
        if (!isPreschool) return '';
        const themes = workbenchConfig.themes || {};
        const candidate = state && state.preschoolTheme;
        if (candidate && themes[candidate]) return candidate;
        return themes[workbenchConfig.defaultTheme] ? workbenchConfig.defaultTheme : 'garden-defense';
    }

    function getPreschoolThemeConfig() {
        if (!isPreschool) return null;
        const themes = workbenchConfig.themes || {};
        return themes[getPreschoolThemeId()] || themes['garden-defense'] || null;
    }

    function getPreschoolThemeAssetName(name) {
        const themeId = getPreschoolThemeId();
        const aliases = PRESCHOOL_THEME_ASSET_ALIASES[themeId] || {};
        return aliases[name] || name;
    }

    function applyPreschoolTheme() {
        if (!isPreschool) return;
        const theme = getPreschoolThemeConfig();
        if (!theme) return;
        const themeId = theme.id;
        document.body.dataset.preschoolTheme = themeId;
        document.body.classList.remove('preschool-theme-garden-defense', 'preschool-theme-voxel-adventure', 'preschool-theme-platform-quest');
        document.body.classList.add(`preschool-theme-${themeId}`);
        document.title = theme.name;
        const brand = document.querySelector('.brand strong');
        const brandSmall = document.querySelector('.brand small');
        const context = document.querySelector('.topbar-context span');
        const firstSectionLabel = document.querySelector('.sidebar-section-label');
        if (brand) brand.textContent = theme.name;
        if (brandSmall) brandSmall.textContent = theme.englishName;
        if (context) context.textContent = theme.name;
        if (firstSectionLabel) firstSectionLabel.textContent = theme.navLabel || '小小路线';
        document.querySelectorAll('[data-preschool-nav-art]').forEach(function (image) {
            const slot = image.dataset.preschoolNavArt || '';
            const assetName = theme.assetMap && theme.assetMap[slot];
            if (!assetName) return;
            image.src = preschoolAssetSrc(assetName);
            image.alt = '';
        });
    }

    function attachPhonicsReferenceMaterial() {
        if (!phonicsReferenceBank || !Array.isArray(phonicsReferenceBank.lessons)) return;
        const materials = new Map(phonicsReferenceBank.lessons.map(function (item) { return [item.id, item]; }));
        const courses = Array.isArray(workbenchConfig.childCourses) ? workbenchConfig.childCourses : [];
        const course = courses.find(function (item) { return item.id === 'preschool-english'; });
        if (!course || !Array.isArray(course.lessons)) return;
        course.lessons.forEach(function (lesson) {
            if (!lesson.referenceMaterialId) return;
            const material = materials.get(lesson.referenceMaterialId);
            if (material) lesson.referenceMaterial = material;
        });
    }

    function loadPhonicsReferenceBank() {
        if (!isPreschool || phonicsReferenceStatus !== 'idle' || typeof global.fetch !== 'function') return;
        phonicsReferenceStatus = 'loading';
        global.fetch(PHONICS_REFERENCE_URL).then(function (response) {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
        }).then(function (payload) {
            if (!payload || payload.id !== 'open-source-phonics-reference-bank' || payload.status !== 'reference-only' || !Array.isArray(payload.lessons)) {
                throw new Error('reference bank schema invalid');
            }
            phonicsReferenceBank = payload;
            phonicsReferenceStatus = 'ready';
            attachPhonicsReferenceMaterial();
            render();
        }).catch(function (error) {
            phonicsReferenceStatus = 'failed';
            console.warn('[PersonalWorkbench] 自然拼读参考素材加载失败，继续使用内置测验', error);
        });
    }

    function getRouteFromHash() {
        const raw = (location.hash || '#overview').slice(1);
        const [route, query = ''] = raw.split('?');
        const params = new URLSearchParams(query);
        return { page: route || 'overview', courseId: params.get('course') || '', courseTab: params.get('tab') || '' };
    }

    function getPageFromHash() {
        const candidate = getRouteFromHash().page;
        return PAGE_META[candidate] ? candidate : 'overview';
    }

    function getCourseIdFromHash() {
        const route = getRouteFromHash();
        return route.page === 'courses' ? route.courseId : '';
    }

    function getCourseTabFromHash() {
        const tab = getRouteFromHash().courseTab;
        return tab === 'media' || tab === 'menu' ? tab : 'today';
    }

    function icon(name, className) {
        return `<i data-lucide="${name}"${className ? ` class="${className}"` : ''}></i>`;
    }

    function preschoolAssetSrc(name) {
        if (isPreschool && PRESCHOOL_FOCUS_GAME_ASSETS[name]) return PRESCHOOL_FOCUS_GAME_ASSETS[name];
        const resolvedName = isPreschool ? getPreschoolThemeAssetName(name) : name;
        const themePack = isPreschool ? PRESCHOOL_THEME_ASSET_FILES[getPreschoolThemeId()] : null;
        if (themePack && themePack[resolvedName]) return themePack[resolvedName];
        const nonGardenTheme = isPreschool && getPreschoolThemeId() !== 'garden-defense';
        if (isPreschool && nonGardenTheme && PIXEL_REFRESH_ASSETS[resolvedName]) return `${PIXEL_REFRESH_ASSET_BASE}${PIXEL_REFRESH_ASSETS[resolvedName]}`;
        if (isPreschool && nonGardenTheme && PIXEL_ASSET_FILES[resolvedName]) return `${PIXEL_ASSET_BASE}${PIXEL_ASSET_FILES[resolvedName]}`;
        if (isPreschool && PRESCHOOL_PVZ_ASSETS[resolvedName]) {
            const pvzFile = PRESCHOOL_PVZ_ASSETS[resolvedName];
            if (/^(https?:)?\/\//.test(pvzFile) || pvzFile.indexOf('../assets/') === 0) return pvzFile;
            return `${PRESCHOOL_PVZ_ASSET_BASE}${pvzFile}`;
        }
        if (isPreschool && PRESCHOOL_SOFT_ASSETS[resolvedName]) return `../assets/generated/preschool/${PRESCHOOL_SOFT_ASSETS[resolvedName]}`;
        if (isPreschool && PIXEL_REFRESH_ASSETS[resolvedName]) return `${PIXEL_REFRESH_ASSET_BASE}${PIXEL_REFRESH_ASSETS[resolvedName]}`;
        if (isPreschool && PIXEL_ASSET_FILES[resolvedName]) return `${PIXEL_ASSET_BASE}${PIXEL_ASSET_FILES[resolvedName]}`;
        const base = workbenchConfig.current && workbenchConfig.current.assetBase ? workbenchConfig.current.assetBase : '../assets/generated/preschool/';
        return `${base}${resolvedName}.webp`;
    }

    function preschoolAsset(name, alt) {
        const pvzClass = getPreschoolThemeId() === 'garden-defense' && /^plant-|^zombie-/.test(String(name || '')) ? ' preschool-pvz-art' : '';
        return `<img class="preschool-generated-art${pvzClass}" src="${escapeHtml(preschoolAssetSrc(name))}" alt="${escapeHtml(alt || '')}" loading="lazy" onerror="this.hidden=true">`;
    }

    function preschoolAssetForIcon(iconName) {
        const assets = {
            sun: 'sun-token',
            sprout: 'seedling-node',
            droplets: 'water-drop-token',
            'book-open': 'storybook-token',
            gift: 'treasure-chest',
            bug: 'zombie-basic',
            sparkles: 'star-companion',
            heart: 'star-companion',
            'heart-handshake': 'star-companion',
            calculator: 'sun-token',
            languages: 'storybook-token',
            moon: 'star-companion',
            'shield-check': 'plant-wallnut',
            target: 'plant-peashooter',
            snowflake: 'plant-snowpea',
            flame: 'plant-cherrybomb',
            'flower-2': 'plant-sunflower',
            rainbow: 'growth-tree',
            crown: 'star-companion',
            'gamepad-2': 'treasure-chest',
            stamp: 'sun-smile-badge',
            map: 'quest-flag-pedestal'
        };
        return assets[iconName] || '';
    }

    function preschoolPlantAsset(plant) {
        const source = plant && typeof plant === 'object' ? plant : {};
        const byId = {
            'plant-sunflower': 'plant-sunflower',
            'plant-peashooter': 'plant-peashooter',
            'plant-wallnut': 'plant-wallnut',
            'plant-snowpea': 'plant-snowpea',
            'plant-cherrybomb': 'plant-cherrybomb',
            'plant-sun-sprout': 'plant-sunflower',
            'plant-moon-mint': 'plant-snowpea',
            'plant-star-flower': 'plant-cherrybomb',
            'plant-rainbow-tree': 'plant-wallnut'
        };
        return byId[source.id] || 'plant-sunflower';
    }

    function preschoolInvaderProfile(invader) {
        const catalog = preschoolGarden && Array.isArray(preschoolGarden.ZOMBIE_CATALOG) ? preschoolGarden.ZOMBIE_CATALOG : [];
        return catalog.find(item => item.id === (invader && invader.kind)) || catalog[0] || { id: 'zombie-basic', title: '普通僵尸', asset: 'zombie-basic' };
    }

    function preschoolVisual(iconName, assetName, alt) {
        return `<span class="preschool-card-visual ${assetName ? 'has-image' : ''}">${assetName ? preschoolAsset(assetName, alt) : icon(iconName)}</span>`;
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function clamp(value, min, max) {
        const number = Number(value);
        return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : min;
    }

    function formatDuration(minutes) {
        const value = Math.max(0, Number(minutes) || 0);
        if (value < 60) return `${value} 分钟`;
        const hours = Math.floor(value / 60);
        const remainder = value % 60;
        return remainder ? `${hours} 小时 ${remainder} 分` : `${hours} 小时`;
    }

    function formatDate(dateValue) {
        const date = String(dateValue || '');
        if (!date) return '未设置日期';
        const today = storage.localDate();
        if (date === today) return '今天';
        const parsed = new Date(`${date}T12:00:00`);
        if (Number.isNaN(parsed.getTime())) return date;
        return `${parsed.getMonth() + 1}月${parsed.getDate()}日`;
    }

    function formatLongDate(dateValue) {
        const date = String(dateValue || '');
        const parsed = new Date(`${date}T12:00:00`);
        if (Number.isNaN(parsed.getTime())) return date;
        return `${parsed.getFullYear()}年${parsed.getMonth() + 1}月${parsed.getDate()}日`;
    }

    function dateLabel(dateValue) {
        const date = String(dateValue || '');
        const labels = ['日', '一', '二', '三', '四', '五', '六'];
        const parsed = new Date(`${date}T12:00:00`);
        return Number.isNaN(parsed.getTime()) ? '' : `周${labels[parsed.getDay()]}`;
    }

    function daysInRange(days) {
        return Array.from({ length: days }, function (_, index) {
            const value = new Date();
            value.setDate(value.getDate() - (days - 1 - index));
            return storage.localDate(value);
        });
    }

    function getDerived() {
        const today = storage.localDate();
        const todayPlans = state.dailyPlans.filter(item => item.date === today).sort((a, b) => (a.order || 0) - (b.order || 0));
        const todayCorePlans = todayPlans.filter(item => item.required === true);
        const todayOptionalPlans = todayPlans.filter(item => item.required !== true);
        const week = daysInRange(7);
        const focusByDate = week.map(date => state.focusSessions.filter(item => item.date === date).reduce((sum, item) => sum + (Number(item.minutes) || 0), 0));
        const readingByDate = week.map(date => state.readingLogs.filter(item => item.date === date).reduce((sum, item) => sum + (Number(item.minutes) || 0), 0));
        const todayFocus = focusByDate[6] || 0;
        const weekFocus = focusByDate.reduce((sum, item) => sum + item, 0);
        const weekReading = readingByDate.reduce((sum, item) => sum + item, 0);
        const weekPages = state.readingLogs.filter(item => week.includes(item.date)).reduce((sum, item) => sum + (Number(item.pages) || 0), 0);
        const monthKey = today.slice(0, 7);
        const monthReading = state.readingLogs.filter(item => String(item.date).slice(0, 7) === monthKey).reduce((sum, item) => sum + (Number(item.minutes) || 0), 0);
        const completedPlans = todayPlans.filter(item => item.done).length;
        const completedTasks = state.tasks.filter(item => item.status === 'done' || Number(item.progress) >= 100).length;
        const activityDates = new Set(state.focusSessions.concat(state.readingLogs).map(item => item.date));
        state.dailyPlans.filter(item => item.done).forEach(item => activityDates.add(item.date));
        let streak = 0;
        for (let offset = 0; offset < 365; offset += 1) {
            const value = new Date();
            value.setDate(value.getDate() - offset);
            if (!activityDates.has(storage.localDate(value))) break;
            streak += 1;
        }
        const adult = isAdult && state.adult ? state.adult : { lifeEntries: [], habits: [], milestones: [], archive: [], language: 'zh-CN' };
        const year = today.slice(0, 4);
        const yearFocus = state.focusSessions.filter(item => String(item.date).startsWith(year)).reduce((sum, item) => sum + (Number(item.minutes) || 0), 0);
        const yearReading = state.readingLogs.filter(item => String(item.date).startsWith(year)).reduce((sum, item) => sum + (Number(item.minutes) || 0), 0);
        const yearCompleted = state.tasks.filter(item => item.status === 'done' && String(item.completedAt || '').startsWith(year)).length
            + state.dailyPlans.filter(item => item.done && String(item.completedAt || '').startsWith(year)).length
            + adult.lifeEntries.filter(item => item.status === 'done' && String(item.updatedAt || '').startsWith(year)).length;
        const yearActivityDates = new Set(activityDates);
        adult.habits.forEach(function (habit) { habit.checkedDates.filter(date => String(date).startsWith(year)).forEach(date => yearActivityDates.add(date)); });
        const dueSoon = adult.milestones.slice().sort((a, b) => String(a.date).localeCompare(String(b.date))).filter(item => item.date && item.date >= today).slice(0, 5);
        const overdueMilestones = adult.milestones.filter(item => item.date && item.date < today).length;
        const todayHabits = adult.habits.map(function (habit) { return Object.assign({}, habit, { checked: habit.checkedDates.includes(today) }); });
        const yearDaysActive = Array.from(yearActivityDates).filter(date => String(date).startsWith(year)).length;
        return { today, todayPlans, todayCorePlans, todayOptionalPlans, week, focusByDate, readingByDate, todayFocus, weekFocus, weekReading, weekPages, monthReading, completedPlans, completedTasks, streak, adult, yearFocus, yearReading, yearCompleted, yearDaysActive, dueSoon, overdueMilestones, todayHabits };
    }

    function setPage(page, replace, courseId, courseTab) {
        const requested = PAGE_META[page] ? page : 'overview';
        if (isPreschool && requested === 'battle' && openPreschoolWorldGame()) return;
        ui.page = requested;
        const nextCourseId = ui.page === 'courses' ? String(courseId || '') : '';
        const courseChanged = ui.courseId !== nextCourseId;
        if (courseChanged) {
            ui.courseCards = null;
            ui.courseClassic = false;
            ui.courseTab = 'today';
            ui.mediaBvid = '';
        }
        ui.courseId = nextCourseId;
        if (courseTab) {
            ui.courseTab = courseTab === 'media' || courseTab === 'menu' ? courseTab : 'today';
            ui.courseClassic = ui.courseTab === 'menu';
        } else if (!courseChanged && requested === 'courses' && nextCourseId) {
            ui.courseTab = 'today';
            ui.courseClassic = false;
        }
        if (ui.page !== 'growth') ui.growthWorld = '';
        if (ui.page !== 'battle') {
            ui.battleEffect = null;
            if (preschoolBattleEffectTimer) {
                window.clearTimeout(preschoolBattleEffectTimer);
                preschoolBattleEffectTimer = 0;
            }
        }
        if (ui.lessonSession && ui.lessonSession.courseId === 'preschool-focus' && (ui.page !== 'courses' || ui.courseId !== 'preschool-focus')) {
            clearLessonMotionTimer();
            clearLessonSimonTimer();
            clearFocusPlayClock();
            ui.lessonSession = null;
        }
        if (ui.page === 'courses') ui.courseNavExpanded = true;
        const tabQuery = ui.page === 'courses' && ui.courseId && ui.courseTab && ui.courseTab !== 'today' ? `&tab=${encodeURIComponent(ui.courseTab)}` : '';
        const hash = ui.page === 'courses' && ui.courseId ? `#courses?course=${encodeURIComponent(ui.courseId)}${tabQuery}` : `#${ui.page}`;
        if (replace) history.replaceState(null, '', hash);
        else if (location.hash !== hash) location.hash = hash;
        render();
        if (shouldAutoCloseSidebar()) closeSidebar();
        window.scrollTo(0, 0);
    }

    function applyCourseTab(tab) {
        ui.courseTab = tab === 'media' || tab === 'menu' ? tab : 'today';
        ui.courseClassic = ui.courseTab === 'menu';
        if (ui.page === 'courses' && ui.courseId) {
            const tabQuery = ui.courseTab !== 'today' ? `&tab=${encodeURIComponent(ui.courseTab)}` : '';
            const hash = `#courses?course=${encodeURIComponent(ui.courseId)}${tabQuery}`;
            if (location.hash !== hash) history.replaceState(null, '', hash);
        }
        render();
    }

    function render() {
        ui._inRender = true;
        const meta = PAGE_META[ui.page];
        const derived = getDerived();
        if (isPreschool) {
            applyPreschoolTheme();
            syncPreschoolGameNavLabels();
            syncPreschoolCopyLabels();
            document.body.classList.toggle('preschool-no-motion', !getPreschoolFeedbackPreference('motionEnabled', true));
            document.body.classList.toggle('is-focus-arcade', isFocusInlineSession());
        }
        updateModeStatus();
        document.querySelectorAll('.nav-item').forEach(function (item) {
            item.classList.toggle('is-active', item.dataset.page === ui.page && (!item.dataset.courseId || item.dataset.courseId === ui.courseId));
        });
        document.querySelectorAll('[data-mobile-nav]').forEach(function (item) {
            item.classList.toggle('is-active', item.dataset.mobileNav !== 'more' && item.dataset.page === ui.page);
        });
        setCourseNavExpanded(ui.courseNavExpanded);
        const activeCourse = isPreschool && ui.page === 'courses' ? getPreschoolCourseById(ui.courseId) : null;
        pageName.textContent = activeCourse ? activeCourse.title : meta.title;
        if (isPreschool) pageContent.innerHTML = renderPreschoolPage(derived);
        else {
            if (ui.page === 'overview') pageContent.innerHTML = renderOverview(derived);
            if (ui.page === 'growth') pageContent.innerHTML = renderGrowthMap();
            if (ui.page === 'plans') pageContent.innerHTML = renderPlans(derived);
            if (ui.page === 'tasks') pageContent.innerHTML = renderTasks(derived);
            if (ui.page === 'mistakes') pageContent.innerHTML = renderMistakes();
            if (ui.page === 'courses') pageContent.innerHTML = renderCourses();
            if (ui.page === 'reading') pageContent.innerHTML = renderReading(derived);
            if (ui.page === 'goals') pageContent.innerHTML = renderGoals(derived);
            if (ui.page === 'life') pageContent.innerHTML = renderLife(derived);
            if (ui.page === 'archive') pageContent.innerHTML = renderArchive(derived);
            if (ui.page === 'rewards') pageContent.innerHTML = renderRewards();
            if (ui.page === 'family') pageContent.innerHTML = renderFamily();
            if (ui.page === 'account') pageContent.innerHTML = renderAccount();
            if (ui.page === 'settings') pageContent.innerHTML = renderSettings();
            if (ui.page === 'reviews') pageContent.innerHTML = renderReviews(derived);
        }
        if (isPreschool) {
            pageContent.classList.remove('pixel-page-enter');
            void pageContent.offsetWidth;
            pageContent.classList.add('pixel-page-enter');
            // The preschool battle route is the stable, click-driven lawn battlefield.
            // The separate 5x6 defense prototype owns its timer only when explicitly
            // reintroduced as a dedicated route; it must not rebuild this page here.
            stopPreschoolDefenseLoop();
        }
        applyLanguagePreference();
        global.lucide.createIcons({ root: pageContent });
        ui._inRender = false;
    }

    function setCourseNavExpanded(expanded) {
        const toggle = document.querySelector('[data-action="open-course-wall"], [data-action="toggle-course-nav"]');
        const nav = document.getElementById('preschool-course-nav');
        if (!toggle || !nav) return;
        const isExpanded = Boolean(expanded);
        toggle.classList.toggle('is-collapsed', !isExpanded);
        toggle.classList.toggle('is-active', ui.page === 'courses');
        toggle.setAttribute('aria-expanded', String(isExpanded));
        nav.classList.toggle('is-collapsed', !isExpanded);
    }

    function updateModeStatus() {
        const status = api && typeof api.getStatus === 'function'
            ? api.getStatus()
            : { label: '本地模式', detail: '数据保存在此设备' };
        const label = document.querySelector('.mode-status strong');
        const detail = document.querySelector('.mode-status small');
        if (label) label.textContent = status.label;
        if (detail) detail.textContent = status.detail;
    }

    const ADULT_ENGLISH_LABELS = {
        overview: 'Overview', plans: 'Today plan', tasks: 'Growth tasks', reading: 'Reading', goals: 'Long-term goals',
        life: 'Life OS', archive: 'Archive & stats', family: 'Family', reviews: 'Weekly review', account: 'Account & sync', settings: 'Settings'
    };

    function applyLanguagePreference() {
        if (!isAdult) return;
        const language = state.adult && state.adult.language === 'en-US' ? 'en-US' : 'zh-CN';
        const english = language === 'en-US';
        document.documentElement.lang = language;
        document.body.dataset.language = language;
        document.querySelectorAll('.nav-item').forEach(function (item) {
            const label = item.querySelector('span');
            if (label && ADULT_ENGLISH_LABELS[item.dataset.page]) label.textContent = english ? ADULT_ENGLISH_LABELS[item.dataset.page] : (PAGE_META[item.dataset.page] ? PAGE_META[item.dataset.page].title : label.textContent);
        });
        if (pageName) pageName.textContent = english ? (ADULT_ENGLISH_LABELS[ui.page] || PAGE_META[ui.page].title) : PAGE_META[ui.page].title;
        const context = document.querySelector('.topbar-context span');
        if (context) context.textContent = english ? 'LIFE OS / ADULT WORKBENCH' : 'ADULT GROWTH WORKBENCH';
    }

    function renderIntro(meta, action, actionLabel, secondary) {
        const resolvedActionLabel = ACTION_COPY_VARIANT && action === 'add-plan'
            ? PRESCHOOL_COPY.addPlanLabel
            : (workbenchConfig.actions && workbenchConfig.actions[action] ? workbenchConfig.actions[action] : actionLabel);
        const primary = action ? `<button class="btn-primary" type="button" data-action="${action}">${icon('plus')}${resolvedActionLabel}</button>` : '';
        return `<div class="page-intro"><div><span class="eyebrow">${meta.eyebrow}</span><h1>${meta.heading}</h1><p>${meta.description}</p></div><div class="page-intro-actions">${secondary || ''}${primary}</div></div>`;
    }

    function renderPreschoolIntro(meta, action, actionLabel, secondary) {
        const resolvedActionLabel = action === 'add-plan'
            ? PRESCHOOL_COPY.addPlanLabel
            : (workbenchConfig.actions && workbenchConfig.actions[action] ? workbenchConfig.actions[action] : actionLabel);
        const primary = action ? `<button class="btn-primary preschool-primary-action" type="button" data-action="${action}">${icon('plus')}${resolvedActionLabel}</button>` : '';
        return `<div class="preschool-page-intro"><div><span class="eyebrow">${meta.eyebrow}</span><h1>${meta.title}</h1><p>${meta.description}</p></div><div class="page-intro-actions">${secondary || ''}${primary}</div></div>`;
    }

    function renderPreschoolChoiceCard(page, iconName, title, caption, tone, assetName) {
        return `<button class="preschool-choice-card tone-${escapeHtml(tone || 'blue')}" type="button" data-action="navigate" data-page="${escapeHtml(page)}">${preschoolVisual(iconName, assetName, title)}<strong>${escapeHtml(title)}</strong><small>${escapeHtml(caption)}</small></button>`;
    }

    function getPreschoolGarden(growth) {
        if (!isPreschool || !preschoolGarden || typeof preschoolGarden.getView !== 'function') return null;
        return growth && growth.garden ? growth : Object.assign({}, growth, preschoolGarden.getView(state.growth, storage.localDate()));
    }

    function getPreschoolDefense(growth) {
        if (!isPreschool || !preschoolGarden || typeof preschoolGarden.getDefenseView !== 'function') {
            return { energy: 0, shots: 0, invader: { active: false, health: 0, maxHealth: 0, wave: 0 }, canFire: false };
        }
        return preschoolGarden.getDefenseView(state.growth || growth, storage.localDate());
    }

    function stopPreschoolDefenseLoop() {
        if (!preschoolDefenseTimer) return;
        window.clearInterval(preschoolDefenseTimer);
        preschoolDefenseTimer = 0;
    }

    function ensurePreschoolDefenseLoop() {
        if (!isPreschool || ui.page !== 'battle' || !preschoolGarden || typeof preschoolGarden.tickDefense !== 'function') {
            stopPreschoolDefenseLoop();
            return;
        }
        if (preschoolDefenseTimer) return;
        preschoolDefenseTimer = window.setInterval(function () {
            if (ui.page !== 'battle') {
                stopPreschoolDefenseLoop();
                return;
            }
            commit(function (next) {
                const result = preschoolGarden.tickDefense(next.growth, 1);
                next.growth = result.growth;
            }, null);
        }, 720);
    }

    function renderPreschoolCollection(growth) {
        const collection = growth.collection || { catalog: [], unlockedIds: [], total: 0 };
        const catalog = Array.isArray(collection.catalog) ? collection.catalog : [];
        return `<section class="preschool-section preschool-collection-section"><div class="preschool-section-head"><div><span class="eyebrow">COLLECTION</span><h2>我的小收藏</h2></div><span class="tag gold">${collection.unlockedIds.length}/${collection.total} 张</span></div><div class="preschool-collection-grid">${catalog.map(function (item) {
            const unlocked = collection.unlockedIds.includes(item.id);
            const assetName = preschoolAssetForIcon(item.icon || '');
            return `<article class="preschool-collection-card ${unlocked ? 'is-unlocked' : 'is-locked'} tone-${escapeHtml(item.tone || 'blue')}"><span class="collection-card-icon ${assetName ? 'has-image' : ''}">${assetName ? preschoolAsset(assetName, unlocked ? item.title : '待发现') : icon(item.icon || 'sparkles')}</span><strong>${escapeHtml(unlocked ? item.title : '待发现')}</strong><small>${escapeHtml(unlocked ? item.description : '完成小任务来收集')}</small></article>`;
        }).join('')}</div></section>`;
    }

    function isPreschoolTimedCheckin(item) {
        return Boolean(item && item.checkinMode === 'timed');
    }

    function getPreschoolPlanCourseId(item) {
        const practice = getPreschoolPlanPractice(item);
        if (practice && practice.course && practice.course.id) return practice.course.id;
        if (item && item.id === 'preschool-plan-picturebook') return 'preschool-literacy';
        if (item && (item.id === 'preschool-plan-cartoon' || item.id === 'preschool-plan-listen')) return 'preschool-english';
        const category = String(item && item.category || '');
        if (category === '识字' || category === '阅读') return 'preschool-literacy';
        if (category === '古诗') return 'preschool-poetry';
        if (category === '数学') return 'preschool-math';
        if (category === '英语') return 'preschool-english';
        if (category === '运动') return 'preschool-exercise';
        if (category === '专注') return 'preschool-focus';
        return '';
    }

    function preschoolTimedCheckinMinutes() {
        return [10, 15, 20, 25, 30, 40, 60];
    }

    function snapPreschoolTimedMinutes(value) {
        const minutes = preschoolTimedCheckinMinutes();
        const raw = Number(value);
        if (!Number.isFinite(raw) || raw <= 0) return 20;
        return minutes.reduce(function (best, item) {
            return Math.abs(item - raw) < Math.abs(best - raw) ? item : best;
        }, minutes[0]);
    }

    function renderPreschoolPlanRows(items, options) {
        const editable = Boolean(options && options.editable);
        if (!items.length) return renderEmpty('sparkles', '先创建一项');
        const playbook = getPreschoolThemePlaybook();
        const lanePlants = playbook.lanePlants || ['plant-sunflower', 'plant-peashooter', 'plant-wallnut'];
        if (editable) {
            return `<div class="preschool-plan-list preschool-plan-lanes">${items.map(function (item) {
                const done = Boolean(item.done);
                const practice = item.practiceLessonId ? getPreschoolPlanPractice(item) : null;
                const minutes = getPreschoolPlanMinutes(item);
                const timed = isPreschoolTimedCheckin(item);
                const meta = [item.category || '学习', item.hint || (minutes ? `${minutes} 分钟` : ''), item.required === true ? '必做' : '选做', timed ? '选时长' : '', practice ? '带练习' : ''].filter(Boolean).join(' · ');
                return `<article class="preschool-plan-row ${done ? 'is-done' : ''}">
                    <span class="preschool-plan-row-art">${preschoolAsset(pixelQuestAsset(item), item.category || '学习')}</span>
                    <div class="preschool-plan-row-copy"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(meta)}</small></div>
                    <span class="preschool-plan-row-status ${done ? 'is-done' : ''}">${done ? `${icon('check')} 已点亮` : '还没点亮'}</span>
                    <div class="preschool-plan-manage" aria-label="调整任务"><button class="row-action" type="button" data-action="edit-plan" data-id="${escapeHtml(item.id)}" data-date="${escapeHtml(item.date)}" aria-label="编辑${escapeHtml(item.title)}" title="编辑任务">${icon('edit-3')}<span>编辑</span></button><button class="row-action danger" type="button" data-action="delete-plan" data-id="${escapeHtml(item.id)}" data-date="${escapeHtml(item.date)}" aria-label="删除${escapeHtml(item.title)}" title="删除任务">${icon('trash-2')}<span>删除</span></button></div>
                </article>`;
            }).join('')}</div>`;
        }
        const nextOpen = items.find(function (item) { return !item.done; });
        const nextOpenId = nextOpen ? nextOpen.id : '';
        return `<div class="preschool-home-lanes preschool-plan-lanes">${items.map(function (item, index) {
            const done = Boolean(item.done);
            const plantAsset = lanePlants[index % lanePlants.length];
            const isNow = !done && item.id === nextOpenId;
            const courseId = getPreschoolPlanCourseId(item);
            const practiceBtn = preschoolHomeLanePracticeButton(item);
            return `<article class="preschool-home-lane ${done ? 'is-done' : ''} ${item.required === true ? 'is-required' : 'is-optional'}${practiceBtn ? '' : ' main-only'}${isNow ? ' is-now' : ''}">
                <button class="preschool-home-lane-main" type="button" data-action="${courseId ? 'open-plan-course' : 'toggle-plan'}" data-id="${escapeHtml(item.id)}" data-date="${escapeHtml(item.date)}" ${courseId ? `data-course-id="${escapeHtml(courseId)}"` : ''} aria-label="${courseId ? '去学习' : (done ? '取消完成' : '完成')}${escapeHtml(item.title)}">
                    <span class="preschool-home-lane-characters"><span class="preschool-home-lane-plant">${preschoolAsset(plantAsset, '伙伴')}</span></span>
                    <span class="preschool-home-lane-copy"><small>${item.hint || (item.required === true ? '必做' : '选做')}</small><strong>${escapeHtml(item.title)}</strong></span>
                    <span class="preschool-home-lane-status">${courseId ? '去学习' : (done ? `${icon('check')} 已点亮` : `${preschoolAsset('sun-token', playbook.currency)} +10`)}</span>
                </button>
                ${practiceBtn}
                <button class="preschool-home-lane-check" type="button" data-action="toggle-plan" data-id="${escapeHtml(item.id)}" data-date="${escapeHtml(item.date)}" aria-label="${done ? '取消点亮' : '点亮'}${escapeHtml(item.title)}">${done ? `${icon('check')} 已点亮` : `${preschoolAsset('sun-token', playbook.currency)} 点亮`}</button>
            </article>`;
        }).join('')}</div>`;
    }

    function pixelQuestAsset(item) {
        const category = String(item && item.category || '学习');
        if (category === '语文' || category === '阅读' || category === '识字' || category === '古诗') return 'task-book-icon';
        if (category === '数学') return 'task-sun-icon';
        if (category === '英语') return 'task-water-icon';
        if (category === '创意') return 'flower-pot';
        if (category === '运动') return 'seedling-node';
        if (category === '生活' || category === '专注') return 'cat-helper';
        return 'star-companion';
    }

    function pixelQuestCard(item, index) {
        const done = Boolean(item.done);
        const label = done ? '已点亮' : '完成 +10 阳光';
        const asset = pixelQuestAsset(item);
        return `<button class="pixel-quest-card workbench-task-card quest-tone-${index % 3} ${done ? 'is-done' : ''}" type="button" data-action="toggle-plan" data-id="${escapeHtml(item.id)}" data-date="${escapeHtml(item.date)}" aria-label="${done ? '取消完成' : '完成'}${escapeHtml(item.title)}">
            <span class="pixel-quest-ribbon">${escapeHtml(item.category || '学习')}</span>
            <span class="pixel-quest-art workbench-task-art">${preschoolAsset(asset, item.title)}</span>
            <span class="pixel-quest-copy workbench-task-copy"><small>${done ? '已点亮' : '今天的冒险'}</small><strong>${escapeHtml(item.title)}</strong><em>${label}任务 <span>${done ? icon('check') : icon('arrow-right')}</span></em></span>
            <span class="pixel-quest-status ${done ? 'is-done' : ''}">${done ? icon('check') : ''}</span>
        </button>`;
    }

    function renderPixelMap(growth, plans, compact) {
        const garden = growth.garden || {};
        const invader = garden.invader || { active: false };
        const defense = getPreschoolDefense(growth);
        const activePlant = garden.activePlant || { id: 'plant-sunflower', title: '向日葵', icon: 'sun', tone: 'gold' };
        const battleEffect = ui.battleEffect || {};
        const invaderProfile = preschoolInvaderProfile(invader);
        const nodes = plans.slice(0, 3).map(function (item, index) {
            const active = !item.done && plans.slice(0, index).every(entry => entry.done);
            return `<button class="pixel-map-node ${item.done ? 'is-done' : active ? 'is-active' : ''}" type="button" data-action="toggle-plan" data-id="${escapeHtml(item.id)}" data-date="${escapeHtml(item.date)}" aria-label="${item.done ? '取消完成' : '完成'}${escapeHtml(item.title)}"><span class="pixel-node-flag">${item.done ? icon('check') : index + 1}</span><span class="pixel-node-icon">${preschoolAsset(pixelQuestAsset(item), item.title)}</span><strong>${escapeHtml(item.title)}</strong></button>`;
        }).join('');
        const health = Math.max(0, Number(invader.health) || 0);
        const maxHealth = Math.max(1, Number(invader.maxHealth) || 3);
        const plantAsset = preschoolPlantAsset(activePlant);
        const activePlantArt = preschoolAsset(preschoolPlantAsset(activePlant), activePlant.title);
        const seedPlants = Array.isArray(garden.plants) ? garden.plants : (preschoolGarden && Array.isArray(preschoolGarden.PLANT_CATALOG) ? preschoolGarden.PLANT_CATALOG : []);
        const board = defense.board || { lanes: 5, columns: 8 };
        const placedPlants = Array.isArray(defense.plants) ? defense.plants : [];
        const plantAt = function (lane, column) {
            return placedPlants.find(function (item) { return item.lane === lane && item.column === column && item.health > 0; }) || null;
        };
        const plantById = function (id) {
            return seedPlants.find(function (plant) { return plant.id === id; }) || (preschoolGarden && preschoolGarden.PLANT_CATALOG ? preschoolGarden.PLANT_CATALOG.find(function (plant) { return plant.id === id; }) : null) || activePlant;
        };
        const boardRows = Array.from({ length: Math.max(1, Number(board.lanes) || 5) }, function (_, laneIndex) {
            const isTarget = Boolean(invader.active && laneIndex === 2);
            const isDefeated = Boolean(battleEffect.defeated && laneIndex === 2);
            const showInvader = Boolean(isTarget || (laneIndex === 2 && !invader.active && !invader.wave) || isDefeated);
            const cells = Array.from({ length: Math.max(1, Number(board.columns) || 6) }, function (_, columnIndex) {
                const planted = plantAt(laneIndex, columnIndex);
                const plant = planted ? plantById(planted.plantId) : null;
                const occupied = Boolean(planted && plant);
                const label = occupied
                    ? `第 ${laneIndex + 1} 路第 ${columnIndex + 1} 格，${plant.title}，等级 ${planted.level || 1}`
                    : `第 ${laneIndex + 1} 路第 ${columnIndex + 1} 格，空草坪，点击种下${escapeHtml(activePlant.title)}`;
                return `<button class="pixel-battle-slot ${occupied ? 'is-occupied' : 'is-empty'}" type="button" data-action="place-defense-plant" data-lane="${laneIndex}" data-column="${columnIndex}" data-occupied="${occupied ? 'true' : 'false'}" aria-label="${label}">${occupied ? `<span class="pixel-battle-slot-plant">${preschoolAsset(preschoolPlantAsset(plant), plant.title)}<b>Lv.${planted.level || 1}</b></span>` : `<span class="pixel-battle-slot-empty"><i>＋</i><small>种下</small></span>`}</button>`;
            }).join('');
            return `<div class="pixel-battle-lane-row ${isTarget ? 'is-target' : isDefeated ? 'is-defeated' : showInvader ? 'is-preview' : ''}" data-lane="${laneIndex + 1}" aria-label="第 ${laneIndex + 1} 路花园防守"><div class="pixel-battle-lane-cells">${cells}</div><span class="pixel-battle-invader-column">${showInvader ? `<button class="pixel-battle-invader ${isDefeated ? 'is-defeated' : isTarget ? '' : 'is-preview'}" type="button" data-action="${isDefeated ? 'battle-noop' : isTarget ? 'fire-pea' : 'spawn-invader'}" ${isDefeated || (isTarget && !defense.canUseSkill) ? 'disabled' : ''} aria-label="${isDefeated ? `${escapeHtml(invaderProfile.title)}已被击倒` : isTarget ? `${escapeHtml(invaderProfile.title)}入侵，${escapeHtml(activePlant.skillTitle || '使用技能')}` : '召唤僵尸练习'}">${preschoolAsset(invaderProfile.asset, invaderProfile.title)}<span class="pixel-invader-preview-label">${isDefeated ? '被击倒' : isTarget ? activePlant.skillTitle || '使用技能' : '点我召唤'}</span></button>${isTarget ? '<span class="pixel-hit-flash" aria-hidden="true"></span>' : ''}` : ''}</span></div>`;
        }).join('');
        const seedCosts = Object.fromEntries(seedPlants.map(function (plant) {
            const rule = preschoolGarden && preschoolGarden.PLANT_RULES ? preschoolGarden.PLANT_RULES[plant.id] : null;
            return [plant.id, rule ? rule.cost : plant.unlockAt];
        }));
        const seedPackets = seedPlants.map(function (plant) {
            const unlocked = Array.isArray(garden.unlockedPlantIds) && garden.unlockedPlantIds.includes(plant.id);
            const selected = plant.id === garden.activePlantId;
            return `<button class="pvz-seed-packet ${selected ? 'is-selected' : ''} ${unlocked ? '' : 'is-locked'}" type="button" draggable="${unlocked ? 'true' : 'false'}" data-action="select-plant" data-id="${escapeHtml(plant.id)}" data-plant-id="${escapeHtml(plant.id)}" ${unlocked ? '' : 'disabled'} aria-pressed="${selected ? 'true' : 'false'}" aria-label="${escapeHtml(plant.title)}：${escapeHtml(plant.skillTitle || plant.description)}"><span class="pvz-seed-art">${preschoolAsset(preschoolPlantAsset(plant), unlocked ? plant.title : '未解锁')}</span><span class="pvz-seed-name">${escapeHtml(unlocked ? plant.title : '未解锁')}</span><small class="pvz-seed-skill">${escapeHtml(unlocked ? (plant.skillTitle || plant.description) : `${plant.unlockAt} 阳光解锁`)}</small><b>${seedCosts[plant.id] || plant.unlockAt}</b></button>`;
        }).join('');
        const skillIcon = { sunlight: 'sun', pea: 'zap', block: 'shield-check', 'ice-pea': 'snowflake', blast: 'flame' }[activePlant.skill] || 'sparkles';
        const skillTitle = activePlant.skillTitle || '使用植物技能';
        const energyCost = Math.max(0, Number(activePlant.energyCost) || 0);
        const invaderEffect = invader.active && invader.blockedTurns > 0 ? `坚果墙挡住啦（${invader.blockedTurns} 回合）` : invader.active && invader.slowedTurns > 0 ? `冰冻中（${invader.slowedTurns} 回合）` : '';
        const unavailableHint = activePlant.skill === 'sunlight' ? '今天的阳光已经收集过啦。' : energyCost ? `还需要 ${energyCost} 点豌豆能量。` : '先召唤僵尸，再使用这个技能。';
        const playbook = getPreschoolThemePlaybook();
        const skillButton = invader.active ? `<button class="pixel-pea-button is-skill-${escapeHtml(activePlant.skill || 'default')}" type="button" data-action="fire-pea" ${defense.canUseSkill ? '' : 'disabled'}>${icon(skillIcon)} ${escapeHtml(skillTitle)} ${energyCost ? `<b>${energyCost}</b>` : ''}</button>` : `<button class="pixel-pea-button is-practice" type="button" data-action="spawn-invader">${icon('swords')} ${escapeHtml(playbook.foeReady)}</button>`;
        const sunflowerButton = !invader.active && activePlant.skill === 'sunlight' ? `<button class="pixel-skill-secondary" type="button" data-action="fire-pea" ${defense.canUseSkill ? '' : 'disabled'}>${icon(skillIcon)} ${escapeHtml(skillTitle)}${activePlant.amount ? ` +${activePlant.amount}` : ' +10'}</button>` : '';
        return `<section class="pixel-map-panel ${compact ? 'is-compact' : ''} ${invader.active ? 'has-invader' : ''}" data-defense-state="${invader.active ? 'active' : 'ready'}" aria-live="polite">
            <div class="pixel-map-landmarks" aria-hidden="true"><span class="pixel-map-landmark landmark-castle">${preschoolAsset('castle-gate', '')}</span><span class="pixel-map-landmark landmark-tree">${preschoolAsset('small-tree', '')}</span><span class="pixel-map-landmark landmark-bridge">${preschoolAsset('river-bridge', '')}</span><span class="pixel-map-landmark landmark-fence">${preschoolAsset('fence', '')}</span><span class="pixel-map-landmark landmark-platform">${preschoolAsset('grass-platform', '')}</span><span class="pixel-map-landmark landmark-grass grass-a">${preschoolAsset('grass-patch', '')}</span><span class="pixel-map-landmark landmark-grass grass-b">${preschoolAsset('grass-patch', '')}</span></div>
             <div class="pixel-map-copy"><span class="pixel-panel-kicker">${escapeHtml(playbook.battleKicker)}</span><h2>${invader.active ? `${escapeHtml(invaderProfile.title)}${escapeHtml(playbook.battleTitleActive)}` : escapeHtml(playbook.battleTitle)}</h2><p>${invader.active ? escapeHtml(playbook.battleActiveCopy(invader.wave || 1, health, invaderProfile.title)) : escapeHtml(playbook.battleReadyCopy)}</p></div>
            <div class="pixel-map-hud"><span class="pixel-map-sun">${preschoolAsset('map-sun', playbook.currency)}<b>${growth.sunlight}</b></span><span class="pixel-defense-energy"><span class="pixel-energy-art">${preschoolAsset('player-energy-bars', playbook.energy)}</span><span>${escapeHtml(playbook.energy)}</span><b>${defense.energy}</b></span><span class="pixel-wave-badge">${invader.active ? `生命 ${health}/${maxHealth}` : escapeHtml(playbook.homeFootReady)}</span></div>
            <div class="pvz-seed-tray" aria-label="植物种子卡槽"><span class="pvz-seed-sun"><img src="${escapeHtml(preschoolAssetSrc('sun-token'))}" alt="阳光"><b>${growth.sunlight}</b></span>${seedPackets}</div>
             <div class="pixel-battlefield" aria-label="五路六列阳光花园防守场景"><div class="pixel-battle-sky"><span class="pixel-battle-cloud cloud-a"></span><span class="pixel-battle-cloud cloud-b"></span><span class="pixel-battle-sun">${preschoolAsset('map-sun', '阳光')}</span></div><div class="pixel-battle-grid"><span class="pixel-battle-row-label">五路 · 六列</span><div class="pixel-battle-lanes">${boardRows}</div></div><div class="pixel-battle-ground"></div></div>
             <div class="pixel-defense-actions">${skillButton}${sunflowerButton}<span class="pixel-defense-state ${invader.active ? 'is-active' : 'is-ready'}">${invader.active ? (invaderEffect || (defense.canUseSkill ? `${skillTitle}可用` : unavailableHint)) : '准备召唤'}</span><span class="pixel-defense-hint">${invader.active ? (invaderEffect || (defense.canUseSkill ? activePlant.skillDescription : unavailableHint)) : `先召唤僵尸，再使用${skillTitle}。`}</span></div>
            <div class="pixel-map-route"><span class="pixel-route-line"></span>${nodes || `<span class="pixel-map-empty">先加一项小任务</span>`}</div>
            <div class="pixel-map-companion"><span>${preschoolAsset('star-companion', '星芒')}</span><div><strong>星芒在陪你</strong><small>连续 ${growth.streak} 天</small></div></div>
             ${invader.active ? `<span class="pixel-map-invader"><span>${preschoolAsset(invaderProfile.asset, invaderProfile.title)}</span><strong>${escapeHtml(invaderProfile.title)}入侵</strong><small>${defense.energy ? '准备发射' : '完成任务得能量'}</small></span>` : `<span class="pixel-map-safe">${icon('shield-check')} 花园安全</span>`}
            <div class="pixel-map-ground"></div>
        </section>`;
    }

    function renderPixelChest(growth, completed, total) {
        const ready = total > 0 && completed >= total;
        return `<section class="pixel-side-panel pixel-chest-panel ${ready ? 'is-ready' : ''}">
            <div class="pixel-side-heading"><div><span class="pixel-panel-kicker">DAILY CHEST</span><h2>${ready ? '宝箱可以开啦' : '今日宝箱'}</h2></div><span class="pixel-side-count">${completed}/${total}</span></div>
            <div class="pixel-chest-art">${preschoolAsset('treasure-chest', '宝箱')}<span>${ready ? 'READY' : 'LOCKED'}</span></div>
            <div class="pixel-chest-progress"><span style="width:${total ? Math.round((completed / total) * 100) : 0}%"></span></div>
            <p>${ready ? '今天的任务都完成了，去选一份奖励。' : `再完成 ${Math.max(0, total - completed)} 项就能打开。`}</p>
            <button class="pixel-side-button" type="button" data-action="navigate" data-page="${ready ? 'rewards' : 'plans'}">${icon(ready ? 'gift' : 'map')} ${ready ? '去开宝箱' : '继续冒险'}</button>
        </section>`;
    }

    function renderPixelCollection(growth) {
        const collection = growth.collection || { catalog: [], unlockedIds: [], total: 0 };
        const catalog = Array.isArray(collection.catalog) ? collection.catalog : [];
        return `<section class="pixel-side-panel pixel-collection-panel"><div class="pixel-side-heading"><div><span class="pixel-panel-kicker">COLLECTION</span><h2>收集栏</h2></div><span class="pixel-side-count">${collection.unlockedIds.length}/${collection.total}</span></div><div class="pixel-collection-grid">${catalog.map(function (item) {
            const unlocked = collection.unlockedIds.includes(item.id);
            const assetName = preschoolAssetForIcon(item.icon || '') || 'star-companion';
            return `<div class="pixel-collection-slot ${unlocked ? 'is-unlocked' : ''}" title="${escapeHtml(unlocked ? item.title : '完成任务来发现')}"><span>${preschoolAsset(assetName, unlocked ? item.title : '待发现')}</span><small>${unlocked ? escapeHtml(item.title) : '？？？'}</small></div>`;
        }).join('')}</div><button class="pixel-side-link" type="button" data-action="navigate" data-page="growth">查看全部收藏${icon('arrow-up-right')}</button></section>`;
    }

    function renderPixelStats(growth, defense) {
        const garden = growth.garden || {};
        const activePlant = garden.activePlant || { id: 'plant-sunflower', title: '向日葵' };
        const collection = growth.collection || { unlockedIds: [], total: 0 };
        const stats = [
            { label: '阳光', value: growth.sunlight, note: '可兑换', asset: 'sun-token', tone: 'sun' },
            { label: '植物', value: garden.unlockedPlantIds ? garden.unlockedPlantIds.length : 1, note: activePlant.title, asset: preschoolPlantAsset(activePlant), tone: 'plant' },
            { label: '豌豆', value: defense.energy, note: '防守能量', asset: 'player-energy-bars', tone: 'pea' },
            { label: '等级', value: `Lv.${growth.level}`, note: `${growth.petXp} XP`, asset: 'star-companion', tone: 'level' },
            { label: '连续', value: `${growth.streak} 天`, note: '每天点亮', asset: 'sun-smile-badge', tone: 'streak' },
            { label: '收藏', value: `${collection.unlockedIds.length}/${collection.total}`, note: '已发现', asset: 'treasure-chest', tone: 'collection' }
        ];
        return `<section class="pixel-stat-strip workbench-stat-strip" aria-label="成长状态">${stats.map(function (stat) {
            return `<article class="pixel-stat-card workbench-stat-card tone-${stat.tone}"><span class="pixel-stat-art">${preschoolAsset(stat.asset, stat.label)}</span><span class="pixel-stat-copy"><small>${escapeHtml(stat.label)}</small><strong>${escapeHtml(stat.value)}</strong><em>${escapeHtml(stat.note)}</em></span></article>`;
        }).join('')}</section>`;
    }

    function renderPreschoolBattleRewards(growth, defense) {
        const playbook = getPreschoolThemePlaybook();
        const rewardSteps = [
            { asset: 'sun-token', title: playbook.reward1, caption: playbook.reward1Hint, tone: 'sun' },
            { asset: 'player-energy-bars', title: playbook.reward2, caption: playbook.reward2Hint, tone: 'pea' },
            { asset: 'treasure-chest', title: playbook.reward3, caption: playbook.reward3Hint, tone: 'chest' }
        ];
        return `<section class="pixel-battle-reward-panel"><div class="pixel-side-heading"><div><span class="pixel-panel-kicker">REWARD LADDER</span><h2>分层奖励</h2></div><span class="pixel-side-count">${growth.sunlight} ${escapeHtml(playbook.currency)}</span></div><div class="pixel-battle-reward-grid">${rewardSteps.map(function (step) { return `<article class="pixel-battle-reward-item tone-${step.tone}"><span class="pixel-battle-reward-art">${preschoolAsset(step.asset, step.title)}</span><span><strong>${escapeHtml(step.title)}</strong><small>${escapeHtml(step.caption)}</small></span></article>`; }).join('')}</div><p class="pixel-battle-reward-note">当前${escapeHtml(playbook.energy)} ${defense.energy}，每次行动都会留下记录。</p></section>`;
    }

    function renderPreschoolDailyChallenge(plans, defense) {
        const total = plans.length;
        const completed = plans.filter(item => item.done).length;
        const remaining = Math.max(0, total - completed);
        const percent = total ? Math.round((completed / total) * 100) : 0;
        const ready = total > 0 && remaining === 0;
        return `<section class="pixel-daily-challenge ${ready ? 'is-ready' : ''}"><div class="pixel-side-heading"><div><span class="pixel-panel-kicker">DAILY CHALLENGE</span><h2>${ready ? '今日挑战完成啦' : '每日挑战'}</h2></div><span class="pixel-side-count">${completed}/${total}</span></div><div class="pixel-daily-challenge-copy"><strong>${ready ? '阳光花园已点亮' : `再完成 ${remaining} 项`}</strong><small>${ready ? '去阳光商城挑一份小礼物。' : '完成任务会同时收集阳光和豌豆能量。'}</small></div><div class="pixel-daily-progress"><span style="width:${percent}%"></span></div><div class="pixel-daily-meta"><span>${percent}% 完成</span><span>${defense.shots} 次发射</span></div><button class="pixel-side-button" type="button" data-action="navigate" data-page="${ready ? 'rewards' : 'plans'}">${icon(ready ? 'gift' : 'flag')} ${ready ? '去阳光商城' : '去完成任务'}</button></section>`;
    }

    function renderPreschoolBattle() {
        const growth = getChildGrowth();
        const derived = getDerived();
        const plans = derived.todayPlans;
        const defense = getPreschoolDefense(growth);
        const garden = growth.garden || {};
        const invader = defense.invader || {};
        const playbook = getPreschoolThemePlaybook();
        const plants = Array.isArray(garden.plants) ? garden.plants : [];
        const plantCards = plants.map(function (plant) {
            const unlocked = Array.isArray(garden.unlockedPlantIds) && garden.unlockedPlantIds.includes(plant.id);
            const active = plant.id === garden.activePlantId;
            return `<button class="pixel-battle-plant ${active ? 'is-active' : ''} ${unlocked ? '' : 'is-locked'}" type="button" data-action="select-plant" data-id="${escapeHtml(plant.id)}" ${unlocked ? '' : 'disabled'}><span>${preschoolAsset(preschoolPlantAsset(plant), unlocked ? plant.title : '未出现')}</span><strong>${escapeHtml(unlocked ? plant.title : '未出现')}</strong><small>${escapeHtml(unlocked ? plant.description : `${plant.unlockAt} ${playbook.currency}出现`)}</small></button>`;
        }).join('');
        const statusRows = [
            ['当前波次', invader.active ? `第 ${invader.wave || 1} 波` : '等待召唤', 'flag'],
            [playbook.energy, `${defense.energy}`, 'zap'],
            ['行动次数', `${defense.shots} 次`, 'target'],
            ['击退次数', `${invader.defeated || 0} 次`, 'shield-check']
        ];
        return `${renderPreschoolIntro(PAGE_META.battle, '', '', `<span class="points-chip">${preschoolAsset('player-energy-bars', playbook.energy)}${defense.energy}</span>`)}
            <div class="pixel-battle-page">
                <div class="pixel-battle-layout"><div>${renderPixelMap(growth, plans, true)}</div><aside class="pixel-battle-side">
                     <section class="pixel-rulebook"><div class="pixel-side-heading"><div><span class="pixel-panel-kicker">HOW TO PLAY</span><h2>${escapeHtml(playbook.battleHowTitle)}</h2></div><span class="pixel-side-count">${defense.canUseSkill ? '技能可用' : '准备中'}</span></div><div class="pixel-rule-list"><div><b>1</b><span><strong>${escapeHtml(playbook.battleStep1)}</strong><small>${escapeHtml(playbook.battleStep1Hint)}</small></span></div><div><b>2</b><span><strong>${escapeHtml(playbook.battleStep2)}</strong><small>${escapeHtml(playbook.battleStep2Hint)}</small></span></div><div><b>3</b><span><strong>${escapeHtml(playbook.battleStep3)}</strong><small>${escapeHtml(playbook.battleStep3Hint)}</small></span></div></div></section>
                     <section class="pixel-battle-status"><div class="pixel-side-heading"><div><span class="pixel-panel-kicker">DEFENSE LOG</span><h2>冒险记录</h2></div><span class="pixel-side-count">${invader.active ? `${invader.health}/${invader.maxHealth} HP` : '安全'}</span></div><div class="pixel-battle-status-grid">${statusRows.map(function (row) { return `<div><span>${icon(row[2])}</span><small>${escapeHtml(row[0])}</small><strong>${escapeHtml(row[1])}</strong></div>`; }).join('')}</div></section>
                </aside></div>
                <div class="pixel-battle-support-grid">${renderPreschoolBattleRewards(growth, defense)}${renderPreschoolDailyChallenge(plans, defense)}</div>
                <section class="pixel-battle-plant-panel"><div class="pixel-side-heading"><div><span class="pixel-panel-kicker">LOADOUT</span><h2>选择伙伴设施</h2></div><span class="pixel-side-count">${Array.isArray(garden.unlockedPlantIds) ? garden.unlockedPlantIds.length : 0}/${plants.length}</span></div><div class="pixel-battle-plant-grid">${plantCards}</div></section>
                <section class="pixel-battle-quest-panel"><div class="pixel-side-heading"><div><span class="pixel-panel-kicker">TODAY QUESTS</span><h2>先完成任务，再继续冒险</h2></div><button class="pixel-side-link" type="button" data-action="navigate" data-page="plans">去完成任务${icon('arrow-up-right')}</button></div>${renderPreschoolPlanRows(plans)}</section>
            </div>`;
    }

    function renderPreschoolDefenseGame() {
        const growth = getChildGrowth();
        const derived = getDerived();
        const plans = derived.todayPlans;
        const defense = getPreschoolDefense(growth);
        const garden = growth.garden || {};
        const game = garden.defense || defense;
        const plants = Array.isArray(garden.plants) ? garden.plants : [];
        const costs = { 'plant-sunflower': 25, 'plant-peashooter': 40, 'plant-wallnut': 30, 'plant-snowpea': 50, 'plant-cherrybomb': 75 };
        const selectedPlantId = game.selectedPlantId || garden.activePlantId || 'plant-sunflower';
        const started = game.status === 'playing' || game.status === 'won';
        const plantById = function (id) { return plants.find(item => item.id === id) || { id: id, title: id, tone: 'lime' }; };
        const renderDefenseCell = function (lane, column) {
            const plant = (game.plants || []).find(item => item.lane === lane && item.column === column);
            const zombie = (game.zombies || []).find(item => item.lane === lane && item.column === column);
            const pea = (game.projectiles || []).find(item => item.lane === lane && Math.floor(item.column) === column);
            const plantInfo = plant ? plantById(plant.plantId) : null;
            const zombieInfo = zombie ? preschoolInvaderProfile({ kind: zombie.kind }) : null;
            return `<button class="preschool-defense-cell ${plant ? 'has-plant' : ''} ${zombie ? 'has-zombie' : ''}" type="button" data-action="place-defense-plant" data-lane="${lane}" data-column="${column}" aria-label="第 ${lane + 1} 路第 ${column + 1} 格${plantInfo ? plantInfo.title : '空地'}${zombieInfo ? `，${zombieInfo.title}` : ''}">${plantInfo ? `<span class="preschool-defense-plant">${preschoolAsset(preschoolPlantAsset(plantInfo), plantInfo.title)}<small>${Math.max(0, plant.health)}/${plant.maxHealth}</small></span>` : ''}${zombieInfo ? `<span class="preschool-defense-zombie">${preschoolAsset(zombieInfo.asset, zombieInfo.title)}<small>${zombie.health}/${zombie.maxHealth}</small></span>` : ''}${pea ? '<i class="preschool-defense-pea" aria-hidden="true"></i>' : ''}</button>`;
        };
        const lanes = Array.from({ length: 5 }, function (_, lane) {
            return `<div class="preschool-defense-lane" data-lane="${lane}"><span class="preschool-defense-lane-label">第 ${lane + 1} 路</span><div class="preschool-defense-cells">${Array.from({ length: Number((game.board || {}).columns) || 8 }, function (_, column) { return renderDefenseCell(lane, column); }).join('')}</div></div>`;
        }).join('');
        const plantCards = plants.map(function (plant) {
            const unlocked = Array.isArray(garden.unlockedPlantIds) && garden.unlockedPlantIds.includes(plant.id);
            const active = plant.id === selectedPlantId;
            const cost = costs[plant.id] || 25;
            return `<button class="preschool-defense-seed ${active ? 'is-active' : ''} ${unlocked ? '' : 'is-locked'}" type="button" data-action="select-plant" data-id="${escapeHtml(plant.id)}" ${unlocked ? '' : 'disabled'}><span>${preschoolAsset(preschoolPlantAsset(plant), unlocked ? plant.title : '未出现')}</span><strong>${escapeHtml(unlocked ? plant.title : '未出现')}</strong><small>${escapeHtml(unlocked ? `${cost} 阳光` : `${plant.unlockAt} 阳光出现`)}</small></button>`;
        }).join('');
        const gameMessage = game.status === 'ready' ? '选择一个植物，开始你的第一场守护。' : game.status === 'won' ? '这一波完成啦，可以重新开始或继续领奖励。' : game.zombies.length ? `第 ${game.wave} 波还有 ${game.zombies.length} 只僵尸。` : '点击“来一波”，让花园开始动起来。';
        return `${renderPreschoolIntro(PAGE_META.battle, '', '', `<span class="points-chip">${preschoolAsset('sun-token', '阳光')}${growth.sunlight}</span>`)}
            <div class="preschool-defense-game" data-game-status="${game.status}">
                <section class="preschool-defense-game-head"><div><span class="pixel-panel-kicker">GARDEN DEFENSE / MINI GAME</span><h2>花园保卫战</h2><p>${gameMessage}</p></div><div class="preschool-defense-game-stats"><span>${preschoolAsset('sun-token', '阳光')}<b>${growth.sunlight}</b><small>阳光</small></span><span>${preschoolAsset('player-energy-bars', '豌豆能量')}<b>${defense.energy}</b><small>能量</small></span><span><b>${game.defeated}</b><small>击退</small></span></div></section>
                <section class="preschool-defense-seeds" aria-label="选择植物"><div class="preschool-defense-section-title"><div><span class="pixel-panel-kicker">SEED PACKETS</span><h2>先选植物</h2></div><small>当前：${escapeHtml(plantById(selectedPlantId).title)}</small></div><div class="preschool-defense-seed-grid">${plantCards}</div></section>
                <section class="preschool-defense-board-wrap"><div class="preschool-defense-board-head"><div><span class="pixel-panel-kicker">FIVE LANES / SIX CELLS</span><h2>点击空地种下植物</h2></div><div class="preschool-defense-board-actions"><button class="workbench-action-button" type="button" data-action="${started ? 'spawn-defense-wave' : 'start-defense-game'}">${icon(started ? 'swords' : 'play')} ${started ? '来一波僵尸' : '开始游戏'}</button><button class="workbench-text-button" type="button" data-action="navigate" data-page="rewards">${icon('gift')} 去领奖励</button></div></div><div class="preschool-defense-board" aria-label="五路六列花园战场">${lanes}</div><div class="preschool-defense-legend"><span><i class="legend-plant"></i>植物会自动行动</span><span><i class="legend-zombie"></i>僵尸会慢慢前进</span><span><i class="legend-pea"></i>豌豆正在飞</span></div></section>
                <section class="preschool-defense-bottom"><div><span class="pixel-panel-kicker">TODAY / REWARD LOOP</span><strong>完成任务得阳光和豌豆能量</strong><small>${plans.filter(item => item.done).length}/${plans.length} 项今日任务已完成</small></div><button class="workbench-secondary-button" type="button" data-action="navigate" data-page="plans">${icon('list-checks')} 去完成任务</button><button class="workbench-text-button" type="button" data-action="navigate" data-page="overview">${icon('arrow-left')} 回到工作台</button></section>
            </div>`;
    }

    function getPreschoolGrowthDashboardStats(growth, garden, defense, derived) {
        const plans = derived.todayPlans;
        const todayDone = plans.filter(item => item.done).length;
        const todayTotal = plans.length;
        const completedPlanCount = state.dailyPlans.filter(item => item.done).length;
        const unlockedPlantIds = Array.isArray(garden.unlockedPlantIds) ? garden.unlockedPlantIds : [];
        const plantCatalog = Array.isArray(garden.plants) ? garden.plants : [];
        const nextPlant = plantCatalog.slice().filter(item => !unlockedPlantIds.includes(item.id)).sort((a, b) => (Number(a.unlockAt) || 0) - (Number(b.unlockAt) || 0))[0] || null;
        const totalSunlight = Math.max(Number(growth.totalSunlightEarned) || 0, Number(growth.sunlight) || 0);
        const plantTarget = nextPlant ? Math.max(1, Number(nextPlant.unlockAt) || 1) : Math.max(1, totalSunlight);
        const wave = Math.max(Number(defense.wave) || 0, Number(garden.invader && garden.invader.wave) || 0);
        const waveGoal = wave === 0 ? 3 : Math.max(3, Math.ceil(wave / 3) * 3);
        const zombieDefeated = Math.max(Number(defense.defeated) || 0, Number(garden.invader && garden.invader.defeated) || 0, Number(growth.zombieDefeated) || 0);
        const collection = garden.collection || { unlockedIds: [], total: 0 };
        const unlockedCollectionIds = Array.isArray(collection.unlockedIds) ? collection.unlockedIds : [];
        const badgeEngine = global.PersonalWorkbenchAchievements;
        const badgeUnlocked = Array.isArray(state.growth && state.growth.achievements && state.growth.achievements.unlocked)
            ? state.growth.achievements.unlocked.length
            : 0;
        const badgeUnseen = badgeEngine && typeof badgeEngine.unseenBadgeIds === 'function'
            ? badgeEngine.unseenBadgeIds(state.growth && state.growth.achievements).length
            : 0;
        return {
            sunlight: Math.max(0, Number(growth.sunlight) || 0),
            todayDone: todayDone,
            todayTotal: todayTotal,
            todayPercent: todayTotal ? Math.round(todayDone / todayTotal * 100) : 0,
            completedPlanCount: completedPlanCount,
            wave: wave,
            waveGoal: waveGoal,
            wavePercent: clamp(wave / waveGoal * 100, 0, 100),
            zombieDefeated: zombieDefeated,
            zombieActive: Boolean(garden.invaderActive || garden.invader && garden.invader.active),
            unlockedPlantCount: unlockedPlantIds.length,
            plantCount: plantCatalog.length,
            plantPercent: nextPlant ? clamp(totalSunlight / plantTarget * 100, 0, 100) : 100,
            plantProgressLabel: nextPlant ? `还差 ${Math.max(0, plantTarget - totalSunlight)} 阳光解锁${escapeHtml(nextPlant.title)}` : '植物伙伴已全部出现',
            level: Number(growth.level) || 1,
            levelPercent: clamp(Number(growth.levelProgress) || 0, 0, 100),
            levelProgressLabel: `Lv.${Number(growth.level) || 1} · ${Number(growth.levelProgress) || 0}/100 成长经验`,
            badgeUnlocked: badgeUnlocked,
            badgeUnseen: badgeUnseen,
            badgeTotal: badgeEngine && typeof badgeEngine.BADGE_COUNT === 'number'
                ? badgeEngine.BADGE_COUNT
                : (badgeEngine && Array.isArray(badgeEngine.BADGE_ORDER) ? badgeEngine.BADGE_ORDER.length : 19),
            collectionCount: unlockedCollectionIds.length,
            collectionTotal: Number(collection.total) || 0,
            nextAction: todayDone < todayTotal ? `完成今日第 ${todayDone + 1} 项任务` : wave === 0 ? '去花园游戏挑战第一波' : zombieDefeated > 0 ? '继续解锁植物伙伴' : '去花园游戏击退僵尸'
        };
    }

    function renderPreschoolGrowthDashboard(stats) {
        const cards = [
            { label: '已完成任务', value: stats.completedPlanCount, meta: '累计点亮', icon: 'circle-check', tone: 'lime' },
            { label: '防守波次', value: stats.wave, meta: '花园战绩', icon: 'flag', tone: 'orange' },
            { label: '击退僵尸', value: stats.zombieDefeated, meta: stats.zombieActive ? '还有僵尸提醒' : '花园安全', icon: 'bug', tone: stats.zombieActive ? 'pink' : 'blue' },
            { label: '植物伙伴', value: `${stats.unlockedPlantCount}/${stats.plantCount}`, meta: '已解锁图鉴', icon: 'sprout', tone: 'lime' },
            { label: '成长徽章', value: `${stats.badgeUnlocked}/${stats.badgeTotal}`, meta: '收集箱', icon: 'album', tone: 'gold', action: 'toggle-badge-box' }
        ];
        const cardMarkup = cards.map(function (card) {
            const inner = `<span class="preschool-growth-stat-icon">${icon(card.icon)}</span><span class="preschool-growth-stat-copy"><small>${card.label}</small><strong>${card.value}</strong><em>${card.meta}</em></span>`;
            if (card.action) {
                return `<button class="preschool-growth-stat-card tone-${card.tone} is-action badge-collection-toggle" type="button" data-action="${escapeHtml(card.action)}" aria-expanded="${ui.badgeBoxOpen ? 'true' : 'false'}">${inner}</button>`;
            }
            return `<article class="preschool-growth-stat-card tone-${card.tone}">${inner}</article>`;
        }).join('');
        return `<section class="preschool-growth-dashboard" aria-label="花园成长总览">
            <div class="preschool-growth-dashboard-head"><div><span class="preschool-growth-kicker">GARDEN BASE / PROGRESS</span><h2>我的花园成长记录</h2><p>任务是阳光，防守是挑战，徽章记录每一次坚持。</p></div><div class="preschool-growth-balance">${preschoolAsset('sun-token', '阳光')}<strong>${stats.sunlight}</strong><small>当前阳光</small></div><button class="preschool-badge-box-link badge-collection-toggle" type="button" data-action="toggle-badge-box" aria-expanded="${ui.badgeBoxOpen ? 'true' : 'false'}">🏅 徽章收集箱 ${stats.badgeUnlocked}/${stats.badgeTotal}${stats.badgeUnseen ? ' · 新' : ''}</button></div>
            <div class="preschool-growth-stat-grid">${cardMarkup}</div>
            <div class="preschool-growth-record"><span class="preschool-growth-record-icon">${icon(stats.zombieActive ? 'shield-alert' : 'shield-check')}</span><span><small>下一步</small><strong>${stats.nextAction}</strong></span><button class="preschool-growth-record-action" type="button" data-action="navigate" data-page="${stats.todayDone < stats.todayTotal ? 'plans' : 'battle'}">${stats.todayDone < stats.todayTotal ? '去完成任务' : '去挑战'} ${icon('arrow-up-right')}</button></div>
        </section>`;
    }

    function renderPreschoolGrowthProgress(stats) {
        const rows = [
            { label: '今日任务', value: `${stats.todayDone}/${stats.todayTotal} 项`, meta: stats.todayTotal ? `完成 ${stats.todayPercent}%` : '还没有今日任务', percent: stats.todayPercent, icon: 'circle-check', tone: 'lime' },
            { label: '植物成长', value: `${stats.unlockedPlantCount}/${stats.plantCount} 位`, meta: stats.plantProgressLabel, percent: stats.plantPercent, icon: 'sprout', tone: 'green' },
            { label: '星芒等级', value: `Lv.${stats.level}`, meta: stats.levelProgressLabel, percent: stats.levelPercent, icon: 'sparkles', tone: 'blue' },
            { label: '防守进度', value: `${stats.wave}/${stats.waveGoal} 波`, meta: stats.zombieDefeated ? `已击退 ${stats.zombieDefeated} 只僵尸` : '挑战第一波，记录你的战绩', percent: stats.wavePercent, icon: 'shield-check', tone: 'orange' }
        ];
        return `<section class="preschool-growth-progress"><div class="preschool-growth-section-head"><div><span class="preschool-growth-kicker">PROGRESS TRACK</span><h2>四条成长进度</h2><p>把抽象的“成长”变成看得见的下一步。</p></div><span class="preschool-growth-section-count">${stats.todayDone}/${stats.todayTotal} 今日</span></div><div class="preschool-growth-progress-list">${rows.map(function (row) { return `<div class="preschool-growth-progress-row"><div class="preschool-growth-progress-copy"><span class="preschool-growth-progress-icon tone-${row.tone}">${icon(row.icon)}</span><span><strong>${row.label}</strong><small>${row.value} · ${row.meta}</small></span><b>${Math.round(row.percent)}%</b></div><div class="preschool-growth-progress-bar" role="progressbar" aria-label="${row.label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(row.percent)}"><i class="tone-${row.tone}" style="width:${clamp(row.percent, 0, 100)}%"></i></div></div>`; }).join('')}</div></section>`;
    }

    function renderPreschoolWeeklyAdventureReport(options) {
        const opts = options || {};
        const forParent = Boolean(opts.forParent);
        const bridge = global.WorkbenchGameBridge;
        if (!bridge || typeof bridge.getWeeklyReport !== 'function') {
            return `<section class="preschool-weekly-report"><p>冒险周报模块未加载。</p></section>`;
        }
        const report = bridge.getWeeklyReport(storage.localDate());
        const dayCells = (report.days || []).map(function (day) {
            const tone = day.isFuture ? 'future' : day.isTriple ? 'triple' : day.played ? 'played' : 'empty';
            const title = day.played
                ? `${day.date} 玩了 ${day.worldCount} 个世界`
                : day.isFuture ? `${day.date} 还没到` : `${day.date} 未玩`;
            return `<span class="preschool-weekly-day is-${tone}" title="${escapeHtml(title)}"><small>周${escapeHtml(day.weekday)}</small><b>${escapeHtml(day.date.slice(8))}</b><i>${day.isTriple ? '③' : day.played ? '●' : '·'}</i></span>`;
        }).join('');
        const worldRows = (report.worlds || []).map(function (w) {
            return `<article class="preschool-weekly-world theme-${escapeHtml(w.id)}">
                <div class="preschool-weekly-world-head"><strong>${escapeHtml(w.label)}</strong><span>本周 ${w.playDays} 天</span></div>
                <div class="preschool-world-progress-bar" role="progressbar" aria-valuenow="${w.percent}" aria-valuemin="0" aria-valuemax="100"><i style="width:${w.percent}%"></i></div>
                <small>生涯 ${w.done}/${w.total} ${escapeHtml(w.unit)}${w.fact ? ' · ' + escapeHtml(w.fact) : ''}</small>
                <button class="preschool-world-progress-go" type="button" data-action="open-world-game" data-theme-id="${escapeHtml(w.id)}">${icon('play')} 去玩</button>
            </article>`;
        }).join('');
        const badges = (report.badges || []).length
            ? report.badges.map(function (b) {
                return `<span class="preschool-adventure-badge is-on" title="${escapeHtml(b.desc || '')}">${escapeHtml(b.title)}</span>`;
            }).join('')
            : '<span class="preschool-weekly-empty">还没有徽章，通关和完成任务会慢慢点亮。</span>';
        const tips = (report.tips || []).map(function (t) {
            return `<li>${escapeHtml(t)}</li>`;
        }).join('');
        const kicker = forParent ? 'PARENT / WEEKLY ADVENTURE' : 'WEEKLY / ADVENTURE REPORT';
        const title = forParent ? '孩子本周冒险报告' : '本周冒险周报';
        const lead = forParent
            ? '给家长看的一页摘要：玩了几天、三个世界各到哪、拿了哪些徽章。'
            : '看看这一周的冒险足迹，再决定下一步去哪个世界。';
        return `<section class="preschool-weekly-report ${forParent ? 'is-parent' : ''}" aria-label="${escapeHtml(title)}">
            <div class="preschool-weekly-report-head">
                <div>
                    <span class="pixel-panel-kicker">${kicker}</span>
                    <h2>${escapeHtml(title)}</h2>
                    <p>${escapeHtml(lead)}</p>
                    <strong class="preschool-weekly-headline">${escapeHtml(report.headline || '')}</strong>
                    <small class="preschool-weekly-range">${escapeHtml(report.weekStart)} ~ ${escapeHtml(report.weekEnd)}</small>
                </div>
                <div class="preschool-weekly-kpis">
                    <span><b>${report.playedDays}/${report.goalPlayDays}</b><small>本周游玩天</small></span>
                    <span><b>${report.weekSun}</b><small>本周游戏阳光</small></span>
                    <span><b>${report.badgeUnlocked}/${report.badgeTotal}</b><small>徽章</small></span>
                    <span><b>Lv.${report.adventureLevel}</b><small>${escapeHtml(report.adventureTitle || '')}</small></span>
                </div>
            </div>
            <div class="preschool-weekly-days" aria-label="本周每日游玩">${dayCells}</div>
            <div class="preschool-weekly-worlds">${worldRows}</div>
            <div class="preschool-weekly-footer">
                <div class="preschool-weekly-badges"><strong>已点亮徽章</strong><div class="preschool-adventure-badges">${badges}</div></div>
                <div class="preschool-weekly-tips"><strong>给家长的小建议</strong><ul>${tips}</ul></div>
            </div>
            ${forParent && global.PersonalWorkbenchAchievements ? global.PersonalWorkbenchAchievements.renderParentBadgeWall(state.growth && state.growth.achievements) : ''}
            ${forParent ? `<p class="preschool-weekly-note">说明：游戏阳光有每日上限（${report.dailyCap}），与学习打卡（学习行动）阳光共用同一账本；坚持比刷分更重要。</p>` : ''}
        </section>`;
    }

    function renderPreschoolGrowth() {
        const growth = getChildGrowth();
        const derived = getDerived();
        const garden = growth.garden || { invaderActive: growth.zombieActive, invader: { active: growth.zombieActive, defeated: growth.zombieDefeated || 0, wave: 0 }, plants: [], unlockedPlantIds: [], collection: { unlockedIds: [], total: 0 }, defense: {} };
        const defense = getPreschoolDefense(growth);
        const stats = getPreschoolGrowthDashboardStats(growth, garden, defense, derived);
        const activeStyle = growth.styles.find(item => item.id === growth.activeStyleId) || growth.styles[0] || { title: '初始造型', icon: 'sparkles' };
        const waterAvailable = growth.lastWateredDate !== storage.localDate() && growth.sunlight >= 5;
        const rewardCards = growth.streakRewards.map(function (reward) {
            const unlocked = growth.unlockedStreakRewardIds.includes(reward.id);
            const claimed = growth.claimedStreakRewardIds.includes(reward.id);
            return `<div class="preschool-streak-card ${claimed ? 'is-claimed' : ''}"><span>${escapeHtml(reward.days)}天</span><strong>${escapeHtml(reward.title)}</strong>${claimed ? `<small>已领</small>` : unlocked ? `<button class="row-action" type="button" data-action="claim-streak-reward" data-id="${escapeHtml(reward.id)}" aria-label="领取${escapeHtml(reward.title)}" title="领取奖励">${icon('gift')}</button>` : `<small>继续</small>`}</div>`;
        }).join('');
        const badgeEngine = global.PersonalWorkbenchAchievements;
        const badgeBox = badgeEngine && ui.badgeBoxOpen
            ? badgeEngine.renderCollectionBox(state.growth && state.growth.achievements, badgeEngine.getGrowthStats(state, workbenchConfig.childCourses, getLevelBanks()), { filter: ui.badgeFilter || 'all' })
            : '';
        const petCard = global.PersonalWorkbenchPet
            ? global.PersonalWorkbenchPet.renderCard(state.growth, getPreschoolThemeId())
            : '';
        const growthWorld = global.PersonalWorkbenchGrowthWorld
            ? global.PersonalWorkbenchGrowthWorld.render(state, workbenchConfig.childCourses, { today: storage.localDate(), focus: ui.growthWorld })
            : '';
        return `${renderPreschoolIntro(PAGE_META.growth, '', '', `<span class="points-chip">${icon('sun')}${growth.sunlight}</span>`)}
            <section class="preschool-growth-simple" aria-label="花园基地">
                <div class="preschool-growth-simple-stats">
                    <span><small>阳光</small><b>${stats.sunlight}</b></span>
                    <span><small>今天</small><b>${stats.todayDone}/${stats.todayTotal}</b></span>
                    <span><small>连续</small><b>${growth.streak || 0} 天</b></span>
                </div>
                ${petCard}
                <p class="preschool-growth-simple-next">${escapeHtml(stats.nextAction)}</p>
                <div class="preschool-growth-actions"><button class="btn-primary" type="button" data-action="water-plant" ${waterAvailable ? '' : 'disabled'}>${icon('droplets')}${growth.lastWateredDate === storage.localDate() ? '已浇水' : '浇水'}</button><button class="btn-secondary" type="button" data-action="navigate" data-page="battle">${icon('swords')}去保卫战</button><button class="btn-secondary" type="button" data-action="navigate" data-page="rewards">${icon('gift')}去领奖励</button></div>
            </section>
            <section class="preschool-section"><div class="preschool-section-head"><div><span class="eyebrow">STREAK</span><h2>连续奖励</h2></div><span class="tag gold">${growth.streak} 天</span></div>${growth.streakRepair && growth.streakRepair.canRepair ? `<div class="streak-repair-row"><small>昨天断了一下，用补签卡接上（这个月还有 ${growth.streakRepair.available} 张）。</small><button class="btn-secondary" type="button" data-action="repair-streak">${icon('heart')}补签</button></div>` : ''}<div class="preschool-streak-grid">${rewardCards}</div></section>
            <details class="preschool-growth-more"><summary>花园图鉴和徽章</summary>${badgeBox || `<button class="preschool-badge-box-link badge-collection-toggle" type="button" data-action="toggle-badge-box">打开徽章收集箱 ${stats.badgeUnlocked}/${stats.badgeTotal}</button>`}
            <section class="preschool-section"><div class="preschool-section-head"><div><span class="eyebrow">PLANTS</span><h2>植物伙伴</h2></div><span class="tag lime">${stats.unlockedPlantCount}/${stats.plantCount}</span></div><div class="preschool-plant-grid">${garden.plants.map(function (plant) { const unlocked = garden.unlockedPlantIds.includes(plant.id); const active = plant.id === garden.activePlantId; const assetName = preschoolPlantAsset(plant); return `<button class="preschool-plant-card ${active ? 'is-active' : ''} ${unlocked ? '' : 'is-locked'} tone-${escapeHtml(plant.tone || 'lime')}" type="button" data-action="select-plant" data-id="${escapeHtml(plant.id)}" ${unlocked ? '' : 'disabled'}><span class="${assetName ? 'has-image' : ''}">${assetName ? preschoolAsset(assetName, unlocked ? plant.title : '未出现') : icon(plant.icon)}</span><strong>${escapeHtml(unlocked ? plant.title : '未出现')}</strong><small>${escapeHtml(unlocked ? plant.description : `${plant.unlockAt} 阳光出现`)}</small></button>`; }).join('')}</div></section>
            ${renderPreschoolCollection(garden)}
            <section class="preschool-section"><div class="preschool-section-head"><div><span class="eyebrow">STYLE</span><h2>星芒造型</h2></div><span class="tag blue">Lv.${growth.level} · ${escapeHtml(activeStyle.title)}</span></div><div class="preschool-style-grid">${growth.styles.map(function (style) { const unlocked = growth.unlockedStyleIds.includes(style.id); const active = style.id === growth.activeStyleId; const assetName = preschoolAssetForIcon(style.icon); return `<button class="preschool-style-card ${active ? 'is-active' : ''} ${unlocked ? '' : 'is-locked'}" type="button" data-action="select-style" data-id="${escapeHtml(style.id)}" ${unlocked ? '' : 'disabled'}><span class="${assetName ? 'has-image' : ''}">${assetName ? preschoolAsset(assetName, style.title) : icon(style.icon)}</span><strong>${escapeHtml(style.title)}</strong></button>`; }).join('')}</div></section></details>
            <details class="preschool-growth-more"><summary>三世界冒险进度</summary>${growthWorld}${renderPreschoolHomeWorldProgress()}${renderPreschoolVoxelHomeCard()}${renderPreschoolHomeRhythm(derived)}${renderPreschoolWeeklyAdventureReport({ forParent: false })}${renderPreschoolGrowthProgress(stats)}</details>`;
    }

    function renderPreschoolPlans(derived) {
        const plans = derived.todayPlans;
        const done = plans.filter(item => item.done).length;
        return `${renderPreschoolIntro(PAGE_META.plans, 'add-plan', '创建任务', `<span class="points-chip">${icon('circle-check')}${done}/${plans.length}</span>`)}<section class="preschool-plan-card is-simple"><div class="preschool-section-head"><div><span class="eyebrow">TODAY / LIST</span><h2>今天的清单</h2><p>创建、改名或删除。勾选完成请回首页。</p></div></div>${renderPreschoolPlanRows(plans, { editable: true })}</section>`;
    }

    function renderPreschoolCalendar(derived) {
        const today = derived.today;
        const monthKey = today.slice(0, 7);
        const monthStart = new Date(`${monthKey}-01T12:00:00`);
        const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
        const firstDay = monthStart.getDay();
        const completedDates = new Set(state.dailyPlans.filter(function (item) { return item.done; }).map(function (item) { return item.date; }));
        const activeDates = new Set(state.dailyPlans.concat(state.focusSessions || [], state.readingLogs || []).map(function (item) { return item.date; }));
        const completedThisMonth = Array.from(completedDates).filter(function (date) { return String(date).startsWith(monthKey); }).length;
        const attendance = daysInMonth ? Math.round((completedThisMonth / daysInMonth) * 100) : 0;
        const cells = Array.from({ length: firstDay }, function () { return '<span class="preschool-calendar-blank" aria-hidden="true"></span>'; });
        for (let day = 1; day <= daysInMonth; day += 1) {
            const date = `${monthKey}-${String(day).padStart(2, '0')}`;
            const isToday = date === today;
            const isFuture = date > today;
            const isDone = completedDates.has(date);
            const isActive = activeDates.has(date);
            const status = isDone ? 'done' : isFuture ? 'future' : isActive ? 'active' : 'missed';
            cells.push(`<span class="preschool-calendar-day is-${status} ${isToday ? 'is-today' : ''}" title="${date}"><b>${day}</b><small>${isDone ? '✓' : isFuture ? '○' : isActive ? '·' : '×'}</small></span>`);
        }
        return `${renderPreschoolIntro(PAGE_META.calendar, '', '', `<span class="tag lime">${attendance}% 出勤率</span>`)}<div class="preschool-calendar-layout"><section class="preschool-calendar-card"><div class="preschool-section-head"><div><span class="eyebrow">ACTION / CALENDAR</span><h2>${monthStart.getFullYear()}年 ${monthStart.getMonth() + 1}月</h2><p>完成任务会留下绿色小点，漏掉的一天也只是下一次出发的提示。</p></div><span class="preschool-calendar-today">今天 ${today.slice(8)} 日</span></div><div class="preschool-calendar-weekdays">${['日', '一', '二', '三', '四', '五', '六'].map(function (label) { return `<span>${label}</span>`; }).join('')}</div><div class="preschool-calendar-grid">${cells.join('')}</div></section><aside class="preschool-calendar-summary"><article><span>${icon('calendar-check-2')}</span><strong>${completedThisMonth}</strong><small>本月点亮天数</small></article><article><span>${icon('flame')}</span><strong>${getChildGrowth().streak}</strong><small>当前连续天数</small></article><article><span>${icon('target')}</span><strong>${derived.todayPlans.filter(function (item) { return item.done; }).length}/${derived.todayPlans.length}</strong><small>今天完成进度</small></article><div class="preschool-calendar-legend"><strong>怎么看小日历</strong><span><i class="done"></i>已点亮</span><span><i class="missed"></i>还没点亮</span><span><i class="future"></i>还没到</span></div></aside></div>`;
    }

    function findPreschoolLesson(id) {
        const courses = Array.isArray(workbenchConfig.childCourses) ? workbenchConfig.childCourses : [];
        for (const course of courses) {
            const lesson = Array.isArray(course.lessons) ? course.lessons.find(function (item) { return item.id === id; }) : null;
            if (lesson) return { course: course, lesson: lesson };
        }
        return null;
    }

    function getLiteracyEngine() {
        return global.PersonalWorkbenchPreschoolLiteracy || null;
    }

    function getEnglishVocabEngine() {
        return global.PersonalWorkbenchPreschoolEnglishVocab || null;
    }

    function preschoolCardArt(spec) {
        const helper = global.PersonalWorkbenchPreschoolCardArt;
        return helper && typeof helper.render === 'function' ? helper.render(spec) : '';
    }

    function preschoolVocabMediaSrc(rel) {
        const value = String(rel || '').trim().replace(/^\/+/, '');
        if (!value || /^https?:/i.test(value)) return '';
        const allowed = value.indexOf('assets/img/vocab/') === 0
            || value.indexOf('assets/audio/vocab/') === 0
            || value.indexOf('assets/img/vocab-mc/') === 0
            || value.indexOf('assets/audio/vocab-mc/') === 0;
        if (!allowed) return '';
        return '../' + value;
    }

    function resolvePreschoolCardMedia(entry) {
        const source = entry && typeof entry === 'object' ? entry : {};
        const media = source.media && typeof source.media === 'object' ? source.media : {};
        const image = String(media.image || source.image || '').trim();
        const audio = String(media.audio || source.audio || '').trim();
        const art = String(media.art || source.art || '').trim();
        const imageUrl = preschoolVocabMediaSrc(image);
        const audioUrl = preschoolVocabMediaSrc(audio);
        let artSvg = '';
        if (!imageUrl && art !== 'none') {
            artSvg = preschoolCardArt(Object.assign({}, source, { art: art || source.art }));
        }
        return {
            imageUrl: imageUrl,
            artSvg: artSvg,
            audioUrl: audioUrl,
            markup: imageUrl
                ? `<img class="preschool-card-art preschool-card-photo" src="${escapeHtml(imageUrl)}" alt="" loading="lazy">`
                : artSvg
        };
    }

    function preschoolVocabArt(item) {
        return resolvePreschoolCardMedia(item).markup;
    }

    function playVocabAudio(url, fallbackText, lang) {
        const raw = String(url || '').trim();
        const src = raw.indexOf('../assets/') === 0 ? raw : preschoolVocabMediaSrc(raw);
        if (src && global.Audio) {
            try {
                const audio = new Audio(src);
                audio.play().catch(function () { speakLiteracy(fallbackText, lang); });
                return;
            } catch (error) {
                console.warn('[PersonalWorkbench] 词汇音频失败', error);
            }
        }
        speakLiteracy(fallbackText, lang);
    }

    function getPhonicsEngine() {
        return global.PersonalWorkbenchPreschoolPhonics || null;
    }

    function getMathBankEngine() {
        return global.PersonalWorkbenchPreschoolMathBank || null;
    }

    function getPinyinEngine() {
        return global.PersonalWorkbenchPreschoolPinyin || null;
    }

    function getPlayGamesEngine() {
        return global.PersonalWorkbenchPreschoolPlayGames || null;
    }

    function getPoetryEngine() {
        return global.PersonalWorkbenchPreschoolPoetry || null;
    }

    function isLiteracyLesson(match) {
        const mode = match && match.lesson && match.lesson.activity && match.lesson.activity.mode;
        return mode === 'literacy-loop' || mode === 'literacy-bloom' || mode === 'literacy-review' || mode === 'literacy-find' || mode === 'literacy-flash';
    }

    function isEnglishSpeakLesson(match) {
        const mode = match && match.lesson && match.lesson.activity && match.lesson.activity.mode;
        return mode === 'english-speak';
    }

    function isBankQuizLesson(match) {
        const mode = match && match.lesson && match.lesson.activity && match.lesson.activity.mode;
        return mode === 'phonics-cvc' || mode === 'phonics-letter' || mode === 'math-bank' || mode === 'pinyin-initial' || mode === 'poetry-line';
    }

    function isPlayLesson(match) {
        const mode = match && match.lesson && match.lesson.activity && match.lesson.activity.mode;
        return mode === 'play-memory' || mode === 'play-odd' || mode === 'play-order' || mode === 'play-schulte' || mode === 'play-sudoku' || mode === 'play-simon' || mode === 'play-search' || mode === 'pinyin-match';
    }

    function isMotionTimerLesson(match) {
        const mode = match && match.lesson && match.lesson.activity && match.lesson.activity.mode;
        return mode === 'motion-timer';
    }

    function isReplayableLesson(match) {
        return isLiteracyLesson(match) || isEnglishSpeakLesson(match) || isBankQuizLesson(match) || isPlayLesson(match) || isMotionTimerLesson(match);
    }

    function isFocusInlineSession() {
        return !!(isPreschool && ui.lessonSession && ui.lessonSession.courseId === 'preschool-focus');
    }

    function getFocusPlayStages(match) {
        const engine = getPlayGamesEngine();
        const mode = match && match.lesson && match.lesson.activity && match.lesson.activity.mode;
        return engine && typeof engine.getFocusStages === 'function' ? engine.getFocusStages(mode) : [];
    }

    function playSessionSalt(extra) {
        const level = Number(ui.lessonSession && ui.lessonSession.focusLevel) || 0;
        return storage.localDate().length + (Number(extra) || 0) + level * 17;
    }

    function getFocusArcadeMeta(match) {
        const mode = match && match.lesson && match.lesson.activity && match.lesson.activity.mode;
        const table = {
            'play-schulte': { emoji: '👁️', theme: 'indigo', title: '舒尔特方格', blurb: '按顺序点击数字。这是一个视觉扫描小游戏。', win: '太棒啦！' },
            'play-sudoku': { emoji: '🧩', theme: 'green', title: '数独', blurb: '填满数字，保证每行每列不重复。', win: '逻辑满分！' },
            'play-memory': { emoji: '🦊', theme: 'orange', title: '记忆翻牌', blurb: '翻开两张相同的卡片即可消除。', win: '记忆力大师！' },
            'play-simon': { emoji: '🎵', theme: 'purple', title: '听音辨位', blurb: '看按钮闪烁的顺序，再按同样顺序点回去。', win: '顺序记住啦！' },
            'play-search': { emoji: '🔍', theme: 'teal', title: '视觉搜索', blurb: '只点目标图案，把它们都找出来。', win: '火眼金睛！' }
        };
        return table[mode] || { emoji: '✨', theme: 'indigo', title: '专注力', blurb: '', win: '过关啦！' };
    }

    function clearFocusPlayClock() {
        if (focusPlayClockId) {
            clearInterval(focusPlayClockId);
            focusPlayClockId = 0;
        }
    }

    function startFocusPlayClock() {
        clearFocusPlayClock();
        focusPlayClockId = setInterval(function () {
            const el = document.querySelector('[data-focus-clock]');
            const play = ui.lessonSession && ui.lessonSession.play;
            if (!el || !play || !play.startedAt || play.complete || (play.run && play.run.complete)) return;
            el.textContent = ((Date.now() - play.startedAt) / 1000).toFixed(1) + 's';
        }, 100);
    }

    function selectFocusPlayLevel(level) {
        const match = findPreschoolLesson(ui.lessonSession && ui.lessonSession.id);
        if (!match || !ui.lessonSession) return false;
        const stages = getFocusPlayStages(match);
        if (!stages.length) return false;
        ui.lessonSession.focusPhase = 'pick';
        ui.lessonSession.focusLevel = Math.max(0, Math.min(stages.length - 1, Number(level) || 0));
        ui.lessonSession.play = null;
        render();
        return true;
    }

    function startFocusPlayLevel(level) {
        const match = findPreschoolLesson(ui.lessonSession && ui.lessonSession.id);
        if (!match || !ui.lessonSession) return false;
        const stages = getFocusPlayStages(match);
        if (!stages.length) return false;
        const index = Math.max(0, Math.min(stages.length - 1, Number(level) || 0));
        ui.lessonSession.focusPhase = 'play';
        ui.lessonSession.focusLevel = index;
        ui.lessonSession.selectedIndex = null;
        ui.lessonSession.correct = false;
        ui.lessonSession.play = buildPlaySession(match, stages[index]);
        if (ui.lessonSession.play) ui.lessonSession.play.startedAt = Date.now();
        clearLessonSimonTimer();
        render();
        startFocusPlayClock();
        if (ui.lessonSession.play && ui.lessonSession.play.kind === 'simon') startLessonSimonShow();
        return true;
    }

    function startFocusPlayFromIdle() {
        return startFocusPlayLevel(ui.lessonSession && ui.lessonSession.focusLevel);
    }

    function refreshFocusArcade() {
        if (ui.lessonSession && ui.lessonSession.focusPhase === 'play') return replayFocusPlayLevel();
        return startFocusPlayFromIdle();
    }

    function replayFocusPlayLevel() {
        return startFocusPlayLevel(ui.lessonSession && ui.lessonSession.focusLevel);
    }

    function nextFocusPlayLevel() {
        const match = findPreschoolLesson(ui.lessonSession && ui.lessonSession.id);
        const stages = getFocusPlayStages(match);
        const current = Number(ui.lessonSession && ui.lessonSession.focusLevel) || 0;
        if (current >= stages.length - 1) return startFocusPlayLevel(current);
        return startFocusPlayLevel(current + 1);
    }

    function backFocusPlayMap() {
        if (!ui.lessonSession || !isFocusInlineSession()) return false;
        clearLessonSimonTimer();
        clearFocusPlayClock();
        ui.lessonSession.focusPhase = 'pick';
        ui.lessonSession.play = null;
        ui.lessonSession.correct = false;
        render();
        return true;
    }

    function renderFocusArcadeIdle(match, meta) {
        const stages = getFocusPlayStages(match);
        const selected = Number(ui.lessonSession.focusLevel) || 0;
        const pills = stages.map(function (stage, index) {
            return `<button class="focus-arcade-pill ${index === selected ? 'is-on' : ''}" type="button" data-action="focus-pick-level" data-level="${index}">${escapeHtml(stage.hint)}</button>`;
        }).join('');
        return `<div class="play-level-pick focus-arcade-idle"><div class="focus-arcade-emoji" aria-hidden="true">${meta.emoji}</div><h2>${escapeHtml(meta.title)}</h2><p>${escapeHtml(meta.blurb)}</p><div class="focus-arcade-pills">${pills}</div><button class="focus-arcade-start" type="button" data-action="focus-start-level">开始挑战</button></div>`;
    }

    function renderFocusArcadeWon(match, meta, play) {
        const stages = getFocusPlayStages(match);
        const level = Number(ui.lessonSession.focusLevel) || 0;
        const hasNext = level < stages.length - 1;
        const elapsed = play && play.startedAt ? ((Date.now() - play.startedAt) / 1000).toFixed(1) : '';
        const extra = play && play.kind === 'schulte' && elapsed
            ? `<p>最终用时: <strong>${elapsed} 秒</strong></p>`
            : '';
        return `<div class="play-win-banner focus-arcade-won" role="status"><div class="focus-arcade-emoji" aria-hidden="true">🏆</div><h2>${escapeHtml(meta.win)}</h2>${extra}<div class="focus-arcade-actions play-win-actions">${hasNext ? `<button class="focus-arcade-next" type="button" data-action="focus-next-level">下一关</button>` : ''}<button class="focus-arcade-again" type="button" data-action="focus-replay">再来一次</button><button class="focus-arcade-finish" type="button" data-action="lesson-finish">完成点亮</button></div></div>`;
    }

    function renderFocusArcadePlaying(match, meta, play) {
        if (play.kind === 'memory' && play.board) {
            const cards = play.board.cards || [];
            const cols = cards.length > 16 ? 5 : (cards.length === 12 ? 3 : 4);
            const tiles = cards.map(function (card, index) {
                const open = card.matched || (play.board.selected || []).indexOf(index) >= 0;
                return `<button class="focus-arcade-flip play-flip-card ${card.matched ? 'is-matched' : ''} ${open ? 'is-open' : ''}" type="button" data-action="play-flip" data-index="${index}" ${card.matched ? 'disabled' : ''}><span class="focus-arcade-flip-inner play-flip-inner"><span class="focus-arcade-flip-back" aria-hidden="true">?</span><span class="focus-arcade-flip-face">${open ? escapeHtml(card.face) : ''}</span></span></button>`;
            }).join('');
            const matched = play.board.matchedCount || 0;
            return `<div class="focus-arcade-play"><div class="focus-arcade-stat-row"><div class="focus-arcade-stat">步数: <span>${(play.board.selected || []).length}</span></div><div class="focus-arcade-stat is-theme">配对: ${matched}</div></div><div class="focus-arcade-grid" style="--play-cols:${cols}; grid-template-columns:repeat(${cols}, minmax(0,1fr)); max-width:${cols > 4 ? 450 : 350}px">${tiles}</div></div>`;
        }
        if (play.kind === 'schulte' && play.run) {
            const size = play.run.size || 5;
            const tiles = (play.run.cells || []).map(function (value, index) {
                const done = (play.run.done || []).indexOf(value) >= 0;
                return `<button class="focus-arcade-cell ${done ? 'is-done' : ''} ${play.run.wrong && !done ? 'is-wrong' : ''}" type="button" data-action="play-schulte" data-index="${index}" ${done || play.run.complete ? 'disabled' : ''}>${value}</button>`;
            }).join('');
            const elapsed = play.startedAt ? ((Date.now() - play.startedAt) / 1000).toFixed(1) + 's' : '0.0s';
            return `<div class="focus-arcade-play"><div class="focus-arcade-stat-row"><div class="focus-arcade-stat"><small>下一个数字</small><strong>${play.run.next}</strong></div><div class="focus-arcade-stat"><small>用时</small><strong data-focus-clock>${elapsed}</strong></div></div><div class="focus-arcade-grid is-square" style="grid-template-columns:repeat(${size}, minmax(0,1fr))">${tiles}</div></div>`;
        }
        if (play.kind === 'sudoku' && play.run) {
            const size = play.run.size || 6;
            const cells = (play.run.values || []).map(function (value, index) {
                const given = !!(play.run.given && play.run.given[index]);
                const selected = play.run.selected === index;
                return `<button class="focus-arcade-sudoku-cell ${given ? 'is-given' : ''} ${selected ? 'is-selected' : ''} ${play.run.wrong && selected ? 'is-wrong' : ''}" type="button" data-action="play-sudoku-cell" data-index="${index}" ${given || play.run.complete ? 'disabled' : ''}>${value || ''}</button>`;
            }).join('');
            const digits = [];
            for (let digit = 1; digit <= size; digit += 1) digits.push(digit);
            const pad = digits.map(function (digit) {
                return `<button type="button" data-action="play-sudoku-num" data-value="${digit}" ${play.run.selected < 0 || play.run.complete ? 'disabled' : ''}>${digit}</button>`;
            }).join('');
            return `<div class="focus-arcade-play"><div class="focus-arcade-sudoku" style="grid-template-columns:repeat(${size}, minmax(0,1fr)); max-width:${size === 4 ? 280 : 360}px">${cells}</div><div class="focus-arcade-pad" style="max-width:${size === 4 ? 280 : 360}px">${pad}</div></div>`;
        }
        if (play.kind === 'simon' && play.run) {
            const lit = play.run.phase === 'show' ? play.run.sequence[play.run.showIndex] : -1;
            const pads = (play.run.colors || ['red', 'blue', 'green', 'yellow']).map(function (color, index) {
                const label = (play.run.labels && play.run.labels[index]) || color;
                return `<button class="focus-arcade-simon-pad is-${escapeHtml(color || '')} ${lit === index ? 'is-lit' : ''}" type="button" data-action="play-simon" data-index="${index}" aria-label="${escapeHtml(label)}" ${play.run.phase !== 'input' || play.run.complete ? 'disabled' : ''}></button>`;
            }).join('');
            const tip = play.run.phase === 'show' ? '听仔细！看仔细！' : (play.run.wrong ? '哎呀，点错了！' : '轮到你了！');
            return `<div class="focus-arcade-play"><p class="focus-arcade-idle" style="padding:0 0 8px"><strong>${escapeHtml(tip)}</strong></p><div class="focus-arcade-simon">${pads}</div><p>当前记忆长度: ${play.run.sequence.length}</p></div>`;
        }
        if (play.kind === 'search' && play.run) {
            const size = play.run.size || 6;
            const tiles = (play.run.cells || []).map(function (cell, index) {
                return `<button class="focus-arcade-cell ${cell.found ? 'is-done' : ''} ${play.run.wrong && !cell.found ? 'is-wrong' : ''}" type="button" data-action="play-search" data-index="${index}" ${cell.found || play.run.complete ? 'disabled' : ''}>${escapeHtml(cell.face)}</button>`;
            }).join('');
            return `<div class="focus-arcade-play"><div class="focus-arcade-search-target"><span>${escapeHtml(play.run.target)}</span><strong>${play.run.found}/${play.run.total}</strong></div><div class="focus-arcade-grid is-square" style="grid-template-columns:repeat(${size}, minmax(0,1fr))">${tiles}</div></div>`;
        }
        return renderPlayLessonBody('', play);
    }

    function renderFocusPlayInner() {
        const match = findPreschoolLesson(ui.lessonSession && ui.lessonSession.id);
        if (!match) return '<p class="lesson-dialog-feedback is-error">这节练习暂时不可用。</p>';
        const meta = getFocusArcadeMeta(match);
        if (ui.lessonSession.focusPhase !== 'play' || !ui.lessonSession.play) return renderFocusArcadeIdle(match, meta);
        if (isPlayComplete(ui.lessonSession.play)) return renderFocusArcadeWon(match, meta, ui.lessonSession.play);
        return renderFocusArcadePlaying(match, meta, ui.lessonSession.play);
    }

    function buildBankQuizSession(match) {
        const activity = match && match.lesson && match.lesson.activity ? match.lesson.activity : {};
        if (activity.mode === 'phonics-cvc') {
            const engine = getPhonicsEngine();
            if (!engine) return null;
            const quiz = engine.buildBlendQuiz(engine.getRuntimeBank(), { preferred: activity.preferred || 'mat', size: activity.size || 10 });
            if (!quiz || !quiz.rounds.length) return null;
            return { mode: 'phonics-cvc', run: quiz, roundIndex: 0, roundCorrect: false, complete: false, speakLang: 'en-US' };
        }
        if (activity.mode === 'math-bank') {
            const engine = getMathBankEngine();
            if (!engine) return null;
            const quiz = engine.buildQuiz(engine.getRuntimeBank(), { level: resolveLessonLevel(match), band: getMathPracticeBand(), size: activity.size || 8, salt: String(match.lesson && match.lesson.id || '').length });
            if (!quiz || !quiz.rounds.length) return null;
            return { mode: 'math-bank', run: quiz, roundIndex: 0, roundCorrect: false, complete: false, speakLang: 'zh-CN' };
        }
        if (activity.mode === 'phonics-letter') {
            const engine = getPhonicsEngine();
            if (!engine) return null;
            const quiz = engine.buildLetterQuiz(engine.getRuntimeLetters(), { groups: activity.groups || '', preferred: activity.preferred || 'm', size: activity.size || 5 });
            if (!quiz || !quiz.rounds.length) return null;
            return { mode: 'phonics-letter', run: quiz, roundIndex: 0, roundCorrect: false, complete: false, speakLang: 'en-US' };
        }
        if (activity.mode === 'pinyin-initial') {
            const engine = getPinyinEngine();
            if (!engine) return null;
            const quiz = engine.buildInitialQuiz(engine.getRuntimeBank(), { kind: activity.kind || 'initial', groups: activity.groups || '', preferred: activity.preferred || 'b', size: activity.size || 8, level: resolveLessonLevel(match) });
            if (!quiz || !quiz.rounds.length) return null;
            return { mode: 'pinyin-initial', run: quiz, roundIndex: 0, roundCorrect: false, complete: false, speakLang: 'zh-CN' };
        }
        if (activity.mode === 'poetry-line') {
            const engine = getPoetryEngine();
            if (!engine) return null;
            const quiz = engine.buildLineQuiz(engine.getRuntimeBank(), { preferred: activity.preferred || 'poem-jingyesi', size: activity.size || 5, level: resolveLessonLevel(match) });
            if (!quiz || !quiz.rounds.length) return null;
            return { mode: 'poetry-line', run: quiz, roundIndex: 0, roundCorrect: false, complete: false, speakLang: 'zh-CN' };
        }
        return null;
    }

    function isMinecraftCourse(match) {
        return !!(match && match.course && match.course.id === 'preschool-minecraft');
    }

    function buildEnglishSession(match) {
        const engine = getEnglishVocabEngine();
        if (!engine || !match) return null;
        const isMc = isMinecraftCourse(match);
        const bank = isMc ? getMinecraftBank(engine) : engine.getRuntimeBank();
        const activity = match.lesson.activity || {};
        const size = activity.size || 5;
        const daily = engine.dailyWindow(bank, storage.localDate(), size);
        const mastery = isMc
            ? (state.courseProgress && state.courseProgress.minecraft ? state.courseProgress.minecraft : engine.createDefaultProgress())
            : (state.courseProgress && state.courseProgress.english ? state.courseProgress.english : engine.createDefaultProgress());
        const batch = typeof engine.buildSpeakBatch === 'function'
            ? engine.buildSpeakBatch(bank, mastery, engine.getRuntimeRules(), storage.localDate(), activity.preferred || '', size)
            : daily.batch;
        if (!batch.length) return null;
        return { mode: 'english-speak', phase: 'speak', batch: batch, day: daily.day, match: null, spell: null, complete: false, bankKind: isMc ? 'minecraft' : 'english' };
    }

    function buildPlaySession(match, stage) {
        const engine = getPlayGamesEngine();
        const activity = match && match.lesson && match.lesson.activity ? match.lesson.activity : {};
        const size = stage && stage.size != null ? Number(stage.size) : activity.size;
        const clues = stage && stage.clues != null ? Number(stage.clues) : activity.clues;
        const targets = stage && stage.targets != null ? Number(stage.targets) : activity.targets;
        if (!engine) return null;
        if (activity.mode === 'play-memory') {
            return { kind: 'memory', board: engine.buildMemoryBoard(size || 8, playSessionSalt(5)), complete: false };
        }
        if (activity.mode === 'play-odd') {
            const run = engine.buildOddRounds(size || 3, 7);
            return { kind: 'odd', run: run, roundIndex: 0, roundCorrect: false, complete: false };
        }
        if (activity.mode === 'play-order') {
            return { kind: 'order', run: engine.buildOrderRound(size || 5, 4), complete: false };
        }
        if (activity.mode === 'play-schulte') {
            return { kind: 'schulte', run: engine.buildSchulteGrid(size || 5, playSessionSalt(11)), complete: false };
        }
        if (activity.mode === 'play-sudoku') {
            const run = typeof engine.buildSudoku === 'function'
                ? engine.buildSudoku(size || 6, playSessionSalt(8), clues || 16)
                : engine.buildSudoku6(playSessionSalt(8), clues || 16);
            return { kind: 'sudoku', run: run, complete: false };
        }
        if (activity.mode === 'play-simon') {
            return { kind: 'simon', run: engine.buildSimonRound(size || 6, playSessionSalt(3)), complete: false };
        }
        if (activity.mode === 'play-search') {
            return { kind: 'search', run: engine.buildSearchGrid(size || 6, targets || 8, playSessionSalt(5)), complete: false };
        }
        if (activity.mode === 'pinyin-match') {
            const pinyin = getPinyinEngine();
            if (!pinyin) return null;
            const kind = String(activity.kind || 'final');
            const pool = pinyin.getRuntimeBank().filter(function (item) { return item.kind === kind; }).slice(0, activity.size || 6);
            return { kind: 'match', board: engine.buildMatchBoard(pinyin.toMatchPairs(pool), 2), complete: false };
        }
        return null;
    }

    function buildLiteracySession(match) {
        const engine = getLiteracyEngine();
        if (!engine || !match) return null;
        const bank = engine.getRuntimeBank();
        const rules = engine.getRuntimeRules();
        const activity = match.lesson.activity || {};
        const level = resolveLessonLevel(match);
        const mastery = state.courseProgress && state.courseProgress.literacy
            ? state.courseProgress.literacy
            : engine.createDefaultProgress();
        if (activity.mode === 'literacy-flash') {
            const batch = engine.buildFlashBatch(bank, mastery, rules, storage.localDate(), activity.char || '山', activity.size || 8, level);
            return { mode: 'literacy-flash', batch: batch, phase: 'mark', teachIndex: 0, card: null, level: level, complete: false };
        }
        if (activity.mode === 'literacy-bloom') {
            const char = engine.pickTodayChar(bank, mastery, rules, storage.localDate(), activity.char || '山', level);
            const bloom = engine.buildWordBloom(bank, char);
            return bloom ? { mode: 'literacy-bloom', char: bloom.char, bloom: bloom, selected: {}, level: level, complete: false } : null;
        }
        if (activity.mode === 'literacy-find' || activity.mode === 'literacy-review') {
            const run = engine.buildFindRun(bank, mastery, rules, storage.localDate(), activity.char || '山', activity.rounds || 5, level);
            if (!run || !run.rounds.length) return null;
            return { mode: 'literacy-find', char: run.rounds[0].char, run: run, roundIndex: 0, roundCorrect: false, hint: false, level: level, complete: false };
        }
        const char = engine.pickTodayChar(bank, mastery, rules, storage.localDate(), activity.char || '山', level);
        const loop = engine.buildLoop(bank, char);
        if (!loop) return null;
        return { mode: activity.mode, char: loop.char, loop: loop, stepIndex: 0, stepCorrect: false, complete: false };
    }

    function buildMotionTimerSession(match) {
        const activity = match && match.lesson && match.lesson.activity ? match.lesson.activity : {};
        const durationSec = Math.max(15, Math.min(90, Number(activity.durationSec) || 45));
        return {
            durationSec: durationSec,
            remaining: durationSec,
            safety: Array.isArray(activity.safety) ? activity.safety.slice() : [],
            prompt: String(activity.prompt || (match.lesson && match.lesson.title) || '开始做'),
            success: String(activity.success || '做完啦！'),
            complete: false
        };
    }

    function clearLessonMotionTimer() {
        if (lessonMotionTimerId) {
            clearInterval(lessonMotionTimerId);
            lessonMotionTimerId = 0;
        }
    }

    function tickLessonMotionTimer() {
        const timer = ui.lessonSession && ui.lessonSession.timer;
        if (!timer || timer.complete) {
            clearLessonMotionTimer();
            return;
        }
        timer.remaining = Math.max(0, Number(timer.remaining) - 1);
        if (timer.remaining <= 0) {
            timer.complete = true;
            ui.lessonSession.correct = true;
            clearLessonMotionTimer();
            speakPraise(timer.success);
        }
        renderLessonDialog();
    }

    function startLessonMotionTimer() {
        clearLessonMotionTimer();
        lessonMotionTimerId = setInterval(tickLessonMotionTimer, 1000);
    }

    function clearLessonSimonTimer() {
        if (lessonSimonTimerId) {
            clearInterval(lessonSimonTimerId);
            lessonSimonTimerId = 0;
        }
    }

    function startLessonSimonShow() {
        const engine = getPlayGamesEngine();
        const play = ui.lessonSession && ui.lessonSession.play;
        if (!engine || !play || play.kind !== 'simon' || !play.run) return;
        clearLessonSimonTimer();
        lessonSimonTimerId = setInterval(function () {
            const current = ui.lessonSession && ui.lessonSession.play;
            if (!current || current.kind !== 'simon' || !current.run || current.run.phase !== 'show') {
                clearLessonSimonTimer();
                return;
            }
            current.run = engine.advanceSimonShow(current.run);
            if (current.run.phase !== 'show') clearLessonSimonTimer();
            renderLessonDialog();
        }, 700);
    }

    function completeMotionTimer() {
        const timer = ui.lessonSession && ui.lessonSession.timer;
        if (!timer) return false;
        timer.complete = true;
        timer.remaining = 0;
        ui.lessonSession.correct = true;
        clearLessonMotionTimer();
        renderLessonDialog();
        speakPraise(timer.success);
        return true;
    }

    function recordLiteracyAttempt(activityType, correct) {
        const engine = getLiteracyEngine();
        const session = ui.lessonSession && ui.lessonSession.literacy;
        if (!engine || !session || !session.char) return;
        let newBadges = [];
        commit(function (next) {
            const current = next.courseProgress && next.courseProgress.literacy
                ? next.courseProgress.literacy
                : engine.createDefaultProgress();
            const updated = engine.recordAttempt(current, session.char, {
                correct: !!correct,
                date: storage.localDate(),
                activityType: activityType
            }, engine.getRuntimeRules());
            next.courseProgress = global.PersonalWorkbenchChildCourses.saveLiteracy(next.courseProgress, updated);
            newBadges = applyPreschoolAchievements(next);
        }, '');
        presentPreschoolAchievements(newBadges);
    }

    function literacyBloomComplete(session) {
        if (!session || !session.bloom) return false;
        return session.bloom.options.every(function (option) {
            return !!session.selected[option.word] === !!option.correct;
        });
    }

    function getPreschoolPlanPractice(plan) {
        if (!isPreschool || !plan || !plan.practiceLessonId) return null;
        return findPreschoolLesson(plan.practiceLessonId);
    }

    function preschoolHomeLanePracticeButton(item) {
        if (!item || item.done || !item.practiceLessonId) return '';
        return `<button class="preschool-home-lane-practice" type="button" data-action="open-plan-practice" data-id="${escapeHtml(item.id)}" data-date="${escapeHtml(item.date)}" aria-label="去练习${escapeHtml(item.title)}">${icon('play')}<span>去练习</span></button>`;
    }

    function getDueMistakeReviews() {
        if (!storage || typeof storage.buildMistakeReviewQueue !== 'function') return [];
        return storage.buildMistakeReviewQueue(state.mistakes, storage.localDate());
    }

    function resolveReviewOutcome(known) {
        const key = ui.reviewSourceKey;
        if (!key || !storage || typeof storage.markMistakeReviewed !== 'function') return;
        commit(function (next) {
            next.mistakes = storage.markMistakeReviewed(next.mistakes, key, !!known);
        }, '');
        if (known) ui.reviewSourceKey = '';
    }

    function openReviewPractice() {
        const due = getDueMistakeReviews();
        if (!due.length) {
            showToast('今天没有要复习的题。');
            return;
        }
        const first = due[0];
        if (!first.lessonId) {
            setPage('mistakes');
            return;
        }
        ui.reviewSourceKey = first.sourceKey || '';
        openLessonDialog(first.lessonId);
    }

    function getLessonActivity(lesson) {
        const source = lesson && lesson.activity && typeof lesson.activity === 'object' ? lesson.activity : {};
        const options = Array.isArray(source.options) && source.options.length ? source.options : ['我准备好了'];
        const answer = Math.max(0, Math.min(options.length - 1, Number.isInteger(Number(source.answer)) ? Number(source.answer) : 0));
        return {
            prompt: String(source.prompt || `准备完成“${lesson && lesson.title ? lesson.title : '这项练习'}”吗？`),
            hint: String(source.hint || (lesson && lesson.tip) || '选一个'),
            options: options.map(function (item) { return String(item); }),
            optionIcons: Array.isArray(source.optionIcons)
                ? source.optionIcons.map(function (item) { return String(item); })
                : [],
            answer: answer,
            success: String(source.success || '好！')
        };
    }

    function isPlayComplete(play) {
        if (!play) return false;
        if (play.complete) return true;
        if (play.board && play.board.complete) return true;
        if (play.run && play.run.complete) return true;
        return false;
    }

    function renderPlayHud(play, title, feedbackHtml) {
        if (!isFocusInlineSession() || !ui.lessonSession || ui.lessonSession.focusPhase !== 'play') {
            return `<h3 class="lesson-dialog-prompt">${escapeHtml(title)}</h3><p class="lesson-dialog-feedback">${feedbackHtml}</p>`;
        }
        const match = findPreschoolLesson(ui.lessonSession.id);
        const stages = getFocusPlayStages(match);
        const level = Number(ui.lessonSession.focusLevel) || 0;
        const hint = stages[level] ? stages[level].hint : '';
        return `<div class="play-arcade-hud"><span>第 ${level + 1} 关</span>${hint ? `<small>${escapeHtml(hint)}</small>` : ''}</div><h3 class="lesson-dialog-prompt">${escapeHtml(title)}</h3><p class="lesson-dialog-feedback">${feedbackHtml}</p>`;
    }

    function renderPlayActions(play, extraAction) {
        const done = isPlayComplete(play);
        if (isFocusInlineSession() && ui.lessonSession && ui.lessonSession.focusPhase === 'play') {
            if (!done) return '';
            const match = findPreschoolLesson(ui.lessonSession.id);
            const stages = getFocusPlayStages(match);
            const level = Number(ui.lessonSession.focusLevel) || 0;
            const hasNext = level < stages.length - 1;
            return `<div class="play-win-banner" role="status"><p class="play-win-stars" aria-hidden="true">⭐⭐⭐</p><strong>过关啦！</strong><div class="play-win-actions">${hasNext ? `<button class="btn-primary" type="button" data-action="focus-next-level">${icon('sparkles')}下一关</button>` : ''}<button class="btn-secondary" type="button" data-action="focus-replay">${icon('rotate-ccw')}再玩</button><button class="btn-primary" type="button" data-action="lesson-finish">${icon('sparkles')}完成点亮</button></div></div>`;
        }
        const action = extraAction || 'lesson-finish';
        return `<div class="lesson-dialog-actions"><button class="btn-secondary lesson-quit" type="button" data-action="close-lesson" aria-label="先放一放" title="先放一放">${icon('x')}</button><button class="btn-primary" type="button" data-action="${action}" ${done ? '' : 'disabled'}>${icon(done ? 'sparkles' : 'lock-keyhole')}${done ? '完成' : '继续'}</button></div>`;
    }

    function sudokuBoxClass(index, size) {
        const edge = Number(size) || 6;
        const row = Math.floor(index / edge);
        const col = index % edge;
        const boxW = edge === 4 ? 2 : 3;
        const classes = [];
        if (col % boxW === 0) classes.push('is-box-left');
        if ((col + 1) % boxW === 0) classes.push('is-box-right');
        if (row % 2 === 0) classes.push('is-box-top');
        if ((row + 1) % 2 === 0) classes.push('is-box-bottom');
        return classes.join(' ');
    }

    function renderPlayMatchBody(progressHead, prompt, board, hint, nextLabel) {
        const cards = (board.cards || []).map(function (card, index) {
            const open = card.matched || (board.selected || []).indexOf(index) >= 0;
            return `<button class="play-match-card play-flip-card ${card.matched ? 'is-matched' : ''} ${open ? 'is-open' : ''}" type="button" data-action="play-flip" data-index="${index}" ${card.matched ? 'disabled' : ''}><span class="play-flip-inner"><span class="play-flip-back" aria-hidden="true"></span><span class="play-flip-face">${open ? escapeHtml(card.face) : ''}</span></span></button>`;
        }).join('');
        const cols = (board.cards || []).length > 16 ? 5 : 4;
        const play = { board: board, complete: !!board.complete, kind: 'memory' };
        return `<div class="lesson-dialog-body play-arcade-body">${progressHead}${renderPlayHud(play, prompt, escapeHtml(hint || (board.complete ? '全配上啦！' : '翻开两张一样的')))}<div class="play-match-grid" style="--play-cols:${cols}">${cards}</div>${renderPlayActions(play)}</div>`;
    }

    function renderPlaySpellBody(progressHead, spell) {
        const tiles = (spell.tiles || []).map(function (letter) {
            return `<button class="play-spell-tile" type="button" data-action="play-spell" data-letter="${escapeHtml(letter)}">${escapeHtml(letter)}</button>`;
        }).join('');
        const feedback = spell.complete ? '拼对啦！' : (spell.wrong ? '再试一次' : '按顺序点');
        return `<div class="lesson-dialog-body">${progressHead}<h3 class="lesson-dialog-prompt">拼一拼 ${escapeHtml(spell.zh || '')}</h3><p class="literacy-char">${escapeHtml(spell.typed || '…')}</p><p class="lesson-dialog-feedback">${escapeHtml(feedback)}</p><div class="play-spell-row">${tiles}</div><div class="lesson-dialog-actions"><button class="btn-secondary lesson-quit" type="button" data-action="close-lesson" aria-label="先放一放" title="先放一放">${icon('x')}</button><button class="btn-primary" type="button" data-action="lesson-finish" ${spell.complete ? '' : 'disabled'}>${icon(spell.complete ? 'sparkles' : 'lock-keyhole')}${spell.complete ? '完成' : '继续'}</button></div></div>`;
    }

    function renderPlayLessonBody(progressHead, play) {
        if (play.kind === 'match' || play.kind === 'memory') {
            const prompt = play.kind === 'memory' ? '找出两张一样的卡片。' : '把两边配成一对。';
            return renderPlayMatchBody(progressHead, prompt, play.board || {}, '', '完成');
        }
        if (play.kind === 'odd' && play.run) {
            const round = play.run.rounds[play.roundIndex] || play.run.rounds[0];
            const tiles = (round.tiles || []).map(function (tile, index) {
                const picked = ui.lessonSession.selectedIndex === index;
                const good = play.roundCorrect && index === round.oddIndex;
                return `<button class="play-match-card ${good ? 'is-matched' : ''} ${picked && !play.roundCorrect ? 'is-wrong' : ''}" type="button" data-action="play-odd" data-index="${index}" ${play.roundCorrect ? 'disabled' : ''}><span>${escapeHtml(tile)}</span></button>`;
            }).join('');
            const canGo = play.complete || play.roundCorrect;
            const nextAction = play.complete || (play.roundCorrect && play.roundIndex >= play.run.rounds.length - 1) ? 'lesson-finish' : 'play-odd-next';
            return `<div class="lesson-dialog-body">${progressHead}<h3 class="lesson-dialog-prompt">${escapeHtml(round.prompt || '哪一个和其他不一样？')}</h3><p class="lesson-dialog-feedback">第 ${play.roundIndex + 1}/${play.run.rounds.length} 题</p><div class="play-match-grid">${tiles}</div><div class="lesson-dialog-actions"><button class="btn-secondary lesson-quit" type="button" data-action="close-lesson" aria-label="先放一放" title="先放一放">${icon('x')}</button><button class="btn-primary" type="button" data-action="${nextAction}" ${canGo ? '' : 'disabled'}>${icon(canGo ? 'sparkles' : 'lock-keyhole')}${play.complete ? '完成' : '下一题'}</button></div></div>`;
        }
        if (play.kind === 'order' && play.run) {
            const used = play.run.typed || [];
            const tiles = (play.run.tiles || []).map(function (value) {
                const done = used.indexOf(value) >= 0;
                return `<button class="play-spell-tile ${done ? 'is-used' : ''}" type="button" data-action="play-order" data-value="${value}" ${done ? 'disabled' : ''}>${value}</button>`;
            }).join('');
            return `<div class="lesson-dialog-body">${progressHead}<h3 class="lesson-dialog-prompt">按从小到大点数字</h3><p class="literacy-word">${escapeHtml(used.join(' ') || '先点 1')}</p><p class="lesson-dialog-feedback">${play.run.wrong ? '再试一次！' : '从小到大点'}</p><div class="play-spell-row">${tiles}</div><div class="lesson-dialog-actions"><button class="btn-secondary lesson-quit" type="button" data-action="close-lesson" aria-label="先放一放" title="先放一放">${icon('x')}</button><button class="btn-primary" type="button" data-action="lesson-finish" ${play.run.complete ? '' : 'disabled'}>${icon(play.run.complete ? 'sparkles' : 'lock-keyhole')}${play.run.complete ? '完成' : '继续'}</button></div></div>`;
        }
        if (play.kind === 'schulte' && play.run) {
            const size = play.run.size || 5;
            const last = size * size;
            const tiles = (play.run.cells || []).map(function (value, index) {
                const done = (play.run.done || []).indexOf(value) >= 0;
                const hue = ((value - 1) * 37) % 360;
                return `<button class="play-schulte-cell ${done ? 'is-done' : ''} ${play.run.wrong && !done ? 'is-wrong' : ''}" type="button" data-action="play-schulte" data-index="${index}" style="--tile-hue:${hue}" ${done || play.run.complete ? 'disabled' : ''}>${value}</button>`;
            }).join('');
            const feedback = play.run.complete
                ? '全点完啦！'
                : (play.run.wrong
                    ? '不是这个，继续找 <span class="play-next-badge">' + play.run.next + '</span>'
                    : '下一个：<span class="play-next-badge">' + play.run.next + '</span>');
            return `<div class="lesson-dialog-body play-arcade-body">${progressHead}${renderPlayHud(play, '从 1 点到 ' + last, feedback)}<div class="play-schulte-grid" style="--play-cols:${size}">${tiles}</div>${renderPlayActions(play)}</div>`;
        }
        if (play.kind === 'sudoku' && play.run) {
            const size = play.run.size || 6;
            const cells = (play.run.values || []).map(function (value, index) {
                const given = !!(play.run.given && play.run.given[index]);
                const selected = play.run.selected === index;
                const digitClass = value ? ' is-d' + value : '';
                return `<button class="play-sudoku-cell ${given ? 'is-given' : ''} ${selected ? 'is-selected' : ''}${digitClass} ${sudokuBoxClass(index, size)}" type="button" data-action="play-sudoku-cell" data-index="${index}" ${given || play.run.complete ? 'disabled' : ''}>${value || ''}</button>`;
            }).join('');
            const digits = [];
            for (let digit = 1; digit <= size; digit += 1) digits.push(digit);
            const pad = digits.map(function (digit) {
                return `<button class="play-sudoku-num is-d${digit}" type="button" data-action="play-sudoku-num" data-value="${digit}" ${play.run.selected < 0 || play.run.complete ? 'disabled' : ''}>${digit}</button>`;
            }).join('');
            const title = size === 4 ? '四宫数独' : '六宫数独';
            const feedback = play.run.complete ? '填完啦！' : (play.run.wrong ? '这个数放这里不对' : '先点空格，再点 1 到 ' + size);
            return `<div class="lesson-dialog-body play-arcade-body">${progressHead}${renderPlayHud(play, title, escapeHtml(feedback))}<div class="play-sudoku-grid is-size-${size}" style="--play-cols:${size}">${cells}</div><div class="play-sudoku-pad" style="--play-cols:${size}">${pad}</div>${renderPlayActions(play)}</div>`;
        }
        if (play.kind === 'simon' && play.run) {
            const lit = play.run.phase === 'show' ? play.run.sequence[play.run.showIndex] : -1;
            const tiles = (play.run.colors || []).map(function (color, index) {
                const label = (play.run.labels && play.run.labels[index]) || color;
                return `<button class="play-simon-cell is-${escapeHtml(color || '')} ${lit === index ? 'is-lit' : ''}" type="button" data-action="play-simon" data-index="${index}" aria-label="${escapeHtml(label)}" ${play.run.phase !== 'input' || play.run.complete ? 'disabled' : ''}></button>`;
            }).join('');
            const feedback = play.run.complete
                ? '顺序全对啦！'
                : (play.run.phase === 'show' ? '先看亮灯' : (play.run.wrong ? '错了，从第一个重新点' : '按刚才的顺序点 · 已点 ' + play.run.inputIndex + '/' + play.run.sequence.length));
            return `<div class="lesson-dialog-body play-arcade-body">${progressHead}${renderPlayHud(play, '记住颜色顺序', escapeHtml(feedback))}<div class="play-simon-grid">${tiles}</div>${renderPlayActions(play)}</div>`;
        }
        if (play.kind === 'search' && play.run) {
            const size = play.run.size || 6;
            const tiles = (play.run.cells || []).map(function (cell, index) {
                return `<button class="play-search-cell ${cell.found ? 'is-found' : ''} ${play.run.wrong && !cell.found ? 'is-wrong' : ''}" type="button" data-action="play-search" data-index="${index}" ${cell.found || play.run.complete ? 'disabled' : ''}>${escapeHtml(cell.face)}</button>`;
            }).join('');
            const feedback = play.run.complete ? '全找到啦！' : (play.run.wrong ? '这个不是目标' : '只点和上面一样的图案');
            return `<div class="lesson-dialog-body play-arcade-body">${progressHead}${renderPlayHud(play, '找出它们', escapeHtml(feedback))}<div class="play-search-target-row"><span class="play-search-target"><span class="play-search-target-face">${escapeHtml(play.run.target)}</span><small>要找的</small></span><span class="play-search-count">${play.run.found}/${play.run.total}</span></div><div class="play-search-grid" style="--play-cols:${size}">${tiles}</div>${renderPlayActions(play)}</div>`;
        }
        return `<div class="lesson-dialog-body">${progressHead}<p class="lesson-dialog-feedback">这节小游戏暂时不可用。</p></div>`;
    }

    function renderLiteracyStrokeBoard(card, playKey) {
        const strokes = card && Array.isArray(card.strokes) ? card.strokes : [];
        if (!strokes.length) return '';
        const token = Math.max(0, Number(playKey) || 0);
        const paths = strokes.map(function (d, index) {
            return `<path pathLength="1" style="--i:${index}" d="${escapeHtml(d)}"></path>`;
        }).join('');
        return `<div class="literacy-stroke-board" data-play="${token}"><svg class="literacy-stroke-svg is-playing" viewBox="0 0 1024 1024" aria-hidden="true">${paths}</svg><button class="btn-secondary" type="button" data-action="literacy-stroke" aria-label="再看一遍笔顺">${icon('rotate-ccw')} 看笔顺</button></div>`;
    }

    function renderMotionTimerBody(progressHead, timer, activity) {
        const total = Math.max(1, Number(timer && timer.durationSec) || 45);
        const remaining = Math.max(0, Number(timer && timer.remaining) || 0);
        const progress = Math.round(((total - remaining) / total) * 100);
        const done = !!(timer && timer.complete);
        const safety = ((timer && timer.safety) || []).map(function (item) { return escapeHtml(item); }).join(' · ');
        const feedback = done
            ? `<p class="lesson-dialog-feedback is-success" role="status">${escapeHtml((timer && timer.success) || '做完啦！')} 好啦！</p>`
            : `<p class="lesson-dialog-feedback">${escapeHtml(activity.hint || '跟着做')}</p>`;
        return `<div class="lesson-dialog-body">${progressHead}<h3 class="lesson-dialog-prompt">${escapeHtml((timer && timer.prompt) || activity.prompt || '开始做')}</h3><div class="motion-timer-board"><div class="motion-timer-ring" style="--progress:${progress}" aria-label="还剩 ${remaining} 秒"><span>${done ? '好' : remaining}</span></div>${safety ? `<p class="motion-timer-safety">${safety}</p>` : ''}</div>${feedback}<div class="lesson-dialog-actions"><button class="btn-secondary lesson-quit" type="button" data-action="close-lesson" aria-label="先放一放" title="先放一放">${icon('x')}</button><button class="btn-secondary" type="button" data-action="motion-done">${icon('check')}做完了</button><button class="btn-primary" type="button" data-action="lesson-finish" ${done ? '' : 'disabled'}>${icon(done ? 'sparkles' : 'lock-keyhole')}${done ? '完成' : '继续'}</button></div></div>`;
    }

    function renderLessonDialog() {
        if (isFocusInlineSession()) {
            if (lessonDialog && typeof lessonDialog.close === 'function' && lessonDialog.open) lessonDialog.close();
            const host = document.getElementById('preschool-focus-play-host');
            if (host) {
                host.innerHTML = renderFocusPlayInner();
                if (global.lucide && typeof global.lucide.createIcons === 'function') global.lucide.createIcons({ root: host });
                return;
            }
            if (!ui._inRender) render();
            return;
        }
        if (!lessonDialogContent || !ui.lessonSession) return;
        const match = findPreschoolLesson(ui.lessonSession.id);
        if (!match) {
            lessonDialogContent.innerHTML = '<p class="lesson-dialog-feedback is-error">这节练习暂时不可用，请先回到课程列表。</p>';
            return;
        }
        const activity = getLessonActivity(match.lesson);
        const lessons = Array.isArray(match.course.lessons) ? match.course.lessons : [];
        const lessonIndex = Math.max(0, lessons.findIndex(function (item) {
            return item.id === match.lesson.id;
        }));
        const completedIds = new Set(
            state.courseProgress && Array.isArray(state.courseProgress.completedLessonIds)
                ? state.courseProgress.completedLessonIds
                : []
        );
        const completedInCourse = lessons.filter(function (item) {
            return completedIds.has(item.id);
        }).length;
        const courseTotal = lessons.length || 1;
        const coursePercent = Math.round((completedInCourse / courseTotal) * 100);
        const progressHead = `<span class="lesson-dialog-course">${escapeHtml(match.course.title)}</span><div class="lesson-dialog-progress"><div><span>${lessonIndex + 1}/${courseTotal}</span></div><span class="lesson-dialog-progress-track" role="progressbar" aria-label="当前课程进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${coursePercent}"><i style="width:${coursePercent}%"></i></span></div>`;
        const english = ui.lessonSession.english;
        const literacy = ui.lessonSession.literacy;
        const bankQuiz = ui.lessonSession.bankQuiz;
        if (english && english.mode === 'english-speak' && Array.isArray(english.batch) && english.phase === 'match' && english.match) {
            lessonDialogContent.innerHTML = renderPlayMatchBody(progressHead, '把英文和中文配成一对。', english.match, '', '下一步');
        } else if (english && english.mode === 'english-speak' && Array.isArray(english.batch) && english.phase === 'spell' && english.spell) {
            lessonDialogContent.innerHTML = renderPlaySpellBody(progressHead, english.spell);
        } else if (english && english.mode === 'english-speak' && Array.isArray(english.batch)) {
            const marked = english.batch.filter(function (item) { return item.mark === 'known' || item.mark === 'unknown'; }).length;
            const allMarked = marked === english.batch.length;
            const reviewCount = english.batch.filter(function (item) { return item.review; }).length;
            const cards = english.batch.map(function (item) {
                const reviewMark = item.review ? '<span class="literacy-flash-review">再认</span>' : '';
                return `<article class="literacy-flash-card is-${item.mark || 'plain'}${item.review ? ' is-review' : ''}">${reviewMark}<div class="literacy-flash-marks"><button class="literacy-flash-speak" type="button" data-action="english-speak" data-text="${escapeHtml(item.text)}" aria-label="听单词">${icon('volume-2')} 听单词</button><button class="literacy-flash-speak" type="button" data-action="english-speak" data-text="${escapeHtml(item.phrase)}" aria-label="听句子">${icon('volume-2')} 听句子</button></div>${resolvePreschoolCardMedia(item).markup}<p class="literacy-char">${escapeHtml(item.text)}</p><p class="literacy-pinyin">${escapeHtml(item.zh)}</p><p class="literacy-word">${escapeHtml(item.phrase)}</p><p class="literacy-word">${escapeHtml(item.phraseZh)}</p><div class="literacy-flash-marks"><button class="btn-secondary" type="button" data-action="english-known" data-word="${escapeHtml(item.text)}" data-known="1" aria-pressed="${item.mark === 'known'}">会了</button><button class="btn-secondary" type="button" data-action="english-known" data-word="${escapeHtml(item.text)}" data-known="0" aria-pressed="${item.mark === 'unknown'}">不会</button></div></article>`;
            }).join('');
            const dayLabel = reviewCount
                ? `今天再认 ${reviewCount} 个词`
                : (english.day ? `Day ${english.day} 英语 · ${english.batch.length} 个词` : '听句子，这些词你会了吗？');
            const reviewHint = reviewCount ? `` : '';
            lessonDialogContent.innerHTML = `<div class="lesson-dialog-body">${progressHead}<h3 class="lesson-dialog-prompt">${escapeHtml(dayLabel)}</h3><p class="lesson-dialog-feedback">听一听，会了吗？ ${marked}/${english.batch.length}</p><div class="literacy-flash-grid">${cards}</div><div class="lesson-dialog-actions"><button class="btn-secondary lesson-quit" type="button" data-action="close-lesson" aria-label="先放一放" title="先放一放">${icon('x')}</button><button class="btn-primary" type="button" data-action="lesson-finish" ${allMarked ? '' : 'disabled'}>${icon(allMarked ? 'sparkles' : 'lock-keyhole')}${allMarked ? '下一步' : '继续'}</button></div></div>`;
        } else if (literacy && literacy.mode === 'literacy-flash' && Array.isArray(literacy.batch)) {
            const marked = literacy.batch.filter(function (item) { return item.mark === 'known' || item.mark === 'unknown'; }).length;
            const unknowns = literacy.batch.filter(function (item) { return item.mark === 'unknown'; });
            const allMarked = marked === literacy.batch.length;
            if (literacy.phase === 'teach' && literacy.card) {
                const total = Math.max(1, unknowns.length);
                const wordMarkup = literacy.card.words.map(function (word) {
                    return `<span class="literacy-word-chip">${escapeHtml(word)}</span>`;
                }).join('');
                const last = literacy.teachIndex >= total - 1;
                const strokeBoard = renderLiteracyStrokeBoard(literacy.card, literacy.strokePlay);
                const rememberBtn = literacy.complete ? '' : `<button class="btn-secondary" type="button" data-action="literacy-remember">${icon('check')}记住了</button>`;
                lessonDialogContent.innerHTML = `<div class="lesson-dialog-body">${progressHead}<div class="literacy-find-progress" aria-label="学不会的字"><span>不会的字 ${literacy.teachIndex + 1}/${total}</span></div><h3 class="lesson-dialog-prompt">看组词，记住这个字</h3><article class="literacy-card">${resolvePreschoolCardMedia({ kind: 'literacy', text: literacy.card.char, char: literacy.card.char, theme: literacy.card.theme, media: literacy.card.media, art: literacy.card.art }).markup}<p class="literacy-pinyin">${escapeHtml(literacy.card.pinyin || '')}</p><p class="literacy-char">${escapeHtml(literacy.card.char)}</p><button class="btn-secondary" type="button" data-action="literacy-speak" data-text="${escapeHtml(literacy.card.speak || literacy.card.char)}" aria-label="听发音">${icon('volume-2')} 听一听</button>${strokeBoard}<div class="literacy-teach-block"><strong>组词</strong><div class="literacy-word-chips">${wordMarkup}</div></div><div class="literacy-teach-block"><strong>解词</strong><p>${escapeHtml(literacy.card.explain)}</p></div></article><p class="lesson-dialog-feedback">看一遍，记住它！</p><div class="lesson-dialog-actions"><button class="btn-secondary lesson-quit" type="button" data-action="close-lesson" aria-label="先放一放" title="先放一放">${icon('x')}</button>${rememberBtn}<button class="btn-primary" type="button" data-action="${last || literacy.complete ? 'lesson-finish' : 'literacy-teach-next'}">${icon('sparkles')}${last || literacy.complete ? '完成' : '下一个字'}</button></div></div>`;
            } else {
                const reviewCount = literacy.batch.filter(function (item) { return item.review; }).length;
                const cards = literacy.batch.map(function (item) {
                    const reviewMark = item.review ? '<span class="literacy-flash-review">再认</span>' : '';
                    return `<article class="literacy-flash-card is-${item.mark || 'plain'}${item.review ? ' is-review' : ''}">${reviewMark}<button class="literacy-flash-speak" type="button" data-action="literacy-speak" data-text="${escapeHtml(item.char)}" aria-label="听${escapeHtml(item.char)}">${icon('volume-2')}</button>${resolvePreschoolCardMedia({ kind: 'literacy', text: item.char, char: item.char, theme: item.theme, media: item.media, art: item.art }).markup}<p class="literacy-pinyin">${escapeHtml(item.pinyin || '')}</p><p class="literacy-char">${escapeHtml(item.char)}</p><div class="literacy-flash-marks"><button class="btn-secondary" type="button" data-action="literacy-mark" data-char="${escapeHtml(item.char)}" data-known="1" aria-pressed="${item.mark === 'known'}">会了</button><button class="btn-secondary" type="button" data-action="literacy-mark" data-char="${escapeHtml(item.char)}" data-known="0" aria-pressed="${item.mark === 'unknown'}">不会</button></div></article>`;
                }).join('');
                const nextAction = literacy.complete ? 'lesson-finish' : (allMarked && unknowns.length ? 'literacy-teach-start' : 'lesson-finish');
                const nextLabel = literacy.complete || (allMarked && !unknowns.length) ? '完成' : allMarked ? '学一学' : '继续';
                const canGo = literacy.complete || allMarked;
                const prompt = reviewCount ? `这些字，哪些还记得？` : '这些字，哪些会了？';
                const reviewHint = reviewCount ? `` : '';
                lessonDialogContent.innerHTML = `<div class="lesson-dialog-body">${progressHead}<h3 class="lesson-dialog-prompt">${escapeHtml(prompt)}</h3><p class="lesson-dialog-feedback">会了吗？点一点 ${marked}/${literacy.batch.length}</p><div class="literacy-flash-grid">${cards}</div><div class="lesson-dialog-actions"><button class="btn-secondary lesson-quit" type="button" data-action="close-lesson" aria-label="先放一放" title="先放一放">${icon('x')}</button><button class="btn-primary" type="button" data-action="${nextAction}" ${canGo ? '' : 'disabled'}>${icon(canGo ? 'sparkles' : 'lock-keyhole')}${nextLabel}</button></div></div>`;
            }
        } else if (literacy && literacy.mode === 'literacy-bloom' && literacy.bloom) {
            const bloomComplete = literacyBloomComplete(literacy);
            const optionMarkup = literacy.bloom.options.map(function (option, index) {
                const selected = !!literacy.selected[option.word];
                const mark = bloomComplete ? (option.correct ? 'is-correct' : selected ? 'is-wrong' : '') : (selected ? 'is-selected' : '');
                return `<button class="lesson-dialog-option ${mark}" type="button" data-action="literacy-bloom" data-word="${escapeHtml(option.word)}" aria-pressed="${selected}"><strong>${escapeHtml(option.word)}</strong>${selected ? icon('check') : icon('arrow-right')}</button>`;
            }).join('');
            const feedback = bloomComplete
                ? `<p class="lesson-dialog-feedback is-success" role="status">开花啦！</p>`
                : `<p class="lesson-dialog-feedback">${escapeHtml(literacy.bloom.prompt)}</p>`;
            lessonDialogContent.innerHTML = `<div class="lesson-dialog-body">${progressHead}<div class="literacy-steps" aria-label="组词"><span class="literacy-step is-active">组</span></div><h3 class="lesson-dialog-prompt">${escapeHtml(literacy.bloom.prompt)}</h3><div class="lesson-dialog-options literacy-bloom-options" role="group" aria-label="组词选项">${optionMarkup}</div>${feedback}<div class="lesson-dialog-actions"><button class="btn-secondary lesson-quit" type="button" data-action="close-lesson" aria-label="先放一放" title="先放一放">${icon('x')}</button><button class="btn-primary" type="button" data-action="lesson-finish" ${bloomComplete ? '' : 'disabled'}>${icon(bloomComplete ? 'sparkles' : 'lock-keyhole')}${bloomComplete ? '完成' : '继续'}</button></div></div>`;
        } else if (literacy && literacy.run) {
            const round = literacy.run.rounds[literacy.roundIndex] || literacy.run.rounds[0];
            const total = literacy.run.rounds.length;
            const stars = literacy.run.rounds.map(function (_item, index) {
                const done = index < literacy.roundIndex || literacy.complete;
                const current = index === literacy.roundIndex && !literacy.complete;
                return `<span class="literacy-star${done ? ' is-done' : ''}${current ? ' is-active' : ''}" aria-hidden="true">${icon('sparkles')}</span>`;
            }).join('');
            const optionMarkup = round.options.map(function (option, index) {
                const isSelected = ui.lessonSession.selectedIndex === index;
                const isCorrect = literacy.roundCorrect && index === round.answer;
                const isWrong = isSelected && !literacy.roundCorrect;
                return `<button class="lesson-dialog-option literacy-find-option ${isCorrect ? 'is-correct' : ''} ${isWrong ? 'is-wrong' : ''}" type="button" data-action="lesson-answer" data-index="${index}" aria-pressed="${isSelected}" ${literacy.roundCorrect ? 'disabled' : ''}><strong>${escapeHtml(option.label)}</strong>${isCorrect ? icon('check') : isWrong ? icon('rotate-ccw') : icon('arrow-right')}</button>`;
            }).join('');
            const canAdvance = literacy.roundCorrect || literacy.complete;
            const nextAction = literacy.complete ? 'lesson-finish' : 'literacy-next';
            const nextLabel = literacy.complete ? '完成' : literacy.roundIndex >= total - 1 ? '完成' : '下一关';
            const feedback = literacy.complete
                ? '<p class="lesson-dialog-feedback is-success" role="status">全部答对啦！</p>'
                : literacy.roundCorrect
                    ? '<p class="lesson-dialog-feedback is-success" role="status">答对啦！</p>'
                    : ui.lessonSession.selectedIndex !== null
                        ? '<p class="lesson-dialog-feedback" role="status">再想想哦～</p>'
                        : `<p class="lesson-dialog-feedback">${escapeHtml(round.prompt)}</p>`;
            lessonDialogContent.innerHTML = `<div class="lesson-dialog-body">${progressHead}<div class="literacy-find-progress" aria-label="找字进度"><span>第 ${literacy.roundIndex + 1}/${total} 关</span><span class="literacy-stars">${stars}</span></div><h3 class="lesson-dialog-prompt">${escapeHtml(round.prompt)}</h3><article class="literacy-card literacy-find-cue"><p class="literacy-pinyin">${escapeHtml(round.pinyin || '')}</p>${literacy.hint && round.word ? `<p class="literacy-word">${escapeHtml(round.word)}</p>` : ''}<div class="literacy-find-tools"><button class="btn-secondary" type="button" data-action="literacy-speak" data-text="${escapeHtml(round.speak || round.char)}" aria-label="听发音">${icon('volume-2')} 听一听</button><button class="btn-secondary" type="button" data-action="literacy-hint" aria-label="看提示">${icon('sparkles')} 提示</button></div></article><div class="lesson-dialog-options literacy-find-options" role="group" aria-label="找字选项">${optionMarkup}</div>${feedback}<div class="lesson-dialog-actions"><button class="btn-secondary lesson-quit" type="button" data-action="close-lesson" aria-label="先放一放" title="先放一放">${icon('x')}</button><button class="btn-primary" type="button" data-action="${nextAction}" ${canAdvance ? '' : 'disabled'}>${icon(canAdvance ? 'sparkles' : 'lock-keyhole')}${nextLabel}</button></div></div>`;
        } else if (literacy && literacy.loop) {
            const step = literacy.loop.steps[literacy.stepIndex] || literacy.loop.steps[0];
            const stepNames = ['认', '练', '测'];
            const stepNav = `<div class="literacy-steps" aria-label="认练测">${stepNames.map(function (name, index) {
                const current = index === literacy.stepIndex;
                const done = index < literacy.stepIndex || literacy.complete;
                return `<span class="literacy-step${current ? ' is-active' : ''}${done ? ' is-done' : ''}">${name}</span>`;
            }).join('')}</div>`;
            let body = '';
            if (step.kind === 'recognize') {
                body = `<article class="literacy-card"><p class="literacy-pinyin">${escapeHtml(step.pinyin || '')}</p><p class="literacy-char">${escapeHtml(step.char)}</p><p class="literacy-word">${escapeHtml(step.word || '')}</p><button class="btn-secondary" type="button" data-action="literacy-speak" data-text="${escapeHtml(step.speak || step.char)}" aria-label="听发音">${icon('volume-2')} 听一听</button></article>`;
            } else {
                const optionMarkup = step.options.map(function (option, index) {
                    const isSelected = ui.lessonSession.selectedIndex === index;
                    const isCorrect = literacy.stepCorrect && index === step.answer;
                    const isWrong = isSelected && !literacy.stepCorrect;
                    return `<button class="lesson-dialog-option ${isCorrect ? 'is-correct' : ''} ${isWrong ? 'is-wrong' : ''}" type="button" data-action="lesson-answer" data-index="${index}" aria-pressed="${isSelected}" ${literacy.stepCorrect ? 'disabled' : ''}><strong>${escapeHtml(option.label)}</strong>${isCorrect ? icon('check') : isWrong ? icon('rotate-ccw') : icon('arrow-right')}</button>`;
                }).join('');
                body = `${step.kind === 'quiz' ? `<button class="btn-secondary literacy-speak-inline" type="button" data-action="literacy-speak" data-text="${escapeHtml(literacy.loop.char)}" aria-label="听发音">${icon('volume-2')} 听字音</button>` : ''}<div class="lesson-dialog-options" role="group" aria-label="练习选项">${optionMarkup}</div>`;
            }
            const canAdvance = step.kind === 'recognize' || literacy.stepCorrect;
            const feedback = literacy.complete
                ? `<p class="lesson-dialog-feedback is-success" role="status">太棒了！</p>`
                : literacy.stepCorrect
                    ? '<p class="lesson-dialog-feedback is-success" role="status">对啦！</p>'
                    : `<p class="lesson-dialog-feedback">${escapeHtml(step.prompt)}</p>`;
            const nextLabel = literacy.complete ? '完成' : '完成';
            const nextAction = literacy.complete ? 'lesson-finish' : 'literacy-next';
            lessonDialogContent.innerHTML = `<div class="lesson-dialog-body">${progressHead}${stepNav}<h3 class="lesson-dialog-prompt">${escapeHtml(step.prompt)}</h3>${body}${feedback}<div class="lesson-dialog-actions"><button class="btn-secondary lesson-quit" type="button" data-action="close-lesson" aria-label="先放一放" title="先放一放">${icon('x')}</button><button class="btn-primary" type="button" data-action="${nextAction}" ${canAdvance || literacy.complete ? '' : 'disabled'}>${icon(literacy.complete || canAdvance ? 'sparkles' : 'lock-keyhole')}${nextLabel}</button></div></div>`;
        } else if (bankQuiz && bankQuiz.run && Array.isArray(bankQuiz.run.rounds)) {
            const total = bankQuiz.run.rounds.length;
            const round = bankQuiz.run.rounds[bankQuiz.roundIndex] || bankQuiz.run.rounds[0];
            const stars = Array.from({ length: total }, function (_item, index) {
                return `<span class="${index < bankQuiz.roundIndex || bankQuiz.complete ? 'is-on' : ''}">★</span>`;
            }).join('');
            const optionMarkup = (round.options || []).map(function (option, index) {
                const isSelected = ui.lessonSession.selectedIndex === index;
                const isCorrect = bankQuiz.roundCorrect && index === round.answer;
                const isWrong = isSelected && !bankQuiz.roundCorrect;
                return `<button class="lesson-dialog-option literacy-find-option ${isCorrect ? 'is-correct' : ''} ${isWrong ? 'is-wrong' : ''}" type="button" data-action="lesson-answer" data-index="${index}" aria-pressed="${isSelected}" ${bankQuiz.roundCorrect ? 'disabled' : ''}><strong>${escapeHtml(option)}</strong>${isCorrect ? icon('check') : isWrong ? icon('rotate-ccw') : icon('arrow-right')}</button>`;
            }).join('');
            const speakText = round.speak || round.text || '';
            const cue = bankQuiz.mode === 'math-bank'
                ? `<p class="literacy-char">${escapeHtml(round.tokens || '')}</p>`
                : bankQuiz.mode === 'poetry-line'
                    ? `<p class="literacy-pinyin">${escapeHtml(round.title || '')}</p><p class="literacy-word">${escapeHtml(round.tokens || '')}</p>`
                    : `<p class="literacy-pinyin">${escapeHtml(round.blend || '')}</p><p class="literacy-char">${bankQuiz.roundCorrect ? escapeHtml(round.text || '') : '?'}</p>`;
            const canAdvance = bankQuiz.roundCorrect || bankQuiz.complete;
            const nextLabel = bankQuiz.complete ? '完成' : (bankQuiz.roundIndex >= total - 1 ? '完成' : '下一题');
            const nextAction = bankQuiz.complete || (bankQuiz.roundCorrect && bankQuiz.roundIndex >= total - 1) ? 'lesson-finish' : 'bank-quiz-next';
            const feedback = bankQuiz.complete
                ? '<p class="lesson-dialog-feedback is-success" role="status">太棒了！</p>'
                : bankQuiz.roundCorrect
                    ? '<p class="lesson-dialog-feedback is-success" role="status">对啦！</p>'
                    : ui.lessonSession.selectedIndex !== null
                        ? '<p class="lesson-dialog-feedback" role="status">再想想哦～</p>'
                        : `<p class="lesson-dialog-feedback">${escapeHtml(round.prompt || '')}</p>`;
            lessonDialogContent.innerHTML = `<div class="lesson-dialog-body">${progressHead}<div class="literacy-find-progress" aria-label="题目进度"><span>第 ${bankQuiz.roundIndex + 1}/${total} 题</span><span class="literacy-stars">${stars}</span></div><h3 class="lesson-dialog-prompt">${escapeHtml(round.prompt || '')}</h3><article class="literacy-card literacy-find-cue">${cue}<div class="literacy-find-tools"><button class="btn-secondary" type="button" data-action="bank-quiz-speak" data-text="${escapeHtml(speakText)}" data-lang="${escapeHtml(bankQuiz.speakLang || 'zh-CN')}" aria-label="听一听">${icon('volume-2')} 听一听</button></div></article><div class="lesson-dialog-options literacy-find-options" role="group" aria-label="选项">${optionMarkup}</div>${feedback}<div class="lesson-dialog-actions"><button class="btn-secondary lesson-quit" type="button" data-action="close-lesson" aria-label="先放一放" title="先放一放">${icon('x')}</button><button class="btn-primary" type="button" data-action="${nextAction}" ${canAdvance ? '' : 'disabled'}>${icon(canAdvance ? 'sparkles' : 'lock-keyhole')}${nextLabel}</button></div></div>`;
        } else if (ui.lessonSession.play) {
            lessonDialogContent.innerHTML = renderPlayLessonBody(progressHead, ui.lessonSession.play);
        } else if (ui.lessonSession.timer) {
            lessonDialogContent.innerHTML = renderMotionTimerBody(progressHead, ui.lessonSession.timer, activity);
        } else {
            const selectedIndex = ui.lessonSession.selectedIndex;
            const correct = ui.lessonSession.correct;
            const optionMarkup = activity.options.map(function (option, index) {
                const isSelected = selectedIndex === index;
                const isCorrect = correct && index === activity.answer;
                const isWrong = isSelected && !correct;
                const optionIcon = activity.optionIcons[index] || match.course.icon || 'sparkles';
                return `<button class="lesson-dialog-option ${isCorrect ? 'is-correct' : ''} ${isWrong ? 'is-wrong' : ''}" type="button" data-action="lesson-answer" data-index="${index}" aria-pressed="${isSelected}" ${correct ? 'disabled' : ''}><span class="lesson-dialog-option-art" aria-hidden="true">${icon(optionIcon)}</span><strong>${escapeHtml(option)}</strong>${isCorrect ? icon('check') : isWrong ? icon('rotate-ccw') : icon('arrow-right')}</button>`;
            }).join('');
            const feedback = correct
                ? `<p class="lesson-dialog-feedback is-success" role="status">${escapeHtml(activity.success)} 阳光和豌豆能量已经准备好啦。</p>`
                : selectedIndex === null
                    ? `<p class="lesson-dialog-feedback">${escapeHtml(activity.hint)}</p>`
                    : '<p class="lesson-dialog-feedback is-error" role="alert">还差一点，再看看提示，换一个答案试试。</p>';
            lessonDialogContent.innerHTML = `<div class="lesson-dialog-body">${progressHead}<h3 class="lesson-dialog-prompt">${escapeHtml(activity.prompt)}</h3><div class="lesson-dialog-options" role="group" aria-label="练习选项">${optionMarkup}</div>${feedback}<div class="lesson-dialog-actions"><button class="btn-secondary lesson-quit" type="button" data-action="close-lesson" aria-label="先放一放" title="先放一放">${icon('x')}</button><button class="btn-primary" type="button" data-action="lesson-finish" ${correct ? '' : 'disabled'}>${icon(correct ? 'sparkles' : 'lock-keyhole')}${correct ? '完成' : '答对后领取奖励'}</button></div></div>`;
        }
        if (global.lucide && typeof global.lucide.createIcons === 'function') global.lucide.createIcons({ root: lessonDialogContent });
    }

    function getLevelBanks() {
        const literacy = getLiteracyEngine();
        const english = getEnglishVocabEngine();
        const pinyin = getPinyinEngine();
        const poetry = getPoetryEngine();
        const math = getMathBankEngine();
        const phonics = getPhonicsEngine();
        const motionPack = global.PersonalWorkbenchLessonPack;
        return {
            literacy: literacy && typeof literacy.getRuntimeBank === 'function' ? literacy.getRuntimeBank() : [],
            english: english && typeof english.getRuntimeBank === 'function' ? english.getRuntimeBank() : [],
            pinyin: pinyin && typeof pinyin.getRuntimeBank === 'function' ? pinyin.getRuntimeBank() : [],
            poetry: poetry && typeof poetry.getRuntimeBank === 'function' ? poetry.getRuntimeBank() : [],
            math: math && typeof math.getRuntimeBank === 'function' ? math.getRuntimeBank() : [],
            phonics: phonics && typeof phonics.getRuntimeBank === 'function' ? phonics.getRuntimeBank() : [],
            motion: motionPack && typeof motionPack.getMotionBank === 'function' ? motionPack.getMotionBank() : []
        };
    }

    const PRESCHOOL_LEVEL_BAND_COURSES = new Set([
        'preschool-literacy',
        'preschool-english',
        'preschool-pinyin',
        'preschool-poetry',
        'preschool-math',
        'preschool-exercise'
    ]);

    const PRESCHOOL_SUBJECT_TRACK = {
        'preschool-pinyin': 'pinyin',
        'preschool-poetry': 'poetry',
        'preschool-math': 'math',
        'preschool-exercise': 'motion',
        'preschool-phonics': 'phonics'
    };

    function summarizeSubjectMastery(courseId) {
        const track = PRESCHOOL_SUBJECT_TRACK[courseId];
        if (!track || !global.PersonalWorkbenchChildCourses) return null;
        const banks = getLevelBanks();
        const bank = banks[track] || [];
        const progressRoot = state.courseProgress && state.courseProgress[track]
            ? state.courseProgress[track]
            : { mastery: {} };
        const mastery = progressRoot.mastery || {};
        let known = 0;
        let unknown = 0;
        Object.keys(mastery).forEach(function (key) {
            const entry = mastery[key];
            if (entry && (entry.state === 'ready' || entry.state === 'maintenance')) known += 1;
            else unknown += 1;
        });
        const unseen = Math.max(0, bank.length - known - unknown);
        return { known: known, unknown: unknown, unseen: unseen, bankSize: bank.length };
    }

    function recordSubjectProgressFromLesson(next, match) {
        const courses = global.PersonalWorkbenchChildCourses;
        const levels = global.PersonalWorkbenchBankLevels;
        if (!courses || !levels || !match || !match.course || !ui.lessonSession) return;
        const track = levels.trackForCourse(match.course.id);
        if (track === 'literacy' || track === 'english') return;
        const date = storage.localDate();
        const keys = [];
        const activity = match.lesson && match.lesson.activity ? match.lesson.activity : {};
        const session = ui.lessonSession;
        if (session.bankQuiz && session.bankQuiz.run && Array.isArray(session.bankQuiz.run.rounds)) {
            if (track === 'pinyin') {
                session.bankQuiz.run.rounds.forEach(function (round) {
                    if (round && round.text) keys.push(String(round.text));
                });
            } else if (track === 'poetry') {
                if (activity.preferred) keys.push(String(activity.preferred));
            } else if (track === 'math') {
                session.bankQuiz.run.rounds.forEach(function (round) {
                    if (round && round.id) keys.push(String(round.id));
                });
            } else if (track === 'phonics') {
                session.bankQuiz.run.rounds.forEach(function (round) {
                    if (round && round.text) keys.push(String(round.text));
                });
            }
        } else if (session.timer && track === 'motion') {
            if (activity.motionId) keys.push(String(activity.motionId));
            else {
                const bank = getLevelBanks().motion || [];
                const byTitle = bank.find(function (item) { return item.name === match.lesson.title; });
                if (byTitle) keys.push(byTitle.id);
            }
        }
        if (!keys.length) return;
        const current = next.courseProgress && next.courseProgress[track]
            ? next.courseProgress[track]
            : { mastery: {} };
        next.courseProgress = courses.saveSubject(next.courseProgress, track, courses.markSubjectReady(current, keys, date));
    }

    function getCourseTrackProgress(courseId) {
        const levels = global.PersonalWorkbenchBankLevels;
        if (!levels || typeof levels.resolveTrackProgress !== 'function') return null;
        return levels.resolveTrackProgress(courseId, state.courseProgress, getLevelBanks());
    }

    function resolveLessonLevel(match) {
        if (match && match.course) return getPracticeLevelForCourse(match.course.id);
        const activity = match && match.lesson && match.lesson.activity ? match.lesson.activity : {};
        return activity.level || 'L1';
    }

    function isLessonLevelUnlocked(match) {
        const levels = global.PersonalWorkbenchBankLevels;
        if (!match) return true;
        const activity = match.lesson && match.lesson.activity ? match.lesson.activity : {};
        const requested = activity.level || 'L1';
        if (levels && typeof levels.levelIndex === 'function' && match.course) {
            if (levels.levelIndex(getPracticeLevelForCourse(match.course.id)) >= levels.levelIndex(requested)) return true;
        }
        if (!levels || typeof levels.isLevelUnlocked !== 'function') return true;
        return levels.isLevelUnlocked(requested, getCourseTrackProgress(match.course.id));
    }

    function openLessonDialog(id, planId, planDate) {
        if (!isPreschool || !lessonDialog || !lessonDialogContent) return false;
        const match = findPreschoolLesson(id);
        if (!match) {
            showToast('这节练习暂时不可用。', true);
            return false;
        }
        const completedIds = state.courseProgress && Array.isArray(state.courseProgress.completedLessonIds)
            ? state.courseProgress.completedLessonIds
            : [];
        const sourcePlan = planId ? findDailyPlan(state.dailyPlans, planId, planDate) : null;
        if (planId && (!sourcePlan || sourcePlan.done)) {
            showToast(sourcePlan && sourcePlan.done ? '这项任务已经完成啦。' : '找不到来源任务，请刷新页面后重试。', true);
            return false;
        }
        if (completedIds.includes(match.lesson.id)) {
            if (!isReplayableLesson(match)) {
                    if (sourcePlan) return completeCourseLesson(match.lesson.id, sourcePlan.id, sourcePlan.date);
                    showToast('这节练习已经点亮啦。');
                    return false;
            }
        }
        if (!isLessonLevelUnlocked(match)) {
            const levels = global.PersonalWorkbenchBankLevels;
            const hint = levels && typeof levels.unlockHint === 'function'
                ? levels.unlockHint((match.lesson.activity && match.lesson.activity.level) || 'L1', getCourseTrackProgress(match.course.id))
                : '';
            showToast(hint || '这一级还没解锁，先把前面的练熟。', true);
            return false;
        }
        ui.lessonSession = { id: match.lesson.id, courseId: match.course.id, selectedIndex: null, correct: false, planId: sourcePlan ? sourcePlan.id : '', planDate: sourcePlan ? sourcePlan.date : '' };
        if (isLiteracyLesson(match)) ui.lessonSession.literacy = buildLiteracySession(match);
        if (isEnglishSpeakLesson(match)) ui.lessonSession.english = buildEnglishSession(match);
        if (isBankQuizLesson(match)) ui.lessonSession.bankQuiz = buildBankQuizSession(match);
        if (isPlayLesson(match)) {
            if (match.course && match.course.id === 'preschool-focus') {
                ui.lessonSession.focusPhase = 'pick';
                ui.lessonSession.focusLevel = 0;
                ui.lessonSession.play = null;
            } else {
                ui.lessonSession.play = buildPlaySession(match);
            }
        }
        if (isMotionTimerLesson(match)) {
            ui.lessonSession.timer = buildMotionTimerSession(match);
            startLessonMotionTimer();
        }
        if (isFocusInlineSession()) {
            if (typeof lessonDialog.close === 'function' && lessonDialog.open) lessonDialog.close();
            else lessonDialog.removeAttribute('open');
            if (ui.page !== 'courses' || ui.courseId !== 'preschool-focus') setPage('courses', true, 'preschool-focus');
            else render();
            if (ui.lessonSession.play && ui.lessonSession.play.kind === 'simon') startLessonSimonShow();
            return true;
        }
        renderLessonDialog();
        if (ui.lessonSession.play && ui.lessonSession.play.kind === 'simon') startLessonSimonShow();
        if (typeof lessonDialog.showModal === 'function' && !lessonDialog.open) lessonDialog.showModal();
        else lessonDialog.setAttribute('open', '');
        speakBankQuizRound();
        return true;
    }

    function openPreschoolPlanPractice(id, date) {
        if (!isPreschool) return false;
        const plan = findDailyPlan(state.dailyPlans, id, date);
        const match = getPreschoolPlanPractice(plan);
        if (!plan || plan.done || !match) {
            showToast(plan && plan.done ? '这项任务已经完成啦。' : '这项任务暂时没有配套练习。', true);
            return false;
        }
        return openLessonDialog(match.lesson.id, plan.id, plan.date);
    }

    function flipPlayCard(index) {
        const engine = getPlayGamesEngine();
        if (!engine || !ui.lessonSession) return false;
        const selected = Number(index);
        const english = ui.lessonSession.english;
        if (english && english.phase === 'match' && english.match) {
            english.match = engine.flipCard(english.match, selected);
            renderLessonDialog();
            return true;
        }
        const play = ui.lessonSession.play;
        if (play && play.board) {
            play.board = engine.flipCard(play.board, selected);
            play.complete = !!play.board.complete;
            ui.lessonSession.correct = play.complete;
            renderLessonDialog();
            return true;
        }
        return false;
    }

    function tapPlaySpell(letter) {
        const engine = getPlayGamesEngine();
        const english = ui.lessonSession && ui.lessonSession.english;
        if (!engine || !english || !english.spell) return false;
        english.spell = engine.tapSpell(english.spell, letter);
        if (english.spell.complete) ui.lessonSession.correct = true;
        renderLessonDialog();
        return true;
    }

    function tapPlayOrder(value) {
        const engine = getPlayGamesEngine();
        const play = ui.lessonSession && ui.lessonSession.play;
        if (!engine || !play || !play.run) return false;
        play.run = engine.tapOrder(play.run, value);
        play.complete = !!play.run.complete;
        ui.lessonSession.correct = play.complete;
        renderLessonDialog();
        return true;
    }

    function tapPlayOdd(index) {
        const play = ui.lessonSession && ui.lessonSession.play;
        if (!play || !play.run) return false;
        const round = play.run.rounds[play.roundIndex] || play.run.rounds[0];
        const selected = Number(index);
        play.roundCorrect = !!round && selected === round.oddIndex;
        ui.lessonSession.selectedIndex = selected;
        if (play.roundCorrect && play.roundIndex >= play.run.rounds.length - 1) {
            play.complete = true;
            ui.lessonSession.correct = true;
        }
        renderLessonDialog();
        if (play.roundCorrect) speakPraise('找对啦');
        return play.roundCorrect;
    }

    function tapPlaySchulte(index) {
        const engine = getPlayGamesEngine();
        const play = ui.lessonSession && ui.lessonSession.play;
        if (!engine || !play || play.kind !== 'schulte' || !play.run) return false;
        play.run = engine.tapSchulte(play.run, index);
        play.complete = !!play.run.complete;
        ui.lessonSession.correct = play.complete;
        renderLessonDialog();
        if (play.complete) speakPraise('全点完啦');
        return true;
    }

    function tapPlaySudokuCell(index) {
        const engine = getPlayGamesEngine();
        const play = ui.lessonSession && ui.lessonSession.play;
        if (!engine || !play || play.kind !== 'sudoku' || !play.run) return false;
        play.run = engine.selectSudoku(play.run, index);
        renderLessonDialog();
        return true;
    }

    function tapPlaySudokuNum(value) {
        const engine = getPlayGamesEngine();
        const play = ui.lessonSession && ui.lessonSession.play;
        if (!engine || !play || play.kind !== 'sudoku' || !play.run) return false;
        play.run = engine.placeSudoku(play.run, value);
        play.complete = !!play.run.complete;
        ui.lessonSession.correct = play.complete;
        renderLessonDialog();
        if (play.complete) speakPraise('数独填完啦');
        return true;
    }

    function tapPlaySimon(index) {
        const engine = getPlayGamesEngine();
        const play = ui.lessonSession && ui.lessonSession.play;
        if (!engine || !play || play.kind !== 'simon' || !play.run || play.run.phase !== 'input') return false;
        play.run = engine.tapSimon(play.run, index);
        play.complete = !!play.run.complete;
        ui.lessonSession.correct = play.complete;
        renderLessonDialog();
        if (play.complete) speakPraise('顺序记住啦');
        return true;
    }

    function tapPlaySearch(index) {
        const engine = getPlayGamesEngine();
        const play = ui.lessonSession && ui.lessonSession.play;
        if (!engine || !play || play.kind !== 'search' || !play.run) return false;
        play.run = engine.tapSearch(play.run, index);
        play.complete = !!play.run.complete;
        ui.lessonSession.correct = play.complete;
        renderLessonDialog();
        if (play.complete) speakPraise('全找到啦');
        return true;
    }

    function advancePlayOdd() {
        const play = ui.lessonSession && ui.lessonSession.play;
        if (!play || !play.roundCorrect || !play.run) return false;
        if (play.roundIndex < play.run.rounds.length - 1) {
            play.roundIndex += 1;
            play.roundCorrect = false;
            ui.lessonSession.selectedIndex = null;
        } else {
            play.complete = true;
            ui.lessonSession.correct = true;
        }
        renderLessonDialog();
        return true;
    }

    function recordPreschoolLessonMistake(payload) {
        if (!isPreschool || !storage || typeof storage.recordLessonMistake !== 'function') return;
        const source = payload && typeof payload === 'object' ? payload : {};
        if (!String(source.question || '').trim()) return;
        commit(function (next) {
            const result = storage.recordLessonMistake(next.mistakes, Object.assign({
                date: storage.localDate(),
                reviewDate: storage.dateOffset(1),
                createdAt: new Date().toISOString()
            }, source));
            next.mistakes = result.mistakes;
        }, '');
    }

    function markEnglishKnown(word, known) {
        const engine = getEnglishVocabEngine();
        const session = ui.lessonSession && ui.lessonSession.english;
        if (!engine || !session || !Array.isArray(session.batch)) return false;
        const item = session.batch.find(function (entry) { return entry.text === word; });
        if (!item) return false;
        const isMc = session.bankKind === 'minecraft' || (ui.lessonSession && ui.lessonSession.courseId === 'preschool-minecraft');
        item.mark = known ? 'known' : 'unknown';
        resolveReviewOutcome(!!known);
        if (!known) {
            recordPreschoolLessonMistake({
                subject: storage.subjectForCourse(isMc ? 'preschool-minecraft' : 'preschool-english'),
                question: item.text + (item.zh ? ' · ' + item.zh : ''),
                correctAnswer: item.phrase || item.zh || item.text,
                mistakeReason: '点了不会',
                sourceKey: (isMc ? 'minecraft:' : 'english:') + String(item.text || '').toLowerCase(),
                lessonId: ui.lessonSession.id || (isMc ? 'preschool-minecraft-words-1' : 'preschool-english-words-1')
            });
        }
        commit(function (next) {
            const current = isMc
                ? (next.courseProgress && next.courseProgress.minecraft ? next.courseProgress.minecraft : engine.createDefaultProgress())
                : (next.courseProgress && next.courseProgress.english ? next.courseProgress.english : engine.createDefaultProgress());
            const marked = engine.markKnown(current, word, !!known, storage.localDate(), engine.getRuntimeRules());
            next.courseProgress = isMc
                ? global.PersonalWorkbenchChildCourses.saveMinecraft(next.courseProgress, marked)
                : global.PersonalWorkbenchChildCourses.saveEnglish(next.courseProgress, marked);
        }, '');
        session.complete = false;
        ui.lessonSession.correct = false;
        renderLessonDialog();
        return true;
    }

    function markLiteracyFlash(char, known) {
        const engine = getLiteracyEngine();
        const session = ui.lessonSession && ui.lessonSession.literacy;
        if (!engine || !session || !Array.isArray(session.batch)) return false;
        const item = session.batch.find(function (entry) { return entry.char === char; });
        if (!item) return false;
        item.mark = known ? 'known' : 'unknown';
        resolveReviewOutcome(!!known);
        session.char = char;
        commit(function (next) {
            const current = next.courseProgress && next.courseProgress.literacy
                ? next.courseProgress.literacy
                : engine.createDefaultProgress();
            next.courseProgress = global.PersonalWorkbenchChildCourses.saveLiteracy(
                next.courseProgress,
                engine.markFlash(current, char, !!known, storage.localDate(), engine.getRuntimeRules())
            );
        }, '');
        const allMarked = session.batch.every(function (entry) { return entry.mark === 'known' || entry.mark === 'unknown'; });
        const unknowns = session.batch.filter(function (entry) { return entry.mark === 'unknown'; });
        if (allMarked && !unknowns.length) {
            session.complete = true;
            ui.lessonSession.correct = true;
        } else {
            session.complete = false;
            ui.lessonSession.correct = false;
        }
        renderLessonDialog();
        return true;
    }

    function startLiteracyTeach() {
        const engine = getLiteracyEngine();
        const session = ui.lessonSession && ui.lessonSession.literacy;
        if (!engine || !session || !Array.isArray(session.batch)) return false;
        const unknowns = session.batch.filter(function (entry) { return entry.mark === 'unknown'; });
        if (!unknowns.length) {
            session.complete = true;
            ui.lessonSession.correct = true;
            renderLessonDialog();
            return true;
        }
        session.phase = 'teach';
        session.teachIndex = 0;
        session.char = unknowns[0].char;
        session.card = engine.buildTeachCard(engine.getRuntimeBank(), session.char);
        renderLessonDialog();
        return true;
    }

    function advanceLiteracyTeach() {
        const engine = getLiteracyEngine();
        const session = ui.lessonSession && ui.lessonSession.literacy;
        if (!engine || !session || session.phase !== 'teach') return false;
        const unknowns = session.batch.filter(function (entry) { return entry.mark === 'unknown'; });
        if (session.teachIndex >= unknowns.length - 1) {
            session.complete = true;
            ui.lessonSession.correct = true;
        } else {
            session.teachIndex += 1;
            session.char = unknowns[session.teachIndex].char;
            session.card = engine.buildTeachCard(engine.getRuntimeBank(), session.char);
        }
        renderLessonDialog();
        return true;
    }

    function rememberLiteracyTeach() {
        const engine = getLiteracyEngine();
        const session = ui.lessonSession && ui.lessonSession.literacy;
        if (!engine || !session || session.phase !== 'teach' || !session.char) return false;
        const item = session.batch.find(function (entry) { return entry.char === session.char; });
        if (item) item.mark = 'known';
        commit(function (next) {
            const current = next.courseProgress && next.courseProgress.literacy
                ? next.courseProgress.literacy
                : engine.createDefaultProgress();
            next.courseProgress = global.PersonalWorkbenchChildCourses.saveLiteracy(
                next.courseProgress,
                engine.markFlash(current, session.char, true, storage.localDate(), engine.getRuntimeRules())
            );
        }, '');
        const remaining = session.batch.filter(function (entry) { return entry.mark === 'unknown'; });
        if (!remaining.length || session.teachIndex >= remaining.length) {
            session.complete = true;
            ui.lessonSession.correct = true;
        } else {
            session.char = remaining[session.teachIndex].char;
            session.card = engine.buildTeachCard(engine.getRuntimeBank(), session.char);
        }
        renderLessonDialog();
        return true;
    }

    function speakBankQuizRound() {
        const bankQuiz = ui.lessonSession && ui.lessonSession.bankQuiz;
        if (!bankQuiz || !bankQuiz.run) return;
        const round = bankQuiz.run.rounds[bankQuiz.roundIndex];
        if (round && round.speak) speakLiteracy(round.speak, bankQuiz.speakLang || 'zh-CN');
    }

    function advanceBankQuiz() {
        if (!isPreschool || !ui.lessonSession || !ui.lessonSession.bankQuiz) return false;
        const session = ui.lessonSession.bankQuiz;
        if (!session.roundCorrect && !session.complete) return false;
        if (session.roundIndex >= session.run.rounds.length - 1) {
            session.complete = true;
            ui.lessonSession.correct = true;
        } else {
            session.roundIndex += 1;
            session.roundCorrect = false;
            ui.lessonSession.selectedIndex = null;
        }
        renderLessonDialog();
        if (!session.complete) speakBankQuizRound();
        return true;
    }

    function speakLiteracy(text, lang) {
        if (!global.speechSynthesis || !global.SpeechSynthesisUtterance) {
            showToast('当前浏览器暂不支持听发音。', true);
            return;
        }
        try {
            global.speechSynthesis.cancel();
            const utterance = new global.SpeechSynthesisUtterance(String(text || ''));
            utterance.lang = lang || 'zh-CN';
            utterance.rate = 0.8;
            global.speechSynthesis.speak(utterance);
        } catch (error) {
            console.warn('[PersonalWorkbench] 识字发音失败', error);
            showToast('暂时听不了，请看大字。', true);
        }
    }

    function advanceLiteracy() {
        if (!isPreschool || !ui.lessonSession || !ui.lessonSession.literacy) return false;
        const session = ui.lessonSession.literacy;
        if (session.run) {
            if (!session.roundCorrect && !session.complete) return false;
            if (session.roundIndex >= session.run.rounds.length - 1) {
                session.complete = true;
                ui.lessonSession.correct = true;
            } else {
                session.roundIndex += 1;
                session.roundCorrect = false;
                session.hint = false;
                session.char = session.run.rounds[session.roundIndex].char;
                ui.lessonSession.selectedIndex = null;
            }
            renderLessonDialog();
            return true;
        }
        if (!session.loop) return false;
        const step = session.loop.steps[session.stepIndex] || session.loop.steps[0];
        if (step.kind === 'recognize') {
            recordLiteracyAttempt('recognize', true);
            session.stepIndex += 1;
            session.stepCorrect = false;
            ui.lessonSession.selectedIndex = null;
            renderLessonDialog();
            return true;
        }
        if (!session.stepCorrect) return false;
        if (session.stepIndex >= session.loop.steps.length - 1) {
            session.complete = true;
            ui.lessonSession.correct = true;
        } else {
            session.stepIndex += 1;
            session.stepCorrect = false;
            ui.lessonSession.selectedIndex = null;
        }
        renderLessonDialog();
        return true;
    }

    function toggleLiteracyHint() {
        if (!isPreschool || !ui.lessonSession || !ui.lessonSession.literacy || !ui.lessonSession.literacy.run) return false;
        ui.lessonSession.literacy.hint = !ui.lessonSession.literacy.hint;
        renderLessonDialog();
        return true;
    }

    function toggleLiteracyBloom(word) {
        if (!isPreschool || !ui.lessonSession || !ui.lessonSession.literacy || !ui.lessonSession.literacy.bloom) return false;
        const session = ui.lessonSession.literacy;
        const key = String(word || '');
        if (!key) return false;
        session.selected[key] = !session.selected[key];
        session.complete = literacyBloomComplete(session);
        ui.lessonSession.correct = session.complete;
        renderLessonDialog();
        return session.complete;
    }

    function answerLesson(index) {
        if (!isPreschool || !ui.lessonSession) return false;
        const match = findPreschoolLesson(ui.lessonSession.id);
        if (!match) return false;
        const literacy = ui.lessonSession.literacy;
        if (literacy && literacy.run) {
            const round = literacy.run.rounds[literacy.roundIndex] || literacy.run.rounds[0];
            if (!round || !Array.isArray(round.options)) return false;
            const selectedIndex = Number(index);
            if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= round.options.length) return false;
            const correct = selectedIndex === round.answer;
            ui.lessonSession.selectedIndex = selectedIndex;
            literacy.roundCorrect = correct;
            literacy.char = round.char;
            recordLiteracyAttempt('quiz', correct);
            if (!correct) {
                recordPreschoolLessonMistake({
                    subject: storage.subjectForCourse(match.course && match.course.id),
                    question: '找字：' + (round.char || ''),
                    correctAnswer: (round.options[round.answer] && (round.options[round.answer].label || round.options[round.answer])) || String(round.char || ''),
                    mistakeReason: '选了 ' + ((round.options[selectedIndex] && (round.options[selectedIndex].label || round.options[selectedIndex])) || selectedIndex),
                    sourceKey: (match.lesson.id || 'literacy') + ':' + (round.char || literacy.roundIndex),
                    lessonId: match.lesson.id
                });
            }
            if (correct && literacy.roundIndex >= literacy.run.rounds.length - 1) {
                literacy.complete = true;
                ui.lessonSession.correct = true;
            }
            renderLessonDialog();
            if (correct) speakPraise('找对啦');
            return correct;
        }
        if (literacy && literacy.loop) {
            const step = literacy.loop.steps[literacy.stepIndex] || literacy.loop.steps[0];
            if (!step || !Array.isArray(step.options)) return false;
            const selectedIndex = Number(index);
            if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= step.options.length) return false;
            const correct = selectedIndex === step.answer;
            ui.lessonSession.selectedIndex = selectedIndex;
            literacy.stepCorrect = correct;
            recordLiteracyAttempt(step.kind, correct);
            if (!correct) {
                recordPreschoolLessonMistake({
                    subject: storage.subjectForCourse(match.course && match.course.id),
                    question: step.prompt || step.kind || '识字练习',
                    correctAnswer: (step.options[step.answer] && (step.options[step.answer].label || step.options[step.answer])) || '',
                    mistakeReason: '选了 ' + ((step.options[selectedIndex] && (step.options[selectedIndex].label || step.options[selectedIndex])) || selectedIndex),
                    sourceKey: (match.lesson.id || 'literacy') + ':loop:' + literacy.stepIndex,
                    lessonId: match.lesson.id
                });
            }
            if (correct && literacy.stepIndex >= literacy.loop.steps.length - 1) {
                literacy.complete = true;
                ui.lessonSession.correct = true;
            }
            renderLessonDialog();
            if (correct) speakPraise(step.kind === 'quiz' ? '听对啦' : '找对啦');
            return correct;
        }
        const bankQuiz = ui.lessonSession.bankQuiz;
        if (bankQuiz && bankQuiz.run && Array.isArray(bankQuiz.run.rounds)) {
            const round = bankQuiz.run.rounds[bankQuiz.roundIndex] || bankQuiz.run.rounds[0];
            if (!round || !Array.isArray(round.options)) return false;
            const selectedIndex = Number(index);
            if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= round.options.length) return false;
            const correct = selectedIndex === round.answer;
            ui.lessonSession.selectedIndex = selectedIndex;
            bankQuiz.roundCorrect = correct;
            if (!correct) {
                recordPreschoolLessonMistake({
                    subject: storage.subjectForCourse(match.course && match.course.id),
                    question: round.tokens || round.prompt || round.text || '口算',
                    correctAnswer: String(round.options[round.answer] || ''),
                    mistakeReason: '选了 ' + String(round.options[selectedIndex] || ''),
                    sourceKey: (match.lesson.id || bankQuiz.mode) + ':' + (round.id || round.text || round.tokens || bankQuiz.roundIndex),
                    lessonId: match.lesson.id
                });
            }
            if (correct && bankQuiz.roundIndex >= bankQuiz.run.rounds.length - 1) {
                bankQuiz.complete = true;
                ui.lessonSession.correct = true;
            }
            renderLessonDialog();
            if (correct) speakPraise(bankQuiz.mode === 'math-bank' ? '数对啦' : '听对啦');
            else if (round.speak) speakBankQuizRound();
            return correct;
        }
        const activity = getLessonActivity(match.lesson);
        const selectedIndex = Number(index);
        if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= activity.options.length) return false;
        ui.lessonSession.selectedIndex = selectedIndex;
        ui.lessonSession.correct = selectedIndex === activity.answer;
        if (!ui.lessonSession.correct) {
            recordPreschoolLessonMistake({
                subject: storage.subjectForCourse(match.course && match.course.id),
                question: activity.prompt || match.lesson.title || '练习题',
                correctAnswer: String(activity.options[activity.answer] || ''),
                mistakeReason: '选了 ' + String(activity.options[selectedIndex] || ''),
                sourceKey: (match.lesson.id || 'choice') + ':' + String(activity.prompt || match.lesson.title || ''),
                lessonId: match.lesson.id
            });
        }
        renderLessonDialog();
        if (ui.lessonSession.correct) speakPraise(activity.success);
        return ui.lessonSession.correct;
    }

    function finishLesson() {
        if (!isPreschool || !ui.lessonSession) return false;
        const literacy = ui.lessonSession.literacy;
        const english = ui.lessonSession.english;
        const play = ui.lessonSession.play;
        const playEngine = getPlayGamesEngine();
        const vocabEngine = getEnglishVocabEngine();
        if (english && english.mode === 'english-speak') {
            const allMarked = (english.batch || []).every(function (entry) { return entry.mark === 'known' || entry.mark === 'unknown'; });
            if ((english.phase || 'speak') === 'speak') {
                if (!allMarked || !playEngine || !vocabEngine) {
                    showToast('先点完会了和不会，再去配对。', true);
                    return false;
                }
                english.phase = 'match';
                english.match = playEngine.buildMatchBoard(vocabEngine.toMatchPairs(english.batch), english.day || 1);
                renderLessonDialog();
                return false;
            }
            if (english.phase === 'match') {
                if (!english.match || !english.match.complete) {
                    showToast('先把英文和中文配完。', true);
                    return false;
                }
                english.phase = 'spell';
                english.spell = playEngine.buildSpellRound(english.batch[0], english.day || 1);
                renderLessonDialog();
                return false;
            }
            if (!english.spell || !english.spell.complete) {
                showToast('先把这个词拼完。', true);
                return false;
            }
            english.complete = true;
            ui.lessonSession.correct = true;
        } else if (play) {
            const ready = !!(play.complete || (play.board && play.board.complete) || (play.run && play.run.complete));
            if (!ready) {
                showToast('先把这局小游戏玩完。', true);
                return false;
            }
            play.complete = true;
            ui.lessonSession.correct = true;
        } else if (ui.lessonSession.timer) {
            if (!ui.lessonSession.timer.complete) {
                showToast('先做完这一轮，再领取阳光哦。', true);
                return false;
            }
            ui.lessonSession.correct = true;
        } else if (literacy) {
            if (literacy.mode === 'literacy-flash' && literacy.phase === 'teach') {
                const unknowns = (literacy.batch || []).filter(function (entry) { return entry.mark === 'unknown'; });
                if (literacy.teachIndex >= Math.max(0, unknowns.length - 1)) {
                    literacy.complete = true;
                    ui.lessonSession.correct = true;
                }
            }
            const ready = !!literacy.complete || (literacy.bloom && literacyBloomComplete(literacy));
            if (!ready) {
                showToast('先答对题目，再领取阳光哦。', true);
                return false;
            }
            literacy.complete = true;
            ui.lessonSession.correct = true;
            if (literacy.bloom) recordLiteracyAttempt('practice', true);
        } else if (ui.lessonSession.bankQuiz) {
            if (!ui.lessonSession.bankQuiz.complete) {
                showToast('先答对题目，再领取阳光哦。', true);
                return false;
            }
            ui.lessonSession.correct = true;
        } else if (!ui.lessonSession.correct) {
            showToast('先答对题目，再领取阳光哦。', true);
            return false;
        }
        const id = ui.lessonSession.id;
        const ok = completeCourseLesson(id, ui.lessonSession.planId, ui.lessonSession.planDate);
        if (ok) {
            resolveReviewOutcome(true);
            closeLessonDialog();
        }
        return ok;
    }

    function closeLessonDialog() {
        const wasInline = isFocusInlineSession();
        clearLessonMotionTimer();
        clearLessonSimonTimer();
        clearFocusPlayClock();
        if (lessonDialog) {
            if (typeof lessonDialog.close === 'function' && lessonDialog.open) lessonDialog.close();
            else lessonDialog.removeAttribute('open');
        }
        ui.lessonSession = null;
        ui.reviewSourceKey = '';
        if (lessonDialogContent) lessonDialogContent.innerHTML = '';
        if (wasInline && !ui._inRender) render();
    }

    function getNextPreschoolLesson() {
        if (!isPreschool) return null;
        const completed = new Set(Array.isArray(state.courseProgress && state.courseProgress.completedLessonIds) ? state.courseProgress.completedLessonIds : []);
        const courses = Array.isArray(workbenchConfig.childCourses) ? workbenchConfig.childCourses : [];
        for (const course of courses) {
            const lesson = Array.isArray(course.lessons) ? course.lessons.find(function (item) { return !completed.has(item.id); }) : null;
            if (lesson) return { course: course, lesson: lesson };
        }
        return null;
    }

    function getPreschoolQuickTest() {
        if (!isPreschool) return null;
        const courses = Array.isArray(workbenchConfig.childCourses) ? workbenchConfig.childCourses : [];
        const english = courses.find(function (course) { return course.id === 'preschool-english'; });
        const completed = new Set(state.courseProgress && Array.isArray(state.courseProgress.completedLessonIds)
            ? state.courseProgress.completedLessonIds
            : []);
        const lesson = english && Array.isArray(english.lessons)
            ? english.lessons.find(function (item) { return !completed.has(item.id); })
            : null;
        return lesson && english ? { course: english, lesson: lesson } : null;
    }

    function renderPreschoolContinueLearning() {
        const next = getNextPreschoolLesson();
        if (!next) return `<section class="preschool-continue-learning is-complete" aria-label="英语测试进度"><span class="preschool-continue-art">${preschoolAsset('star-companion', '测试完成')}</span><div><span class="eyebrow">QUICK TEST</span><h2>今日英语小测试完成啦</h2><p>去花园看看新伙伴，或者和家长分享今天的成长。</p></div><button class="btn-secondary" type="button" data-action="navigate" data-page="growth">去看花园${icon('arrow-up-right')}</button></section>`;
        return `<section class="preschool-continue-learning" aria-label="英语小测试"><span class="preschool-continue-art">${preschoolVisual(next.course.icon || 'languages', preschoolAssetForIcon(next.course.icon || 'languages'), next.course.title)}</span><div><span class="eyebrow">QUICK TEST</span><h2>${escapeHtml(next.lesson.title)}</h2><p>${escapeHtml(next.course.title)} · ${escapeHtml(next.lesson.minutes)} 分钟 · 答对后记录一次成长。</p></div><button class="btn-primary" type="button" data-action="open-lesson" data-id="${escapeHtml(next.lesson.id)}">${icon('play')} 开始测试</button></section>`;
    }

    function renderPreschoolCourseBadges(course) {
        const items = [];
        if (course && course.badge) items.push(course.badge);
        if (course && Array.isArray(course.highlights)) items.push.apply(items, course.highlights);
        if (!items.length) return '';
        return `<div class="preschool-course-badges">${items.map(function (item, index) {
            return `<span class="preschool-course-badge ${index === 0 ? 'is-primary' : ''}">${escapeHtml(item)}</span>`;
        }).join('')}</div>`;
    }

    function renderPreschoolCourseSamples(course) {
        const items = course && Array.isArray(course.samples) ? course.samples : [];
        if (!items.length) return '';
        return `<div class="preschool-course-samples">${items.map(function (item) {
            return `<span class="preschool-course-sample">${escapeHtml(item)}</span>`;
        }).join('')}</div>`;
    }

    function renderPreschoolMediaCover(item) {
        if (item && item.cover) return `<img class="preschool-media-cover" src="${escapeHtml(item.cover)}" alt="${escapeHtml(item.title || '学习资料')}" loading="lazy">`;
        const assetName = preschoolAssetForIcon((item && item.icon) || 'book-open');
        return `<span class="preschool-media-cover is-fallback">${assetName ? preschoolAsset(assetName, item && item.title) : icon((item && item.icon) || 'book-open')}</span>`;
    }

    function renderPreschoolCourseMedia(course) {
        const media = course && Array.isArray(course.media) ? course.media : [];
        if (!media.length) return '';
        const active = media.find(function (item) { return item.type === 'bilibili' && item.bvid && item.bvid === ui.mediaBvid; }) || null;
        const stage = active ? `<div class="preschool-media-stage"><div class="preschool-media-stage-bar"><strong>${escapeHtml(active.title)}</strong><button class="workbench-text-button" type="button" data-action="media-close">${icon('x')}<span>收起</span></button></div><div class="preschool-media-frame"><iframe src="${'https://player.bilibili.com/player.html?bvid=' + encodeURIComponent(active.bvid) + '&page=1&high_quality=1&danmaku=0'}" scrolling="no" frameborder="no" framespacing="0" allowfullscreen="true" title="${escapeHtml(active.title)}"></iframe></div></div>` : '';
        const cards = media.map(function (item) {
            const cover = `<span class="preschool-media-cover-wrap">${renderPreschoolMediaCover(item)}${item.type === 'bilibili' ? `<i class="preschool-media-play">${icon('play')}</i>` : ''}</span>`;
            if (item.type === 'bilibili') {
                const selected = active && active.bvid === item.bvid;
                return `<button class="preschool-media-card is-video ${selected ? 'is-active' : ''}" type="button" data-action="media-open" data-bvid="${escapeHtml(item.bvid)}" aria-pressed="${selected}"><span class="preschool-media-card-face">${cover}<strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.note || 'B站动画')}</small></span></button>`;
            }
            const code = item.code ? `<span class="preschool-media-code">提取码 ${escapeHtml(item.code)}</span>` : '';
            return `<article class="preschool-media-card is-link"><div class="preschool-media-card-face">${cover}<strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.note || '网盘资料')}</small></div><div class="preschool-media-link-action"><span>${code || '家长可在浏览器打开'}</span><button class="btn-primary" type="button" data-action="open-resource" data-url="${escapeHtml(item.url)}">打开资源${icon('arrow-up-right')}</button></div></article>`;
        }).join('');
        return `<section class="preschool-course-media" aria-label="英语动画屋"><div class="preschool-course-media-head"><div><span class="eyebrow">ANIMATION ROOM</span><h3>英语动画屋</h3><p>点一张封面看视频，看了也算今日英语打卡。</p></div><span class="preschool-course-media-count">${media.length} 个资源</span></div>${stage}<div class="preschool-media-grid">${cards}</div></section>`;
    }

    function renderPreschoolCourseResources(course) {
        const resources = course && Array.isArray(course.resources) ? course.resources : [];
        if (!resources.length) return '';
        return `<section class="preschool-course-resources" aria-label="${escapeHtml(course.title || '课程')}学习素材"><div class="preschool-course-resources-head"><div><span class="eyebrow">READY TO USE</span><h3>今天可以直接用的素材</h3><p>先选一张读一读，再去完成下面的小练习。</p></div><span>${resources.length} 张素材</span></div><div class="preschool-course-resource-list">${resources.map(function (resource) {
            const iconName = resource.icon || 'book-open';
            const assetName = preschoolAssetForIcon(iconName);
            const speech = resource.speak || `${resource.title || ''}。${resource.content || ''}`;
            return `<article class="preschool-course-resource"><span class="preschool-course-resource-art ${assetName ? 'has-image' : ''}">${assetName ? preschoolAsset(assetName, resource.title) : icon(iconName)}</span><div class="preschool-course-resource-copy"><span>${escapeHtml(resource.kind || '学习素材')}</span><strong>${escapeHtml(resource.title || '学习素材')}</strong><p>${escapeHtml(resource.content || '')}</p></div><button class="row-action preschool-course-resource-speak" type="button" data-action="speak-resource" data-text="${escapeHtml(speech)}" aria-label="朗读${escapeHtml(resource.title || '学习素材')}" title="朗读素材">${icon('volume-2')}</button></article>`;
        }).join('')}</div></section>`;
    }

    function getSummerLibraryCategory(categoryId) {
        return SUMMER_LIBRARY_CATEGORIES.find(function (item) { return item.id === categoryId; }) || SUMMER_LIBRARY_CATEGORIES[0];
    }

    function getSummerLibraryEntries(categoryId) {
        const category = getSummerLibraryCategory(categoryId);
        const source = Array.isArray(summerLibrary[category.source]) ? summerLibrary[category.source] : [];
        if (category.id !== 'daily') return source;
        return source.map(function (reading, index) {
            const literacy = Array.isArray(summerLibrary.literacy) && summerLibrary.literacy.length ? summerLibrary.literacy[index % summerLibrary.literacy.length] : null;
            const poem = Array.isArray(summerLibrary.poems) ? summerLibrary.poems[index] : null;
            const classic = Array.isArray(summerLibrary.classics) && summerLibrary.classics.length ? summerLibrary.classics[Math.floor(index / 7) % summerLibrary.classics.length] : null;
            const review = Array.isArray(summerLibrary.weeklyReview) && summerLibrary.weeklyReview.length ? summerLibrary.weeklyReview[Math.floor(index / 7) % summerLibrary.weeklyReview.length] : null;
            return {
                id: `summer-daily-${reading.day || index + 1}`,
                title: `第 ${reading.day || index + 1} 天 · ${reading.title || '暑假学习'}`,
                day: reading.day || index + 1,
                reading: reading,
                literacy: literacy,
                poem: poem,
                classic: classic,
                review: review
            };
        });
    }

    function getSummerLibraryEntrySpeech(entry, categoryId) {
        if (!entry) return '';
        if (categoryId === 'daily') {
            const parts = [entry.reading && entry.reading.content, entry.literacy && Array.isArray(entry.literacy.items) ? entry.literacy.items.map(function (item) { return item.char; }).join('，') : '', entry.poem && entry.poem.content, entry.classic && entry.classic.content, entry.review && entry.review.prompt];
            return parts.filter(Boolean).join('。');
        }
        if (categoryId === 'literacy' && Array.isArray(entry.items)) return entry.items.map(function (item) { return `${item.char}，${item.example || ''}`; }).join('。');
        if (categoryId === 'weeklyReview') return [entry.prompt, ...(Array.isArray(entry.checklist) ? entry.checklist : [])].filter(Boolean).join('。');
        return [entry.title, entry.content, entry.explanation].filter(Boolean).join('。');
    }

    function renderSummerLibrarySection(title, content, pinyin, extra) {
        if (!content && !extra) return '';
        return `<section class="preschool-summer-library-section"><div><span>${escapeHtml(title)}</span>${pinyin ? `<small>${escapeHtml(pinyin)}</small>` : ''}</div>${content ? `<p>${escapeHtml(content)}</p>` : ''}${extra || ''}</section>`;
    }

    function renderPreschoolSummerLibrary(course) {
        if (!course || course.id !== 'preschool-summer' || !summerLibrary.sourcePack) return '';
        const category = getSummerLibraryCategory(ui.summerLibraryCategory);
        const entries = getSummerLibraryEntries(category.id);
        if (!entries.length) return '';
        const currentIndex = Math.max(0, Math.min(entries.length - 1, Number(ui.summerLibraryItem) || 0));
        const entry = entries[currentIndex];
        const speech = getSummerLibraryEntrySpeech(entry, category.id);
        const categoryMarkup = SUMMER_LIBRARY_CATEGORIES.map(function (item) {
            const count = Array.isArray(summerLibrary[item.source]) ? summerLibrary[item.source].length : 0;
            return `<button class="preschool-summer-library-category ${item.id === category.id ? 'is-active' : ''}" type="button" data-action="summer-library-category" data-category="${item.id}" aria-pressed="${item.id === category.id}">${icon(item.icon)}<span>${escapeHtml(item.label)}</span><small>${count} 份</small></button>`;
        }).join('');
        const itemMarkup = entries.map(function (item, index) {
            return `<option value="${index}" ${index === currentIndex ? 'selected' : ''}>${escapeHtml(item.title || `第 ${index + 1} 份`)}</option>`;
        }).join('');
        let contentMarkup = '';
        if (category.id === 'daily') {
            contentMarkup = [
                renderSummerLibrarySection('晨读', entry.reading && entry.reading.content, entry.reading && entry.reading.pinyinContent),
                renderSummerLibrarySection('识字', entry.literacy && Array.isArray(entry.literacy.items) ? entry.literacy.items.map(function (item) { return `${item.char}（${item.pinyin}）`; }).join(' · ') : '', entry.literacy && entry.literacy.focus),
                renderSummerLibrarySection('古诗', entry.poem && entry.poem.content, entry.poem && entry.poem.pinyinContent),
                renderSummerLibrarySection('经典短句', entry.classic && entry.classic.content, entry.classic && entry.classic.pinyinContent),
                renderSummerLibrarySection('本周回看', entry.review && entry.review.prompt, '', entry.review && Array.isArray(entry.review.checklist) ? `<ul>${entry.review.checklist.map(function (item) { return `<li>${escapeHtml(item)}</li>`; }).join('')}</ul>` : '')
            ].join('');
        } else if (category.id === 'literacy') {
            contentMarkup = renderSummerLibrarySection('今日字卡', Array.isArray(entry.items) ? entry.items.map(function (item) { return `${item.char}　${item.pinyin}　${item.example || ''}`; }).join('　·　') : '', entry.focus);
        } else if (category.id === 'weeklyReview') {
            contentMarkup = renderSummerLibrarySection('复盘问题', entry.prompt, '', Array.isArray(entry.checklist) ? `<ul>${entry.checklist.map(function (item) { return `<li>${escapeHtml(item)}</li>`; }).join('')}</ul>` : '');
        } else {
            contentMarkup = renderSummerLibrarySection(category.label, entry.content, entry.pinyinContent, entry.explanation ? `<p class="preschool-summer-library-explanation">${escapeHtml(entry.explanation)}</p>` : '');
        }
        const total = ['morningReading', 'literacy', 'poems', 'classics', 'weeklyReview'].reduce(function (sum, key) { return sum + (Array.isArray(summerLibrary[key]) ? summerLibrary[key].length : 0); }, 0);
        return `<section class="preschool-summer-library" aria-label="完整暑假学习资料库"><div class="preschool-summer-library-head"><div><span class="eyebrow">FULL SUMMER LIBRARY</span><h3>完整暑假资料库</h3><p>把打印版的长期内容收进工作台，今天看一份，明天接着走。</p></div><strong>${total} 份资料</strong></div><div class="preschool-summer-library-categories" role="tablist" aria-label="暑假资料分类">${categoryMarkup}</div><div class="preschool-summer-library-browser"><div class="preschool-summer-library-controls"><label for="summer-library-item">${escapeHtml(category.label)} · 共 ${entries.length} 份</label><select id="summer-library-item" data-action="summer-library-item" aria-label="选择${escapeHtml(category.label)}">${itemMarkup}</select><div class="preschool-summer-library-stepper"><button class="row-action" type="button" data-action="summer-library-step" data-direction="-1" ${currentIndex === 0 ? 'disabled' : ''} aria-label="上一份" title="上一份">${icon('chevron-left')}</button><span>第 ${currentIndex + 1} / ${entries.length} 份</span><button class="row-action" type="button" data-action="summer-library-step" data-direction="1" ${currentIndex === entries.length - 1 ? 'disabled' : ''} aria-label="下一份" title="下一份">${icon('chevron-right')}</button></div></div><article class="preschool-summer-library-entry"><div class="preschool-summer-library-entry-head"><div><span>${escapeHtml(category.label)}</span><h4>${escapeHtml(entry.title || `第 ${currentIndex + 1} 份学习资料`)}</h4></div><button class="row-action preschool-course-resource-speak" type="button" data-action="speak-resource" data-text="${escapeHtml(speech)}" aria-label="朗读${escapeHtml(entry.title || category.label)}" title="朗读这份资料">${icon('volume-2')}</button></div>${contentMarkup}</article></div></section>`;
    }

    function getPreschoolCourseCompletion(course) {
        const lessons = course && Array.isArray(course.lessons) ? course.lessons : [];
        const completedIds = new Set(state.courseProgress && Array.isArray(state.courseProgress.completedLessonIds)
            ? state.courseProgress.completedLessonIds
            : []);
        const completed = lessons.filter(function (lesson) { return completedIds.has(lesson.id); }).length;
        const total = lessons.length;
        return {
            lessons: lessons,
            completed: completed,
            total: total,
            percent: total ? Math.round((completed / total) * 100) : 0,
            firstIncompleteIndex: lessons.findIndex(function (lesson) { return !completedIds.has(lesson.id); })
        };
    }

    function getPreschoolLessonRouteState(completion, lesson, index, course) {
        if (completion.lessons.indexOf(lesson) < 0) return 'next';
        const match = course && lesson ? { course: course, lesson: lesson } : null;
        if (match && !isLessonLevelUnlocked(match)) return 'locked';
        const completedIds = new Set(state.courseProgress && Array.isArray(state.courseProgress.completedLessonIds)
            ? state.courseProgress.completedLessonIds
            : []);
        if (completedIds.has(lesson.id)) return 'done';
        return index === completion.firstIncompleteIndex ? 'current' : 'next';
    }

    function renderPreschoolLevelBands(course) {
        if (!course || course.id === 'preschool-english' || !PRESCHOOL_LEVEL_BAND_COURSES.has(course.id)) return '';
        const levels = global.PersonalWorkbenchBankLevels;
        const track = getCourseTrackProgress(course.id);
        if (!levels || !track || !Array.isArray(track.bands)) return '';
        const maxUnlocked = track.maxUnlocked || 'L1';
        const trackName = typeof levels.trackForCourse === 'function' ? levels.trackForCourse(course.id) : '';
        const visible = track.bands.filter(function (band) { return band.total > 0; });
        return `<div class="preschool-level-bands" aria-label="${escapeHtml(course.title)}分级进度">${visible.map(function (band) {
            const unlocked = levels.isLevelUnlocked(band.level, track);
            const current = band.level === maxUnlocked;
            const stateClass = unlocked ? (current ? 'is-current' : 'is-unlocked') : 'is-locked';
            const stateLabel = unlocked ? (current ? '进行中' : '已解锁') : '未解锁';
            const title = levels.labelFor(band.level, trackName);
            const heading = trackName === 'english' ? title : (band.level + ' · ' + title);
            return `<article class="preschool-level-band ${stateClass}"><strong>${escapeHtml(heading)}</strong><span class="preschool-level-band-track" role="progressbar" aria-label="${escapeHtml(title)}掌握度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${band.percent}"><i style="width:${band.percent}%"></i></span><span class="preschool-level-band-state">${stateLabel} · ${band.ready}/${band.total}</span></article>`;
        }).join('')}</div>`;
    }

    function getPreschoolLessonRouteArt(course, lesson, index) {
        const activityIcons = lesson && lesson.activity && Array.isArray(lesson.activity.optionIcons) ? lesson.activity.optionIcons : [];
        const iconName = lesson && lesson.icon
            ? lesson.icon
            : activityIcons[Number(lesson && lesson.activity && lesson.activity.answer) || 0] || (course && course.icon) || 'book-open';
        const assetName = preschoolAssetForIcon(iconName);
        return assetName ? preschoolAsset(assetName, lesson.title) : icon(iconName);
    }

    function renderPreschoolCourseProgress(course) {
        const completion = getPreschoolCourseCompletion(course);
        const status = completion.percent >= 100 ? 'complete' : completion.completed ? 'active' : 'ready';
        const statusLabel = status === 'complete' ? '全部点亮' : status === 'active' ? '正在进行' : '准备出发';
        return `<div class="preschool-course-progress" aria-label="${escapeHtml(course.title)}课程进度"><div class="preschool-course-progress-head"><span>成长路线</span><strong>${completion.completed}/${completion.total} 张已点亮</strong><em class="preschool-course-status is-${status}" data-route-state="${status}">${statusLabel}</em></div><span class="preschool-course-progress-track" role="progressbar" aria-label="${escapeHtml(course.title)}完成度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${completion.percent}"><i style="width:${completion.percent}%"></i></span></div>`;
    }

    function countDueReviews(courseId) {
        const today = storage.localDate();
        if (courseId === 'preschool-literacy') {
            const engine = getLiteracyEngine();
            if (!engine || typeof engine.buildReviewQueue !== 'function') return 0;
            const progress = state.courseProgress && state.courseProgress.literacy
                ? state.courseProgress.literacy
                : engine.createDefaultProgress();
            const chars = (engine.getRuntimeBank() || []).map(function (item) { return item.char; });
            return engine.buildReviewQueue(progress, engine.getRuntimeRules(), today, chars).length;
        }
        if (courseId === 'preschool-english' || courseId === 'preschool-minecraft') {
            const engine = getEnglishVocabEngine();
            if (!engine || typeof engine.buildReviewQueue !== 'function') return 0;
            const isMc = courseId === 'preschool-minecraft';
            const progress = isMc
                ? (state.courseProgress && state.courseProgress.minecraft ? state.courseProgress.minecraft : engine.createDefaultProgress())
                : (state.courseProgress && state.courseProgress.english ? state.courseProgress.english : engine.createDefaultProgress());
            const bank = isMc ? getMinecraftBank(engine) : (engine.getRuntimeBank() || []);
            const words = bank.map(function (item) { return item.text; });
            return engine.buildReviewQueue(progress, engine.getRuntimeRules(), today, words).length;
        }
        return 0;
    }

    function renderPreschoolLiteracyMastery(course) {
        if (!course || course.id !== 'preschool-literacy') return '';
        const engine = getLiteracyEngine();
        if (!engine || typeof engine.summarizeMastery !== 'function') return '';
        const literacy = state.courseProgress && state.courseProgress.literacy
            ? state.courseProgress.literacy
            : engine.createDefaultProgress();
        const summary = engine.summarizeMastery(literacy);
        const bankSize = (engine.getRuntimeBank() || []).length;
        const unseen = Math.max(0, bankSize - summary.total);
        const track = getCourseTrackProgress(course.id);
        const maxLevel = track && track.maxUnlocked ? track.maxUnlocked : 'L1';
        const due = countDueReviews(course.id);
        return `<div class="preschool-literacy-mastery" aria-label="识字会了还不会"><span>会了 ${summary.known}</span><span>还不会 ${summary.unknown}</span><span>还没点 ${unseen}</span><span class="is-review">今天再认 ${due}</span><span>已开到 ${escapeHtml(maxLevel)}</span></div>`;
    }

    function renderPreschoolEnglishMastery(course) {
        if (!course || (course.id !== 'preschool-english' && course.id !== 'preschool-minecraft')) return '';
        const engine = getEnglishVocabEngine();
        if (!engine) return '';
        const isMc = course.id === 'preschool-minecraft';
        const progress = isMc
            ? (state.courseProgress && state.courseProgress.minecraft ? state.courseProgress.minecraft : engine.createDefaultProgress())
            : (state.courseProgress && state.courseProgress.english ? state.courseProgress.english : engine.createDefaultProgress());
        const mastery = progress.mastery || {};
        let known = 0;
        let unknown = 0;
        Object.keys(mastery).forEach(function (word) {
            const stateName = mastery[word] && mastery[word].state;
            if (stateName === 'ready' || stateName === 'maintenance') known += 1;
            else unknown += 1;
        });
        const bankSize = (isMc ? getMinecraftBank(engine) : (engine.getRuntimeBank() || [])).length;
        const unseen = Math.max(0, bankSize - known - unknown);
        const due = countDueReviews(course.id);
        return `<div class="preschool-literacy-mastery" aria-label="${isMc ? 'Minecraft词掌握' : '英语词掌握'}"><span>会了 ${known} / ${bankSize}</span><span>练过 ${unknown}</span><span>还没点 ${unseen}</span><span class="is-review">今天再认 ${due}</span></div>`;
    }

    function renderPreschoolSubjectMastery(course) {
        if (!course || !PRESCHOOL_SUBJECT_TRACK[course.id]) return '';
        const summary = summarizeSubjectMastery(course.id);
        if (!summary) return '';
        const track = getCourseTrackProgress(course.id);
        const maxLevel = track && track.maxUnlocked ? track.maxUnlocked : 'L1';
        const labels = {
            'preschool-pinyin': '拼音掌握',
            'preschool-phonics': '拼读掌握',
            'preschool-poetry': '古诗掌握',
            'preschool-math': '数学掌握',
            'preschool-exercise': '运动掌握'
        };
        return `<div class="preschool-literacy-mastery" aria-label="${escapeHtml(labels[course.id] || '掌握进度')}"><span>会了 ${summary.known}</span><span>练过 ${summary.unknown}</span><span>还没点 ${summary.unseen}</span><span>已开到 ${escapeHtml(maxLevel)}</span></div>`;
    }

    function renderPreschoolCourseRoute(course) {
        const lessonAction = isPreschool ? 'open-lesson' : 'complete-lesson';
        const completion = getPreschoolCourseCompletion(course);
        const stateLabels = { done: '已点亮', current: '现在来做', next: '下一张', locked: '还没解锁' };
        return `<div class="preschool-course-route" aria-label="${escapeHtml(course.title)}学习路线">${completion.lessons.map(function (lesson, index) {
            const routeState = getPreschoolLessonRouteState(completion, lesson, index, course);
            const literacyReplay = isLiteracyLesson({ lesson: lesson }) || isEnglishSpeakLesson({ lesson: lesson });
            const isDone = routeState === 'done';
            const isLocked = routeState === 'locked';
            const lessonLevel = lesson && lesson.activity && lesson.activity.level ? lesson.activity.level : 'L1';
            const dueCount = literacyReplay ? countDueReviews(course.id) : 0;
            const detail = isLocked
                ? `${lessonLevel} · 先把前一级练到 80%`
                : isDone
                ? (dueCount ? `今天再认 ${dueCount} 个` : (literacyReplay ? '再认一个字 · 字库继续排队' : '完成啦 · 已记录到成长花园'))
                : (dueCount ? `今天再认 ${dueCount} 个 · ${lesson.minutes || 0} 分钟` : `${lesson.minutes || 0} 分钟 · ${escapeHtml(lesson.meta || '看图选一选')}`);
            const actionIcon = isLocked ? 'lock-keyhole' : isDone && !literacyReplay ? 'check' : routeState === 'current' || isDone ? 'play' : 'arrow-right';
            return `<button class="preschool-route-step is-${routeState}" type="button" data-action="${lessonAction}" data-id="${escapeHtml(lesson.id)}" data-route-state="${routeState}" ${isDone && !literacyReplay || isLocked ? 'disabled' : ''}><span class="preschool-route-step-number">${index + 1}</span><span class="preschool-route-step-art" aria-hidden="true">${getPreschoolLessonRouteArt(course, lesson, index)}</span><span class="preschool-route-step-copy"><strong>${escapeHtml(lesson.title)}</strong><small>${stateLabels[routeState]} · ${detail}</small></span><span class="preschool-route-step-action">${icon(actionIcon)}</span></button>`;
        }).join('')}</div>`;
    }

    function getPreschoolCourses() {
        const catalog = Array.isArray(workbenchConfig.childCourses) ? workbenchConfig.childCourses : [];
        return global.PersonalWorkbenchChildCourses && typeof global.PersonalWorkbenchChildCourses.getCourseView === 'function'
            ? global.PersonalWorkbenchChildCourses.getCourseView(catalog, state.courseProgress)
            : catalog;
    }

    function getPreschoolCourseById(id) {
        if (!id) return null;
        return getPreschoolCourses().find(function (course) { return course.id === id; }) || null;
    }

    function getPreschoolCourseShortTitle(course) {
        const shortTitles = {
            'preschool-summer': '暑假', 'preschool-literacy': '识字',
            'preschool-pinyin': '拼音', 'preschool-poetry': '古诗',
            'preschool-math': '数学', 'preschool-focus': '专注',
            'preschool-english': '英语', 'preschool-minecraft': 'MC英语', 'preschool-phonics': '拼读',
            'preschool-exercise': '运动'
        };
        return shortTitles[course.id] || course.title;
    }

    function getPreschoolCourseMediaTabLabel(course) {
        if (course && course.id === 'preschool-english') return '动画屋';
        if (course && course.id === 'preschool-summer') return '资料库';
        return '资料';
    }

    function renderPreschoolCourseWallCard(course) {
        const completion = getPreschoolCourseCompletion(course);
        const status = completion.percent >= 100 ? 'complete' : completion.completed ? 'active' : 'ready';
        const statusLabel = status === 'complete' ? '完成' : status === 'active' ? '继续' : '开始';
        const dots = [1, 2, 3].map(function (step) {
            return `<i class="${completion.percent >= step * 33 ? 'is-on' : ''}"></i>`;
        }).join('');
        const iconName = course.icon || 'book-open';
        const art = preschoolAssetForIcon(iconName) ? preschoolAsset(preschoolAssetForIcon(iconName), course.title) : icon(iconName);
        const levelMark = course.id !== 'preschool-english' && course.id !== 'preschool-minecraft' && (PRESCHOOL_LEVEL_BAND_COURSES.has(course.id) || PRESCHOOL_FLASHCARD_COURSES.has(course.id))
            ? `<small class="preschool-course-wall-level">${escapeHtml(formatPracticeLevelCaption(course.id))}</small>`
            : '';
        return `<button class="preschool-course-wall-card tone-${escapeHtml(course.tone || 'blue')}" type="button" data-action="navigate" data-page="courses" data-course-id="${escapeHtml(course.id)}" aria-label="打开${escapeHtml(course.title)}"><span class="preschool-course-wall-art" aria-hidden="true">${art}</span><strong>${escapeHtml(getPreschoolCourseShortTitle(course))}</strong>${levelMark}<small class="preschool-course-wall-preview">${escapeHtml(getPreschoolCourseTodayPreview(course))}</small><span class="preschool-course-wall-dots" role="progressbar" aria-label="${escapeHtml(course.title)}完成度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${completion.percent}">${dots}</span><span class="preschool-course-wall-state is-${status}" data-route-state="${status}">${statusLabel}</span></button>`;
    }

    function renderPreschoolCourseMediaWallCard(course) {
        const label = getPreschoolCourseMediaTabLabel(course);
        const shortTitle = getPreschoolCourseShortTitle(course);
        const iconName = course.id === 'preschool-english' ? 'play-circle' : 'book-open';
        const art = preschoolAssetForIcon(iconName) ? preschoolAsset(preschoolAssetForIcon(iconName), label) : icon(iconName);
        return `<button class="preschool-course-wall-card preschool-course-wall-media tone-${escapeHtml(course.tone || 'blue')}" type="button" data-action="navigate" data-page="courses" data-course-id="${escapeHtml(course.id)}" data-tab="media" aria-label="打开${escapeHtml(shortTitle)}${escapeHtml(label)}"><span class="preschool-course-wall-art" aria-hidden="true">${art}</span><strong>${escapeHtml(shortTitle)}</strong><small class="preschool-course-wall-preview">${escapeHtml(label)}</small><span class="preschool-course-wall-state">打开</span></button>`;
    }

    function renderPreschoolCourseWallExtras(courses) {
        const cards = (Array.isArray(courses) ? courses : [])
            .filter(function (course) { return course && course.id !== 'preschool-focus'; })
            .map(function (course) { return renderPreschoolCourseMediaWallCard(course); }).join('');
        return `<section class="preschool-course-wall-extras" aria-label="动画和资料"><h2 class="preschool-course-wall-extras-title">动画和资料</h2><div class="preschool-course-wall">${cards}</div></section>`;
    }

    function renderPreschoolCourseTabs(course) {
        const current = ui.courseTab === 'media' || ui.courseTab === 'menu' ? ui.courseTab : 'today';
        const mediaLabel = getPreschoolCourseMediaTabLabel(course);
        return `<nav class="preschool-course-tabs" aria-label="课程分区"><button class="preschool-course-tab ${current === 'today' ? 'is-active' : ''}" type="button" data-action="course-tab" data-tab="today" aria-pressed="${current === 'today'}">今日学习</button><button class="preschool-course-tab ${current === 'media' ? 'is-active' : ''}" type="button" data-action="course-tab" data-tab="media" aria-pressed="${current === 'media'}">${escapeHtml(mediaLabel)}</button><button class="preschool-course-tab ${current === 'menu' ? 'is-active' : ''}" type="button" data-action="course-tab" data-tab="menu" aria-pressed="${current === 'menu'}">更多练习</button></nav>`;
    }

    function renderPreschoolCourseMediaPane(course) {
        const label = getPreschoolCourseMediaTabLabel(course);
        const shortTitle = getPreschoolCourseShortTitle(course);
        const body = [renderPreschoolCourseMedia(course), renderPreschoolCourseResources(course), renderPreschoolSummerLibrary(course)].filter(Boolean).join('');
        const empty = body ? '' : `<section class="preschool-course-media-empty"><p>这一科还没有${escapeHtml(label)}。</p><button class="btn-primary" type="button" data-action="course-tab" data-tab="today">回到今日学习</button></section>`;
        return `<div class="preschool-course-media-pane tone-${escapeHtml(course.tone || 'blue')}"><div class="preschool-flashcard-top"><button class="workbench-text-button" type="button" data-action="navigate" data-page="courses">${icon('arrow-left')}<span>卡片墙</span></button><strong>${escapeHtml(shortTitle)} · ${escapeHtml(label)}</strong><span></span></div>${body}${empty}</div>`;
    }

    function renderPreschoolCoursesTodayCard() {
        const today = storage.localDate();
        const plans = (Array.isArray(state.dailyPlans) ? state.dailyPlans : [])
            .filter(function (item) { return item.date === today; })
            .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
        const workflow = getPreschoolHomeWorkflow(plans);
        const headline = workflow.kind === 'game' ? '今天都学完啦！' : workflow.kind === 'rest' ? '还差一点点' : '今天学什么？';
        return `<section class="preschool-course-today"><span class="preschool-course-today-art" aria-hidden="true">${preschoolAsset('storybook-token', '今日学习')}</span><div class="preschool-course-today-copy"><small>${headline}</small><strong>${escapeHtml(workflow.title)}</strong></div><button class="btn-primary preschool-course-today-cta" type="button" ${preschoolWorkflowActionAttrs(workflow)}>${icon('play')}<span>${escapeHtml(workflow.cta || '开始')}</span></button></section>`;
    }

    const PRESCHOOL_FLASHCARD_COURSES = new Set(['preschool-literacy', 'preschool-english', 'preschool-minecraft', 'preschool-pinyin', 'preschool-phonics', 'preschool-math']);
    const PRESCHOOL_TODAY_PAGE_COURSES = new Set(['preschool-summer', 'preschool-literacy', 'preschool-pinyin', 'preschool-poetry', 'preschool-math', 'preschool-focus', 'preschool-english', 'preschool-minecraft', 'preschool-phonics', 'preschool-exercise']);
    const PRESCHOOL_FLASHCARD_SIZE = { 'preschool-literacy': 8, 'preschool-english': 5, 'preschool-minecraft': 5, 'preschool-pinyin': 8, 'preschool-phonics': 8, 'preschool-math': 8 };
    const PRESCHOOL_FLASHCARD_MARK_LABELS = { 'preschool-math': ['再练练', '答对了'] };

    function preschoolDayIndex(length) {
        if (!length) return 0;
        const days = Math.floor(Date.parse(`${storage.localDate()}T00:00:00`) / 86400000) || 0;
        return ((days % length) + length) % length;
    }

    function getPreschoolCourseMasteryMap(course) {
        if (course.id === 'preschool-literacy') {
            return state.courseProgress && state.courseProgress.literacy && state.courseProgress.literacy.mastery ? state.courseProgress.literacy.mastery : {};
        }
        if (course.id === 'preschool-english') {
            return state.courseProgress && state.courseProgress.english && state.courseProgress.english.mastery ? state.courseProgress.english.mastery : {};
        }
        if (course.id === 'preschool-minecraft') {
            return state.courseProgress && state.courseProgress.minecraft && state.courseProgress.minecraft.mastery ? state.courseProgress.minecraft.mastery : {};
        }
        const track = PRESCHOOL_SUBJECT_TRACK[course.id];
        return track && state.courseProgress && state.courseProgress[track] && state.courseProgress[track].mastery
            ? state.courseProgress[track].mastery
            : {};
    }

    function hasPreschoolMasteryToday(entry, today) {
        return !!(entry && Array.isArray(entry.dates) && entry.dates.indexOf(today) >= 0);
    }

    function derivePreschoolPoetryTodayPoem(course) {
        const level = getPracticeLevelForCourse(course.id);
        const levels = global.PersonalWorkbenchBankLevels;
        const bank = getLevelBanks().poetry || [];
        const mastery = state.courseProgress && state.courseProgress.poetry && state.courseProgress.poetry.mastery ? state.courseProgress.poetry.mastery : {};
        const notReady = bank.filter(function (poem) {
            const entry = mastery[poem.id];
            return !(entry && (entry.state === 'ready' || entry.state === 'maintenance'));
        });
        const scoped = levels && typeof levels.levelPool === 'function' ? levels.levelPool(notReady, level) : notReady;
        const pool = scoped.length ? scoped : (notReady.length ? notReady : bank);
        return pool.length ? pool[preschoolDayIndex(pool.length)] : null;
    }

    function isPreschoolCourseTodayDone(course) {
        const today = storage.localDate();
        const session = ui.courseCards && ui.courseCards.courseId === course.id ? ui.courseCards : null;
        if (PRESCHOOL_FLASHCARD_COURSES.has(course.id)) {
            if (session && Array.isArray(session.items) && session.items.length && session.index >= session.items.length) return true;
            const items = buildPreschoolCourseCardItems(course);
            if (!items.length) return true;
            const mastery = getPreschoolCourseMasteryMap(course);
            return items.every(function (item) {
                const key = (course.id === 'preschool-english' || course.id === 'preschool-minecraft') ? String(item.key || '').toLowerCase() : item.key;
                return hasPreschoolMasteryToday(mastery[key], today);
            });
        }
        if (course.id === 'preschool-poetry') {
            if (session && session.poemId && session.marks && session.marks[session.poemId]) return true;
            const poem = derivePreschoolPoetryTodayPoem(course);
            return !!(poem && hasPreschoolMasteryToday(getPreschoolCourseMasteryMap(course)[poem.id], today));
        }
        if (course.id === 'preschool-exercise') {
            if (session && session.motionDone) return true;
            const levels = global.PersonalWorkbenchBankLevels;
            const bank = getLevelBanks().motion || [];
            const scoped = levels && typeof levels.levelPool === 'function' ? levels.levelPool(bank, getPracticeLevelForCourse(course.id)) : bank;
            const pool = scoped.length ? scoped : bank;
            const mastery = getPreschoolCourseMasteryMap(course);
            return pool.length > 0 && pool.every(function (motion) {
                return hasPreschoolMasteryToday(mastery[motion.id], today);
            });
        }
        if (course.id === 'preschool-focus') {
            const lessons = Array.isArray(course.lessons) ? course.lessons : [];
            const lesson = lessons.length ? lessons[preschoolDayIndex(lessons.length)] : null;
            const completedIds = state.courseProgress && Array.isArray(state.courseProgress.completedLessonIds) ? state.courseProgress.completedLessonIds : [];
            return !!(lesson && completedIds.indexOf(lesson.id) >= 0);
        }
        return false;
    }

    function getMinecraftBand() {
        return ui.minecraftBand === 'MC-D2' ? 'MC-D2' : 'MC-D1';
    }

    function getMinecraftBank(engine) {
        const all = engine && typeof engine.getRuntimeMinecraftBank === 'function' ? engine.getRuntimeMinecraftBank() : [];
        const band = getMinecraftBand();
        return all.filter(function (item) { return item.level === band; });
    }

    function getEnglishTodayThemeLabel(size) {
        const engine = getEnglishVocabEngine();
        const count = size || PRESCHOOL_FLASHCARD_SIZE['preschool-english'] || 5;
        if (!engine || typeof engine.todayTheme !== 'function') return '今天 ' + count + ' 个单词';
        const theme = engine.todayTheme(engine.getRuntimeBank(), storage.localDate(), count);
        return theme ? '今天学：' + theme : '今天 ' + count + ' 个单词';
    }

    function getMinecraftTodayThemeLabel(size) {
        const engine = getEnglishVocabEngine();
        const count = size || PRESCHOOL_FLASHCARD_SIZE['preschool-minecraft'] || 5;
        const bank = getMinecraftBank(engine);
        if (!engine || typeof engine.todayTheme !== 'function' || !bank.length) return '今天 ' + count + ' 个MC词';
        const theme = engine.todayTheme(bank, storage.localDate(), count);
        return theme ? '今天学：' + theme : '今天 ' + count + ' 个MC词';
    }

    function getPreschoolFlashcardCaption(course, session) {
        const total = session && Array.isArray(session.items) ? session.items.length : 0;
        if (course.id === 'preschool-english' || course.id === 'preschool-minecraft') {
            const item = session && session.items ? (session.items[session.index] || session.items[0]) : null;
            const theme = item && item.theme ? item.theme : '';
            return theme ? '今天学：' + theme : '今天 ' + total + ' 张';
        }
        return getPreschoolCourseShortTitle(course) + ' · ' + getPracticeLevelLabel(course.id) + ' · 今天 ' + total + ' 张';
    }

    function getPreschoolCourseTodayPreview(course) {
        if (!course) return '';
        if (isPreschoolCourseTodayDone(course)) return '今天做完啦 ✓';
        if (PRESCHOOL_FLASHCARD_COURSES.has(course.id)) {
            const size = PRESCHOOL_FLASHCARD_SIZE[course.id] || 8;
            const labels = {
                'preschool-literacy': '今天认 ' + size + ' 个字',
                'preschool-english': getEnglishTodayThemeLabel(size),
                'preschool-minecraft': getMinecraftTodayThemeLabel(size),
                'preschool-pinyin': '今天认 ' + size + ' 个拼音',
                'preschool-phonics': '今天认 ' + size + ' 个词',
                'preschool-math': '今天 ' + size + ' 道口算'
            };
            return labels[course.id] || ('今天 ' + size + ' 张');
        }
        if (course.id === 'preschool-poetry') {
            const poem = derivePreschoolPoetryTodayPoem(course);
            return poem && poem.title ? '今日一首 · ' + poem.title : '今日一首';
        }
        if (course.id === 'preschool-focus') return '点一张卡开始玩';
        if (course.id === 'preschool-exercise') return '跟做今天的动作';
        if (course.id === 'preschool-summer') return '今天看五样';
        return '';
    }

    function getPreschoolCourseTodayLesson(course) {
        const lessons = course && Array.isArray(course.lessons) ? course.lessons : [];
        if (!lessons.length) return null;
        if (course.id === 'preschool-focus') return lessons[preschoolDayIndex(lessons.length)];
        const completion = getPreschoolCourseCompletion(course);
        if (completion.firstIncompleteIndex >= 0) return lessons[completion.firstIncompleteIndex];
        return lessons[0];
    }

    function buildPreschoolCourseCardItems(course) {
        const today = storage.localDate();
        const size = PRESCHOOL_FLASHCARD_SIZE[course.id] || 8;
        const level = getPracticeLevelForCourse(course.id);
        if (course.id === 'preschool-literacy') {
            const engine = getLiteracyEngine();
            if (!engine || typeof engine.buildFlashBatch !== 'function') return [];
            const progress = state.courseProgress && state.courseProgress.literacy ? state.courseProgress.literacy : engine.createDefaultProgress();
            return engine.buildFlashBatch(engine.getRuntimeBank(), progress, engine.getRuntimeRules(), today, '', size, level).map(function (item) {
                const words = Array.isArray(item.words) ? item.words.filter(Boolean) : [];
                const rows = [
                    words.length ? { label: '组词', text: words.join(' · ') } : { label: '读一读', text: item.pinyin || item.char },
                    item.explain ? { label: '讲解', text: item.explain } : null
                ].filter(Boolean);
                const media = resolvePreschoolCardMedia({ kind: 'literacy', text: item.char, char: item.char, theme: item.theme, media: item.media, art: item.art });
                return { key: item.char, main: item.char, sub: item.pinyin || '', rows: rows, speak: item.char, lang: 'zh-CN', review: !!item.review, art: media.markup };
            });
        }
        if (course.id === 'preschool-english') {
            const engine = getEnglishVocabEngine();
            if (!engine || typeof engine.buildSpeakBatch !== 'function') return [];
            const progress = state.courseProgress && state.courseProgress.english ? state.courseProgress.english : engine.createDefaultProgress();
            return engine.buildSpeakBatch(engine.getRuntimeBank(), progress, engine.getRuntimeRules(), today, '', size).map(function (item) {
                const rows = [
                    item.zh ? { label: '意思', text: item.zh } : null,
                    item.phrase ? { label: '句子', text: item.phrase } : null,
                    item.phraseZh ? { label: '句意', text: item.phraseZh } : null
                ].filter(Boolean);
                const media = resolvePreschoolCardMedia(item);
                return { key: item.text, main: item.text, sub: '', rows: rows, speak: item.text, lang: 'en-US', review: !!item.review, image: item.image || '', audio: item.audio || '', theme: item.theme || '', art: media.markup, audioUrl: media.audioUrl };
            });
        }
        if (course.id === 'preschool-minecraft') {
            const engine = getEnglishVocabEngine();
            if (!engine || typeof engine.buildSpeakBatch !== 'function') return [];
            const progress = state.courseProgress && state.courseProgress.minecraft ? state.courseProgress.minecraft : engine.createDefaultProgress();
            return engine.buildSpeakBatch(getMinecraftBank(engine), progress, engine.getRuntimeRules(), today, '', size).map(function (item) {
                const rows = [
                    item.zh ? { label: '意思', text: item.zh } : null,
                    item.phrase ? { label: '句子', text: item.phrase } : null,
                    item.phraseZh ? { label: '句意', text: item.phraseZh } : null
                ].filter(Boolean);
                const media = resolvePreschoolCardMedia(item);
                return { key: item.text, main: item.text, sub: '', rows: rows, speak: item.text, lang: 'en-US', review: !!item.review, image: item.image || '', audio: item.audio || '', theme: item.theme || '', art: media.markup, audioUrl: media.audioUrl };
            });
        }
        if (course.id === 'preschool-math') {
            const engine = getMathBankEngine();
            if (!engine || typeof engine.buildQuiz !== 'function') return [];
            const quiz = engine.buildQuiz(engine.getRuntimeBank(), { level: level, band: getMathPracticeBand(), size: size, salt: today });
            const rounds = quiz && Array.isArray(quiz.rounds) ? quiz.rounds : [];
            return rounds.map(function (round) {
                return { key: round.id, main: round.tokens || round.prompt || '', sub: '', rows: [{ label: '答案', text: String(round.answerValue) }], speak: round.speak || round.prompt || '', lang: 'zh-CN', review: false, art: preschoolCardArt({ kind: 'math', text: round.tokens || round.prompt || '', main: round.tokens || '', answer: round.answerValue }) };
            });
        }
        const trackName = PRESCHOOL_SUBJECT_TRACK[course.id];
        const banks = getLevelBanks();
        const bank = trackName && Array.isArray(banks[trackName]) ? banks[trackName] : [];
        if (!bank.length) return [];
        const levels = global.PersonalWorkbenchBankLevels;
        const mastery = state.courseProgress && state.courseProgress[trackName] && state.courseProgress[trackName].mastery
            ? state.courseProgress[trackName].mastery
            : {};
        const isReady = function (item) {
            const entry = mastery[item.text];
            return !!(entry && (entry.state === 'ready' || entry.state === 'maintenance'));
        };
        const isPracticing = function (item) {
            const entry = mastery[item.text];
            return !!(entry && !isReady(item));
        };
        const notReady = bank.filter(function (item) { return !isReady(item); });
        const practicing = notReady.filter(isPracticing);
        const unseen = notReady.filter(function (item) { return !isPracticing(item); });
        const ordered = practicing.concat(unseen);
        const scoped = levels && typeof levels.levelPool === 'function' ? levels.levelPool(ordered, level) : ordered;
        const picked = (scoped.length ? scoped : ordered).slice(0, size);
        if (course.id === 'preschool-pinyin') {
            const kindLabels = { initial: '声母', final: '韵母', whole: '整体认读' };
            return picked.map(function (item) {
                const rows = [
                    item.sample ? { label: '例字', text: item.sample } : null,
                    item.pinyin ? { label: '拼音', text: item.pinyin } : null,
                    item.homophones && item.homophones.length ? { label: '同音', text: item.homophones.slice(0, 6).join(' · ') } : null,
                    item.nearPhones && item.nearPhones.length ? { label: '近音', text: item.nearPhones.slice(0, 6).join(' · ') } : null
                ].filter(Boolean);
                const media = resolvePreschoolCardMedia({ kind: 'pinyin', text: item.text, pinyinKind: item.kind, group: item.group, theme: item.sample, media: item.media, art: item.art });
                return { key: item.text, main: item.text, sub: '', rows: rows, speak: item.sample || item.text, lang: 'zh-CN', review: isPracticing(item), art: media.markup };
            });
        }
        return picked.map(function (item) {
            const graphemes = Array.isArray(item.graphemes) ? item.graphemes.join(' · ') : '';
            const phonemes = Array.isArray(item.phonemes) ? item.phonemes.join(' · ') : '';
            const rows = [
                graphemes ? { label: '拼一拼', text: graphemes } : null,
                phonemes ? { label: '读音', text: phonemes } : null
            ].filter(Boolean);
            const media = resolvePreschoolCardMedia({ kind: 'phonics', text: item.text, theme: item.stageId, media: item.media, art: item.art });
            return { key: item.text, main: item.text, sub: '', rows: rows, speak: item.text, lang: 'en-US', review: isPracticing(item), art: media.markup };
        });
    }

    function getPreschoolCourseCardSession(course) {
        const level = course.id === 'preschool-minecraft' ? getMinecraftBand() : getPracticeLevelForCourse(course.id);
        if (ui.courseCards && ui.courseCards.courseId === course.id && ui.courseCards.level === level && Array.isArray(ui.courseCards.items)) return ui.courseCards;
        ui.courseCards = { courseId: course.id, items: buildPreschoolCourseCardItems(course), index: 0, marks: {}, revealed: {}, level: level };
        return ui.courseCards;
    }

    function isPreschoolFlashcardRevealed(session, item) {
        return !!(session && session.revealed && item && session.revealed[item.key]);
    }

    function revealPreschoolFlashcard() {
        const session = ui.courseCards;
        if (!session || !Array.isArray(session.items) || session.index >= session.items.length) return;
        const item = session.items[session.index];
        session.revealed = session.revealed || {};
        session.revealed[item.key] = true;
        render();
    }

    function renderPreschoolCardFrame(course, session, item, actionsMarkup) {
        const total = session.items.length;
        const dots = session.items.map(function (_, dotIndex) {
            const stateClass = dotIndex < session.index ? 'is-on' : dotIndex === session.index ? 'is-current' : '';
            return `<i class="${stateClass}"></i>`;
        }).join('');
        const rows = item.rows.map(function (row) {
            return `<div class="preschool-flashcard-row"><small>${escapeHtml(row.label)}</small><strong>${escapeHtml(row.text)}</strong></div>`;
        }).join('');
        const coverHint = {
            'preschool-english': '点开看意思',
            'preschool-minecraft': '点开看意思',
            'preschool-literacy': '点开看组词',
            'preschool-math': '点开看答案',
            'preschool-pinyin': '点开看例字',
            'preschool-phonics': '点开看拼读'
        }[course.id] || '点开看看';
        const side = isPreschoolFlashcardRevealed(session, item)
            ? `<div class="preschool-flashcard-rows">${rows}</div>`
            : `<button class="preschool-flashcard-cover" type="button" data-action="flashcard-reveal"><small>还不会？</small><strong>${coverHint}</strong></button>`;
        return `<div class="preschool-flashcard-page tone-${escapeHtml(course.tone || 'blue')}"><div class="preschool-flashcard-top"><button class="workbench-text-button" type="button" data-action="navigate" data-page="courses">${icon('arrow-left')}<span>卡片墙</span></button><strong>${escapeHtml(getPreschoolFlashcardCaption(course, session))}</strong><span class="preschool-flashcard-dots" aria-label="第 ${session.index + 1} 张，共 ${total} 张">${dots}</span></div>${renderPreschoolPracticeLevelChips(course)}<p class="preschool-flashcard-count">第 ${session.index + 1} / ${total} 张${item.review ? '<em class="preschool-flashcard-review">复习</em>' : ''}</p><div class="preschool-flashcard"><div class="preschool-flashcard-main">${item.art || ''}<strong>${escapeHtml(item.main)}</strong>${item.sub ? `<small>${escapeHtml(item.sub)}</small>` : ''}</div>${side}</div><div class="preschool-flashcard-toolbar"><button class="preschool-flashcard-speak" type="button" data-action="${item.lang === 'en-US' ? 'english-speak' : 'literacy-speak'}" data-text="${escapeHtml(item.speak)}" data-audio="${escapeHtml(item.audioUrl || resolvePreschoolCardMedia(item).audioUrl)}" aria-label="朗读${escapeHtml(item.main)}" title="点我朗读">${icon('volume-2')}<span>听一听</span></button></div><div class="preschool-flashcard-actions">${actionsMarkup}</div><div class="preschool-flashcard-foot"><button class="workbench-text-button" type="button" data-action="flashcard-classic">更多练习</button></div></div>`;
    }

    function renderPreschoolCourseFlashcards(course) {
        const session = getPreschoolCourseCardSession(course);
        const total = session.items.length;
        if (!total || session.index >= total) return renderPreschoolFlashcardComplete(course, session);
        const item = session.items[session.index];
        const labels = PRESCHOOL_FLASHCARD_MARK_LABELS[course.id] || ['还不会', '会了'];
        const actions = `<button class="preschool-flashcard-mark is-unknown" type="button" data-action="flashcard-mark" data-known="0">${icon('rotate-ccw')}<span>${labels[0]}</span></button><button class="preschool-flashcard-mark is-known" type="button" data-action="flashcard-mark" data-known="1">${icon('check')}<span>${labels[1]}</span></button>`;
        return renderPreschoolCardFrame(course, session, item, actions);
    }

    function renderPreschoolFlashcardComplete(course, session) {
        const marks = session.marks || {};
        const markedKeys = Object.keys(marks);
        const knownCount = markedKeys.filter(function (key) { return marks[key] === 'known'; }).length;
        const unknownCount = markedKeys.length - knownCount;
        const empty = !session.items.length;
        const lessons = (Array.isArray(course.lessons) ? course.lessons : []).filter(function (lesson) {
            return !(lesson.activity && lesson.activity.mode === 'literacy-flash');
        });
        const lessonButtons = lessons.map(function (lesson) {
            return `<button class="btn-primary preschool-flashcard-lesson" type="button" data-action="open-lesson" data-id="${escapeHtml(lesson.id)}">${icon('play')}<span>${escapeHtml(lesson.title)}</span></button>`;
        }).join('');
        const summary = empty
            ? '去练一练，明天再来认新的。'
            : course.id === 'preschool-math'
                ? `答对 ${knownCount}${unknownCount ? ` · 再练 ${unknownCount}` : ''}`
                : `会了 ${knownCount}${unknownCount ? ` · 明天再认 ${unknownCount}` : ''}`;
        return `<div class="preschool-flashcard-page tone-${escapeHtml(course.tone || 'blue')}"><div class="preschool-flashcard-top"><button class="workbench-text-button" type="button" data-action="navigate" data-page="courses">${icon('arrow-left')}<span>卡片墙</span></button><strong>${escapeHtml(getPreschoolCourseShortTitle(course))}</strong><span></span></div><section class="preschool-flashcard-complete"><span class="preschool-flashcard-complete-art" aria-hidden="true">${preschoolAsset('star-companion', '完成')}</span><h2>${empty ? '这一级的卡都翻完啦！' : '今天的小卡翻完啦！🎉'}</h2><p>${summary}</p>${lessonButtons ? `<div class="preschool-flashcard-complete-lessons">${lessonButtons}</div>` : ''}<div class="preschool-flashcard-foot"><button class="workbench-text-button" type="button" data-action="flashcard-classic">更多练习</button></div></section></div>`;
    }

    function getPreschoolPoetryTodaySession(course) {
        if (ui.courseCards && ui.courseCards.courseId === course.id && ui.courseCards.poem && ui.courseCards.level === getPracticeLevelForCourse(course.id)) return ui.courseCards;
        const poem = derivePreschoolPoetryTodayPoem(course);
        ui.courseCards = { courseId: course.id, items: [], index: 0, marks: {}, poemId: poem ? poem.id : '', poem: poem, motionDone: false, level: getPracticeLevelForCourse(course.id) };
        return ui.courseCards;
    }

    function getPreschoolBrowseCardSession(course) {
        if (ui.courseCards && ui.courseCards.courseId === course.id && ui.courseCards.level === getPracticeLevelForCourse(course.id) && Array.isArray(ui.courseCards.items)) return ui.courseCards;
        ui.courseCards = { courseId: course.id, items: [], index: 0, marks: {}, poemId: '', motionDone: false, level: getPracticeLevelForCourse(course.id) };
        const level = ui.courseCards.level;
        const levels = global.PersonalWorkbenchBankLevels;
        if (course.id === 'preschool-exercise') {
            const bank = getLevelBanks().motion || [];
            const scoped = levels && typeof levels.levelPool === 'function' ? levels.levelPool(bank, level) : bank;
            const pool = scoped.length ? scoped : bank;
            ui.courseCards.items = pool.map(function (motion) {
                const seconds = Number(motion.durationSec) || 60;
                const rows = [
                    { label: '时长', text: `${seconds} 秒` },
                    { label: '注意', text: Array.isArray(motion.safety) ? motion.safety.join(' · ') : '' }
                ].filter(function (row) { return row.text; });
                return { key: motion.id, main: motion.name || '运动', sub: '跟爸爸妈妈一起做', rows: rows, speak: motion.name || '', lang: 'zh-CN', review: false };
            });
        }
        return ui.courseCards;
    }

    function renderPreschoolBrowseCards(course) {
        const session = getPreschoolBrowseCardSession(course);
        const total = session.items.length;
        if (!total || session.index >= total) {
            return renderPreschoolMotionComplete(course, session);
        }
        const item = session.items[session.index];
        const actions = `<button class="preschool-flashcard-mark is-nav" type="button" data-action="flashcard-prev" ${session.index === 0 ? 'disabled' : ''}>${icon('arrow-left')}<span>上一张</span></button><button class="preschool-flashcard-mark is-nav" type="button" data-action="flashcard-next">${icon('arrow-right')}<span>${session.index === total - 1 ? '翻完啦' : '下一张'}</span></button>`;
        return renderPreschoolCardFrame(course, session, item, actions);
    }

    function renderPreschoolPoetryToday(course) {
        const session = getPreschoolPoetryTodaySession(course);
        const poem = session.poem;
        if (!poem) return '';
        const lines = Array.isArray(poem.lines) ? poem.lines : [];
        const linesMarkup = lines.map(function (line) {
            return `<p>${escapeHtml(line)}</p>`;
        }).join('');
        const asked = session.poemId && session.marks && session.marks[session.poemId];
        const lessons = Array.isArray(course.lessons) ? course.lessons : [];
        const lessonButtons = lessons.map(function (lesson) {
            return `<button class="btn-primary preschool-flashcard-lesson" type="button" data-action="open-lesson" data-id="${escapeHtml(lesson.id)}">${icon('play')}<span>${escapeHtml(lesson.title)}</span></button>`;
        }).join('');
        const askBlock = asked
            ? `<div class="preschool-poem-ask is-done"><h2>${session.marks[session.poemId] === 'known' ? '会背啦，真厉害！🎉' : '没关系，明天再读一遍！'}</h2><p>${session.marks[session.poemId] === 'known' ? '这首诗放进你的小花园了。' : '这首诗明天还会再来找你。'}</p>${lessonButtons ? `<div class="preschool-flashcard-complete-lessons">${lessonButtons}</div>` : ''}</div>`
            : `<div class="preschool-poem-ask"><h2>这首会背了吗？</h2><p>试着不看卡，自己背一遍。</p><div class="preschool-flashcard-actions preschool-flashcard-actions-inline"><button class="preschool-flashcard-mark is-unknown" type="button" data-action="flashcard-poem-mark" data-known="0">${icon('rotate-ccw')}<span>还没会</span></button><button class="preschool-flashcard-mark is-known" type="button" data-action="flashcard-poem-mark" data-known="1">${icon('check')}<span>会背了</span></button></div></div>`;
        return `<div class="preschool-flashcard-page tone-${escapeHtml(course.tone || 'blue')}"><div class="preschool-flashcard-top"><button class="workbench-text-button" type="button" data-action="navigate" data-page="courses">${icon('arrow-left')}<span>卡片墙</span></button><strong>${escapeHtml(getPreschoolCourseShortTitle(course))} · ${escapeHtml(getPracticeLevelLabel(course.id))} · 今日一首</strong><span></span></div>${renderPreschoolPracticeLevelChips(course)}<section class="preschool-poem-today"><div class="preschool-poem-today-head">${preschoolCardArt({ kind: 'poetry', text: poem.title })}<h2>${escapeHtml(poem.title)}</h2><small>${escapeHtml(poem.author || '')}</small></div><div class="preschool-poem-lines">${linesMarkup}</div><div class="preschool-flashcard-toolbar"><button class="preschool-flashcard-speak" type="button" data-action="literacy-speak" data-text="${escapeHtml([poem.title].concat(lines).join('，'))}" aria-label="朗读整首${escapeHtml(poem.title)}" title="点我朗读">${icon('volume-2')}<span>听整首</span></button></div>${poem.meaning ? `<div class="preschool-poem-meaning"><small>讲解</small><p>${escapeHtml(poem.meaning)}</p></div>` : ''}</section>${askBlock}<div class="preschool-flashcard-foot"><button class="workbench-text-button" type="button" data-action="flashcard-classic">更多练习</button></div></div>`;
    }

    function renderPreschoolMotionComplete(course, session) {
        const lessons = Array.isArray(course.lessons) ? course.lessons : [];
        const lessonButtons = lessons.map(function (lesson) {
            return `<button class="btn-primary preschool-flashcard-lesson" type="button" data-action="open-lesson" data-id="${escapeHtml(lesson.id)}">${icon('play')}<span>${escapeHtml(lesson.title)}</span></button>`;
        }).join('');
        const body = session.motionDone
            ? `<h2>点亮成功，真棒！🎉</h2><p>今天的运动记进花园了。</p>${lessonButtons ? `<div class="preschool-flashcard-complete-lessons">${lessonButtons}</div>` : ''}`
            : `<h2>动作都看完啦！</h2><p>跟爸爸妈妈做一遍，再点亮这项行动。</p><div class="preschool-flashcard-actions preschool-flashcard-actions-inline"><button class="preschool-flashcard-mark is-known" type="button" data-action="flashcard-motion-done">${icon('check')}<span>完成点亮</span></button></div>`;
        return `<div class="preschool-flashcard-page tone-${escapeHtml(course.tone || 'blue')}"><div class="preschool-flashcard-top"><button class="workbench-text-button" type="button" data-action="navigate" data-page="courses">${icon('arrow-left')}<span>卡片墙</span></button><strong>${escapeHtml(getPreschoolCourseShortTitle(course))}</strong><span></span></div><section class="preschool-flashcard-complete"><span class="preschool-flashcard-complete-art" aria-hidden="true">${preschoolAsset('star-companion', '运动')}</span>${body}<div class="preschool-flashcard-foot"><button class="workbench-text-button" type="button" data-action="flashcard-classic">更多练习</button></div></section></div>`;
    }

    function getPreschoolFocusGameArtName(lesson) {
        const byId = {
            'preschool-focus-1': 'focus-schulte',
            'preschool-focus-2': 'focus-sudoku',
            'preschool-focus-3': 'focus-memory',
            'preschool-focus-4': 'focus-simon',
            'preschool-focus-5': 'focus-search'
        };
        const byMode = {
            'play-schulte': 'focus-schulte',
            'play-sudoku': 'focus-sudoku',
            'play-memory': 'focus-memory',
            'play-simon': 'focus-simon',
            'play-search': 'focus-search'
        };
        return (lesson && byId[lesson.id]) || (lesson && lesson.activity && byMode[lesson.activity.mode]) || '';
    }

    function renderPreschoolFocusGameArt(lesson) {
        const name = getPreschoolFocusGameArtName(lesson);
        return name ? preschoolAsset(name, lesson && lesson.title) : getPreschoolLessonRouteArt({ id: 'preschool-focus', icon: 'target' }, lesson, 0);
    }

    function renderPreschoolFocusToday(course) {
        if (isFocusInlineSession()) {
            const match = findPreschoolLesson(ui.lessonSession.id);
            const title = match && match.lesson ? match.lesson.title : '专注力训练';
            const meta = getFocusArcadeMeta(match);
            const playing = ui.lessonSession.focusPhase === 'play';
            const backAction = playing ? 'focus-pick-map' : 'close-lesson';
            return `<div class="focus-arcade theme-${escapeHtml(meta.theme)} preschool-focus-play-page"><div class="focus-arcade-bar"><button class="focus-arcade-icon-btn" type="button" data-action="${backAction}" aria-label="返回">${icon('arrow-left')}</button><h1>${escapeHtml(meta.title || title)}</h1><button class="focus-arcade-icon-btn" type="button" data-action="focus-refresh" aria-label="重新开始">${icon('rotate-ccw')}</button></div><div id="preschool-focus-play-host" class="focus-arcade-card preschool-focus-play-host ${playing ? 'is-playing' : 'is-picking'}">${renderFocusPlayInner()}</div></div>`;
        }
        const lessons = (Array.isArray(course.lessons) ? course.lessons : []).filter(isPreschoolMenuCoreLesson);
        if (!lessons.length) return '';
        const completedIds = state.courseProgress && Array.isArray(state.courseProgress.completedLessonIds) ? state.courseProgress.completedLessonIds : [];
        const cards = lessons.map(function (lesson) {
            const done = completedIds.indexOf(lesson.id) >= 0;
            const preview = [lesson.meta, lesson.minutes ? lesson.minutes + ' 分钟' : ''].filter(Boolean).join(' · ');
            return `<button class="preschool-course-wall-card preschool-focus-game-card tone-${escapeHtml(course.tone || 'gold')}${done ? ' is-done' : ''}" type="button" data-action="open-lesson" data-id="${escapeHtml(lesson.id)}" aria-label="打开${escapeHtml(lesson.title)}"><span class="preschool-course-wall-art" aria-hidden="true">${renderPreschoolFocusGameArt(lesson)}</span><strong>${escapeHtml(lesson.title)}</strong>${preview ? `<small class="preschool-course-wall-preview">${escapeHtml(preview)}</small>` : ''}<span class="preschool-course-wall-state${done ? ' is-complete' : ''}">${done ? '再玩' : '开始'}</span></button>`;
        }).join('');
        return `<div class="preschool-flashcard-page tone-${escapeHtml(course.tone || 'gold')}"><div class="preschool-flashcard-top"><button class="workbench-text-button" type="button" data-action="navigate" data-page="courses">${icon('arrow-left')}<span>卡片墙</span></button><strong>专注力训练</strong><span></span></div><div class="preschool-course-wall preschool-focus-game-wall" aria-label="专注力游戏">${cards}</div></div>`;
    }

    function renderPreschoolSummerToday(course) {
        const dailies = getSummerLibraryEntries('daily');
        if (!dailies.length) return '';
        const entry = dailies[preschoolDayIndex(dailies.length)];
        const today = storage.localDate();
        const dateParts = today.split('-');
        const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][new Date(`${today}T00:00:00`).getDay()];
        const indexIn = function (categoryId, item) {
            if (!item) return 0;
            const list = getSummerLibraryEntries(categoryId);
            const found = list.indexOf(item);
            return found >= 0 ? found : 0;
        };
        const rows = [];
        if (entry.reading) rows.push({ icon: 'volume-2', label: '晨读', title: entry.reading.title || '今日晨读', preview: entry.reading.content || '', minutes: entry.reading.estimatedMinutes, category: 'morningReading', index: indexIn('morningReading', entry.reading) });
        if (entry.literacy) rows.push({ icon: 'book-open', label: '识字', title: Array.isArray(entry.literacy.items) ? `认一认：${entry.literacy.items.map(function (char) { return char.char; }).join('、')}` : (entry.literacy.title || '今日识字'), preview: entry.literacy.tip || '', minutes: entry.literacy.estimatedMinutes, category: 'literacy', index: indexIn('literacy', entry.literacy) });
        if (entry.poem) rows.push({ icon: 'feather', label: '古诗', title: entry.poem.title || '读一首诗', preview: entry.poem.content || '', minutes: entry.poem.estimatedMinutes, category: 'poems', index: indexIn('poems', entry.poem) });
        if (entry.classic) rows.push({ icon: 'heart', label: '经典一句', title: entry.classic.title || '今日一句', preview: entry.classic.content || '', minutes: entry.classic.estimatedMinutes, category: 'classics', index: indexIn('classics', entry.classic) });
        if (entry.review) rows.push({ icon: 'calendar-check-2', label: '每周复盘', title: entry.review.title || '这一周', preview: entry.review.prompt || '', minutes: 0, category: 'weeklyReview', index: indexIn('weeklyReview', entry.review) });
        const rowMarkup = rows.map(function (row) {
            return `<button class="preschool-summer-task" type="button" data-action="flashcard-summer-open" data-category="${escapeHtml(row.category)}" data-index="${row.index}"><span class="preschool-summer-task-icon">${icon(row.icon)}</span><span class="preschool-summer-task-copy"><small>${escapeHtml(row.label)}${row.minutes ? ` · ${row.minutes} 分钟` : ''}</small><strong>${escapeHtml(row.title)}</strong>${row.preview ? `<em>${escapeHtml(row.preview)}</em>` : ''}</span><span class="preschool-summer-task-go">${icon('arrow-right')}</span></button>`;
        }).join('');
        return `<div class="preschool-flashcard-page tone-${escapeHtml(course.tone || 'orange')}"><div class="preschool-flashcard-top"><button class="workbench-text-button" type="button" data-action="navigate" data-page="courses">${icon('arrow-left')}<span>卡片墙</span></button><strong>暑假 · 今日资料</strong><span></span></div><section class="preschool-summer-today"><div class="preschool-summer-today-head"><span class="eyebrow">TODAY</span><h2>${Number(dateParts[1])}月${Number(dateParts[2])}日 ${weekday}</h2><p>今天看一看，点开就能读。</p></div><div class="preschool-summer-today-list">${rowMarkup}</div></section><div class="preschool-flashcard-foot"><button class="workbench-text-button" type="button" data-action="flashcard-classic">更多资料</button></div></div>`;
    }

    function renderPreschoolSubjectTodayPage(course) {
        if (!course) return '';
        if (PRESCHOOL_FLASHCARD_COURSES.has(course.id)) return renderPreschoolCourseFlashcards(course);
        if (course.id === 'preschool-poetry') return renderPreschoolPoetryToday(course);
        if (course.id === 'preschool-exercise') return renderPreschoolBrowseCards(course);
        if (course.id === 'preschool-focus') return renderPreschoolFocusToday(course);
        if (course.id === 'preschool-summer') return renderPreschoolSummerToday(course);
        return '';
    }

    function markPreschoolFlashcard(known) {
        const session = ui.courseCards;
        if (!session || !Array.isArray(session.items) || session.index >= session.items.length) return;
        const item = session.items[session.index];
        session.revealed = session.revealed || {};
        if (!known && !session.revealed[item.key]) {
            session.revealed[item.key] = true;
            render();
            return;
        }
        const today = storage.localDate();
        if (session.courseId === 'preschool-literacy') {
            const engine = getLiteracyEngine();
            if (!engine || typeof engine.markFlash !== 'function') return;
            commit(function (next) {
                const current = next.courseProgress && next.courseProgress.literacy ? next.courseProgress.literacy : engine.createDefaultProgress();
                next.courseProgress = global.PersonalWorkbenchChildCourses.saveLiteracy(next.courseProgress, engine.markFlash(current, item.key, !!known, today, engine.getRuntimeRules()));
            }, '');
        } else if (session.courseId === 'preschool-english' || session.courseId === 'preschool-minecraft') {
            const engine = getEnglishVocabEngine();
            if (!engine || typeof engine.markKnown !== 'function') return;
            const isMc = session.courseId === 'preschool-minecraft';
            if (!known) {
                recordPreschoolLessonMistake({
                    subject: storage.subjectForCourse(isMc ? 'preschool-minecraft' : 'preschool-english'),
                    question: item.main + (item.rows && item.rows[0] ? ' · ' + item.rows[0].text : ''),
                    correctAnswer: item.rows && item.rows[1] ? item.rows[1].text : item.main,
                    mistakeReason: '翻卡点了不会',
                    sourceKey: (isMc ? 'minecraft:' : 'english:') + String(item.key || '').toLowerCase(),
                    lessonId: isMc ? 'preschool-minecraft-words-1' : 'preschool-english-words-1'
                });
            }
            commit(function (next) {
                const current = isMc
                    ? (next.courseProgress && next.courseProgress.minecraft ? next.courseProgress.minecraft : engine.createDefaultProgress())
                    : (next.courseProgress && next.courseProgress.english ? next.courseProgress.english : engine.createDefaultProgress());
                const marked = engine.markKnown(current, item.key, !!known, today, engine.getRuntimeRules());
                next.courseProgress = isMc
                    ? global.PersonalWorkbenchChildCourses.saveMinecraft(next.courseProgress, marked)
                    : global.PersonalWorkbenchChildCourses.saveEnglish(next.courseProgress, marked);
            }, '');
        } else {
            const trackName = PRESCHOOL_SUBJECT_TRACK[session.courseId];
            if (!trackName) return;
            commitPreschoolSubjectMark(trackName, [item.key], known);
        }
        session.marks[item.key] = known ? 'known' : 'unknown';
        resolveReviewOutcome(!!known);
        session.index += 1;
        render();
    }

    function commitPreschoolSubjectMark(trackName, keys, known) {
        const courses = global.PersonalWorkbenchChildCourses;
        if (!courses || typeof courses.saveSubject !== 'function' || !Array.isArray(keys) || !keys.length) return;
        const today = storage.localDate();
        commit(function (next) {
            const current = next.courseProgress && next.courseProgress[trackName] ? next.courseProgress[trackName] : { mastery: {} };
            if (known && typeof courses.markSubjectReady === 'function') {
                next.courseProgress = courses.saveSubject(next.courseProgress, trackName, courses.markSubjectReady(current, keys, today));
            } else if (!known) {
                const mastery = Object.assign({}, current.mastery || {});
                keys.forEach(function (key) {
                    const prev = mastery[key] || { state: 'introduced', dates: [], attempts: 0, correct: 0 };
                    mastery[key] = { state: 'practicing', dates: (Array.isArray(prev.dates) ? prev.dates : []).concat([today]), attempts: (Number(prev.attempts) || 0) + 1, correct: Number(prev.correct) || 0 };
                });
                next.courseProgress = courses.saveSubject(next.courseProgress, trackName, { mastery: mastery });
            }
        }, '');
    }

    function markPreschoolPoem(known) {
        const session = ui.courseCards;
        if (!session || session.courseId !== 'preschool-poetry' || !session.poemId) return;
        commitPreschoolSubjectMark('poetry', [session.poemId], known);
        session.marks[session.poemId] = known ? 'known' : 'unknown';
        render();
    }

    function markPreschoolMotionDone() {
        const session = ui.courseCards;
        if (!session || session.courseId !== 'preschool-exercise' || session.motionDone) return;
        const keys = session.items.map(function (item) { return item.key; });
        commitPreschoolSubjectMark('motion', keys, true);
        session.motionDone = true;
        render();
    }

    function renderPreschoolMenuLessonCover(course, lesson) {
        const sample = course && Array.isArray(course.samples) && course.samples[0] ? String(course.samples[0]).split(' ')[0] : '';
        if (course.id === 'preschool-literacy') return preschoolCardArt({ kind: 'literacy', text: sample || '山', char: sample || '山' });
        if (course.id === 'preschool-english') return preschoolCardArt({ kind: 'english', text: sample || 'hello', zh: '你好' });
        if (course.id === 'preschool-poetry') return preschoolCardArt({ kind: 'poetry', text: (lesson && lesson.title) || '古诗' });
        if (course.id === 'preschool-math') return preschoolCardArt({ kind: 'math', text: sample || '1+1', main: sample || '1+1', answer: 2 });
        if (course.id === 'preschool-pinyin') return preschoolCardArt({ kind: 'pinyin', text: sample || 'b', pinyinKind: 'initial' });
        if (course.id === 'preschool-phonics') return preschoolCardArt({ kind: 'phonics', text: sample || 'm' });
        if (course.id === 'preschool-focus') return renderPreschoolFocusGameArt(lesson);
        const iconName = (course && course.icon) || 'book-open';
        const assetName = preschoolAssetForIcon(iconName);
        return assetName ? preschoolAsset(assetName, lesson && lesson.title) : icon(iconName);
    }

    function isPreschoolMenuCoreLesson(lesson) {
        if (!lesson || !lesson.id) return false;
        if (/-day-\d+$/i.test(String(lesson.id))) return false;
        if (/^第\s*\d+\s*天/.test(String(lesson.meta || ''))) return false;
        return true;
    }

    function renderPreschoolCourseMenu(course) {
        const shortTitle = getPreschoolCourseShortTitle(course);
        const lessons = (Array.isArray(course.lessons) ? course.lessons : []).filter(isPreschoolMenuCoreLesson);
        const lessonCards = lessons.map(function (lesson) {
            return `<button class="preschool-media-card preschool-course-menu-card is-lesson" type="button" data-action="open-lesson" data-id="${escapeHtml(lesson.id)}"><span class="preschool-media-card-face"><span class="preschool-media-cover-wrap">${renderPreschoolMenuLessonCover(course, lesson)}</span><strong>${escapeHtml(lesson.title)}</strong><small>${escapeHtml(lesson.meta || lesson.tip || '点开练一练')}</small></span></button>`;
        }).join('');
        const extraCards = course.id === 'preschool-english'
            ? `<button class="preschool-media-card preschool-course-menu-card is-minecraft" type="button" data-action="navigate" data-page="courses" data-course-id="preschool-minecraft"><span class="preschool-media-card-face"><span class="preschool-media-cover-wrap"><span class="preschool-media-cover is-fallback">${icon('gamepad-2')}</span></span><strong>Minecraft 英语</strong><small>我的世界兴趣词，不进每日必修</small></span></button><button class="preschool-media-card preschool-course-menu-card is-mistakes" type="button" data-action="navigate" data-page="mistakes"><span class="preschool-media-card-face"><span class="preschool-media-cover-wrap"><span class="preschool-media-cover is-fallback">${icon('pencil')}</span></span><strong>去改错本</strong><small>不会的题，和家长一起看看</small></span></button>`
            : '';
        return `<div class="preschool-course-menu tone-${escapeHtml(course.tone || 'blue')}"><div class="preschool-flashcard-top"><button class="workbench-text-button" type="button" data-action="navigate" data-page="courses">${icon('arrow-left')}<span>卡片墙</span></button><strong>${escapeHtml(shortTitle)} · 更多练习</strong><span></span></div><div class="preschool-media-grid preschool-course-menu-grid">${lessonCards}${extraCards}</div><details class="preschool-course-parent-detail"><summary>家长看详情</summary>${renderPreschoolCourseCard(course, true)}</details></div>`;
    }

    function renderPreschoolCourseCard(course, focused) {
        return `<article class="preschool-course-card tone-${escapeHtml(course.tone || 'blue')} ${focused ? 'is-focused' : ''}"><div class="preschool-course-head">${preschoolVisual(course.icon || 'book-open', preschoolAssetForIcon(course.icon || 'book-open'), course.title)}<div><span class="preschool-course-label">${focused ? '当前学习专区' : '学习专区'}</span><h2>${escapeHtml(course.title)}</h2><small>${escapeHtml(course.description || '')}</small></div><strong>${course.completed || 0}/${course.total || 0}</strong></div>${renderPreschoolCourseProgress(course)}${renderPreschoolLevelBands(course)}${renderPreschoolLiteracyMastery(course)}${renderPreschoolEnglishMastery(course)}${renderPreschoolSubjectMastery(course)}<div class="preschool-course-reference"><span>${icon('sparkles')}</span><p class="preschool-course-note">${escapeHtml(course.note || '选一张卡，开始今天的小练习。')}</p></div>${renderPreschoolCourseBadges(course)}${renderPreschoolCourseSamples(course)}${renderPreschoolCourseMedia(course)}${renderPreschoolCourseResources(course)}${renderPreschoolSummerLibrary(course)}<div class="preschool-course-lesson-heading"><div><span class="eyebrow">LEARNING ROUTE</span><h3>一步一步点亮小路线</h3></div><span>${course.total || (course.lessons || []).length} 张练习卡</span></div>${renderPreschoolCourseRoute(course)}</article>`;
    }

    function renderPreschoolCourses() {
        const courses = getPreschoolCourses();
        const activeCourse = getPreschoolCourseById(ui.courseId);
        if (!activeCourse) {
            return `${renderPreschoolIntro(PAGE_META.courses, '', '', `<span class="tag lime">${courses.length} 个专区</span>`)}${renderPreschoolCoursesTodayCard()}<div class="preschool-course-wall" aria-label="学科卡片墙">${courses.map(function (course) { return renderPreschoolCourseWallCard(course); }).join('')}</div>${renderPreschoolCourseWallExtras(courses)}`;
        }
        if (activeCourse.id === 'preschool-focus') {
            return `${renderPreschoolIntro(PAGE_META.courses, '', '', `<span class="tag lime">${escapeHtml(activeCourse.title)}</span>`)}<div class="preschool-course-layout is-focused"><div class="preschool-course-content">${renderPreschoolFocusToday(activeCourse)}</div></div>`;
        }
        const tabs = renderPreschoolCourseTabs(activeCourse);
        let pane = '';
        if (ui.courseTab === 'media') {
            pane = renderPreschoolCourseMediaPane(activeCourse);
        } else if (ui.courseTab === 'menu' || ui.courseClassic) {
            pane = renderPreschoolCourseMenu(activeCourse);
        } else if (PRESCHOOL_TODAY_PAGE_COURSES.has(activeCourse.id)) {
            pane = renderPreschoolSubjectTodayPage(activeCourse) || renderPreschoolCourseMenu(activeCourse);
        } else {
            pane = renderPreschoolCourseMenu(activeCourse);
        }
        return `${renderPreschoolIntro(PAGE_META.courses, '', '', `<span class="tag lime">${escapeHtml(activeCourse.title)}</span>`)}${tabs}<div class="preschool-course-layout is-focused"><div class="preschool-course-content">${pane}</div></div>`;
    }

    function renderPreschoolMistakes() {
        const items = state.mistakes.slice().sort((a, b) => String(a.reviewDate || a.date).localeCompare(String(b.reviewDate || b.date)));
        return `${renderPreschoolIntro(PAGE_META.mistakes, 'add-mistake', '记下来')}<section class="preschool-mistake-card"><div class="preschool-section-head"><div><span class="eyebrow">TRY AGAIN</span><h2>${items.length ? '再试一次' : '还没有题'}</h2><p>${items.length ? '练习里选错的题会自动记在这里。' : '练习里选错或点不会，会自动记到这里。'}</p></div><span class="preschool-card-visual">${icon('triangle-alert')}</span></div>${items.length ? `<div class="preschool-mistake-list">${items.map(function (item) { return `<article class="preschool-mistake-row"><span class="preschool-card-visual">${icon(item.status === 'mastered' ? 'check' : 'pencil')}</span><div><strong>${escapeHtml(item.question)}</strong><small>${escapeHtml(item.subject || '学习')} · ${item.status === 'mastered' ? '会了' : '再看看'}${item.correctAnswer ? ' · 答案 ' + escapeHtml(item.correctAnswer) : ''}</small></div><button class="row-action" type="button" data-action="toggle-mistake" data-id="${escapeHtml(item.id)}" aria-label="标记${item.status === 'mastered' ? '未掌握' : '掌握'}" title="更新状态">${icon(item.status === 'mastered' ? 'rotate-ccw' : 'check')}</button></article>`; }).join('')}</div>` : renderEmpty('pencil', '练习里选错或点不会，会自动记到这里。')}</section>`;
    }

    function renderPreschoolRewards() {
        const growth = getChildGrowth();
        const rewards = getChildRewards();
        const unclaimed = rewards.filter(function (reward) { return !growth.claimedRewardIds.includes(reward.id); }).sort(function (a, b) { return Number(a.cost) - Number(b.cost); });
        const nextReward = unclaimed[0] || null;
        const sunlight = Math.max(0, Number(growth.sunlight) || 0);
        const nextCost = nextReward ? Math.max(1, Number(nextReward.cost) || 1) : 1;
        const nextRemaining = nextReward ? Math.max(0, nextCost - sunlight) : 0;
        const nextProgress = nextReward ? Math.min(100, Math.round((sunlight / nextCost) * 100)) : 100;
        const nextAsset = nextReward ? (preschoolAssetForIcon(nextReward.icon || 'gift') || 'small-crystal') : 'treasure-chest';
        const tiers = ['小奖励', '开心奖励', '亲子奖励', '特别奖励'].map(function (tier) {
            return { name: tier, items: rewards.filter(function (reward) { return (reward.tier || '开心奖励') === tier; }) };
        }).filter(function (group) { return group.items.length; });
        const tierDescriptions = { '小奖励': '马上就能兑现的小惊喜', '开心奖励': '完成几项任务，换一个快乐时刻', '亲子奖励': '和家长一起完成的约定', '特别奖励': '坚持一阵子后的大宝藏' };
        const tierMarkup = tiers.map(function (group, index) {
            return `<section class="preschool-reward-tier tier-${index}"><div class="preschool-reward-tier-head"><div><span class="eyebrow">TIER ${String(index + 1).padStart(2, '0')}</span><h2>${escapeHtml(group.name)}</h2><p>${escapeHtml(tierDescriptions[group.name] || '')}</p></div><span class="preschool-reward-tier-count">${group.items.length} 份</span></div><div class="preschool-reward-tier-grid">${group.items.map(function (reward) { const claimed = growth.claimedRewardIds.includes(reward.id); const remaining = Math.max(0, Number(reward.cost) - growth.sunlight); const disabled = claimed || remaining > 0; const assetName = preschoolAssetForIcon(reward.icon || 'gift') || 'treasure-chest'; return `<article class="preschool-reward-card tone-${escapeHtml(reward.tone || 'orange')} ${claimed ? 'is-claimed' : ''}">${preschoolVisual(reward.icon || 'gift', assetName, reward.title)}<h2>${escapeHtml(reward.title)}</h2><strong>${escapeHtml(reward.cost)} 阳光</strong><button class="btn-primary" type="button" data-action="claim-reward" data-id="${escapeHtml(reward.id)}" ${disabled ? 'disabled' : ''}>${icon(claimed ? 'check' : 'gift')}${claimed ? '已领' : remaining ? `还差 ${remaining}` : '领取'}</button></article>`; }).join('')}</div></section>`;
        }).join('');
        const progressMarkup = `<section class="preschool-reward-progress"><div class="preschool-reward-progress-copy"><span class="eyebrow">SUNLIGHT RUN</span><h2>${nextReward ? `下一站：${escapeHtml(nextReward.title)}` : '所有礼物都点亮啦'}</h2><p>${nextReward ? (nextRemaining ? `再收集 ${nextRemaining} 阳光，就能打开这份小期待。` : '现在就可以领取这份小期待。') : '继续完成小任务，阳光会留在你的花园里。'}</p><div class="preschool-reward-progress-meta"><strong>${sunlight} / ${nextReward ? nextCost : sunlight} 阳光</strong><span>${nextReward ? `${nextProgress}%` : '完成'}</span></div><div class="preschool-reward-meter" role="progressbar" aria-valuemin="0" aria-valuemax="${nextReward ? nextCost : sunlight || 1}" aria-valuenow="${Math.min(sunlight, nextCost)}" aria-label="阳光奖励进度"><span style="width:${nextProgress}%"></span></div></div><div class="preschool-reward-next"><span class="preschool-reward-next-art">${preschoolAsset(nextAsset, nextReward ? nextReward.title : '奖励')}</span><span class="preschool-reward-next-copy"><small>${nextReward ? '下一份奖励' : '奖励收藏'}</small><strong>${escapeHtml(nextReward ? nextReward.title : '花园宝藏')}</strong><em>${nextReward ? `${nextCost} 阳光` : '继续收集'}</em></span><span class="preschool-reward-crystal">${preschoolAsset('small-crystal', '阳光晶体')}</span></div><img class="preschool-reward-progress-art" src="${escapeHtml(preschoolAssetSrc('sun-progress-bar'))}" alt="" aria-hidden="true"></section>`;
        return `${renderPreschoolIntro(PAGE_META.rewards, '', '', `<span class="points-chip">${icon('sun')}${growth.sunlight}</span>`)}${progressMarkup}<div class="preschool-reward-tier-list">${tierMarkup}</div>${renderPreschoolCollection(growth)}`;
    }

    function renderPreschoolFamily() {
        const messages = familyRepository ? familyRepository.load().messages : [];
        return `${renderPreschoolIntro(PAGE_META.family, '', '', `<span class="tag lime">${messages.length} 条</span>`)}${
            renderPreschoolWeeklyAdventureReport({ forParent: true })
            }<section class="preschool-family-card"><div class="preschool-card-visual">${icon('message-circle-heart')}</div><h2>我想告诉家长</h2><form data-family-form><input type="hidden" name="author" value="小朋友"><input type="hidden" name="kind" value="child-share"><textarea name="body" maxlength="200" required placeholder="我今天会了……"></textarea><button class="btn-primary" type="submit">发出去${icon('send')}</button></form></section><section class="preschool-section"><div class="preschool-section-head"><div><span class="eyebrow">FAMILY</span><h2>家长说</h2></div></div><div class="preschool-family-feed">${messages.length ? messages.slice(0, 5).map(function (item) { return `<article><span class="preschool-card-visual">${icon(item.author === '家长' ? 'heart' : 'sparkles')}</span><div><strong>${escapeHtml(item.body)}</strong><small>${escapeHtml(item.author)}</small></div></article>`; }).join('') : renderEmpty('heart', '还没有留言')}</div></section>`;
    }

    function getPreschoolPlanMinutes(item) {
        const direct = Number(item && item.estimateMinutes);
        if (Number.isFinite(direct) && direct > 0) return direct;
        const planId = String(item && item.id || '');
        const taskId = planId.startsWith('preschool-plan-') ? planId.replace('preschool-plan-', 'preschool-task-') : '';
        const linkedTask = taskId && Array.isArray(state.tasks) ? state.tasks.find(entry => String(entry.id) === taskId) : null;
        const linkedMinutes = Number(linkedTask && linkedTask.estimateMinutes);
        return Number.isFinite(linkedMinutes) && linkedMinutes > 0 ? linkedMinutes : 10;
    }

    function renderPreschoolThemeBanner() {
        const theme = getPreschoolThemeConfig() || {};
        const themeId = getPreschoolThemeId();
        const bannerAsset = themeId === 'garden-defense' ? 'plant-sunflower' : themeId === 'voxel-adventure' ? 'voxel-companion' : 'platform-explorer';
        const decorations = themeId === 'voxel-adventure'
            ? [['voxel-block-tree', 'theme-banner-art-tree'], ['voxel-chest', 'theme-banner-art-chest'], ['voxel-purple-crystal', 'theme-banner-art-crystal']]
            : themeId === 'platform-quest'
                ? [['platform-coin', 'theme-banner-art-coin'], ['platform-brick', 'theme-banner-art-brick'], ['platform-pipe', 'theme-banner-art-pipe'], ['platform-flag', 'theme-banner-art-flag']]
                : [['plant-sunflower', 'theme-banner-art-sunflower'], ['plant-peashooter', 'theme-banner-art-peashooter']];
        const decorationMarkup = decorations.map(function (item) { return `<span class="theme-banner-art ${item[1]}">${preschoolAsset(item[0], '')}</span>`; }).join('');
        return `<section class="preschool-theme-banner" aria-label="${escapeHtml(theme.name || '主题冒险')}">
            <div class="preschool-theme-banner-copy"><span class="pixel-panel-kicker">${escapeHtml(theme.bannerKicker || 'ADVENTURE / READY')}</span><h2>${escapeHtml(theme.bannerTitle || '今天的冒险准备好了吗？')}</h2><p>${escapeHtml(theme.bannerDescription || '完成一小步，再去探索自己的小世界。')}</p></div>
            <div class="preschool-theme-banner-scene" aria-hidden="true"><span class="theme-banner-cloud cloud-a"></span><span class="theme-banner-cloud cloud-b"></span><span class="theme-banner-platform platform-a"></span><span class="theme-banner-platform platform-b"></span>${decorationMarkup}<span class="theme-banner-object">${preschoolAsset(bannerAsset, '')}</span></div>
        </section>`;
    }

    function getPreschoolHomeWorkflow(plans) {
        const todayPlans = Array.isArray(plans) ? plans : [];
        const playbook = getPreschoolThemePlaybook();
        const practiceDone = todayPlans.filter(function (item) {
            return item.done && item.completionSource === 'practice';
        }).slice().sort(function (a, b) {
            return String(b.completedAt || '').localeCompare(String(a.completedAt || ''));
        });
        const latestPractice = practiceDone[0] || null;
        const nextPracticePlan = todayPlans.find(function (item) {
            return !item.done && getPreschoolPlanPractice(item);
        });
        const leftover = todayPlans.find(function (item) { return !item.done; });
        if (nextPracticePlan) {
            return {
                kind: 'practice',
                title: nextPracticePlan.title,
                latestPracticeTitle: latestPractice ? latestPractice.title : '',
                action: 'open-plan-practice',
                planId: nextPracticePlan.id,
                planDate: nextPracticePlan.date,
                page: '',
                cta: '去练习'
            };
        }
        if (todayPlans.length && !leftover) {
            return {
                kind: 'game',
                title: playbook.exitGame,
                latestPracticeTitle: latestPractice ? latestPractice.title : '',
                action: playbook.worldGameHref ? 'open-world-game' : 'navigate',
                planId: '',
                planDate: '',
                page: 'battle',
                cta: playbook.exitGame
            };
        }
        if (leftover) {
            return {
                kind: 'rest',
                title: leftover.title,
                latestPracticeTitle: latestPractice ? latestPractice.title : '',
                action: 'navigate',
                planId: '',
                planDate: '',
                page: 'plans',
                cta: '看任务'
            };
        }
        return {
            kind: 'empty',
            title: '今天还没有可练习的任务',
            latestPracticeTitle: '',
            action: 'add-plan',
            planId: '',
            planDate: '',
            page: '',
            cta: '安排一项'
        };
    }

    function preschoolWorkflowActionAttrs(workflow) {
        if (workflow.action === 'open-plan-practice') {
            return `data-action="open-plan-practice" data-id="${escapeHtml(workflow.planId)}" data-date="${escapeHtml(workflow.planDate)}"`;
        }
        if (workflow.action === 'open-world-game') {
            return 'data-action="open-world-game"';
        }
        if (workflow.action === 'navigate') {
            return `data-action="navigate" data-page="${escapeHtml(workflow.page)}"`;
        }
        if (workflow.action === 'add-plan') {
            return 'data-action="add-plan"';
        }
        return 'disabled';
    }

    function renderPreschoolHomeIdentity(derived, growth) {
        const level = Number(growth.level) || 1;
        const companionName = growth.unicorn && growth.unicorn.name ? growth.unicorn.name : '星芒';
        return `<button class="preschool-home-identity preschool-home-companion-tile" type="button" data-action="navigate" data-page="growth" aria-label="${escapeHtml(companionName)}，查看成长">
            <span class="preschool-home-identity-art">${preschoolAsset('star-companion', companionName)}</span>
            <strong>${escapeHtml(companionName)}</strong>
            <small>Lv.${level}</small>
        </button>`;
    }

    function renderPreschoolHomeHero(plans) {
        const workflow = getPreschoolHomeWorkflow(plans);
        const theme = getPreschoolThemeConfig() || {};
        const themeId = getPreschoolThemeId();
        const heroAsset = themeId === 'garden-defense' ? 'plant-sunflower' : themeId === 'voxel-adventure' ? 'voxel-companion' : 'platform-explorer';
        const kicker = workflow.kind === 'practice' ? '现在就做' : workflow.kind === 'game' ? '去玩' : '今天';
        const heading = escapeHtml(workflow.title);
        const desc = theme.bannerDescription || '完成一小步，收集阳光，再去守护自己的花园。';
        const evidenceLine = workflow.latestPracticeTitle
            ? `已完成练习：${escapeHtml(workflow.latestPracticeTitle)}`
            : (workflow.kind === 'practice' ? '答对后留下练习证据' : '');
        const actionIcon = workflow.kind === 'practice' ? 'play-circle' : workflow.kind === 'game' ? 'swords' : workflow.kind === 'empty' ? 'plus' : 'flag';
        return `<section class="preschool-home-hero" aria-label="现在就做">
            <button class="preschool-home-hero-card is-${escapeHtml(workflow.kind)}" type="button" ${preschoolWorkflowActionAttrs(workflow)}>
                <div class="preschool-home-hero-copy"><small>${kicker}</small><strong>${heading}</strong><p>${escapeHtml(desc)}</p>${evidenceLine ? `<em>${evidenceLine}</em>` : ''}<span>${icon(actionIcon)}${escapeHtml(workflow.cta)}</span></div>
                <span class="preschool-home-hero-art">${preschoolAsset(heroAsset, '')}</span>
            </button>
        </section>`;
    }

    function renderPreschoolHomeRhythm(derived) {
        const days = derived.week.map(function (date) {
            const plans = state.dailyPlans.filter(item => item.date === date);
            const done = plans.filter(item => item.done).length;
            const hasEvidence = done > 0 || state.focusSessions.some(item => item.date === date) || state.readingLogs.some(item => item.date === date);
            const tone = date === derived.today ? 'today' : plans.length === 0 ? 'empty' : done === plans.length ? 'complete' : hasEvidence ? 'progress' : 'planned';
            const mark = date === derived.today ? `${done}/${plans.length || 0}` : done ? `${done}` : '·';
            return `<span class="preschool-home-rhythm-day is-${tone}" title="${escapeHtml(date)}：完成 ${done} 项"><small>${escapeHtml(dateLabel(date).replace('周', ''))}</small><b>${escapeHtml(date.slice(8))}</b><i>${mark}</i></span>`;
        }).join('');
        return `<div class="preschool-home-rhythm" aria-label="最近七天学习节奏"><div class="preschool-home-rhythm-copy"><span class="pixel-panel-kicker">WEEKLY RHYTHM</span><strong>最近 7 天的学习节奏</strong><small>每完成一天，就为花园点亮一面小旗子。</small></div><div class="preschool-home-rhythm-days">${days}</div></div>`;
    }

    function renderPreschoolHomeEvidence(derived, growth) {
        const todayReading = state.readingLogs.filter(item => item.date === derived.today).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))[0];
        const completedIds = new Set(state.courseProgress && Array.isArray(state.courseProgress.completedLessonIds) ? state.courseProgress.completedLessonIds : []);
        const next = getNextPreschoolLesson();
        const done = derived.completedPlans;
        const total = derived.todayPlans.length;
        const practiceDone = derived.todayPlans.filter(item => item.done && item.completionSource === 'practice').length;
        const nextRoute = next ? ` data-course-id="${escapeHtml(next.course.id)}"` : '';
        return `<section class="preschool-home-evidence" aria-label="学习证据与下一步"><div class="preschool-home-evidence-head"><div><span class="pixel-panel-kicker">LEARNING EVIDENCE</span><h2>今天留下了什么</h2><p>完成一项，就留下一个看得见的成长证据；当前连续 ${growth.streak || 0} 天。</p></div><button class="workbench-text-button" type="button" data-action="navigate" data-page="plans">看全部任务${icon('arrow-up-right')}</button></div><div class="preschool-home-evidence-grid"><article class="preschool-home-evidence-card tone-green"><span class="preschool-home-evidence-icon">${icon('check-check')}</span><div><strong>${done}/${total || 0} 项已点亮</strong><small>${total ? `今日进度 ${Math.round((done / total) * 100)}% · 练习证据 ${practiceDone} 张` : '先安排今天的第一步'}</small></div></article><article class="preschool-home-evidence-card tone-blue"><span class="preschool-home-evidence-icon">${icon('book-open')}</span><div><strong>${todayReading ? escapeHtml(todayReading.title) : '还没有今日阅读记录'}</strong><small>${todayReading ? `${todayReading.minutes || 0} 分钟 · ${todayReading.pages || 0} 页` : '读完后留下一个词或一句话'}</small></div></article><button class="preschool-home-evidence-card tone-gold is-action" type="button" data-action="navigate" data-page="courses"${nextRoute}><span class="preschool-home-evidence-icon">${icon(next ? 'play-circle' : 'badge-check')}</span><div><strong>${next ? `下一张：${escapeHtml(next.lesson.title)}` : '学习路线已点亮'}</strong><small>${next ? `${escapeHtml(next.course.title)} · ${next.lesson.minutes || 10} 分钟` : `${completedIds.size} 张练习卡已完成`}</small></div><span class="preschool-home-evidence-arrow">${icon('arrow-up-right')}</span></button></div></section>`;
    }

    function renderPreschoolHomeBattlefield(plans, defense) {
        const playbook = getPreschoolThemePlaybook();
        const lanePlants = playbook.lanePlants || ['plant-sunflower', 'plant-peashooter', 'plant-wallnut'];
        const completed = plans.filter(function (item) { return item.done; }).length;
        const requiredPlans = plans.filter(function (item) { return item.required === true; });
        const optionalPlans = plans.filter(function (item) { return item.required !== true; });
        const plannedMinutes = plans.reduce((sum, item) => sum + getPreschoolPlanMinutes(item), 0);
        const invader = defense && defense.invader ? defense.invader : { active: false };
        const nextOpen = plans.find(function (item) { return !item.done; });
        const nextOpenId = nextOpen ? nextOpen.id : '';
        const reviewDue = getDueMistakeReviews();
        const reviewBanner = reviewDue.length
            ? `<button class="preschool-home-review" type="button" data-action="open-review-practice"><small>错题回流</small><strong>今天复习 ${reviewDue.length} 题</strong><span>${icon('rotate-ccw')}去练习</span></button>`
            : '';
        const lanes = plans.map(function (item, index) {
            const done = Boolean(item.done);
            const plantAsset = lanePlants[index % lanePlants.length];
            const isNow = !done && item.id === nextOpenId;
            const courseId = getPreschoolPlanCourseId(item);
            const practiceBtn = preschoolHomeLanePracticeButton(item);
            return `<article class="preschool-home-lane ${done ? 'is-done' : ''} ${item.required === true ? 'is-required' : 'is-optional'}${practiceBtn ? '' : ' main-only'}${isNow ? ' is-now' : ''}">
                <button class="preschool-home-lane-main" type="button" data-action="${courseId ? 'open-plan-course' : 'toggle-plan'}" data-id="${escapeHtml(item.id)}" data-date="${escapeHtml(item.date)}" ${courseId ? `data-course-id="${escapeHtml(courseId)}"` : ''} aria-label="${courseId ? '去学习' : (done ? '取消完成' : '完成')}${escapeHtml(item.title)}">
                    <span class="preschool-home-lane-characters"><span class="preschool-home-lane-plant">${preschoolAsset(plantAsset, '伙伴')}</span></span>
                    <span class="preschool-home-lane-copy"><small>${item.hint || (item.required === true ? '必做' : '选做')}</small><strong>${escapeHtml(item.title)}</strong></span>
                    <span class="preschool-home-lane-status">${courseId ? '去学习' : (done ? `${icon('check')} 已点亮` : `${preschoolAsset('sun-token', playbook.currency)} +10`)}</span>
                </button>
                ${practiceBtn}
                <button class="preschool-home-lane-check" type="button" data-action="toggle-plan" data-id="${escapeHtml(item.id)}" data-date="${escapeHtml(item.date)}" aria-label="${done ? '取消点亮' : '点亮'}${escapeHtml(item.title)}">${done ? `${icon('check')} 已点亮` : `${preschoolAsset('sun-token', playbook.currency)} 点亮`}</button>
            </article>`;
        }).join('');
        return `<section class="preschool-home-battlefield" data-defense-state="${invader.active ? 'active' : 'ready'}" aria-label="今天的任务">
            <div class="preschool-home-battlefield-head"><div><span class="pixel-panel-kicker">${escapeHtml(playbook.homeKicker)}</span><h2>今天的任务</h2><p>点开去学习，回来再点亮</p></div><strong>${completed}/${plans.length || 0}</strong><button class="preschool-home-battlefield-add" type="button" data-action="navigate" data-page="plans" aria-label="打开任务清单">${icon('plus')}<span>管理任务</span></button></div>
            <div class="preschool-home-task-overview" aria-label="今日任务概览"><span class="preschool-home-task-stat is-required"><small>必做任务</small><b>${requiredPlans.filter(item => item.done).length}/${requiredPlans.length}</b></span><span class="preschool-home-task-stat is-optional"><small>选做挑战</small><b>${optionalPlans.filter(item => item.done).length}/${optionalPlans.length}</b></span><span class="preschool-home-task-stat is-time"><small>计划用时</small><b>${plannedMinutes} 分钟</b></span></div>
            ${reviewBanner}
            <div class="preschool-home-lanes">${lanes}</div>
            <div class="preschool-home-battlefield-foot"><span>${icon(invader.active ? 'alert-triangle' : 'shield-check')} ${invader.active ? `${escapeHtml(preschoolInvaderProfile(invader).title)}${escapeHtml(playbook.homeFootActive)}` : escapeHtml(playbook.homeFootReady)}</span><small>${escapeHtml(playbook.homeFootNote)}</small></div>
        </section>`;
    }

    function renderPreschoolHomeWorkflowCard(plans) {
        const workflow = getPreschoolHomeWorkflow(plans);
        const heading = workflow.kind === 'practice' ? `下一步：${escapeHtml(workflow.title)}` : escapeHtml(workflow.title);
        const kicker = workflow.kind === 'practice' ? '下一步' : workflow.kind === 'game' ? '去玩' : '今天';
        const evidenceLine = workflow.latestPracticeTitle
            ? `已完成练习：${escapeHtml(workflow.latestPracticeTitle)}`
            : (workflow.kind === 'practice' ? '答对后留下练习证据' : '');
        const actionIcon = workflow.kind === 'practice' ? 'play-circle' : workflow.kind === 'game' ? 'swords' : workflow.kind === 'empty' ? 'plus' : 'flag';
        let actionAttrs = 'disabled';
        if (workflow.action === 'open-plan-practice') {
            actionAttrs = `data-action="open-plan-practice" data-id="${escapeHtml(workflow.planId)}" data-date="${escapeHtml(workflow.planDate)}"`;
        } else if (workflow.action === 'open-world-game') {
            actionAttrs = 'data-action="open-world-game"';
        } else if (workflow.action === 'navigate') {
            actionAttrs = `data-action="navigate" data-page="${escapeHtml(workflow.page)}"`;
        } else if (workflow.action === 'add-plan') {
            actionAttrs = 'data-action="add-plan"';
        }
        return `<section class="preschool-home-workflow" aria-label="今天要做的事"><button class="preschool-home-workflow-card is-${escapeHtml(workflow.kind)}" type="button" ${actionAttrs}><small>${kicker}</small><strong>${heading}</strong>${evidenceLine ? `<em>${evidenceLine}</em>` : ''}<span>${icon(actionIcon)}${escapeHtml(workflow.cta)}</span></button></section>`;
    }

    function renderPreschoolHomeOverview(derived) {
        const growth = getChildGrowth();
        const plans = derived.todayPlans;
        const done = plans.filter(item => item.done).length;
        const defense = getPreschoolDefense(growth);
        return `<div class="pixel-home workbench-overview preschool-home-overview is-simple">
            <section class="pixel-page-header workbench-overview-header"><div><span class="pixel-panel-kicker workbench-kicker">TODAY / WORKBENCH</span><h1>今天先做这一步</h1><p><span class="preschool-home-date">${escapeHtml(derived.today)} · ${escapeHtml(dateLabel(derived.today))}</span> · ${done}/${plans.length || 0} 项已完成</p></div><div class="pixel-header-actions workbench-overview-actions"><span class="pixel-hud-sun">${preschoolAsset('sun-token', '阳光')}<strong>${growth.sunlight}</strong></span><span class="pixel-hud-defense"><span class="pixel-hud-defense-art">${preschoolAsset('player-energy-bars', '豌豆能量')}</span><strong>${defense.energy}</strong><span>能量</span></span><button class="pixel-settings-button" type="button" data-action="navigate" data-page="account" aria-label="打开设置" title="打开设置">${icon('settings-2')}</button></div></section>
            <div class="preschool-home-top">
                ${renderPreschoolHomeHero(plans)}
                ${renderPreschoolHomeIdentity(derived, growth)}
            </div>
            ${renderPreschoolHomeBattlefield(plans, defense)}
            <div class="preschool-home-exits" aria-label="冒险出口"><button class="workbench-action-button" type="button" ${getPreschoolThemePlaybook().worldGameHref ? 'data-action="open-world-game"' : 'data-action="navigate" data-page="battle"'}>${icon('swords')} ${escapeHtml(getPreschoolThemePlaybook().exitGame)}</button><button class="workbench-secondary-button" type="button" data-action="navigate" data-page="rewards">${icon('gift')} 去领奖励</button></div>
        </div>`;
    }

    function renderPreschoolPage(derived) {
        if (ui.page === 'overview') return renderPreschoolHomeOverview(derived);
        if (ui.page === 'calendar') return renderPreschoolCalendar(derived);
        if (ui.page === 'battle') return renderPreschoolBattle();
        if (ui.page === 'growth') return renderPreschoolGrowth();
        if (ui.page === 'plans') return renderPreschoolPlans(derived);
        if (ui.page === 'courses') return renderPreschoolCourses();
        if (ui.page === 'mistakes') return renderPreschoolMistakes();
        if (ui.page === 'rewards') return renderPreschoolRewards();
        if (ui.page === 'family') return renderPreschoolFamily();
        if (ui.page === 'account') return renderAccount();
        return renderPreschoolHomeOverview(derived);
    }

    function renderMetric(label, value, meta, iconName, tone) {
        return `<article class="metric-card"><div class="metric-card-top"><span>${label}</span>${icon(iconName)}</div><div class="metric-value">${value}</div><div class="metric-meta ${tone || ''}">${meta}</div></article>`;
    }

    function getChildRewards() {
        return Array.isArray(workbenchConfig.childRewards) ? workbenchConfig.childRewards : [];
    }

    function getChildGrowth() {
        if (isChild && global.PersonalWorkbenchChildGrowth && typeof global.PersonalWorkbenchChildGrowth.getView === 'function') {
            const view = global.PersonalWorkbenchChildGrowth.getView(state.growth, storage.localDate());
            const gardenView = isPreschool && preschoolGarden && typeof preschoolGarden.getView === 'function'
                ? preschoolGarden.getView(state.growth, storage.localDate())
                : null;
            const garden = gardenView ? Object.assign({}, gardenView.garden, {
                activePlant: gardenView.activePlant,
                plants: gardenView.plants,
                collection: gardenView.collection,
                invaderActive: gardenView.invaderActive
            }) : null;
            return Object.assign(view, { sunlight: view.sunlight, level: view.petLevel, levelProgress: view.petXp % 100, garden: garden, collection: garden ? garden.collection : null });
        }
        const growth = state.growth || {};
        const sunlight = Math.max(0, Number(growth.sunlight) || 0);
        return {
            sunlight: sunlight,
            level: Math.floor(sunlight / 100) + 1,
            levelProgress: sunlight % 100,
            claimedRewardIds: Array.isArray(growth.claimedRewardIds) ? growth.claimedRewardIds : []
        };
    }

    function renderChildGrowthCard(growth) {
        const nextLevelRemaining = 100 - growth.levelProgress;
        const available = getChildRewards().filter(item => !growth.claimedRewardIds.includes(item.id));
        const nextReward = available[0];
        return `<section class="child-growth-card"><div class="child-growth-main"><div class="work-card-header"><div><span class="eyebrow">SUNLIGHT / GROWTH</span><h2>你的成长能量正在变亮</h2><p>每完成一件真实的小事，就为自己积累一束阳光。</p></div><span class="points-chip">${icon('sun')}${growth.sunlight} 阳光</span></div><div class="growth-meter"><span style="width:${growth.levelProgress}%"></span></div><div class="growth-meter-meta"><span>距离成长等级 ${growth.level + 1} 还差 ${nextLevelRemaining} 阳光</span><strong>LEVEL ${growth.level}</strong></div></div><div class="child-growth-side"><span class="growth-side-label">下一个期待</span><strong>${nextReward ? escapeHtml(nextReward.title) : '所有奖励都已点亮'}</strong><small>${nextReward ? `${nextReward.cost} 阳光可兑换` : '继续保留你的好习惯'}</small><button class="btn-secondary" type="button" data-action="navigate" data-page="rewards">打开奖励中心${icon('arrow-up-right')}</button></div></section>`;
    }

    function renderRewards() {
        const growth = getChildGrowth();
        const rewards = getChildRewards();
        return `${renderIntro(PAGE_META.rewards, '', '', `<span class="points-chip">${icon('sun')}${growth.sunlight} 阳光</span>`)}<section class="reward-summary"><div><span class="eyebrow">YOUR REWARD BALANCE</span><h2>把坚持换成一个真实的期待</h2><p>奖励由你和家人一起约定，领取后记得在线下完成它。</p></div><div class="reward-level"><span>当前成长等级</span><strong>LEVEL ${growth.level}</strong></div></section><div class="reward-grid">${rewards.map(function (reward) {
            const claimed = growth.claimedRewardIds.includes(reward.id);
            const remaining = Math.max(0, Number(reward.cost) - growth.sunlight);
            const disabled = claimed || remaining > 0;
            const label = claimed ? '已领取' : remaining > 0 ? `还需 ${remaining} 阳光` : '领取奖励';
            return `<article class="reward-card ${claimed ? 'is-claimed' : ''}"><div class="reward-card-top"><span class="list-card-mark ${escapeHtml(reward.tone || 'orange')}">${icon(reward.icon || 'gift')}</span><span class="reward-cost">${escapeHtml(reward.cost)} 阳光</span></div><h3>${escapeHtml(reward.title)}</h3><p>${escapeHtml(reward.description)}</p><button class="btn-primary reward-action" type="button" data-action="claim-reward" data-id="${escapeHtml(reward.id)}" ${disabled ? 'disabled' : ''}>${icon(claimed ? 'check' : 'gift')}${label}</button></article>`;
        }).join('')}</div>`;
    }

    function getChildCourseViews() {
        const catalog = Array.isArray(workbenchConfig.childCourses) ? workbenchConfig.childCourses : [];
        const progress = state.courseProgress || { completedLessonIds: [] };
        if (global.PersonalWorkbenchChildCourses && typeof global.PersonalWorkbenchChildCourses.getCourseView === 'function') {
            return global.PersonalWorkbenchChildCourses.getCourseView(catalog, progress);
        }
        return catalog.map(function (course) {
            const lessons = Array.isArray(course.lessons) ? course.lessons : [];
            return Object.assign({}, course, { completed: 0, total: lessons.length, percent: 0 });
        });
    }

    function renderChildPlanRows(items, emptyText) {
        if (!items.length) return `<div class="child-plan-empty">${icon('sparkles')}<span>${escapeHtml(emptyText)}</span></div>`;
        return `<div class="child-plan-list">${items.map(function (item, index) {
            const done = Boolean(item.done);
            const tone = CATEGORY_COLORS[item.category] || 'blue';
            return `<div class="child-plan-item ${done ? 'is-done' : ''}"><button class="child-plan-check ${done ? 'is-done' : ''}" type="button" data-action="toggle-plan" data-id="${escapeHtml(item.id)}" data-date="${escapeHtml(item.date)}" aria-label="${done ? '取消完成' : '完成'}${escapeHtml(item.title)}">${done ? icon('check') : `<span>${index + 1}</span>`}</button><span class="child-plan-icon ${tone}">${icon(item.category === '阅读' ? 'book-open' : item.category === '运动' ? 'footprints' : item.category === '自控' ? 'heart' : 'book-check')}</span><span class="child-plan-copy"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.category || '学习')} · ${done ? '已完成，阳光已到账' : '完成后获得 10 阳光'}</small></span><span class="child-plan-state">${done ? icon('badge-check') : icon('arrow-right')}</span></div>`;
        }).join('')}</div>`;
    }

    function renderChildCourseMap(courseViews) {
        const areas = [
            { id: 'chinese', title: '语文知识森林', hint: '阅读 · 表达 · 文字', icon: 'book-open', tone: 'orange', target: 'courses' },
            { id: 'math', title: '数学数字岛', hint: '口算 · 图形 · 应用', icon: 'calculator', tone: 'blue', target: 'courses' },
            { id: 'english', title: '英语探索湾', hint: '词卡 · 句子 · 听说', icon: 'languages', tone: 'lime', target: 'courses' },
            { id: 'science', title: '科学发现站', hint: '观察 · 提问 · 动手', icon: 'telescope', tone: 'gold', target: 'tasks' }
        ];
        return `<div class="child-map-grid">${areas.map(function (area) {
            const course = courseViews.find(item => item.id === area.id);
            const percent = course ? Number(course.percent || 0) : 0;
            const status = percent >= 100 ? '已点亮' : percent > 0 ? '进行中' : course ? '待开始' : '探索支线';
            const progress = course ? `${course.completed || 0}/${course.total || 0} 小课节` : '先完成一项任务解锁';
            const courseId = course ? ` data-course-id="${escapeHtml(course.id)}"` : '';
            return `<button class="child-map-zone tone-${area.tone} ${percent >= 100 ? 'is-lit' : ''}" type="button" data-action="navigate" data-page="${area.target}"${courseId}><span class="child-map-zone-art">${icon(area.icon)}</span><span class="child-map-zone-copy"><strong>${area.title}</strong><small>${area.hint}</small><span class="child-map-zone-progress"><i style="width:${percent}%"></i></span><em>${status} · ${progress}</em></span><span class="child-map-zone-arrow">${icon('arrow-up-right')}</span></button>`;
        }).join('')}</div>`;
    }

    function renderChildEvidenceCard(derived, courseViews) {
        const progress = state.courseProgress || { completedLessonIds: [] };
        const completedIds = new Set(Array.isArray(progress.completedLessonIds) ? progress.completedLessonIds : []);
        let nextCourse = null;
        let nextLesson = null;
        courseViews.some(function (course) {
            const lesson = (Array.isArray(course.lessons) ? course.lessons : []).find(item => !completedIds.has(item.id));
            if (!lesson) return false;
            nextCourse = course;
            nextLesson = lesson;
            return true;
        });
        const latestReading = state.readingLogs.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
        return `<section class="child-evidence-card"><div class="child-card-heading"><div><span class="eyebrow">LEARNING EVIDENCE</span><h2>今天留下了什么</h2></div><button class="btn-quiet" type="button" data-action="navigate" data-page="reading">看记录${icon('chevron-right')}</button></div><div class="child-evidence-list"><div class="child-evidence-row"><span class="child-evidence-mark orange">${icon('check-check')}</span><span><strong>${derived.completedPlans} 项已点亮</strong><small>${derived.todayPlans.length ? `今日进度 ${Math.round((derived.completedPlans / derived.todayPlans.length) * 100)}%` : '先安排一项小行动'}</small></span></div><div class="child-evidence-row"><span class="child-evidence-mark blue">${icon('book-open')}</span><span><strong>${latestReading ? escapeHtml(latestReading.title) : '还没有今日阅读记录'}</strong><small>${latestReading ? `${latestReading.minutes || 0} 分钟 · ${latestReading.pages || 0} 页` : '读完后记下一句话或一个问题'}</small></span></div><div class="child-evidence-row"><span class="child-evidence-mark lime">${icon(nextLesson ? 'play-circle' : 'badge-check')}</span><span><strong>${nextLesson ? `下一节：${escapeHtml(nextLesson.title)}` : '语数英小课都完成啦'}</strong><small>${nextLesson ? `${escapeHtml(nextCourse.title)} · ${nextLesson.minutes || 0} 分钟` : '可以去奖励中心选一个期待'}</small></span>${nextLesson ? `<button class="row-action" type="button" data-action="navigate" data-page="courses" data-course-id="${escapeHtml(nextCourse.id)}" aria-label="打开${escapeHtml(nextCourse.title)}" title="打开课程">${icon('arrow-up-right')}</button>` : ''}</div></div></section>`;
    }

    function renderChildAdventureHome(derived) {
        const todayPlans = derived.todayPlans;
        const corePlans = derived.todayCorePlans.length ? derived.todayCorePlans : todayPlans.slice(0, 3);
        const optionalPlans = derived.todayCorePlans.length ? derived.todayOptionalPlans : todayPlans.slice(3);
        const coreDone = corePlans.filter(item => item.done).length;
        const optionalDone = optionalPlans.filter(item => item.done).length;
        const nextPlan = corePlans.find(item => !item.done) || optionalPlans.find(item => !item.done);
        const growth = getChildGrowth();
        const courseViews = getChildCourseViews();
        const levelProgress = clamp(growth.levelProgress || 0, 0, 100);
        const nextReward = getChildRewards().find(item => !growth.claimedRewardIds.includes(item.id));
        return `<div class="child-adventure-home"><section class="child-adventure-layout"><div class="child-adventure-main"><section class="child-welcome-banner"><div><span class="eyebrow">TODAY / ADVENTURE BASE</span><h1>今天，先完成三件小事</h1><p>${nextPlan ? `下一步是“${escapeHtml(nextPlan.title)}”。做完真实的学习，再去看看你的成长地图。` : '今天的核心任务已经完成，可以把时间交给阅读、休息或奖励。'}</p></div><button class="btn-primary" type="button" data-action="add-plan">安排下一项${icon('plus')}</button></section><article class="child-identity-card"><div class="child-identity-avatar"><span>${escapeHtml(workbenchConfig.current && workbenchConfig.current.avatar ? workbenchConfig.current.avatar : '星')}</span><i>${icon('sparkles')}</i></div><div class="child-identity-copy"><span class="eyebrow">YOUR ADVENTURE PROFILE</span><h2>小小探索家 · LV.${growth.level}</h2><p>连续行动 ${growth.streak || 0} 天 · ${growth.unicorn ? escapeHtml(growth.unicorn.name) : '星芒'} 陪你一起成长</p><div class="child-level-progress"><span style="width:${levelProgress}%"></span></div><small>再积累 ${Math.max(0, 100 - levelProgress)} 点成长经验，点亮下一级</small></div><div class="child-identity-stats"><strong>${growth.sunlight || 0}</strong><span>阳光</span><strong>${growth.petXp || 0}</strong><span>成长经验</span></div></article><section class="child-plan-board"><div class="child-card-heading"><div><span class="eyebrow">TODAY'S QUESTS</span><h2>今日冒险任务</h2><p>必做先完成，选做按自己的节奏来。</p></div><div class="child-plan-summary"><strong>${coreDone}/${corePlans.length || 0}</strong><span>核心完成</span></div></div><div class="child-plan-section"><div class="child-plan-section-title"><span class="child-section-dot orange"></span><strong>必做任务</strong><span>${corePlans.length ? `${coreDone}/${corePlans.length}` : '待安排'}</span></div>${renderChildPlanRows(corePlans, '还没有核心任务，先安排今天的第一步。')}</div><details class="child-optional-fold"><summary><span class="child-section-dot blue"></span><strong>选做挑战</strong><span>${optionalDone}/${optionalPlans.length || 0}</span><i>${icon('chevron-down')}</i></summary><div class="child-plan-section-content">${renderChildPlanRows(optionalPlans, '完成核心任务后，可以安排一项轻松挑战。')}</div></details></section></div><aside class="child-adventure-aside"><section class="child-growth-map"><div class="child-card-heading"><div><span class="eyebrow">GROWTH MAP</span><h2>成长地图</h2><p>每一次真实行动，都会点亮一个区域。</p></div><button class="btn-quiet" type="button" data-action="navigate" data-page="growth">打开地图${icon('arrow-up-right')}</button></div>${renderChildCourseMap(courseViews)}</section>${renderChildEvidenceCard(derived, courseViews)}<section class="child-reward-peek"><div class="child-reward-peek-art">${icon('gift')}</div><div><span class="eyebrow">NEXT REWARD</span><strong>${nextReward ? escapeHtml(nextReward.title) : '全部奖励已点亮'}</strong><small>${nextReward ? `还需要 ${Math.max(0, Number(nextReward.cost) - Number(growth.sunlight || 0))} 阳光` : '继续保留自己的节奏'}</small></div><button class="row-action" type="button" data-action="navigate" data-page="rewards" aria-label="打开奖励中心" title="打开奖励中心">${icon('arrow-up-right')}</button></section></aside></section></div>`;
    }

    function renderOverview(derived) {
        if (isChild && !isPreschool) return renderChildAdventureHome(derived);
        const todayPercent = derived.todayPlans.length ? Math.round((derived.completedPlans / derived.todayPlans.length) * 100) : 0;
        const nextTask = state.tasks.find(item => item.status !== 'done' && Number(item.progress) < 100) || state.tasks[0];
        const goalProgress = state.goals.reduce((sum, item) => sum + Number(item.progress || 0), 0) / Math.max(1, state.goals.length);
        const growth = getChildGrowth();
        const metrics = isChild
            ? `${renderMetric('今日阳光', `${growth.sunlight}`, '完成行动会增加', 'sun', 'positive')}${renderMetric('今日完成率', `${todayPercent}%`, `${derived.completedPlans}/${derived.todayPlans.length || 0} 项已点亮`, 'circle-check', todayPercent >= 60 ? 'positive' : '')}${renderMetric('连续行动', `${derived.streak} 天`, derived.streak ? '稳定比冲刺重要' : '从今天开始', 'flame', derived.streak ? 'positive' : '')}${renderMetric('本周阅读', formatDuration(derived.weekReading), `${state.readingLogs.filter(item => derived.week.includes(item.date)).length} 条记录`, 'book-open', '')}`
            : `${renderMetric('本周专注', formatDuration(derived.weekFocus), '把时间留给重要的事', 'clock-3', derived.weekFocus ? 'positive' : '')}${renderMetric('已完成任务', `${derived.completedTasks} 项`, '持续推进就算进步', 'circle-check', derived.completedTasks ? 'positive' : '')}${renderMetric('连续行动', `${derived.streak} 天`, derived.streak ? '稳定比冲刺重要' : '从今天开始', 'sun', derived.streak ? 'positive' : '')}${renderMetric('本周阅读页', `${derived.weekPages} 页`, `${state.readingLogs.filter(item => derived.week.includes(item.date)).length} 条记录`, 'book-marked', '')}`;
        return `${renderIntro(PAGE_META.overview, 'add-plan', '添加今日计划', `<button class="btn-secondary" type="button" data-action="open-focus">${icon('clock-3')}记录专注</button>`)}
            <article class="focus-card">
                <div class="focus-card-copy">
                    <span class="eyebrow">TODAY'S MAINLINE</span>
                    <h2>${nextTask ? escapeHtml(nextTask.title) : '从今天的第一步开始'}</h2>
                    <p>${nextTask ? `预计 ${nextTask.estimateMinutes || 25} 分钟 · ${escapeHtml(nextTask.category || '其它')} · ${formatDate(nextTask.dueDate)}` : '先写下一个小而清楚的行动。'}</p>
                    <div class="focus-progress-row"><div class="progress-track"><span style="width:${clamp(nextTask ? nextTask.progress : todayPercent, 0, 100)}%"></span></div><strong>${clamp(nextTask ? nextTask.progress : todayPercent, 0, 100)}%</strong></div>
                    <div class="focus-actions"><button class="btn-primary" type="button" data-action="navigate" data-page="tasks">查看下一步${icon('arrow-up-right')}</button><button class="btn-quiet" type="button" data-action="open-focus">记一段专注</button></div>
                </div>
                <div class="focus-art"><img src="${escapeHtml(workbenchConfig.current && workbenchConfig.current.heroSrc ? workbenchConfig.current.heroSrc : 'assets/generated/workbench-hero.webp')}" alt="${escapeHtml(workbenchConfig.current && workbenchConfig.current.heroAlt ? workbenchConfig.current.heroAlt : '桌面上的学习笔记与计划')}" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="focus-art-fallback" hidden>KEEP MOVING / ONE STEP</span></div>
            </article>
            <div class="metric-grid">${metrics}</div>
            ${isAdult ? renderAdultOverview(derived) : ''}
            ${isChild ? renderChildGrowthCard(growth) : ''}
            <div class="dashboard-grid">
                <div class="dashboard-column">
                    <section class="work-card"><div class="work-card-header"><div><h2>今日计划</h2><p>完成 ${derived.completedPlans} / ${derived.todayPlans.length || 0} 项</p></div><button class="btn-quiet" type="button" data-action="navigate" data-page="plans">打开计划${icon('chevron-right')}</button></div>${renderPlanList(derived.todayPlans.slice(0, 4))}</section>
                    <section class="work-card"><div class="work-card-header"><div><h2>最近阅读</h2><p>给输入留下可回看的痕迹</p></div><button class="btn-quiet" type="button" data-action="navigate" data-page="reading">查看全部${icon('chevron-right')}</button></div>${renderReadingRows(state.readingLogs.slice().sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 3), true)}</section>
                </div>
                <div class="dashboard-column">
                    <section class="work-card"><div class="work-card-header"><div><h2>7 天专注趋势</h2><p>本周累计 ${formatDuration(derived.weekFocus)}</p></div>${icon('chart-column')}</div>${renderChart(derived.week, derived.focusByDate, 'min')}</section>
                    <section class="work-card"><div class="work-card-header"><div><h2>成长目标</h2><p>当前平均进度 ${Math.round(goalProgress)}%</p></div><button class="btn-quiet" type="button" data-action="navigate" data-page="goals">管理目标${icon('chevron-right')}</button></div>${renderGoalMiniList(state.goals.slice(0, 3))}</section>
                    ${renderLatestReview()}
                </div>
            </div>`;
    }

    function renderPlanList(items) {
        if (!items.length) return renderEmpty('clipboard-check', '今天还没有计划，先写下第一步。');
        return `<div class="plan-list">${items.map(function (item) {
            return `<div class="plan-row ${item.done ? 'is-done' : ''}"><button class="plan-check ${item.done ? 'is-done' : ''}" type="button" data-action="toggle-plan" data-id="${escapeHtml(item.id)}" data-date="${escapeHtml(item.date)}" aria-label="${item.done ? '取消完成' : '标记完成'}">${item.done ? icon('check') : ''}</button><div class="plan-row-content"><div class="plan-row-title">${escapeHtml(item.title)}</div><div class="plan-row-meta">${escapeHtml(item.category || '其它')} · ${item.done ? '已完成' : '待完成'}</div></div><div class="row-actions"><button class="row-action" type="button" data-action="edit-plan" data-id="${escapeHtml(item.id)}" data-date="${escapeHtml(item.date)}" aria-label="编辑计划" title="编辑计划">${icon('edit-3')}</button><button class="row-action danger" type="button" data-action="delete-plan" data-id="${escapeHtml(item.id)}" data-date="${escapeHtml(item.date)}" aria-label="删除计划" title="删除计划">${icon('trash-2')}</button></div></div>`;
        }).join('')}</div>`;
    }

    function renderReadingRows(items, compact) {
        if (!items.length) return renderEmpty('book-open', '还没有阅读记录。');
        return `<div class="compact-list">${items.map(function (item) {
            return `<div class="compact-row"><span class="compact-row-icon">${icon('book-marked')}</span><div class="compact-row-content"><strong>${escapeHtml(item.title)}</strong><small>${formatDate(item.date)} · ${formatDuration(item.minutes)}${item.pages ? ` · ${item.pages} 页` : ''}</small></div>${compact ? '' : `<div class="row-actions"><button class="row-action" type="button" data-action="edit-reading" data-id="${escapeHtml(item.id)}" aria-label="编辑阅读记录" title="编辑阅读记录">${icon('edit-3')}</button><button class="row-action danger" type="button" data-action="delete-reading" data-id="${escapeHtml(item.id)}" aria-label="删除阅读记录" title="删除阅读记录">${icon('trash-2')}</button></div>`}</div>`;
        }).join('')}</div>`;
    }

    function renderChart(dates, values, unit) {
        const max = Math.max(1, ...values);
        return `<div class="week-chart" aria-label="最近七天趋势">${values.map(function (value, index) {
            const height = Math.max(4, Math.round((value / max) * 100));
            return `<div class="chart-bar-wrap"><span class="chart-value">${value}${unit === 'min' ? 'm' : 'p'}</span><span class="chart-bar ${index === values.length - 1 ? 'today' : ''}" style="height:${height}%"></span></div>`;
        }).join('')}</div><div class="chart-labels">${dates.map(dateLabel).map(function (label, index) { return `<span>${index === 6 ? '今天' : label}</span>`; }).join('')}</div>`;
    }

    function renderGoalMiniList(items) {
        if (!items.length) return renderEmpty('target', '还没有成长目标。');
        return `<div class="goal-list">${items.map(function (item) { return `<div class="goal-mini"><div class="goal-mini-top"><span class="goal-mini-title">${escapeHtml(item.title)}</span><span class="goal-mini-value">${clamp(item.progress, 0, 100)}%</span></div><div class="progress-track"><span style="width:${clamp(item.progress, 0, 100)}%"></span></div><div class="goal-mini-meta">${escapeHtml(item.period || '长期')} · ${escapeHtml(item.description || '继续推进')}</div></div>`; }).join('')}</div>`;
    }

    function renderLatestReview() {
        const latest = state.reviews.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
        if (!latest) return `<section class="work-card"><div class="work-card-header"><div><h2>复盘箱</h2><p>把今天留下一点痕迹</p></div><button class="btn-quiet" type="button" data-action="add-review">添加${icon('plus')}</button></div>${renderEmpty('notebook-pen', '还没有复盘记录。')}</section>`;
        return `<section class="work-card review-card"><div class="work-card-header"><div><h2>最近复盘</h2><p>${formatDate(latest.date)}</p></div><button class="btn-quiet" type="button" data-action="navigate" data-page="reviews">打开复盘箱${icon('chevron-right')}</button></div><div class="mood-mark">${icon(latest.mood === 'steady' ? 'heart-pulse' : 'lightbulb')}${latest.mood === 'steady' ? '状态稳定' : '发现一个提醒'}</div><p class="review-body">${escapeHtml(latest.body || latest.title)}</p><p class="review-next"><strong>下一步</strong> ${escapeHtml(latest.nextAction || '留意明天的第一步。')}</p></section>`;
    }

    const ADULT_AREAS = [
        { id: '学习', icon: 'book-open', tone: 'orange', hint: '课程、笔记和输入' },
        { id: '健身', icon: 'dumbbell', tone: 'lime', hint: '训练计划和身体状态' },
        { id: '美妆护肤', icon: 'sparkles', tone: 'gold', hint: '护肤流程和妆容记录' },
        { id: '理财', icon: 'wallet-cards', tone: 'blue', hint: '预算、支出和规划' },
        { id: '购物', icon: 'shopping-basket', tone: 'orange', hint: '需要购买的物品' },
        { id: '灵感', icon: 'lightbulb', tone: 'lime', hint: '还没决定的好想法' }
    ];

    function getAdultState() {
        return isAdult && state.adult ? state.adult : { language: 'zh-CN', lifeEntries: [], habits: [], milestones: [], archive: [] };
    }

    function renderMilestoneRows(items, compact) {
        if (!items.length) return renderEmpty('calendar-clock', '还没有截止日期或考试节点。');
        return `<div class="milestone-list">${items.map(function (item) {
            const overdue = item.date < storage.localDate();
            const label = item.kind === 'exam' ? '考试' : 'DDL';
            return `<div class="milestone-row ${overdue ? 'is-overdue' : ''}"><span class="list-card-mark ${item.kind === 'exam' ? 'blue' : 'orange'}">${icon(item.kind === 'exam' ? 'graduation-cap' : 'calendar-clock')}</span><div class="milestone-copy"><strong>${escapeHtml(item.title)}</strong><small><span class="tag ${item.kind === 'exam' ? 'blue' : 'orange'}">${label}</span> ${escapeHtml(item.area || '学习')} · ${overdue ? '已过期' : formatDate(item.date)}</small></div>${compact ? '' : `<div class="row-actions"><button class="row-action" type="button" data-action="edit-milestone" data-id="${escapeHtml(item.id)}" aria-label="编辑节点" title="编辑节点">${icon('edit-3')}</button><button class="row-action danger" type="button" data-action="delete-milestone" data-id="${escapeHtml(item.id)}" aria-label="删除节点" title="删除节点">${icon('trash-2')}</button></div>`}</div>`;
        }).join('')}</div>`;
    }

    function renderHabitRows(habits, compact) {
        if (!habits.length) return renderEmpty('repeat-2', '还没有习惯，先从一个小动作开始。');
        return `<div class="habit-list">${habits.map(function (habit) {
            const checked = habit.checkedDates.includes(storage.localDate());
            return `<div class="habit-row ${checked ? 'is-checked' : ''}"><button class="habit-check" type="button" data-action="toggle-habit" data-id="${escapeHtml(habit.id)}" aria-label="${checked ? '取消' : '完成'}${escapeHtml(habit.title)}">${checked ? icon('check') : ''}</button><div class="habit-copy"><strong>${escapeHtml(habit.title)}</strong><small>${escapeHtml(habit.area || '其它')} · ${habit.cadence === 'weekly' ? '每周' : '每天'}</small></div>${compact ? '' : `<div class="row-actions"><button class="row-action" type="button" data-action="edit-habit" data-id="${escapeHtml(habit.id)}" aria-label="编辑习惯" title="编辑习惯">${icon('edit-3')}</button><button class="row-action danger" type="button" data-action="delete-habit" data-id="${escapeHtml(habit.id)}" aria-label="删除习惯" title="删除习惯">${icon('trash-2')}</button></div>`}</div>`;
        }).join('')}</div>`;
    }

    function getArchiveItems() {
        if (!isAdult) return [];
        const adult = getAdultState();
        const items = adult.archive.slice();
        const keys = new Set(items.map(item => `${item.sourceType}:${item.sourceId}`));
        state.tasks.filter(item => item.status === 'done' || Number(item.progress) >= 100).forEach(function (item) {
            const key = `task:${item.id}`;
            if (!keys.has(key)) items.push({ id: `derived-${item.id}`, sourceType: 'task', sourceId: item.id, title: item.title, category: item.category, completedAt: item.completedAt || item.createdAt, archivedAt: item.completedAt || item.createdAt });
        });
        state.dailyPlans.filter(item => item.done).forEach(function (item) {
            const key = `plan:${item.id}`;
            if (!keys.has(key)) items.push({ id: `derived-${item.id}`, sourceType: 'plan', sourceId: item.id, title: item.title, category: item.category, completedAt: item.completedAt || item.createdAt, archivedAt: item.completedAt || item.createdAt });
        });
        adult.lifeEntries.filter(item => item.status === 'done').forEach(function (item) {
            const key = `life:${item.id}`;
            if (!keys.has(key)) items.push({ id: `derived-${item.id}`, sourceType: 'life', sourceId: item.id, title: item.title, category: item.area, completedAt: item.updatedAt, archivedAt: item.updatedAt });
        });
        return items.sort((a, b) => String(b.archivedAt || b.completedAt).localeCompare(String(a.archivedAt || a.completedAt)));
    }

    function renderAdultOverview(derived) {
        return `<div class="adult-command-grid"><section class="work-card"><div class="work-card-header"><div><span class="eyebrow">NEXT UP</span><h2>临近节点</h2><p>${derived.overdueMilestones ? `${derived.overdueMilestones} 个节点需要重新安排` : '未来两周内值得提前看一眼'}</p></div><button class="btn-quiet" type="button" data-action="navigate" data-page="life">管理${icon('chevron-right')}</button></div>${renderMilestoneRows(derived.dueSoon, true)}</section><section class="work-card"><div class="work-card-header"><div><span class="eyebrow">TODAY / HABITS</span><h2>今天的习惯</h2><p>完成一个就算把节奏接回来</p></div><button class="btn-quiet" type="button" data-action="navigate" data-page="life">查看全部${icon('chevron-right')}</button></div>${renderHabitRows(derived.todayHabits, true)}</section></div>`;
    }

    function renderLife(derived) {
        if (!isAdult) return renderEmpty('layers-3', '生活分区只在成人成长工作台中开放。');
        const adult = getAdultState();
        const areaCards = ADULT_AREAS.map(function (area) {
            const entries = adult.lifeEntries.filter(item => item.area === area.id).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
            return `<section class="life-area-card tone-${area.tone}"><div class="life-area-head"><span class="list-card-mark ${area.tone}">${icon(area.icon)}</span><div><h2>${area.id}</h2><p>${area.hint}</p></div><button class="row-action" type="button" data-action="add-life-entry" data-area="${escapeHtml(area.id)}" aria-label="添加${escapeHtml(area.id)}记录" title="添加记录">${icon('plus')}</button></div>${entries.length ? `<div class="life-entry-list">${entries.slice(0, 4).map(function (item) { return `<article class="life-entry-row ${item.status === 'done' ? 'is-done' : ''}"><div><strong>${escapeHtml(item.title)}</strong><small>${item.status === 'done' ? '已完成并归档' : item.status === 'active' ? '进行中' : '待安排'}${item.date ? ` · ${formatDate(item.date)}` : ''}${item.attachments && item.attachments.length ? ` · ${item.attachments.length} 个附件` : ''}</small></div><div class="row-actions"><button class="row-action" type="button" data-action="edit-life-entry" data-id="${escapeHtml(item.id)}" aria-label="编辑生活记录" title="编辑记录">${icon('edit-3')}</button><button class="row-action danger" type="button" data-action="delete-life-entry" data-id="${escapeHtml(item.id)}" aria-label="删除生活记录" title="删除记录">${icon('trash-2')}</button></div></article>`; }).join('')}</div>` : renderEmpty(area.icon, '还没有记录。')}</section>`;
        }).join('');
        return `${renderIntro(PAGE_META.life, 'add-life-entry', '添加生活记录', `<button class="btn-secondary" type="button" data-action="add-milestone">${icon('calendar-clock')}截止/考试</button>`)}<div class="life-area-grid">${areaCards}</div><div class="life-support-grid"><section class="work-card"><div class="work-card-header"><div><span class="eyebrow">TODAY / HABITS</span><h2>习惯打卡</h2><p>小动作比宏大计划更适合长期坚持。</p></div><button class="btn-quiet" type="button" data-action="add-habit">添加${icon('plus')}</button></div>${renderHabitRows(adult.habits, false)}</section><section class="work-card"><div class="work-card-header"><div><span class="eyebrow">DEADLINES / EXAMS</span><h2>截止与考试</h2><p>把重要节点提前放进视野。</p></div><button class="btn-quiet" type="button" data-action="add-milestone">添加${icon('plus')}</button></div>${renderMilestoneRows(adult.milestones.slice().sort((a, b) => String(a.date).localeCompare(String(b.date))), false)}</section></div>`;
    }

    function renderArchive(derived) {
        if (!isAdult) return renderEmpty('archive', '归档与统计只在成人成长工作台中开放。');
        const archive = getArchiveItems();
        const yearProgress = Math.min(100, Math.round((new Date().getMonth() * 30 + new Date().getDate()) / 365 * 100));
        return `${renderIntro(PAGE_META.archive, '', '', `<span class="tag lime">${archive.length} 条已归档</span>`)}<div class="reading-summary">${renderMetric('今年完成', `${derived.yearCompleted} 项`, '计划、任务和生活记录', 'archive-check', 'positive')}${renderMetric('今年专注', formatDuration(derived.yearFocus), '已经投入的时间', 'clock-3', '')}${renderMetric('活跃天数', `${derived.yearDaysActive} 天`, '有行动就会留下痕迹', 'calendar-check-2', '')}${renderMetric('年度进度', `${yearProgress}%`, '按日历自然前进', 'calendar-range', '')}</div><section class="work-card year-progress-card"><div class="work-card-header"><div><span class="eyebrow">${storage.localDate().slice(0, 4)} / TIME</span><h2>今年已经走到这里</h2><p>统计是回看工具，不是新的考核。</p></div><strong class="year-progress-value">${yearProgress}%</strong></div><div class="progress-track"><span style="width:${yearProgress}%"></span></div><div class="year-progress-meta"><span>阅读 ${formatDuration(derived.yearReading)}</span><span>归档 ${archive.length} 条</span><span>持续记录会让曲线变得清楚</span></div></section><section class="work-card"><div class="work-card-header"><div><h2>自动归档</h2><p>计划、任务和生活记录完成后，会保留在这里。</p></div><span class="inline-stat">最近完成优先</span></div>${archive.length ? `<div class="archive-list">${archive.map(function (item) { return `<article class="archive-row"><span class="list-card-mark lime">${icon('archive-check')}</span><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.category || '其它')} · ${formatLongDate(String(item.completedAt || item.archivedAt).slice(0, 10))} 完成</small></div><span class="tag lime">已归档</span></article>`; }).join('')}</div>` : renderEmpty('archive', '完成一项计划，它会自动出现在这里。')}</section>`;
    }

    function renderSettings() {
        if (!isAdult) return renderEmpty('sliders-horizontal', '偏好设置只在成人成长工作台中开放。');
        const adult = getAdultState();
        const language = adult.language === 'en-US' ? 'en-US' : 'zh-CN';
        return `${renderIntro(PAGE_META.settings, '', '', `<span class="tag ${language === 'en-US' ? 'blue' : 'lime'}">${language === 'en-US' ? 'English shell' : '简体中文'}</span>`)}${renderWorkbenchSwitcher()}<div class="settings-grid"><section class="work-card settings-card"><div class="work-card-header"><div><span class="eyebrow">LANGUAGE</span><h2>界面语言</h2><p>切换后会保存到当前工作台快照。</p></div>${icon('languages')}</div><div class="language-options"><button class="language-option ${language === 'zh-CN' ? 'is-active' : ''}" type="button" data-action="set-language" data-language="zh-CN"><strong>简体中文</strong><small>完整中文工作台</small>${language === 'zh-CN' ? icon('check') : ''}</button><button class="language-option ${language === 'en-US' ? 'is-active' : ''}" type="button" data-action="set-language" data-language="en-US"><strong>English</strong><small>English navigation shell</small>${language === 'en-US' ? icon('check') : ''}</button></div></section><section class="work-card settings-card"><div class="work-card-header"><div><span class="eyebrow">LOCAL DATA</span><h2>本地数据</h2><p>数据只保存在当前浏览器，导出后可以迁移到另一台设备。</p></div>${icon('database')}</div><div class="settings-actions"><button class="btn-secondary" type="button" data-action="export">${icon('download')}导出 JSON 备份</button><button class="btn-secondary" type="button" data-action="import-trigger">${icon('upload')}导入 JSON 快照</button><button class="btn-danger" type="button" data-action="clear-local-data">${icon('trash-2')}清除当前工作台</button></div><small class="field-hint">清除会删除当前成人工作台的本地快照，其他两个工作台不会受影响。</small></section></div>`;
    }

    function renderPlans(derived) {
        const done = derived.todayPlans.filter(item => item.done).length;
        const totalMinutes = derived.todayPlans.reduce((sum, item) => sum + (item.done ? 0 : 25), 0);
        return `${renderIntro(PAGE_META.plans, 'add-plan', '添加今日计划')}
            <div class="reading-summary">${renderMetric('今日完成', `${done}/${derived.todayPlans.length || 0}`, '保持轻量', 'circle-check', done ? 'positive' : '')}${renderMetric('完成率', `${derived.todayPlans.length ? Math.round((done / derived.todayPlans.length) * 100) : 0}%`, '今天的进度', 'chart-column', '')}${renderMetric('预计剩余', formatDuration(totalMinutes), '按需要调整', 'clock-3', '')}</div>
            <section class="work-card"><div class="work-card-header"><div><h2>${formatLongDate(derived.today)}</h2><p>今天只看今天的计划</p></div><span class="inline-stat">${done} 项完成</span></div>${renderPlanList(derived.todayPlans)}</section>`;
    }

    function renderTasks() {
        const filters = [['all', '全部'], ['todo', '待开始'], ['doing', '进行中'], ['done', '已完成']];
        const items = state.tasks.filter(function (item) { return ui.taskFilter === 'all' || item.status === ui.taskFilter; });
        return `${renderIntro(PAGE_META.tasks, 'add-task', '添加学习任务', `<button class="btn-secondary" type="button" data-action="open-focus">${icon('clock-3')}记录专注</button>`)}
            <div class="subnav-tabs">${filters.map(function (item) { return `<button class="subnav-tab ${ui.taskFilter === item[0] ? 'is-active' : ''}" type="button" data-action="task-filter" data-filter="${item[0]}">${item[1]}</button>`; }).join('')}</div>
            <div class="list-stack">${items.length ? items.map(renderTaskCard).join('') : renderEmpty('list-todo', '这个筛选下还没有任务。')}</div>`;
    }

    function renderMistakes() {
        const items = state.mistakes.slice().sort((a, b) => {
            if (a.status !== b.status) return a.status === 'mastered' ? 1 : -1;
            return String(a.reviewDate || a.date).localeCompare(String(b.reviewDate || b.date));
        });
        const due = items.filter(item => item.status !== 'mastered' && item.reviewDate && item.reviewDate <= storage.localDate()).length;
        const mastered = items.filter(item => item.status === 'mastered').length;
        const recent = items.filter(item => String(item.date).slice(0, 7) === storage.localDate().slice(0, 7)).length;
        return `${renderIntro(PAGE_META.mistakes, 'add-mistake', '记录错题')}
            <div class="reading-summary">${renderMetric('待复习', `${items.length - mastered} 道`, due ? `${due} 道今天需要回看` : '今天没有到期题目', 'triangle-alert', due ? 'positive' : '')}${renderMetric('已掌握', `${mastered} 道`, '标记后会沉到列表底部', 'circle-check', mastered ? 'positive' : '')}${renderMetric('本月新增', `${recent} 道`, '先记录，再慢慢消化', 'notebook-pen', '')}</div>
            <div class="list-stack">${items.length ? items.map(renderMistakeCard).join('') : renderEmpty('triangle-alert', '还没有错题，做错并不可怕，记下来就有下一次。')}</div>`;
    }

    function renderMistakeCard(item) {
        const due = item.status !== 'mastered' && item.reviewDate && item.reviewDate <= storage.localDate();
        const statusLabel = item.status === 'mastered' ? '已掌握' : due ? '今天复习' : '待复习';
        return `<article class="list-card mistake-card ${item.status === 'mastered' ? 'is-mastered' : ''}"><div class="task-header"><div class="list-card-main"><span class="list-card-mark gold">${icon(item.status === 'mastered' ? 'circle-check' : 'triangle-alert')}</span><div class="list-card-copy"><div class="list-card-subline"><span class="tag gold">${escapeHtml(item.subject || '其它')}</span><span class="tag ${item.status === 'mastered' ? 'lime' : due ? 'orange' : ''}">${statusLabel}</span><span>${formatDate(item.date)} 记录</span></div><h3>${escapeHtml(item.question)}</h3></div></div><div class="row-actions"><button class="row-action" type="button" data-action="edit-mistake" data-id="${escapeHtml(item.id)}" aria-label="编辑错题" title="编辑错题">${icon('edit-3')}</button><button class="row-action danger" type="button" data-action="delete-mistake" data-id="${escapeHtml(item.id)}" aria-label="删除错题" title="删除错题">${icon('trash-2')}</button></div></div><div class="mistake-detail-grid"><div class="mistake-detail"><small>我错在</small><p>${escapeHtml(item.mistakeReason || '还没有写下错因。')}</p></div><div class="mistake-detail"><small>正确思路</small><p>${escapeHtml(item.correctAnswer || '还没有写下正确思路。')}</p></div></div><div class="mistake-footer"><span>${item.reviewDate ? `下次复习：${formatDate(item.reviewDate)}` : '还没有安排复习日期'}</span><button class="btn-secondary mistake-toggle" type="button" data-action="toggle-mistake" data-id="${escapeHtml(item.id)}">${icon(item.status === 'mastered' ? 'rotate-ccw' : 'circle-check')}${item.status === 'mastered' ? '重新加入复习' : '标记已掌握'}</button></div></article>`;
    }

    function renderGrowthMap() {
        if (!isChild) return renderEmpty('map', '成长地图只在儿童学习工作台中开放。');
        const growth = getChildGrowth();
        const activeStyle = growth.styles.find(item => item.id === growth.activeStyleId) || growth.styles[0];
        const waterAvailable = growth.sunlight >= 5 && growth.lastWateredDate !== storage.localDate();
        const streakRewards = growth.streakRewards.map(function (reward) {
            const unlocked = growth.unlockedStreakRewardIds.includes(reward.id);
            const claimed = growth.claimedStreakRewardIds.includes(reward.id);
            return `<div class="streak-reward ${claimed ? 'is-claimed' : ''}"><span class="list-card-mark gold">${icon(reward.icon)}</span><div class="streak-reward-copy"><strong>${escapeHtml(reward.title)}</strong><small>连续 ${reward.days} 天 · ${escapeHtml(reward.description)}</small></div>${claimed ? `<span class="tag lime">已领取</span>` : unlocked ? `<button class="row-action" type="button" data-action="claim-streak-reward" data-id="${escapeHtml(reward.id)}" aria-label="领取${escapeHtml(reward.title)}" title="领取${escapeHtml(reward.title)}">${icon('gift')}</button>` : `<span class="streak-days">${reward.days}D</span>`}</div>`;
        }).join('');
        const styles = growth.styles.map(function (style) {
            const unlocked = growth.unlockedStyleIds.includes(style.id);
            const active = growth.activeStyleId === style.id;
            return `<button class="style-option ${active ? 'is-active' : ''} ${unlocked ? '' : 'is-locked'}" type="button" data-action="select-style" data-id="${escapeHtml(style.id)}" ${unlocked ? '' : 'disabled'}><span class="list-card-mark ${escapeHtml(style.tone)}">${icon(style.icon)}</span><span><strong>${escapeHtml(style.title)}</strong><small>${escapeHtml(style.description)}</small></span>${active ? icon('check') : unlocked ? '' : icon('lock-keyhole')}</button>`;
        }).join('');
        return `${renderIntro(PAGE_META.growth, '', '', `<span class="points-chip">${icon('sun')}${growth.sunlight} 阳光</span>`)}<section class="growth-map-hero"><div class="growth-map-copy"><span class="eyebrow">STARLIGHT / GROWTH MAP</span><h2>星芒正在穿过自己的小花园</h2><p>当前是 ${escapeHtml(activeStyle.title)}，成长等级 ${growth.level}。完成一件真实的小事，给植物和星芒都留下一点能量。</p><div class="growth-map-actions"><button class="btn-primary" type="button" data-action="navigate" data-page="plans">去完成今天的行动${icon('arrow-up-right')}</button><label class="voice-toggle"><input type="checkbox" data-action="toggle-voice" ${growth.voiceEnabled ? 'checked' : ''}><span class="voice-toggle-track"></span><span>语音夸奖</span></label></div></div><div class="growth-map-art"><img src="${escapeHtml(workbenchConfig.current.heroSrc)}" alt="明亮学习桌上的书本和成长徽章"><div class="growth-pet-badge">${icon(activeStyle.icon)}<strong>${escapeHtml(growth.unicorn.name)}</strong><small>LEVEL ${growth.level}</small></div></div></section><div class="growth-feature-grid"><section class="growth-feature-card plant-feature"><div class="growth-feature-head"><span class="list-card-mark lime">${icon(growth.plant.icon)}</span><div><span class="eyebrow">PLANT / GARDEN</span><h3>${escapeHtml(growth.plant.title)}</h3></div><span class="tag lime">阶段 ${growth.plant.stage}</span></div><p>累计获得 ${growth.totalSunlightEarned} 阳光，植物会从种子慢慢长成自己的小森林。</p><div class="progress-track"><span style="width:${Math.min(100, Math.round((growth.totalSunlightEarned % 120) / 120 * 100))}%"></span></div><div class="growth-feature-foot"><small>浇水 ${growth.plantWaterCount} 次</small><button class="btn-secondary" type="button" data-action="water-plant" ${waterAvailable ? '' : 'disabled'}>${icon('droplets')}${growth.lastWateredDate === storage.localDate() ? '今天已浇水' : '浇水 · 5 阳光'}</button></div></section><section class="growth-feature-card pet-feature"><div class="growth-feature-head"><span class="list-card-mark orange">${icon(activeStyle.icon)}</span><div><span class="eyebrow">UNICORN / COMPANION</span><h3>${escapeHtml(growth.unicorn.name)}</h3></div><span class="tag orange">LEVEL ${growth.level}</span></div><p>当前造型：${escapeHtml(activeStyle.title)}。再积累 ${100 - (growth.petXp % 100)} XP 就会靠近下一级。</p><div class="progress-track"><span style="width:${growth.petXp % 100}%"></span></div><div class="growth-feature-foot"><small>${growth.petXp} XP · 已解锁 ${growth.unlockedStyleIds.length} 种造型</small><button class="btn-quiet" type="button" data-action="navigate" data-page="rewards">去看奖励${icon('chevron-right')}</button></div></section><section class="growth-feature-card zombie-feature ${growth.zombieActive ? 'is-alert' : ''}"><div class="growth-feature-head"><span class="list-card-mark ${growth.zombieActive ? 'gold' : 'blue'}">${icon(growth.zombieActive ? 'ghost' : 'shield-check')}</span><div><span class="eyebrow">GARDEN / GUARD</span><h3>${growth.zombieActive ? '小僵尸来捣蛋了' : '花园今天很平安'}</h3></div></div><p>${growth.zombieActive ? '昨天没有留下成长记录，完成今天的一项行动就能把它驱散。' : `已经驱散 ${growth.zombieDefeated} 次，继续用行动守住自己的节奏。`}</p><div class="growth-feature-foot"><small>${growth.zombieActive ? '等待今日第一次打卡' : '守护状态正常'}</small><button class="btn-secondary" type="button" data-action="navigate" data-page="plans">${icon('shield')}${growth.zombieActive ? '去驱散' : '查看打卡'}</button></div></section></div><div class="growth-detail-grid"><section class="work-card"><div class="work-card-header"><div><h2>连续奖励</h2><p>当前连续 ${growth.streak} 天 · 最好 ${growth.bestStreak} 天</p></div>${icon('flame')}</div>${growth.streakRepair && growth.streakRepair.canRepair ? `<div class="streak-repair-row"><small>欢迎回来！昨天断了一下，用一张补签卡把记录接上（这个月还有 ${growth.streakRepair.available} 张）。</small><button class="btn-secondary" type="button" data-action="repair-streak">${icon('heart')}补签卡接上</button></div>` : ''}<div class="streak-reward-list">${streakRewards}</div></section><section class="work-card"><div class="work-card-header"><div><h2>造型衣橱</h2><p>完成成长和连续奖励，逐步解锁星芒的新样子。</p></div>${icon('shirt')}</div><div class="style-options">${styles}</div></section></div>`;
    }

    function renderCourses() {
        if (!isChild) return renderEmpty('graduation-cap', '课程中心只在儿童学习工作台中开放。');
        const catalog = Array.isArray(workbenchConfig.childCourses) ? workbenchConfig.childCourses : [];
        const progress = state.courseProgress || { completedLessonIds: [] };
        const views = global.PersonalWorkbenchChildCourses ? global.PersonalWorkbenchChildCourses.getCourseView(catalog, progress) : catalog;
        return `${renderIntro(PAGE_META.courses, '', '', `<span class="points-chip">${icon('sun')}${getChildGrowth().sunlight} 阳光</span>`)}<div class="course-grid">${views.map(function (course) {
            const lessons = Array.isArray(course.lessons) ? course.lessons : [];
            return `<section class="course-card"><div class="course-card-head"><span class="list-card-mark ${escapeHtml(course.tone)}">${icon(course.icon)}</span><div><h2>${escapeHtml(course.title)}</h2><p>${escapeHtml(course.description)}</p></div><strong>${course.percent}%</strong></div><div class="progress-track"><span style="width:${course.percent}%"></span></div><div class="course-card-meta"><span>${course.completed}/${course.total} 小课节</span><span>完成一节 +20 阳光</span></div><div class="course-lessons">${lessons.map(function (lesson) { const done = progress.completedLessonIds.includes(lesson.id); return `<button class="course-lesson ${done ? 'is-done' : ''}" type="button" data-action="complete-lesson" data-id="${escapeHtml(lesson.id)}" ${done ? 'disabled' : ''}><span>${icon(done ? 'check' : 'play')}</span><span><strong>${escapeHtml(lesson.title)}</strong><small>${lesson.minutes} 分钟</small></span>${done ? `<span class="tag lime">已完成</span>` : icon('arrow-right')}</button>`; }).join('')}</div></section>`;
        }).join('')}</div>`;
    }

    function renderFamily() {
        if (!familyRepository) return renderEmpty('heart-handshake', '家庭互动模块暂不可用。');
        const feed = familyRepository.load();
        const messages = Array.isArray(feed.messages) ? feed.messages : [];
        const kindLabels = { 'parent-note': '家长鼓励', 'child-share': '成长分享', 'family-note': '家庭约定' };
        return `${renderIntro(PAGE_META.family, '', '', `<span class="points-chip">${icon('heart-handshake')}${messages.length} 条互动</span>`)}
            <section class="family-compose-card"><div class="work-card-header"><div><span class="eyebrow">FAMILY / CHECK-IN</span><h2>${isChild ? '把今天的成长分享给家长' : '留一句能被家人看见的话'}</h2><p>鼓励、约定和完成后的分享单独保存，不会混入学习快照。</p></div>${icon('message-circle-heart')}</div><form class="family-compose" data-family-form><div class="form-grid"><div class="field"><label for="family-author">发送者</label><select id="family-author" name="author"><option>家长</option><option>小朋友</option><option>家庭成员</option></select></div><div class="field"><label for="family-kind">类型</label><select id="family-kind" name="kind"><option value="parent-note">家长鼓励</option><option value="child-share">成长分享</option><option value="family-note">家庭约定</option></select></div><div class="field full"><label for="family-body">内容</label><textarea id="family-body" name="body" maxlength="500" required placeholder="例如：我今天完成了数学口算，还记住了一个新单词。"></textarea></div></div><div class="form-actions"><button class="btn-primary" type="submit">发送互动${icon('send')}</button></div></form></section>
            <section class="work-card family-feed-card"><div class="work-card-header"><div><h2>家庭互动</h2><p>最近的鼓励和成长记录</p></div><span class="inline-stat">${messages.length} 条</span></div>${messages.length ? `<div class="family-feed">${messages.map(function (item) { return `<article class="family-message ${escapeHtml(item.kind)}"><div class="family-message-head"><span class="list-card-mark ${item.author === '家长' ? 'orange' : 'lime'}">${icon(item.author === '家长' ? 'heart' : 'sparkles')}</span><div><strong>${escapeHtml(item.author)}</strong><small>${escapeHtml(kindLabels[item.kind] || '家庭互动')} · ${formatDate(item.date)}</small></div></div><p>${escapeHtml(item.body)}</p></article>`; }).join('')}</div>` : renderEmpty('message-circle-heart', '还没有互动，先送出第一句鼓励。')}</section>`;
    }

    function getWorkbenchSwitchEntries() {
        const variants = workbenchConfig.variants || {};
        const themes = (variants.preschool && variants.preschool.themes) || workbenchConfig.themes || {};
        const themeEntries = [
            { themeId: 'garden-defense', href: '../preschool-workbench/index.html?theme=garden-defense', icon: 'sprout', tone: 'lime' },
            { themeId: 'voxel-adventure', href: '../preschool-workbench/index.html?theme=voxel-adventure', icon: 'grid-2x2', tone: 'blue' },
            { themeId: 'platform-quest', href: '../preschool-workbench/index.html?theme=platform-quest', icon: 'flag', tone: 'orange' }
        ];
        const entries = themeEntries.map(function (entry) {
            const theme = themes[entry.themeId] || {};
            return {
                variant: 'preschool',
                theme: entry.themeId,
                name: theme.name || entry.themeId,
                summary: PRESCHOOL_COPY.themeSummaries[entry.themeId] || theme.switchSummary || '幼儿主题 · 共享本地任务数据',
                icon: entry.icon,
                tone: entry.tone,
                href: entry.href
            };
        });
        ['adult', 'child'].forEach(function (id) {
            const item = variants[id];
            if (!item) return;
            const href = global.PersonalWorkbenchLauncher && typeof global.PersonalWorkbenchLauncher.getSiblingPath === 'function'
                ? global.PersonalWorkbenchLauncher.getSiblingPath(workbenchConfig.variant, id)
                : (item.path || '../');
            entries.push({
                variant: id,
                theme: '',
                name: item.name,
                summary: item.switchSummary || item.statusNote || '',
                icon: item.switchIcon || 'layout-dashboard',
                tone: item.switchTone || 'blue',
                href: href
            });
        });
        return entries;
    }

    function renderWorkbenchSwitcher() {
        const activeTheme = isPreschool ? getPreschoolThemeId() : '';
        const cards = getWorkbenchSwitchEntries().map(function (entry) {
            const current = entry.variant === workbenchConfig.variant && (entry.variant !== 'preschool' || entry.theme === activeTheme);
            const themeAttr = entry.theme ? ` data-workbench-theme="${escapeHtml(entry.theme)}"` : '';
            return `<a class="workbench-switch-card ${current ? 'is-current' : ''}" data-workbench-variant="${escapeHtml(entry.variant)}"${themeAttr} href="${escapeHtml(entry.href)}" ${current ? 'aria-current="page"' : ''}><span class="workbench-switch-card-icon ${escapeHtml(entry.tone || 'blue')}">${icon(entry.icon || 'layout-dashboard')}</span><span class="workbench-switch-card-copy"><strong>${escapeHtml(entry.name)}</strong><small>${escapeHtml(entry.summary || '')}</small></span><span class="workbench-switch-card-action">${current ? `<span class="tag lime">当前</span>` : icon('arrow-right')}</span></a>`;
        }).join('');
        return `<section class="workbench-switcher-panel" aria-labelledby="workbench-switcher-title"><div class="workbench-switcher-head"><div><span class="eyebrow">WORKBENCH / SWITCH</span><h2 id="workbench-switcher-title">切换工作台</h2><p>五个入口可随时切换；三个幼儿主题共享一份本地任务数据。</p></div><span class="workbench-switcher-mark">${icon('layout-dashboard')}</span></div><div class="workbench-switch-grid">${cards}</div></section>`;
    }

    function renderAccount() {
        if (!api) return renderEmpty('cloud-off', '账号连接模块暂不可用。');
        const status = api.getStatus();
        const session = api.getSession();
        const baseUrl = api.getBaseUrl();
        const account = session.account;
        const activeChild = api.getActiveChild();
        const selectedHouseholdId = accountView.selectedHouseholdId || (activeChild && activeChild.householdId) || (accountView.households[0] && accountView.households[0].id);
        const householdOptions = accountView.households.map(function (item) { return `<option value="${escapeHtml(item.id)}" ${item.id === selectedHouseholdId ? 'selected' : ''}>${escapeHtml(item.name)}</option>`; }).join('');
        const children = selectedHouseholdId ? accountView.children.filter(item => item.householdId === selectedHouseholdId) : accountView.children;

        let body = '';
        if (!status || status.id === 'not-configured') {
            body = `<section class="account-setup-card"><span class="list-card-mark blue">${icon('server-cog')}</span><div><h2>连接自托管服务</h2><p>前端可以部署到 Vercel，账号、家庭和 SQLite 快照继续放在你自己的服务上。</p><form class="account-inline-form" data-account-base-form><input name="baseUrl" type="url" required placeholder="例如：https://sync.example.com" value="${escapeHtml(baseUrl)}"><button class="btn-primary" type="submit">保存地址${icon('arrow-right')}</button></form><small class="field-hint">不填写真实密码或密钥到工作台快照；这里仅保存 API 地址。</small></div></section>`;
        } else if (!account) {
            body = `<section class="account-auth-card"><div class="account-auth-copy"><span class="eyebrow">SELF-HOSTED ACCOUNT</span><h2>登录后，把工作台带到另一台设备</h2><p>现有后端使用用户名和密码。网络不可用时，当前设备仍可继续离线使用。</p></div><form class="account-auth-form" data-account-auth-form><div class="form-grid"><div class="field"><label for="account-username">用户名</label><input id="account-username" name="username" required autocomplete="username" placeholder="例如：parent_a"></div><div class="field"><label for="account-password">密码</label><input id="account-password" name="password" required type="password" autocomplete="current-password" placeholder="至少 8 位"></div><div class="field"><label for="account-display-name">显示名称（注册时填写）</label><input id="account-display-name" name="displayName" maxlength="80" placeholder="例如：星芒的家长"></div><div class="field"><label for="account-registration-code">注册码（可选）</label><input id="account-registration-code" name="registrationCode" maxlength="160" placeholder="生产服务开启注册码时填写"></div></div><div class="form-actions"><button class="btn-secondary" type="button" data-action="account-register">注册账号${icon('user-round-plus')}</button><button class="btn-primary" type="button" data-action="account-login">登录${icon('log-in')}</button></div></form></section>`;
        } else {
            body = `<section class="account-profile-card"><div><span class="eyebrow">SIGNED IN</span><h2>${escapeHtml(account.displayName || account.username || '已登录用户')}</h2><p>@${escapeHtml(account.username || '')} · ${escapeHtml(status.detail)}</p></div><button class="btn-quiet" type="button" data-action="account-logout">退出登录${icon('log-out')}</button></section><div class="account-grid"><section class="work-card"><div class="work-card-header"><div><h2>家庭和工作台档案</h2><p>一个孩子档案对应一份可同步的工作台快照。</p></div>${icon('users')}</div><div class="account-section"><label class="account-label" for="account-household">家庭</label><select id="account-household" data-account-household>${householdOptions || '<option value="">还没有家庭</option>'}</select><form class="account-inline-form" data-household-form><input name="name" required maxlength="80" placeholder="新家庭名称"><button class="btn-secondary" type="submit">创建家庭${icon('plus')}</button></form></div>${accountView.households.length ? `<div class="account-section"><label class="account-label" for="account-child-name">当前家庭新增档案</label><form class="account-inline-form" data-child-form><input name="name" id="account-child-name" required maxlength="40" placeholder="例如：小星"><button class="btn-secondary" type="submit">新增档案${icon('user-round-plus')}</button></form></div>` : ''}<div class="account-child-list">${children.length ? children.map(function (child) { const selected = activeChild && activeChild.id === child.id; return `<button class="account-child-option ${selected ? 'is-active' : ''}" type="button" data-action="account-select-child" data-id="${escapeHtml(child.id)}"><span class="list-card-mark ${selected ? 'lime' : 'blue'}">${icon(selected ? 'check' : 'user-round')}</span><span><strong>${escapeHtml(child.name)}</strong><small>${escapeHtml(child.localProfileId || '未绑定本地档案')}</small></span>${selected ? `<span class="tag lime">当前</span>` : icon('chevron-right')}</button>`; }).join('') : renderEmpty('user-round', accountView.households.length ? '还没有工作台档案，请先新增一个。' : '请先创建一个家庭。')}</div></section><section class="work-card sync-card"><div class="work-card-header"><div><h2>多设备同步</h2><p>当前工作台：${activeChild ? escapeHtml(activeChild.name) : '尚未选择'}</p></div>${icon('cloud')} </div><div class="sync-status-line"><span class="status-dot ${activeChild ? 'is-online' : ''}"></span><span>${activeChild ? '可以手动同步' : '先选择工作台档案'}</span></div><div class="sync-actions"><button class="btn-secondary" type="button" data-action="account-pull" ${activeChild ? '' : 'disabled'}>${icon('cloud-download')}从云端恢复</button><button class="btn-primary" type="button" data-action="account-push" ${activeChild ? '' : 'disabled'}>${icon('cloud-upload')}上传当前快照</button></div>${accountView.lastSyncAt ? `<small class="sync-note">最近一次同步：${escapeHtml(accountView.lastSyncAt)}${accountView.lastRemoteRevision ? ` · 远端 revision ${accountView.lastRemoteRevision}` : ''}</small>` : '<small class="sync-note">同步不会自动覆盖本地数据，冲突时会保留两边并提示你处理。</small>'}</section></div>`;
        }
        return `${renderIntro(PAGE_META.account, '', '', `<span class="tag ${status.id === 'ready' ? 'lime' : status.id === 'signed-out' ? 'orange' : ''}">${escapeHtml(status.label)}</span>`)}${renderWorkbenchSwitcher()}${isPreschool ? `${renderPreschoolThemeSettings()}${renderPreschoolPracticeLevelSettings()}${renderPreschoolMathBandSettings()}${renderPreschoolFeedbackSettings()}` : ''}${body}`;
    }

    function renderPreschoolThemeSettings() {
        const themes = workbenchConfig.themes || {};
        const activeTheme = getPreschoolThemeId();
        const cards = Object.keys(themes).map(function (id) {
            const theme = themes[id];
            const current = id === activeTheme;
            const summary = PRESCHOOL_COPY.themeSummaries[id] || theme.switchSummary || '';
            return `<button class="preschool-theme-option ${current ? 'is-active' : ''}" type="button" data-action="select-preschool-theme" data-theme-id="${escapeHtml(id)}" aria-pressed="${current ? 'true' : 'false'}"><span class="preschool-theme-option-preview theme-preview-${escapeHtml(id)}"><i></i><b></b><em></em></span><span class="preschool-theme-option-copy"><strong>${escapeHtml(theme.name)}</strong><small>${escapeHtml(summary)}</small></span><span class="preschool-theme-option-state">${current ? `${icon('check')} 当前` : icon('arrow-right')}</span></button>`;
        }).join('');
        return `<section class="preschool-theme-settings" aria-labelledby="preschool-theme-settings-title"><div class="preschool-theme-settings-copy"><span class="pixel-panel-kicker">WORKBENCH / THEME</span><h2 id="preschool-theme-settings-title">选择冒险主题</h2><p>只换颜色、边框和小物件；任务、阳光、奖励和完成状态继续使用同一份本地数据。</p></div><div class="preschool-theme-options">${cards}</div></section>`;
    }

    const PRACTICE_LEVEL_ROWS = [
        { track: 'literacy', title: '识字' },
        { track: 'pinyin', title: '拼音' },
        { track: 'poetry', title: '古诗' },
        { track: 'phonics', title: '拼读' },
        { track: 'math', title: '数学题库' },
        { track: 'motion', title: '运动' }
    ];

    function getPracticeLevel(track) {
        const helper = global.PersonalWorkbenchBankLevels;
        const garden = state.growth && state.growth.garden;
        const selected = garden && garden.practiceLevels ? garden.practiceLevels[track] : '';
        const raw = helper && typeof helper.normalizeLevel === 'function' ? helper.normalizeLevel(selected) : (selected || 'L1');
        return raw;
    }

    function getPracticeLevelForCourse(courseId) {
        const helper = global.PersonalWorkbenchBankLevels;
        const track = helper && typeof helper.trackForCourse === 'function' ? helper.trackForCourse(courseId) : 'literacy';
        return getPracticeLevel(track);
    }

    function formatPracticeLevelCaption(courseId) {
        const helper = global.PersonalWorkbenchBankLevels;
        const track = helper && typeof helper.trackForCourse === 'function' ? helper.trackForCourse(courseId) : '';
        const label = getPracticeLevelLabel(courseId);
        return getPracticeLevelForCourse(courseId) + ' · ' + label;
    }

    function getPracticeLevelLabel(courseIdOrTrack) {
        const helper = global.PersonalWorkbenchBankLevels;
        const level = String(courseIdOrTrack || '').indexOf('preschool-') === 0
            ? getPracticeLevelForCourse(courseIdOrTrack)
            : getPracticeLevel(courseIdOrTrack);
        const track = String(courseIdOrTrack || '').indexOf('preschool-') === 0
            ? (helper && typeof helper.trackForCourse === 'function' ? helper.trackForCourse(courseIdOrTrack) : '')
            : courseIdOrTrack;
        return helper && typeof helper.labelFor === 'function' ? helper.labelFor(level, track) : level;
    }

    function renderPreschoolPracticeLevelChips(course) {
        const helper = global.PersonalWorkbenchBankLevels;
        if (!helper || !course) return '';
        if (course.id === 'preschool-minecraft') {
            const current = getMinecraftBand();
            const bands = [
                { id: 'MC-D1', title: '入门词' },
                { id: 'MC-D2', title: '进阶词' }
            ];
            const buttons = bands.map(function (band) {
                const active = band.id === current;
                return `<button class="preschool-flashcard-level ${active ? 'is-active' : ''}" type="button" data-action="set-minecraft-band" data-level="${escapeHtml(band.id)}" aria-pressed="${active ? 'true' : 'false'}">${escapeHtml(band.title)}</button>`;
            }).join('');
            return `<div class="preschool-flashcard-levels" role="group" aria-label="选择Minecraft词组">${buttons}</div>`;
        }
        const track = helper.trackForCourse(course.id);
        const hideEnglishPracticeLevels = course.id === 'preschool-english';
        if (hideEnglishPracticeLevels || course.id === 'preschool-focus' || course.id === 'preschool-summer') return '';
        const current = getPracticeLevel(track);
        const defs = typeof helper.getDefinitions === 'function' ? helper.getDefinitions(track) : [];
        if (!defs.length) return '';
        const buttons = defs.map(function (band) {
            const active = band.id === current;
            const caption = `${band.id} ${band.title}`;
            return `<button class="preschool-flashcard-level ${active ? 'is-active' : ''}" type="button" data-action="set-practice-level" data-track="${escapeHtml(track)}" data-level="${escapeHtml(band.id)}" aria-pressed="${active ? 'true' : 'false'}">${escapeHtml(caption)}</button>`;
        }).join('');
        return `<div class="preschool-flashcard-levels" role="group" aria-label="选择练习级别">${buttons}</div>`;
    }

    function setMinecraftBand(level) {
        ui.minecraftBand = level === 'MC-D2' ? 'MC-D2' : 'MC-D1';
        ui.courseCards = null;
        render();
    }

    function setPracticeLevel(track, level) {
        if (!isPreschool || !preschoolGarden || typeof preschoolGarden.setPracticeLevel !== 'function') return;
        const helper = global.PersonalWorkbenchBankLevels;
        const label = helper && typeof helper.labelFor === 'function' ? helper.labelFor(level, track) : level;
        const ok = commit(function (next) {
            const result = preschoolGarden.setPracticeLevel(next.growth, track, level);
            if (!result.ok) throw new Error(result.reason || '级别无法保存');
            next.growth = result.growth;
        }, '已换成' + (label || '当前级别'));
        if (ok) {
            ui.courseCards = null;
            render();
        }
    }

    function renderPreschoolPracticeLevelSettings() {
        const helper = global.PersonalWorkbenchBankLevels;
        const rows = PRACTICE_LEVEL_ROWS.map(function (row) {
            const current = getPracticeLevel(row.track);
            const defs = helper && typeof helper.getDefinitions === 'function' ? helper.getDefinitions(row.track) : [];
            const chips = defs.map(function (band) {
                const active = band.id === current;
                const caption = `${band.id} ${band.title}`;
                return `<button class="preschool-practice-level-chip ${active ? 'is-active' : ''}" type="button" data-action="set-practice-level" data-track="${escapeHtml(row.track)}" data-level="${escapeHtml(band.id)}" aria-pressed="${active ? 'true' : 'false'}"><strong>${escapeHtml(caption)}</strong><small>${escapeHtml(band.summary || '')}</small></button>`;
            }).join('');
            return `<article class="preschool-practice-level-row"><h3>${escapeHtml(row.title)}</h3><div class="preschool-practice-level-chips">${chips}</div></article>`;
        }).join('');
        return `<section class="pixel-feedback-settings practice-level-settings"><div class="pixel-feedback-copy"><span class="pixel-panel-kicker">LEARN / LEVELS</span><h2>学习级别</h2><p>按现在会的来选。识字、拼音、古诗、拼读、数学题库和运动都可以单独换。英语按主题顺序自动往下学。口算范围还在下面另选。</p></div>${rows}</section>`;
    }

    function getMathPracticeBand() {
        const garden = state.growth && state.growth.garden;
        const engine = getMathBankEngine();
        const raw = garden && garden.mathPracticeBand;
        if (engine && typeof engine.normalizePracticeBand === 'function') return engine.normalizePracticeBand(raw);
        if (raw === 'within10' || raw === 'within20' || raw === 'within50' || raw === 'addsub100' || raw === 'mix100') return raw;
        if (raw === 'within100') return 'mix100';
        return 'mix100';
    }

    function setMathPracticeBand(band) {
        if (!isPreschool || !preschoolGarden || typeof preschoolGarden.setMathPracticeBand !== 'function') return;
        const nextBand = getMathBankEngine() && typeof getMathBankEngine().normalizePracticeBand === 'function'
            ? getMathBankEngine().normalizePracticeBand(band)
            : band;
        const labels = { within10: '10 以内', within20: '20 以内', within50: '50 以内', addsub100: '100 以内', mix100: '100 以内 + 乘法' };
        const ok = commit(function (next) {
            const result = preschoolGarden.setMathPracticeBand(next.growth, nextBand);
            if (!result.ok) throw new Error(result.reason || '口算级别无法保存');
            next.growth = result.growth;
        }, '口算已换成' + (labels[nextBand] || '当前级别'));
        if (ok) render();
    }

    function renderPreschoolMathBandSettings() {
        const engine = getMathBankEngine();
        const bands = engine && typeof engine.listPracticeBands === 'function' ? engine.listPracticeBands() : [];
        const current = getMathPracticeBand();
        const cards = bands.map(function (band) {
            const active = band.id === current;
            return `<button class="pixel-feedback-option ${active ? 'is-active' : ''}" type="button" data-action="set-math-band" data-band="${escapeHtml(band.id)}" aria-pressed="${active ? 'true' : 'false'}"><strong>${escapeHtml(band.title)}</strong><small>${escapeHtml(band.summary)}</small>${active ? icon('check') : ''}</button>`;
        }).join('');
        return `<section class="pixel-feedback-settings math-band-settings"><div class="pixel-feedback-copy"><span class="pixel-panel-kicker">MATH / PRACTICE</span><h2>口算级别</h2><p>按现在会的来选。当前默认是 100 以内加减，加上 20 以内简单乘法。</p></div><div class="pixel-feedback-options">${cards}</div></section>`;
    }

    function renderPreschoolFeedbackSettings() {
        const growth = getChildGrowth();
        const musicEnabled = getPreschoolFeedbackPreference('musicEnabled', false);
        const motionEnabled = getPreschoolFeedbackPreference('motionEnabled', true);
        return `<section class="pixel-feedback-settings"><div class="pixel-feedback-copy"><span class="pixel-panel-kicker">GARDEN / FEEDBACK</span><h2>声音和反馈</h2><p>音乐默认关闭，点击后才会播放；关闭动效时，任务和防守仍然正常。</p></div><div class="pixel-feedback-options"><label class="pixel-feedback-option"><input type="checkbox" data-action="toggle-music" ${musicEnabled ? 'checked' : ''}><span>${icon('music-2')}</span><strong>花园音乐</strong><small>${musicEnabled ? '正在准备' : '轻轻的冒险旋律'}</small></label><label class="pixel-feedback-option"><input type="checkbox" data-action="toggle-motion" ${motionEnabled ? 'checked' : ''}><span>${icon('sparkles')}</span><strong>动效</strong><small>${motionEnabled ? '植物会呼吸' : '只保留状态变化'}</small></label><label class="pixel-feedback-option"><input type="checkbox" data-action="toggle-voice" ${growth.voiceEnabled ? 'checked' : ''}><span>${icon('volume-2')}</span><strong>语音夸奖</strong><small>${growth.voiceEnabled ? '完成任务会夸夸' : '需要时再打开'}</small></label></div></section>`;
    }

    function selectPreschoolTheme(themeId) {
        if (!isPreschool || !workbenchConfig.themes || !workbenchConfig.themes[themeId] || themeId === getPreschoolThemeId()) return;
        const theme = workbenchConfig.themes[themeId];
        const ok = commit(function (next) {
            next.preschoolTheme = themeId;
        }, '');
        if (!ok) return;
        if (typeof location !== 'undefined' && typeof history !== 'undefined' && typeof URLSearchParams !== 'undefined') {
            const params = new URLSearchParams(location.search || '');
            params.set('theme', themeId);
            history.replaceState(null, '', `${location.pathname}?${params.toString()}${location.hash || ''}`);
        }
        if (global.PersonalWorkbenchLauncher && typeof global.PersonalWorkbenchLauncher.rememberTheme === 'function') {
            global.PersonalWorkbenchLauncher.rememberTheme(themeId);
        }
        applyPreschoolTheme();
        render();
        showToast(`已切换到${theme.name}`);
    }

    async function refreshAccountData() {
        if (!api || !api.getAccount()) {
            accountView.households = [];
            accountView.children = [];
            accountView.selectedHouseholdId = '';
            accountView.error = '';
            render();
            return;
        }
        accountView.loading = true;
        accountView.error = '';
        render();
        const householdsResult = await api.listHouseholds();
        if (!householdsResult.ok) {
            accountView.loading = false;
            accountView.error = householdsResult.message || '家庭列表读取失败';
            render();
            showToast(accountView.error, true);
            return;
        }
        accountView.households = Array.isArray(householdsResult.payload && householdsResult.payload.households) ? householdsResult.payload.households : [];
        const childrenResult = await api.listChildren();
        accountView.children = childrenResult.ok && Array.isArray(childrenResult.payload && childrenResult.payload.children) ? childrenResult.payload.children : [];
        const active = api.getActiveChild();
        const preferred = (active && accountView.children.find(item => item.id === active.id)) || accountView.children.find(item => item.localProfileId === state.profileId) || accountView.children[0];
        if (preferred && (!active || active.id !== preferred.id)) api.setActiveChild(preferred);
        accountView.selectedHouseholdId = (preferred && preferred.householdId) || (accountView.households[0] && accountView.households[0].id) || '';
        accountView.loading = false;
        accountView.error = childrenResult.ok ? '' : (childrenResult.message || '工作台档案读取失败');
        render();
    }

    function formValue(target, name) {
        const form = target.closest('form');
        const field = form && form.elements ? form.elements[name] : null;
        return field ? String(field.value || '').trim() : '';
    }

    async function saveApiBase(target) {
        const baseUrl = formValue(target, 'baseUrl');
        if (!/^https?:\/\//i.test(baseUrl)) {
            showToast('请输入 http:// 或 https:// 开头的 API 地址。', true);
            return;
        }
        api.setBaseUrl(baseUrl);
        render();
        showToast('API 地址已保存，请登录账号。');
    }

    async function authenticateAccount(target, mode) {
        const username = formValue(target, 'username');
        const password = formValue(target, 'password');
        const displayName = formValue(target, 'displayName');
        const registrationCode = formValue(target, 'registrationCode');
        if (!username || !password || (mode === 'register' && !displayName)) {
            showToast(mode === 'register' ? '注册需要填写用户名、密码和显示名称。' : '请输入用户名和密码。', true);
            return;
        }
        const result = mode === 'register'
            ? await api.register(Object.assign({ username: username, password: password, displayName: displayName }, registrationCode ? { registrationCode: registrationCode } : {}))
            : await api.login({ username: username, password: password });
        if (!result.ok) {
            showToast(result.message || (mode === 'register' ? '注册失败。' : '登录失败。'), true);
            return;
        }
        showToast(mode === 'register' ? '账号已注册并登录。' : '登录成功。');
        await refreshAccountData();
    }

    async function createHousehold(target) {
        const name = formValue(target, 'name');
        if (!name) return showToast('请先填写家庭名称。', true);
        const result = await api.createHousehold(name);
        if (!result.ok) return showToast(result.message || '家庭创建失败。', true);
        showToast('家庭已创建。');
        await refreshAccountData();
    }

    async function createChild(target) {
        const householdId = document.querySelector('[data-account-household]') && document.querySelector('[data-account-household]').value;
        const name = formValue(target, 'name');
        if (!householdId) return showToast('请先创建或选择一个家庭。', true);
        if (!name) return showToast('请填写工作台档案名称。', true);
        const result = await api.createChild(householdId, name, state.profileId || 'local-default');
        if (!result.ok) return showToast(result.message || '工作台档案创建失败。', true);
        if (result.payload && result.payload.child) api.setActiveChild(result.payload.child);
        showToast('工作台档案已创建。');
        await refreshAccountData();
    }

    function selectAccountChild(id) {
        const child = accountView.children.find(item => item.id === id);
        if (!child) return;
        api.setActiveChild(child);
        if (child.localProfileId && child.localProfileId !== state.profileId) {
            const result = repository.update(function (next) { next.profileId = child.localProfileId; });
            if (result.ok) state = result.state;
        }
        render();
        showToast(`已选择“${child.name}”工作台档案。`);
    }

    function localSyncTime() {
        const value = new Date();
        return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')} ${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
    }

    async function pullRemoteSnapshot() {
        const result = await api.pullSnapshot();
        if (!result.ok) return showToast(result.message || (result.code === 'SNAPSHOT_REVISION_CONFLICT' ? '远端快照发生冲突。' : '云端恢复失败。'), true);
        const remote = result.payload && result.payload.snapshot;
        if (!remote || !remote.payload) return showToast('云端还没有这份工作台快照。');
        if (!window.confirm('从云端恢复会覆盖当前设备的工作台数据，确定继续吗？')) return;
        const next = storage.normalizeState(remote.payload);
        next.revision = Math.max(Number(remote.revision) || 0, Number(next.revision) || 0, Number(state.revision) || 0);
        const saved = repository.save(next);
        if (!saved.ok) return showToast('云端数据已读取，但本地写入失败。', true);
        state = saved.state;
        accountView.lastSyncAt = localSyncTime();
        accountView.lastRemoteRevision = Number(remote.revision) || 0;
        render();
        showToast('已从云端恢复工作台。');
    }

    async function pushRemoteSnapshot() {
        const result = await api.pushSnapshot(state);
        if (!result.ok) {
            if (result.code === 'SNAPSHOT_REVISION_CONFLICT') {
                accountView.lastRemoteRevision = Number(result.latestRevision) || 0;
                render();
                showToast(`云端已有更新（revision ${accountView.lastRemoteRevision || '未知'}），请先从云端恢复。`, true);
            } else showToast(result.message || '上传快照失败。', true);
            return;
        }
        accountView.lastSyncAt = localSyncTime();
        accountView.lastRemoteRevision = Number(result.payload && result.payload.snapshot && result.payload.snapshot.revision) || state.revision;
        render();
        showToast('当前工作台已上传到云端。');
    }

    function speakResource(message) {
        if (!isChild || !global.speechSynthesis || !global.SpeechSynthesisUtterance) {
            showToast('当前浏览器暂不支持朗读素材。', true);
            return;
        }
        try {
            global.speechSynthesis.cancel();
            const utterance = new global.SpeechSynthesisUtterance(String(message || ''));
            utterance.lang = 'zh-CN';
            utterance.rate = 0.88;
            global.speechSynthesis.speak(utterance);
            showToast('正在朗读这张素材');
        } catch (error) {
            console.warn('[PersonalWorkbench] 素材朗读失败', error);
            showToast('这张素材暂时读不了，请直接看一看。', true);
        }
    }

    function openExternalResource(url) {
        const target = String(url || '').trim();
        if (!target) return;
        const allowed = /^https:\/\//.test(target) || /^http:\/\//.test(target);
        if (!allowed) {
            showToast('这个资源地址不正确，请检查配置。', true);
            return;
        }
        global.open(target, '_blank', 'noopener');
    }

    function speakPraise(message) {
        if (!isChild || !global.speechSynthesis || !global.SpeechSynthesisUtterance) return;
        const growth = getChildGrowth();
        if (!growth.voiceEnabled) return;
        try {
            global.speechSynthesis.cancel();
            const utterance = new global.SpeechSynthesisUtterance(message);
            utterance.lang = 'zh-CN';
            utterance.rate = 0.95;
            global.speechSynthesis.speak(utterance);
        } catch (error) {
            console.warn('[PersonalWorkbench] 语音夸奖失败', error);
        }
    }

    function getPreschoolFeedbackPreference(key, fallback) {
        const garden = state.growth && state.growth.garden;
        const preferences = garden && garden.feedbackPreferences;
        return preferences && Object.prototype.hasOwnProperty.call(preferences, key) ? Boolean(preferences[key]) : fallback;
    }

    function stopPreschoolMusic() {
        if (document.body) document.body.classList.remove('preschool-music-active');
        if (!preschoolMusic) return;
        window.clearInterval(preschoolMusic.timer);
        const context = preschoolMusic.context;
        preschoolMusic = null;
        if (context && typeof context.close === 'function') context.close().catch(function (error) { console.warn('[PersonalWorkbench] 花园音乐停止失败', error); });
    }

    function startPreschoolMusic() {
        if (!isPreschool || !getPreschoolFeedbackPreference('musicEnabled', false) || preschoolMusic) return;
        const AudioContext = global.AudioContext || global.webkitAudioContext;
        if (!AudioContext) return;
        try {
            const context = new AudioContext();
            const master = context.createGain();
            master.gain.value = 0.035;
            master.connect(context.destination);
            const notes = [261.63, 329.63, 392.00, 329.63, 293.66, 349.23, 440.00, 349.23];
            let noteIndex = 0;
            const playNote = function () {
                if (!preschoolMusic) return;
                const oscillator = context.createOscillator();
                const gain = context.createGain();
                const now = context.currentTime;
                oscillator.type = 'triangle';
                oscillator.frequency.value = notes[noteIndex % notes.length];
                gain.gain.setValueAtTime(0.001, now);
                gain.gain.exponentialRampToValueAtTime(0.22, now + 0.035);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
                oscillator.connect(gain);
                gain.connect(master);
                oscillator.start(now);
                oscillator.stop(now + 0.45);
                noteIndex += 1;
            };
            preschoolMusic = { context: context, master: master, timer: window.setInterval(playNote, 620) };
            if (document.body) document.body.classList.add('preschool-music-active');
            playNote();
            if (context.state === 'suspended') context.resume().catch(function (error) { console.warn('[PersonalWorkbench] 花园音乐启动失败', error); });
        } catch (error) {
            console.warn('[PersonalWorkbench] 花园音乐不可用', error);
        }
    }

    function setPreschoolFeedbackPreference(key, enabled) {
        if (!isPreschool || !preschoolGarden || typeof preschoolGarden.setFeedbackPreference !== 'function') return;
        const ok = commit(function (next) {
            const result = preschoolGarden.setFeedbackPreference(next.growth, key, enabled);
            if (!result.ok) throw new Error(result.reason);
            next.growth = result.growth;
        }, enabled ? '反馈已打开' : '反馈已关闭');
        if (!ok) return;
        if (key === 'musicEnabled') {
            if (document.body) document.body.classList.toggle('preschool-music-active', Boolean(enabled));
            if (enabled) startPreschoolMusic();
            else stopPreschoolMusic();
        }
    }

    function preschoolEventType(awardId) {
        const id = String(awardId || '');
        if (id.startsWith('lesson:')) return 'lesson-complete';
        if (id.startsWith('task:')) return 'task-complete';
        if (id.startsWith('reading:')) return 'reading-complete';
        return 'checkin-complete';
    }

    function collectionTitles(ids) {
        if (!preschoolGarden || !Array.isArray(ids)) return [];
        return ids.map(function (id) {
            const item = preschoolGarden.COLLECTION_CATALOG.find(entry => entry.id === id);
            return item ? item.title : '';
        }).filter(Boolean);
    }

    function pulsePreschoolHud(payload) {
        if (!isPreschool) return;
        const targets = [];
        const sun = document.querySelector('.pixel-hud-sun');
        const defense = document.querySelector('.pixel-hud-defense');
        if (sun && payload && payload.amount) targets.push(sun);
        if (defense && payload && payload.defenseEnergyGranted) targets.push(defense);
        if (!targets.length) return;
        if (preschoolHudPulseTimer) window.clearTimeout(preschoolHudPulseTimer);
        targets.forEach(function (target) {
            target.classList.remove('is-bumped');
            void target.offsetWidth;
            target.classList.add('is-bumped');
        });
        preschoolHudPulseTimer = window.setTimeout(function () {
            targets.forEach(function (target) { target.classList.remove('is-bumped'); });
            preschoolHudPulseTimer = 0;
        }, getPreschoolFeedbackPreference('motionEnabled', true) ? 720 : 40);
    }

    function showPreschoolCelebration(payload) {
        if (!isPreschool || !payload) return;
        const old = document.querySelector('.preschool-celebration');
        if (old) old.remove();
        if (preschoolCelebrationTimer) window.clearTimeout(preschoolCelebrationTimer);
        const rewards = collectionTitles(payload.rewardIds || []);
        const message = payload.invaderDefeated ? '僵尸被赶走啦！' : payload.message || '做得真棒！';
        const detail = [payload.detail || '', payload.amount ? `阳光 +${payload.amount}` : '', payload.defenseEnergyGranted ? '豌豆能量 +1' : '', rewards.length ? `获得：${rewards.join('、')}` : ''].filter(Boolean).join(' · ');
        const resourceMarkup = [
            payload.amount ? `<span>${preschoolAsset('sun-token', '阳光')}<b>+${escapeHtml(payload.amount)}</b></span>` : '',
            payload.defenseEnergyGranted ? `<span>${preschoolAsset('player-energy-bars', '豌豆能量')}<b>+1</b></span>` : ''
        ].filter(Boolean).join('');
        const node = document.createElement('div');
        node.className = 'preschool-celebration';
        node.setAttribute('role', 'status');
        node.setAttribute('aria-live', 'polite');
        node.innerHTML = `<span class="preschool-celebration-icon">${icon(payload.invaderDefeated ? 'shield-check' : rewards.length ? 'album' : 'sparkles')}</span><strong>${escapeHtml(message)}</strong>${detail ? `<small>${escapeHtml(detail)}</small>` : ''}${resourceMarkup ? `<span class="preschool-celebration-resources">${resourceMarkup}</span>` : ''}`;
        document.body.appendChild(node);
        global.lucide.createIcons({ root: node });
        pulsePreschoolHud(payload);
        preschoolCelebrationTimer = window.setTimeout(function () {
            node.remove();
            preschoolCelebrationTimer = 0;
        }, 2200);
    }

    function submitFamilyForm(form) {
        if (!familyRepository) return;
        const values = Object.fromEntries(new FormData(form).entries());
        const result = familyRepository.add({ author: values.author, kind: values.kind, body: values.body });
        if (!result.ok) return showToast(result.error && result.error.message ? result.error.message : '家庭互动保存失败。', true);
        render();
        showToast('家庭互动已发送。');
    }

    function applyPreschoolAchievements(next) {
        if (!isPreschool || !global.PersonalWorkbenchAchievements || typeof global.PersonalWorkbenchAchievements.checkAchievements !== 'function') return [];
        const result = global.PersonalWorkbenchAchievements.checkAchievements(next, {
            catalog: Array.isArray(workbenchConfig.childCourses) ? workbenchConfig.childCourses : [],
            banks: getLevelBanks()
        });
        if (result && result.growth) next.growth = result.growth;
        if (global.PersonalWorkbenchPet && typeof global.PersonalWorkbenchPet.takePendingHappiness === 'function') {
            const pending = global.PersonalWorkbenchPet.takePendingHappiness();
            if (pending) next.growth = global.PersonalWorkbenchPet.addHappiness(next.growth || {}, pending);
        }
        return result && Array.isArray(result.newlyUnlocked) ? result.newlyUnlocked : [];
    }

    function feedPreschoolPet() {
        if (!isPreschool || !global.PersonalWorkbenchPet) return;
        let evolved = false;
        const ok = commit(function (next) {
            const result = global.PersonalWorkbenchPet.feed(next.growth, Date.now());
            if (!result.ok) throw new Error(result.reason);
            next.growth = result.growth;
            evolved = result.evolved;
        }, '');
        if (ok) {
            showToast(evolved ? '伙伴进化了！' : '喂饱啦');
            if (evolved && global.PersonalWorkbenchPet.showEvolution) {
                global.PersonalWorkbenchPet.showEvolution(getPreschoolThemeId(), state.growth && state.growth.pet && state.growth.pet.stage);
            }
        }
    }

    function patPreschoolPet() {
        if (!isPreschool || !global.PersonalWorkbenchPet) return;
        const ok = commit(function (next) {
            next.growth = global.PersonalWorkbenchPet.pat(next.growth, Date.now());
        }, '');
        if (ok) showToast('摸摸，好开心');
    }

    function reviewGrowthWorld(text, lang, toast) {
        if (!text) return;
        if (toast) showToast(toast);
        if (!global.speechSynthesis || !global.SpeechSynthesisUtterance) return;
        try {
            global.speechSynthesis.cancel();
            const utterance = new global.SpeechSynthesisUtterance(String(text));
            utterance.lang = lang || 'zh-CN';
            utterance.rate = 0.85;
            global.speechSynthesis.speak(utterance);
        } catch (error) {
            console.warn('[PersonalWorkbench] 成长世界复习发音失败', error);
        }
    }

    function markPreschoolBadgesSeen(ids) {
        const engine = global.PersonalWorkbenchAchievements;
        if (!isPreschool || !engine || typeof engine.markAchievementsSeen !== 'function') return false;
        const unseen = typeof engine.unseenBadgeIds === 'function'
            ? engine.unseenBadgeIds(state.growth && state.growth.achievements)
            : [];
        if (!unseen.length) return false;
        const pending = Array.isArray(ids) && ids.length
            ? ids.filter(function (id) { return unseen.indexOf(id) >= 0; })
            : unseen;
        if (!pending.length) return false;
        return commit(function (next) {
            next.growth.achievements = engine.markAchievementsSeen(next.growth.achievements, pending);
        }, '');
    }

    function togglePreschoolBadgeBox() {
        ui.badgeBoxOpen = !ui.badgeBoxOpen;
        if (!ui.badgeBoxOpen && markPreschoolBadgesSeen()) return;
        render();
        if (ui.badgeBoxOpen) {
            const box = document.getElementById('preschool-badge-collection');
            if (box && typeof box.scrollIntoView === 'function') box.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    function reviewPreschoolBadge(target) {
        const text = target && target.dataset ? target.dataset.speak : '';
        if (!text) return;
        showToast(text);
        speakPraise(text);
        const badgeId = target && target.dataset ? target.dataset.badgeId : '';
        if (badgeId) markPreschoolBadgesSeen([badgeId]);
    }

    function presentPreschoolAchievements(ids) {
        if (!isPreschool || !ids || !ids.length) return;
        ui.badgeBoxOpen = true;
        render();
        if (global.PersonalWorkbenchAchievements && typeof global.PersonalWorkbenchAchievements.showAchievementCelebration === 'function') {
            global.PersonalWorkbenchAchievements.showAchievementCelebration(ids, document, function () {
                markPreschoolBadgesSeen(ids);
            });
        }
        const defs = global.PersonalWorkbenchAchievements && global.PersonalWorkbenchAchievements.BADGE_DEFS
            ? global.PersonalWorkbenchAchievements.BADGE_DEFS
            : {};
        const names = ids.map(function (id) { return defs[id] && defs[id].name; }).filter(Boolean);
        if (names.length) speakPraise(names.length === 1 ? `点亮了${names[0]}！` : `一次点亮了${names.join('、')}！`);
    }

    function findTodayPreschoolEnglishPlan() {
        const today = storage.localDate();
        return (Array.isArray(state.dailyPlans) ? state.dailyPlans : []).find(function (item) {
            return item.date === today && (item.id === 'preschool-plan-draw' || item.category === '英语' || item.practiceLessonId === 'preschool-english-words-1');
        }) || null;
    }

    function completePreschoolPlanCheckIn(planId, planDate, source) {
        const before = findDailyPlan(state.dailyPlans, planId, planDate);
        if (!before || before.done) return false;
        let rewardGranted = false;
        let newBadges = [];
        const ok = commit(function (next) {
            const item = findDailyPlan(next.dailyPlans, planId, planDate);
            if (!item || item.done) return;
            item.done = true;
            item.completedAt = new Date().toISOString();
            const rewardId = storage.getPreschoolPlanRewardId(item);
            if (!item.completionRewardId) {
                item.completionRewardId = rewardId;
                rewardGranted = awardSunlight(next, rewardId, 10);
            }
            item.completionSource = item.completionSource || source || 'check-in';
            archiveItem(next, 'plan', item);
            newBadges = applyPreschoolAchievements(next);
            if (global.PersonalWorkbenchPet) next.growth = global.PersonalWorkbenchPet.awardExp(next.growth || {}, 5);
        }, '');
        if (ok) {
            showToast(isChild ? (rewardGranted ? '看视频也算打卡，获得 10 阳光' : '看视频也算打卡，阳光已经领取过啦') : '看视频也算打卡');
            speakPraise('今天的英语点亮啦！');
            presentPreschoolAchievements(newBadges);
        }
        return ok;
    }

    function checkInPreschoolEnglishFromMedia() {
        const plan = findTodayPreschoolEnglishPlan();
        if (!plan) return false;
        return completePreschoolPlanCheckIn(plan.id, plan.date, 'check-in');
    }

    function completeCourseLesson(id, planId, planDate) {
        const catalog = Array.isArray(workbenchConfig.childCourses) ? workbenchConfig.childCourses : [];
        const valid = catalog.some(course => Array.isArray(course.lessons) && course.lessons.some(lesson => lesson.id === id));
        if (!valid || !global.PersonalWorkbenchChildCourses) {
            showToast('这节课暂时不可用。', true);
            return false;
        }
        let lessonWasAlreadyComplete = false;
        let newBadges = [];
        const lessonRewardId = `lesson:${id}`;
        const ok = commit(function (next) {
            const sourcePlan = planId ? findDailyPlan(next.dailyPlans, planId, planDate) : null;
            if (planId && (!sourcePlan || sourcePlan.done)) throw new Error(sourcePlan && sourcePlan.done ? '这项计划已经完成了' : '找不到来源计划，请刷新页面后重试。');
            const match = findPreschoolLesson(id);
            recordSubjectProgressFromLesson(next, match);
            const result = global.PersonalWorkbenchChildCourses.completeLesson(next.courseProgress, id);
            if (!result.changed) {
                if (!sourcePlan) throw new Error('这节课已经完成了');
                lessonWasAlreadyComplete = true;
                sourcePlan.done = true;
                sourcePlan.completedAt = sourcePlan.completedAt || new Date().toISOString();
                sourcePlan.completionSource = 'practice';
                sourcePlan.completionRewardId = lessonRewardId;
                newBadges = applyPreschoolAchievements(next);
                if (global.PersonalWorkbenchPet) next.growth = global.PersonalWorkbenchPet.awardExp(next.growth || {}, 5);
                return;
            }
            next.courseProgress = result.progress;
            awardSunlight(next, lessonRewardId, 20);
            if (sourcePlan) {
                sourcePlan.done = true;
                sourcePlan.completedAt = new Date().toISOString();
                sourcePlan.completionSource = 'practice';
                sourcePlan.completionRewardId = lessonRewardId;
            }
            newBadges = applyPreschoolAchievements(next);
            if (global.PersonalWorkbenchPet) next.growth = global.PersonalWorkbenchPet.awardExp(next.growth || {}, 5);
        }, '');
        if (ok) {
            showToast(planId && lessonWasAlreadyComplete ? '练习已经完成，来源任务已同步。' : planId ? '练习完成，任务已同步，获得 20 阳光' : '课程完成，获得 20 阳光');
            speakPraise('太棒了，你完成了一节课！');
            presentPreschoolAchievements(newBadges);
        }
        return ok;
    }

    function claimStreakReward(id) {
        if (!isChild || !global.PersonalWorkbenchChildGrowth) return;
        let gardenEvent = null;
        const ok = commit(function (next) {
            const result = global.PersonalWorkbenchChildGrowth.claimStreakReward(next.growth, id, storage.localDate());
            if (!result.ok) throw new Error(result.reason);
            next.growth = result.growth;
            if (isPreschool && preschoolGarden) {
                gardenEvent = preschoolGarden.recordEvent(next.growth, `streak-${result.reward.days}`, storage.localDate(), `streak:${id}`);
                next.growth = gardenEvent.growth;
            }
        }, '连续奖励已领取');
        if (ok) {
            speakPraise('连续行动奖励到账啦！');
            showPreschoolCelebration({ message: '连续奖励到账啦！', rewardIds: gardenEvent ? gardenEvent.rewardIds : [] });
        }
    }

    function selectGrowthStyle(id) {
        if (!isChild || !global.PersonalWorkbenchChildGrowth) return;
        const ok = commit(function (next) {
            const result = global.PersonalWorkbenchChildGrowth.selectStyle(next.growth, id);
            if (!result.ok) throw new Error(result.reason);
            next.growth = result.growth;
        }, '星芒换上了新造型');
        if (ok) speakPraise('新造型真好看！');
    }

    function selectPreschoolPlant(id) {
        if (!isPreschool || !preschoolGarden) return;
        const ok = commit(function (next) {
            const result = preschoolGarden.selectPlant(next.growth, id);
            if (!result.ok) throw new Error(result.reason);
            next.growth = result.growth;
        }, '植物伙伴换好啦');
        if (ok) showPreschoolCelebration({ message: '植物伙伴换好啦！' });
    }

    function repairGrowthStreak() {
        if (!isChild || !global.PersonalWorkbenchChildGrowth) return;
        const ok = commit(function (next) {
            const result = global.PersonalWorkbenchChildGrowth.repairStreak(next.growth, storage.localDate());
            if (!result.ok) throw new Error(result.reason);
            next.growth = result.growth;
        }, '连续记录接上啦');
        if (ok) render();
    }

    function waterGrowthPlant() {
        if (!isChild || !global.PersonalWorkbenchChildGrowth) return;
        let gardenEvent = null;
        const ok = commit(function (next) {
            const result = global.PersonalWorkbenchChildGrowth.waterPlant(next.growth, storage.localDate());
            if (!result.ok) throw new Error(result.reason);
            next.growth = result.growth;
            if (isPreschool && preschoolGarden) {
                gardenEvent = preschoolGarden.recordEvent(next.growth, 'plant-watered', storage.localDate(), `plant-watered:${storage.localDate()}`);
                next.growth = gardenEvent.growth;
            }
        }, '植物喝饱水了');
        if (ok) {
            speakPraise('小花园又长大了一点！');
            showPreschoolCelebration({ message: '植物喝饱水啦！', rewardIds: gardenEvent ? gardenEvent.rewardIds : [] });
        }
    }

    function spawnPreschoolInvader() {
        if (!isPreschool || !preschoolGarden || typeof preschoolGarden.spawnInvader !== 'function') return;
        const ok = commit(function (next) {
            const result = preschoolGarden.spawnInvader(next.growth, storage.localDate());
            if (!result.changed) throw new Error('花园里已经有一波僵尸了');
            next.growth = result.growth;
        }, '僵尸来啦，准备守护花园！');
        if (ok) showPreschoolCelebration({ message: '僵尸来啦！', detail: '完成任务收集豌豆能量。' });
    }

    function startPreschoolDefenseGame() {
        if (!isPreschool || !preschoolGarden || typeof preschoolGarden.startDefenseGame !== 'function') return;
        commit(function (next) {
            const result = preschoolGarden.startDefenseGame(next.growth, storage.localDate());
            next.growth = result.growth;
        }, '花园游戏开始啦');
    }

    function placePreschoolDefensePlant(lane, column, plantId) {
        if (!isPreschool || !preschoolGarden || typeof preschoolGarden.placeDefensePlant !== 'function') return;
        const ok = commit(function (next) {
            const current = preschoolGarden.normalize(next.growth);
            let selected = current;
            if (plantId && plantId !== current.garden.activePlantId) {
                const selectResult = preschoolGarden.selectPlant(current, plantId);
                if (!selectResult.ok) throw new Error(selectResult.reason);
                selected = selectResult.growth;
            }
            const result = preschoolGarden.placeDefensePlant(selected, lane, column);
            if (!result.ok) throw new Error(result.reason);
            next.growth = result.growth;
        }, '植物种下啦');
        if (ok) speakPraise('植物伙伴好！');
    }

    function spawnPreschoolDefenseWave() {
        if (!isPreschool || !preschoolGarden || typeof preschoolGarden.spawnDefenseWave !== 'function') return;
        const ok = commit(function (next) {
            const result = preschoolGarden.spawnDefenseWave(next.growth, storage.localDate());
            if (!result.ok) throw new Error(result.reason);
            next.growth = result.growth;
        }, '僵尸来啦，植物开始行动！');
        if (ok) speakPraise('看清路线，守护花园！');
    }

    function animatePreschoolPea(effect) {
        const battlefield = document.querySelector('.pixel-battlefield');
        const lane = battlefield && (battlefield.querySelector('.pixel-battle-lane-row.is-target') || battlefield.querySelector('.pixel-battle-lane-row.is-defeated') || battlefield.querySelector('.pixel-battle-lane-row'));
        if (!battlefield || !lane) return;
        const skill = String(effect || 'pea');
        if (!['pea', 'ice-pea', 'blast'].includes(skill)) return;
        if (preschoolPeaTimer) window.clearTimeout(preschoolPeaTimer);
        battlefield.classList.remove('preschool-pea-fired');
        battlefield.classList.remove('preschool-cherry-blast');
        void battlefield.offsetWidth;
        const projectile = skill === 'blast' ? document.createElement('span') : document.createElement('span');
        projectile.className = skill === 'blast' ? 'pixel-cherry-explosion' : `pixel-pea-projectile${skill === 'ice-pea' ? ' is-ice' : ''}`;
        projectile.setAttribute('aria-hidden', 'true');
        const flash = lane.querySelector('.pixel-hit-flash');
        lane.appendChild(projectile);
        if (flash) flash.setAttribute('data-hit', 'true');
        if (skill === 'blast') battlefield.classList.add('preschool-cherry-blast');
        else battlefield.classList.add('preschool-pea-fired');
        preschoolPeaTimer = window.setTimeout(function () {
            projectile.remove();
            if (flash) flash.removeAttribute('data-hit');
            battlefield.classList.remove('preschool-pea-fired');
            battlefield.classList.remove('preschool-cherry-blast');
            preschoolPeaTimer = 0;
        }, getPreschoolFeedbackPreference('motionEnabled', true) ? 680 : 40);
    }

    function usePreschoolPlantSkill() {
        if (!isPreschool || !preschoolGarden || typeof preschoolGarden.usePlantSkill !== 'function') return;
        let result;
        const ok = commit(function (next) {
            result = preschoolGarden.usePlantSkill(next.growth, storage.localDate());
            if (!result.ok) throw new Error(result.reason);
            next.growth = result.growth;
        }, null);
        if (!ok || !result) return;
        if (result.defeated) {
            if (preschoolBattleEffectTimer) window.clearTimeout(preschoolBattleEffectTimer);
            ui.battleEffect = { defeated: result.defeated, effect: result.effect };
            render();
            preschoolBattleEffectTimer = window.setTimeout(function () {
                ui.battleEffect = null;
                preschoolBattleEffectTimer = 0;
                if (ui.page === 'battle') render();
            }, getPreschoolFeedbackPreference('motionEnabled', true) ? 760 : 80);
        }
        animatePreschoolPea(result.effect);
        const feedback = {
            sunlight: ['阳光收集到啦！', '向日葵让花园亮晶晶。'],
            pea: ['命中啦！', '豌豆射手正在守护花园。'],
            'ice-pea': ['冰冻命中！', '僵尸会慢一点啦。'],
            block: ['坚果挡住啦！', '它不能攻击，只负责保护大家。'],
            blast: ['樱桃爆炸啦！', '大范围技能清出一条路。']
        }[result.effect] || ['植物技能发动啦！', '每个伙伴都有自己的本领。'];
        speakPraise(result.defeated ? '太棒啦，僵尸被赶走了！' : feedback[0]);
        showPreschoolCelebration({ message: result.defeated ? '僵尸被赶走啦！' : feedback[0], detail: result.defeated ? '它倒下后会离开花园，继续收集阳光吧。' : feedback[1], invaderDefeated: result.defeated });
        return result;
    }

    function firePreschoolPea() {
        return usePreschoolPlantSkill();
    }

    function renderTaskCard(item) {
        const color = CATEGORY_COLORS[item.category] || 'blue';
        const overdue = item.dueDate && item.dueDate < storage.localDate() && item.status !== 'done';
        return `<article class="list-card"><div class="task-header"><div class="list-card-main"><span class="list-card-mark ${color}">${icon(item.status === 'done' ? 'circle-check' : 'list-todo')}</span><div class="list-card-copy"><h3>${escapeHtml(item.title)}</h3><div class="list-card-subline"><span class="tag ${color}">${escapeHtml(item.category || '其它')}</span><span class="tag ${item.priority === 'high' ? 'orange' : ''}">${PRIORITY_LABELS[item.priority] || '常规'}</span><span>${item.estimateMinutes || 25} 分钟</span></div></div></div><div class="row-actions"><button class="row-action" type="button" data-action="edit-task" data-id="${escapeHtml(item.id)}" aria-label="编辑任务" title="编辑任务">${icon('edit-3')}</button><button class="row-action danger" type="button" data-action="delete-task" data-id="${escapeHtml(item.id)}" aria-label="删除任务" title="删除任务">${icon('trash-2')}</button></div></div><div class="card-toolbar"><input type="range" min="0" max="100" step="5" value="${clamp(item.progress, 0, 100)}" data-action="task-progress" data-id="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.title)} 的完成进度"><output>${clamp(item.progress, 0, 100)}%</output><span class="task-due ${overdue ? 'is-overdue' : ''}">${icon('calendar-days')}${overdue ? '已逾期' : formatDate(item.dueDate)}</span></div></article>`;
    }

    function renderReading(derived) {
        const pages = state.readingLogs.filter(item => derived.week.includes(item.date)).reduce((sum, item) => sum + (Number(item.pages) || 0), 0);
        return `${renderIntro(PAGE_META.reading, 'add-reading', '记录今日阅读')}
            <div class="reading-summary">${renderMetric('本周阅读', formatDuration(derived.weekReading), '过去 7 天', 'book-open', 'positive')}${renderMetric('本月累计', formatDuration(derived.monthReading), '本月输入', 'calendar-days', '')}${renderMetric('阅读页数', `${pages} 页`, '过去 7 天', 'book-marked', '')}</div>
            <section class="work-card reading-chart-card"><div class="work-card-header"><div><h2>本周阅读趋势</h2><p>给每天的输入留下一条线</p></div>${icon('chart-column')}</div>${renderChart(derived.week, derived.readingByDate, 'min')}</section>
            <section class="work-card"><div class="work-card-header"><div><h2>阅读记录</h2><p>标题、时间和一句值得回看的话</p></div><span class="inline-stat">${state.readingLogs.length} 条记录</span></div>${renderReadingRows(state.readingLogs.slice().sort((a, b) => String(b.date).localeCompare(String(a.date))), false)}</section>`;
    }

    function renderGoals() {
        return `${renderIntro(PAGE_META.goals, 'add-goal', '添加成长目标')}
            <div class="list-stack">${state.goals.length ? state.goals.map(function (item) {
                const color = item.color || 'orange';
                return `<article class="goal-card"><div class="goal-card-copy"><div class="list-card-subline"><span class="tag ${color}">${escapeHtml(item.period || '长期')}</span><span>${formatLongDate(String(item.updatedAt || '').slice(0, 10))} 更新</span></div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description || '给这个目标写下一句提醒。')}</p><div class="goal-card-progress"><input type="range" min="0" max="100" step="1" value="${clamp(item.progress, 0, 100)}" data-action="goal-progress" data-id="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.title)} 的完成进度"><output>${clamp(item.progress, 0, 100)}%</output></div></div><div class="goal-card-side"><strong>${clamp(item.progress, 0, 100)}%</strong><small>${item.current || 0} / ${item.target || 1} 个里程碑</small><div class="row-actions" style="margin-top:14px;opacity:1"><button class="row-action" type="button" data-action="edit-goal" data-id="${escapeHtml(item.id)}" aria-label="编辑成长目标" title="编辑成长目标">${icon('edit-3')}</button><button class="row-action danger" type="button" data-action="delete-goal" data-id="${escapeHtml(item.id)}" aria-label="删除成长目标" title="删除成长目标">${icon('trash-2')}</button></div></div></article>`;
            }).join('') : renderEmpty('target', '还没有成长目标，先写一个想持续做下去的方向。')}</div>`;
    }

    function renderReviews() {
        const items = state.reviews.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
        return `${renderIntro(PAGE_META.reviews, 'add-review', '添加复盘')}
            <div class="list-stack">${items.length ? items.map(function (item) {
                return `<article class="list-card"><div class="task-header"><div><div class="mood-mark">${icon(item.mood === 'steady' ? 'heart-pulse' : 'lightbulb')}${item.mood === 'steady' ? '状态稳定' : '发现一个提醒'} · ${formatDate(item.date)}</div><h3 style="margin-top:8px">${escapeHtml(item.title)}</h3></div><div class="row-actions" style="opacity:1"><button class="row-action" type="button" data-action="edit-review" data-id="${escapeHtml(item.id)}" aria-label="编辑复盘" title="编辑复盘">${icon('edit-3')}</button><button class="row-action danger" type="button" data-action="delete-review" data-id="${escapeHtml(item.id)}" aria-label="删除复盘" title="删除复盘">${icon('trash-2')}</button></div></div><p class="review-body" style="margin-top:13px">${escapeHtml(item.body || '还没有写下正文。')}</p><p class="review-next"><strong>下一步</strong> ${escapeHtml(item.nextAction || '还没有写下下一步。')}</p></article>`;
            }).join('') : renderEmpty('notebook-pen', '复盘不是总结报告，只要写下一句真实感受。')}</div>`;
    }

    function renderEmpty(iconName, text) {
        return `<div class="empty-state">${icon(iconName)}<span>${text}</span></div>`;
    }

    function openDialog(type, id, area, date) {
        ui.dialogType = type;
        ui.dialogId = id || '';
        ui.dialogDate = String(date || '');
        const item = id ? findItem(type, id, ui.dialogDate) : null;
        ui.dialogDate = ui.dialogDate || (item && item.date) || '';
        ui.dialogArea = area || (item && item.area) || '';
        const today = storage.localDate();
        const configs = {
            plan: { eyebrow: 'NEW PLAN', title: id ? '编辑今日计划' : '添加今日计划', form: `<div class="form-grid"><div class="field full"><label for="entry-title">计划内容</label><input id="entry-title" name="title" required maxlength="80" placeholder="例如：阅读 30 分钟" value="${escapeHtml(item ? item.title : '')}"></div><div class="field"><label for="entry-category">分类</label><select id="entry-category" name="category"><option>学习</option><option>阅读</option><option>实践</option><option>运动</option><option>自控</option><option>其它</option></select></div><div class="field"><label for="entry-date">日期</label><input id="entry-date" name="date" type="date" required value="${escapeHtml(item ? item.date : today)}"></div><div class="field"><label for="entry-checkin-mode">打卡方式</label><select id="entry-checkin-mode" name="checkinMode"><option value="">点一下完成</option><option value="timed">选时长打卡</option></select></div><div class="field"><label for="entry-minutes">预计时长（分钟）</label><input id="entry-minutes" name="estimateMinutes" type="number" min="5" max="120" step="5" value="${item && item.estimateMinutes ? item.estimateMinutes : 20}"></div></div>` },
            'timed-checkin': { eyebrow: 'TIMED CHECK-IN', title: item ? `打卡 · ${item.title}` : '选时长打卡', form: `<div class="form-grid preschool-timed-checkin"><div class="field full"><p class="field-hint">${escapeHtml((item && item.hint) || '先做完，再选这次用了多久。完成后得 10 阳光。')}</p></div><div class="field full"><label>本次时长</label><div class="preschool-timed-chips">${preschoolTimedCheckinMinutes().map(function (mins) { const selected = mins === snapPreschoolTimedMinutes(item && (item.estimateMinutes || getPreschoolPlanMinutes(item))); return `<label class="preschool-timed-chip"><input type="radio" name="minutes" value="${mins}" ${selected ? 'checked' : ''}><span>${mins} 分</span></label>`; }).join('')}</div></div></div>` },
            task: { eyebrow: 'TASK', title: id ? '编辑学习任务' : '添加学习任务', form: `<div class="form-grid"><div class="field full"><label for="entry-title">任务名称</label><input id="entry-title" name="title" required maxlength="100" placeholder="例如：完成英语词卡复习" value="${escapeHtml(item ? item.title : '')}"></div><div class="field"><label for="entry-category">分类</label><select id="entry-category" name="category"><option>学习</option><option>阅读</option><option>实践</option><option>运动</option><option>自控</option><option>其它</option></select></div><div class="field"><label for="entry-priority">优先级</label><select id="entry-priority" name="priority"><option value="high">高优先</option><option value="medium">常规</option><option value="low">低优先</option></select></div><div class="field"><label for="entry-progress">完成进度</label><input id="entry-progress" name="progress" type="number" min="0" max="100" step="5" required value="${item ? clamp(item.progress, 0, 100) : 0}"></div><div class="field"><label for="entry-minutes">预计时长（分钟）</label><input id="entry-minutes" name="estimateMinutes" type="number" min="5" max="1440" step="5" required value="${item ? item.estimateMinutes || 25 : 25}"></div><div class="field"><label for="entry-date">截止日期</label><input id="entry-date" name="dueDate" type="date" value="${escapeHtml(item ? item.dueDate : today)}"></div></div>` },
            mistake: { eyebrow: 'MISTAKE NOTE', title: id ? '编辑错题' : '记录错题', form: `<div class="form-grid"><div class="field"><label for="entry-subject">学科</label><select id="entry-subject" name="subject"><option>语文</option><option>数学</option><option>英语</option><option>其它</option></select></div><div class="field"><label for="entry-date">记录日期</label><input id="entry-date" name="date" type="date" required value="${escapeHtml(item ? item.date : today)}"></div><div class="field"><label for="entry-review-date">下次复习</label><input id="entry-review-date" name="reviewDate" type="date" required value="${escapeHtml(item ? item.reviewDate : storage.dateOffset(3))}"></div><div class="field"><label for="entry-status">状态</label><select id="entry-status" name="status"><option value="todo">待复习</option><option value="mastered">已掌握</option></select></div><div class="field full"><label for="entry-question">题目或知识点</label><textarea id="entry-question" name="question" maxlength="300" required placeholder="把题目、单词或知识点写清楚">${escapeHtml(item ? item.question : '')}</textarea></div><div class="field full"><label for="entry-mistake-reason">我错在</label><textarea id="entry-mistake-reason" name="mistakeReason" maxlength="240" placeholder="是看错题、忘记方法，还是粗心？">${escapeHtml(item ? item.mistakeReason : '')}</textarea></div><div class="field full"><label for="entry-correct-answer">正确思路</label><textarea id="entry-correct-answer" name="correctAnswer" maxlength="400" required placeholder="写下下一次遇到同类题时的做法">${escapeHtml(item ? item.correctAnswer : '')}</textarea></div></div>` },
            reading: { eyebrow: 'READING LOG', title: id ? '编辑阅读记录' : '记录今日阅读', form: `<div class="form-grid"><div class="field full"><label for="entry-title">书名或主题</label><input id="entry-title" name="title" required maxlength="100" placeholder="例如：纳瓦尔宝典" value="${escapeHtml(item ? item.title : '')}"></div><div class="field"><label for="entry-minutes">阅读时长（分钟）</label><input id="entry-minutes" name="minutes" type="number" min="1" max="1440" required value="${item ? item.minutes : 30}"></div><div class="field"><label for="entry-pages">阅读页数</label><input id="entry-pages" name="pages" type="number" min="0" max="10000" value="${item ? item.pages || 0 : 0}"></div><div class="field"><label for="entry-date">日期</label><input id="entry-date" name="date" type="date" required value="${escapeHtml(item ? item.date : today)}"></div><div class="field full"><label for="entry-note">一句笔记（可选）</label><textarea id="entry-note" name="note" maxlength="300" placeholder="留下一个值得回看的句子">${escapeHtml(item ? item.note : '')}</textarea></div></div>` },
            goal: { eyebrow: 'LONG-TERM DIRECTION', title: id ? '编辑成长目标' : '添加成长目标', form: `<div class="form-grid"><div class="field full"><label for="entry-title">目标名称</label><input id="entry-title" name="title" required maxlength="100" placeholder="例如：建立稳定的英语输入习惯" value="${escapeHtml(item ? item.title : '')}"></div><div class="field"><label for="entry-period">周期</label><select id="entry-period" name="period"><option>本月</option><option>本季度</option><option>今年</option><option>长期</option></select></div><div class="field"><label for="entry-color">状态颜色</label><select id="entry-color" name="color"><option value="orange">橙色行动</option><option value="lime">酸柠檬成长</option><option value="blue">蓝色输入</option><option value="gold">金色里程碑</option></select></div><div class="field"><label for="entry-progress">当前进度</label><input id="entry-progress" name="progress" type="number" min="0" max="100" step="1" required value="${item ? clamp(item.progress, 0, 100) : 0}"></div><div class="field"><label for="entry-target">里程碑总数</label><input id="entry-target" name="target" type="number" min="1" max="1000" required value="${item ? item.target || 1 : 1}"></div><div class="field"><label for="entry-current">已完成里程碑</label><input id="entry-current" name="current" type="number" min="0" max="1000" required value="${item ? item.current || 0 : 0}"></div><div class="field full"><label for="entry-description">目标描述（可选）</label><textarea id="entry-description" name="description" maxlength="240" placeholder="写一句提醒自己为什么要做">${escapeHtml(item ? item.description : '')}</textarea></div></div>` },
            review: { eyebrow: 'WEEKLY / REFLECT', title: id ? '编辑复盘' : '添加复盘', form: `<div class="form-grid"><div class="field full"><label for="entry-title">标题</label><input id="entry-title" name="title" required maxlength="100" placeholder="例如：今天把最难的一步先做了" value="${escapeHtml(item ? item.title : '')}"></div><div class="field"><label for="entry-date">日期</label><input id="entry-date" name="date" type="date" required value="${escapeHtml(item ? item.date : today)}"></div><div class="field"><label for="entry-mood">状态</label><select id="entry-mood" name="mood"><option value="steady">状态稳定</option><option value="notice">发现提醒</option></select></div><div class="field full"><label for="entry-body">发生了什么</label><textarea id="entry-body" name="body" maxlength="500" required placeholder="写下一个事实或感受">${escapeHtml(item ? item.body : '')}</textarea></div><div class="field full"><label for="entry-next-action">下一步</label><input id="entry-next-action" name="nextAction" maxlength="160" placeholder="明天先做什么？" value="${escapeHtml(item ? item.nextAction : '')}"></div></div>` },
            focus: { eyebrow: 'FOCUS LOG', title: '记录一段专注', form: `<div class="form-grid"><div class="field"><label for="entry-minutes">专注时长（分钟）</label><input id="entry-minutes" name="minutes" type="number" min="1" max="1440" required value="25"></div><div class="field"><label for="entry-source">专注内容</label><select id="entry-source" name="source"><option>学习</option><option>阅读</option><option>任务</option><option>实践</option><option>其它</option></select></div><div class="field full"><span class="field-hint">这只记录已经完成的一段专注，不用把倒计时当作结算依据。</span></div></div>` },
            life: { eyebrow: 'LIFE OS / NOTE', title: id ? '编辑生活记录' : '添加生活记录', form: `<div class="form-grid"><div class="field"><label for="entry-area">生活分区</label><select id="entry-area" name="area">${ADULT_AREAS.map(function (areaItem) { return `<option value="${escapeHtml(areaItem.id)}">${escapeHtml(areaItem.id)}</option>`; }).join('')}</select></div><div class="field"><label for="entry-status">状态</label><select id="entry-status" name="status"><option value="planned">待安排</option><option value="active">进行中</option><option value="done">已完成</option></select></div><div class="field full"><label for="entry-title">记录标题</label><input id="entry-title" name="title" required maxlength="100" placeholder="例如：完成一次力量训练" value="${escapeHtml(item ? item.title : '')}"></div><div class="field"><label for="entry-date">日期</label><input id="entry-date" name="date" type="date" value="${escapeHtml(item ? item.date : today)}"></div><div class="field"><label for="entry-attachments">附件</label><input id="entry-attachments" name="attachments" type="file" multiple accept="image/*,.pdf,.txt,.md,.doc,.docx"><small class="field-hint">只保存文件名、类型和大小，原文件不会上传。</small></div><div class="field full"><label for="entry-note">备注</label><textarea id="entry-note" name="note" maxlength="500" placeholder="写下下一步、护肤流程、训练感受或购物备注">${escapeHtml(item ? item.note : '')}</textarea></div></div>` },
            milestone: { eyebrow: 'DDL / EXAM', title: id ? '编辑截止或考试' : '添加截止或考试', form: `<div class="form-grid"><div class="field"><label for="entry-kind">节点类型</label><select id="entry-kind" name="kind"><option value="ddl">截止日期 DDL</option><option value="exam">考试日期</option></select></div><div class="field"><label for="entry-area">所属分区</label><select id="entry-area" name="area"><option>学习</option><option>健身</option><option>美妆护肤</option><option>理财</option><option>购物</option><option>灵感</option><option>生活</option></select></div><div class="field full"><label for="entry-title">节点名称</label><input id="entry-title" name="title" required maxlength="100" placeholder="例如：课程结课考试" value="${escapeHtml(item ? item.title : '')}"></div><div class="field"><label for="entry-date">日期</label><input id="entry-date" name="date" type="date" required value="${escapeHtml(item ? item.date : storage.dateOffset(7))}"></div><div class="field full"><label for="entry-note">备注</label><textarea id="entry-note" name="note" maxlength="240" placeholder="提前准备什么？">${escapeHtml(item ? item.note : '')}</textarea></div></div>` },
            habit: { eyebrow: 'DAILY / HABIT', title: id ? '编辑习惯' : '添加习惯', form: `<div class="form-grid"><div class="field full"><label for="entry-title">习惯名称</label><input id="entry-title" name="title" required maxlength="80" placeholder="例如：睡前读 10 页书" value="${escapeHtml(item ? item.title : '')}"></div><div class="field"><label for="entry-area">所属分区</label><select id="entry-area" name="area">${ADULT_AREAS.map(function (areaItem) { return `<option value="${escapeHtml(areaItem.id)}">${escapeHtml(areaItem.id)}</option>`; }).join('')}</select></div><div class="field"><label for="entry-cadence">频率</label><select id="entry-cadence" name="cadence"><option value="daily">每天</option><option value="weekly">每周</option></select></div></div>` }
        };
        const config = configs[type] || configs.plan;
        dialogEyebrow.textContent = config.eyebrow;
        dialogTitle.textContent = config.title;
        entryForm.innerHTML = `${config.form}<div class="form-actions"><button class="btn-secondary" type="button" data-action="close-dialog">取消</button><button class="btn-primary" type="submit">保存${icon('check')}</button></div>`;
        const categorySelect = entryForm.querySelector('[name="category"]');
        if (categorySelect && item) categorySelect.value = item.category || '其它';
        const prioritySelect = entryForm.querySelector('[name="priority"]');
        if (prioritySelect && item) prioritySelect.value = item.priority || 'medium';
        const periodSelect = entryForm.querySelector('[name="period"]');
        if (periodSelect && item) periodSelect.value = item.period || '长期';
        const colorSelect = entryForm.querySelector('[name="color"]');
        if (colorSelect && item) colorSelect.value = item.color || 'orange';
        const subjectSelect = entryForm.querySelector('[name="subject"]');
        if (subjectSelect && item) subjectSelect.value = item.subject || '其它';
        const statusSelect = entryForm.querySelector('[name="status"]');
        if (statusSelect && item) statusSelect.value = item.status || 'todo';
        const areaSelect = entryForm.querySelector('[name="area"]');
        if (areaSelect) areaSelect.value = ui.dialogArea || (item && item.area) || areaSelect.value;
        const kindSelect = entryForm.querySelector('[name="kind"]');
        if (kindSelect && item) kindSelect.value = item.kind || 'ddl';
        const cadenceSelect = entryForm.querySelector('[name="cadence"]');
        if (cadenceSelect && item) cadenceSelect.value = item.cadence || 'daily';
        const checkinModeSelect = entryForm.querySelector('[name="checkinMode"]');
        if (checkinModeSelect && item) checkinModeSelect.value = item.checkinMode || '';
        if (type === 'timed-checkin') {
            const submitBtn = entryForm.querySelector('[type="submit"]');
            if (submitBtn) submitBtn.innerHTML = `完成打卡${icon('check')}`;
        }
        global.lucide.createIcons({ root: entryForm });
        if (typeof entryDialog.showModal === 'function') entryDialog.showModal();
        else entryDialog.setAttribute('open', '');
        const first = entryForm.querySelector('input, textarea, select');
        if (first) window.setTimeout(() => first.focus(), 0);
    }

    function closeDialog() {
        if (typeof entryDialog.close === 'function' && entryDialog.open) entryDialog.close();
        else entryDialog.removeAttribute('open');
        ui.dialogType = '';
        ui.dialogId = '';
        ui.dialogArea = '';
        ui.dialogDate = '';
    }

    function findDailyPlan(list, id, date) {
        const plans = Array.isArray(list) ? list : [];
        const targetId = String(id || '');
        const targetDate = String(date || '');
        if (targetDate) return plans.find(item => String(item.id) === targetId && String(item.date || '') === targetDate) || null;
        return plans.find(item => String(item.id) === targetId) || null;
    }

    function findItem(type, id, date) {
        if (type === 'plan' || type === 'timed-checkin') return findDailyPlan(state.dailyPlans, id, date);
        const collection = { plan: 'dailyPlans', task: 'tasks', mistake: 'mistakes', reading: 'readingLogs', goal: 'goals', review: 'reviews' }[type];
        if (collection) return state[collection].find(item => item.id === id);
        const adultCollection = { life: 'lifeEntries', milestone: 'milestones', habit: 'habits' }[type];
        return isAdult && adultCollection && state.adult && state.adult[adultCollection] ? state.adult[adultCollection].find(item => item.id === id) : null;
    }

    function ensureGrowth(next) {
        if (isChild && global.PersonalWorkbenchChildGrowth && typeof global.PersonalWorkbenchChildGrowth.normalize === 'function') {
            next.growth = global.PersonalWorkbenchChildGrowth.normalize(next.growth);
            return next.growth;
        }
        if (!next.growth || typeof next.growth !== 'object') next.growth = {};
        if (!Array.isArray(next.growth.awardedIds)) next.growth.awardedIds = [];
        if (!Array.isArray(next.growth.claimedRewardIds)) next.growth.claimedRewardIds = [];
        next.growth.sunlight = Math.max(0, Number(next.growth.sunlight) || 0);
        return next.growth;
    }

    function awardSunlight(next, awardId, amount) {
        if (!isChild) return false;
        if (global.PersonalWorkbenchChildGrowth && typeof global.PersonalWorkbenchChildGrowth.recordAction === 'function') {
            const result = global.PersonalWorkbenchChildGrowth.recordAction(next.growth, { eventId: awardId, amount: amount, date: storage.localDate() });
            next.growth = result.growth;
            if (result.awarded && isPreschool && preschoolGarden) {
                const today = storage.localDate();
                const gardenView = preschoolGarden.getView(next.growth, today);
                if (result.zombieDefeated || gardenView.invaderActive) next.growth.garden.invader.active = true;
                const gardenEvent = preschoolGarden.recordEvent(next.growth, preschoolEventType(awardId), today, awardId);
                next.growth = gardenEvent.growth;
                ui.pendingCelebration = { message: gardenEvent.invaderDefeated ? '僵尸被赶走啦！' : '做得真棒！', amount: Math.max(0, Number(amount) || 0) + result.dailyBonus, rewardIds: gardenEvent.rewardIds, invaderDefeated: gardenEvent.invaderDefeated, defenseEnergyGranted: gardenEvent.defenseEnergyGranted };
            }
            return result.awarded;
        }
        const growth = ensureGrowth(next);
        if (growth.awardedIds.includes(awardId)) return false;
        growth.awardedIds.push(awardId);
        growth.sunlight += Math.max(0, Number(amount) || 0);
        return true;
    }

    function claimReward(id) {
        if (!isChild) return;
        const reward = getChildRewards().find(item => item.id === id);
        if (!reward) return;
        let gardenEvent = null;
        const ok = commit(function (next) {
            const growth = ensureGrowth(next);
            const cost = Math.max(0, Number(reward.cost) || 0);
            if (growth.claimedRewardIds.includes(reward.id)) throw new Error('这个奖励已经领取过了');
            if (growth.sunlight < cost) throw new Error(`还需要 ${cost - growth.sunlight} 阳光`);
            growth.sunlight -= cost;
            growth.claimedRewardIds.push(reward.id);
            if (isPreschool && preschoolGarden) {
                gardenEvent = preschoolGarden.recordEvent(next.growth, 'reward-claimed', storage.localDate(), `reward:${reward.id}`);
                next.growth = gardenEvent.growth;
            }
        }, '奖励已领取，请和家人约定兑现时间');
        if (ok) showPreschoolCelebration({ message: '礼物可以领取啦！', rewardIds: gardenEvent ? gardenEvent.rewardIds : [] });
    }

    function commit(mutator, message) {
        let result;
        ui.pendingCelebration = null;
        try {
            result = repository.update(mutator, state);
        } catch (error) {
            console.warn('[PersonalWorkbench] 状态更新失败', error);
            showToast(error && error.message ? error.message : '保存失败，请检查输入。', true);
            return false;
        }
        if (!result.ok) {
            showToast('保存失败，请检查浏览器本地存储权限。', true);
            return false;
        }
        state = result.state;
        render();
        if (message) showToast(message);
        if (ui.pendingCelebration) {
            const payload = ui.pendingCelebration;
            ui.pendingCelebration = null;
            showPreschoolCelebration(payload);
        }
        return true;
    }

    function archiveItem(next, sourceType, item) {
        if (!isAdult || !item || !next.adult) return;
        const sourceId = item.id || '';
        if (!sourceId) return;
        if (!Array.isArray(next.adult.archive)) next.adult.archive = [];
        if (next.adult.archive.some(entry => entry.sourceType === sourceType && entry.sourceId === sourceId)) return;
        const now = new Date().toISOString();
        next.adult.archive.push({ id: storage.createId('archive'), sourceType: sourceType, sourceId: sourceId, title: item.title || '已完成事项', category: item.category || item.area || '其它', completedAt: item.completedAt || now, archivedAt: now });
    }

    function submitForm(event) {
        event.preventDefault();
        const formData = new FormData(entryForm);
        const values = Object.fromEntries(formData.entries());
        const type = ui.dialogType;
        const id = ui.dialogId;
        const now = new Date().toISOString();
        const existing = id ? findItem(type, id, ui.dialogDate) : null;
        const attachmentInput = entryForm.querySelector('[name="attachments"]');
        const attachments = attachmentInput && attachmentInput.files ? Array.from(attachmentInput.files).slice(0, 12).map(function (file) { return { name: file.name, type: file.type, size: file.size }; }) : [];
        let message = '已保存';
        const ok = commit(function (next) {
            if (type === 'plan') {
                const item = Object.assign({ id: id || storage.createId('plan'), date: storage.localDate(), title: '', category: '学习', practiceLessonId: '', checkinMode: '', hint: '', estimateMinutes: 20, completionSource: '', completionRewardId: '', done: false, order: next.dailyPlans.length + 1, createdAt: now, completedAt: null }, existing || {}, { title: String(values.title || '').trim(), date: values.date || storage.localDate(), category: values.category || '其它', checkinMode: values.checkinMode === 'timed' ? 'timed' : '', estimateMinutes: clamp(values.estimateMinutes || (existing && existing.estimateMinutes) || 20, 5, 120) });
                if (!item.title) throw new Error('计划内容不能为空');
                if (!item.done) item.completionSource = '';
                upsertDailyPlan(next.dailyPlans, item, id ? ui.dialogDate : '');
                if (item.done && !(existing && existing.done)) {
                    const rewardId = storage.getPreschoolPlanRewardId(item);
                    if (!item.completionRewardId) {
                        item.completionRewardId = rewardId;
                        awardSunlight(next, rewardId, 10);
                    }
                    item.completionSource = 'check-in';
                    archiveItem(next, 'plan', item);
                }
                message = id ? '计划已更新' : '计划已添加';
            }
            if (type === 'timed-checkin') {
                const item = findDailyPlan(next.dailyPlans, id, ui.dialogDate);
                if (!item) throw new Error('找不到这项计划，请刷新页面后重试。');
                if (item.done) throw new Error('这项已经点亮过了');
                const minutes = snapPreschoolTimedMinutes(values.minutes);
                item.done = true;
                item.completedAt = now;
                item.estimateMinutes = minutes;
                item.checkinMode = 'timed';
                item.completionSource = 'timed-checkin';
                const rewardId = storage.getPreschoolPlanRewardId(item);
                if (!item.completionRewardId) {
                    item.completionRewardId = rewardId;
                    awardSunlight(next, rewardId, 10);
                }
                archiveItem(next, 'plan', item);
                if (item.category === '阅读') {
                    next.readingLogs.push({ id: storage.createId('reading'), date: item.date, title: item.title, minutes: minutes, pages: 0, note: '时长打卡', createdAt: now });
                }
                if (global.PersonalWorkbenchPet) next.growth = global.PersonalWorkbenchPet.awardExp(next.growth || {}, 5);
                applyPreschoolAchievements(next);
                message = `打卡完成，${minutes} 分钟，+10 阳光`;
            }
            if (type === 'task') {
                const progress = clamp(values.progress, 0, 100);
                const item = Object.assign({ id: id || storage.createId('task'), title: '', category: '学习', status: 'todo', priority: 'medium', progress: 0, dueDate: '', estimateMinutes: 25, createdAt: now, completedAt: null }, existing || {}, { title: String(values.title || '').trim(), category: values.category || '其它', priority: values.priority || 'medium', progress: progress, dueDate: values.dueDate || '', estimateMinutes: clamp(values.estimateMinutes, 5, 1440, 25), status: progress >= 100 ? 'done' : progress > 0 ? 'doing' : 'todo', completedAt: progress >= 100 ? (existing && existing.completedAt) || now : null });
                if (!item.title) throw new Error('任务名称不能为空');
                upsert(next.tasks, item);
                if (item.status === 'done') { awardSunlight(next, `task:${item.id}`, 15); archiveItem(next, 'task', item); }
                message = id ? '任务已更新' : '任务已添加';
            }
            if (type === 'mistake') {
                const item = Object.assign({ id: id || storage.createId('mistake'), date: storage.localDate(), subject: '其它', question: '', mistakeReason: '', correctAnswer: '', reviewDate: storage.dateOffset(3), status: 'todo', createdAt: now }, existing || {}, { date: values.date || storage.localDate(), subject: values.subject || '其它', question: String(values.question || '').trim(), mistakeReason: String(values.mistakeReason || '').trim(), correctAnswer: String(values.correctAnswer || '').trim(), reviewDate: values.reviewDate || storage.dateOffset(3), status: values.status === 'mastered' ? 'mastered' : 'todo' });
                if (!item.question || !item.correctAnswer) throw new Error('题目和正确思路不能为空');
                upsert(next.mistakes, item);
                message = id ? '错题已更新' : '错题已记录';
            }
            if (type === 'reading') {
                const item = Object.assign({ id: id || storage.createId('reading'), date: storage.localDate(), title: '', minutes: 0, pages: 0, note: '', createdAt: now }, existing || {}, { title: String(values.title || '').trim(), date: values.date || storage.localDate(), minutes: clamp(values.minutes, 1, 1440, 30), pages: clamp(values.pages, 0, 10000, 0), note: String(values.note || '').trim() });
                if (!item.title) throw new Error('书名或主题不能为空');
                upsert(next.readingLogs, item);
                if (!id) awardSunlight(next, `reading:${item.id}`, 5);
                message = id ? '阅读记录已更新' : '阅读记录已保存';
            }
            if (type === 'goal') {
                const item = Object.assign({ id: id || storage.createId('goal'), title: '', period: '长期', description: '', progress: 0, target: 1, current: 0, color: 'orange', createdAt: now, updatedAt: now }, existing || {}, { title: String(values.title || '').trim(), period: values.period || '长期', description: String(values.description || '').trim(), progress: clamp(values.progress, 0, 100, 0), target: clamp(values.target, 1, 1000, 1), current: clamp(values.current, 0, 1000, 0), color: values.color || 'orange', updatedAt: now });
                if (!item.title) throw new Error('目标名称不能为空');
                upsert(next.goals, item);
                message = id ? '目标已更新' : '目标已添加';
            }
            if (type === 'review') {
                const item = Object.assign({ id: id || storage.createId('review'), date: storage.localDate(), title: '', mood: 'steady', body: '', nextAction: '', createdAt: now }, existing || {}, { title: String(values.title || '').trim(), date: values.date || storage.localDate(), mood: values.mood || 'steady', body: String(values.body || '').trim(), nextAction: String(values.nextAction || '').trim() });
                if (!item.title || !item.body) throw new Error('标题和复盘内容不能为空');
                upsert(next.reviews, item);
                message = id ? '复盘已更新' : '复盘已添加';
            }
            if (type === 'focus') {
                next.focusSessions.push({ id: storage.createId('focus'), date: storage.localDate(), minutes: clamp(values.minutes, 1, 1440, 25), source: values.source || '其它', createdAt: now });
                message = '专注记录已添加';
            }
            if (type === 'life') {
                const item = Object.assign({ id: id || storage.createId('life'), area: '灵感', title: '', note: '', status: 'planned', date: storage.localDate(), attachments: [], createdAt: now, updatedAt: now }, existing || {}, { area: values.area || '灵感', title: String(values.title || '').trim(), note: String(values.note || '').trim(), status: values.status === 'done' ? 'done' : values.status === 'active' ? 'active' : 'planned', date: values.date || storage.localDate(), attachments: attachments.length ? attachments : (existing && existing.attachments) || [], updatedAt: now });
                if (!item.title) throw new Error('生活记录标题不能为空');
                upsert(next.adult.lifeEntries, item);
                if (item.status === 'done') archiveItem(next, 'life', item);
                message = id ? '生活记录已更新' : '生活记录已添加';
            }
            if (type === 'milestone') {
                const item = Object.assign({ id: id || storage.createId('milestone'), title: '', kind: 'ddl', area: '学习', date: storage.dateOffset(7), note: '', createdAt: now }, existing || {}, { title: String(values.title || '').trim(), kind: values.kind === 'exam' ? 'exam' : 'ddl', area: values.area || '学习', date: values.date || storage.dateOffset(7), note: String(values.note || '').trim() });
                if (!item.title || !item.date) throw new Error('节点名称和日期不能为空');
                upsert(next.adult.milestones, item);
                message = id ? '节点已更新' : '节点已添加';
            }
            if (type === 'habit') {
                const item = Object.assign({ id: id || storage.createId('habit'), title: '', area: '学习', cadence: 'daily', checkedDates: [], createdAt: now }, existing || {}, { title: String(values.title || '').trim(), area: values.area || '学习', cadence: values.cadence === 'weekly' ? 'weekly' : 'daily' });
                if (!item.title) throw new Error('习惯名称不能为空');
                upsert(next.adult.habits, item);
                message = id ? '习惯已更新' : '习惯已添加';
            }
        }, null);
        if (ok) {
            closeDialog();
            showToast(message);
        }
    }

    function upsert(list, item) {
        const index = list.findIndex(entry => entry.id === item.id);
        if (index === -1) list.push(item);
        else list[index] = item;
    }

    function upsertDailyPlan(list, item, originalDate) {
        const targetDate = String(originalDate || item.date || '');
        const index = list.findIndex(entry => String(entry.id) === String(item.id) && String(entry.date || '') === targetDate);
        if (index === -1) list.push(item);
        else list[index] = item;
    }

    function deleteEntry(type, id, date) {
        const collection = { plan: 'dailyPlans', task: 'tasks', mistake: 'mistakes', reading: 'readingLogs', goal: 'goals', review: 'reviews', life: 'adult.lifeEntries', milestone: 'adult.milestones', habit: 'adult.habits' }[type];
        if (!collection) return;
        const item = findItem(type, id, date);
        const label = item && (item.title || item.question) ? item.title || item.question : '这条记录';
        if (!item || !window.confirm(`确定删除“${label}”吗？`)) return;
        commit(function (next) {
            if (collection.indexOf('adult.') === 0) next.adult[collection.slice(6)] = next.adult[collection.slice(6)].filter(entry => entry.id !== id);
            else if (type === 'plan') {
                const targetDate = String(date || '');
                const index = next.dailyPlans.findIndex(entry => String(entry.id) === String(id) && (!targetDate || String(entry.date || '') === targetDate));
                if (index >= 0) next.dailyPlans.splice(index, 1);
            } else next[collection] = next[collection].filter(entry => entry.id !== id);
        }, '已删除');
    }

    function showToast(message, error) {
        const node = document.createElement('div');
        node.className = `toast${error ? ' error' : ''}`;
        node.innerHTML = `${icon(error ? 'cloud-off' : 'circle-check')}<span>${escapeHtml(message)}</span>`;
        toastStack.appendChild(node);
        global.lucide.createIcons({ root: node });
        window.setTimeout(function () { node.remove(); }, 3300);
    }

    function exportSnapshot() {
        try {
            const blob = new Blob([repository.exportJson()], { type: 'application/json;charset=utf-8' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `personal-workbench-${storage.localDate()}.json`;
            link.click();
            URL.revokeObjectURL(link.href);
            showToast('快照已导出');
        } catch (error) {
            console.warn('[PersonalWorkbench] 导出失败', error);
            showToast('导出失败，请稍后重试。', true);
        }
    }

    async function importSnapshot(file) {
        if (!file) return;
        try {
            const parsed = JSON.parse(await file.text());
            const normalized = storage.normalizeState(parsed);
            if (!normalized || normalized.schemaVersion !== storage.SCHEMA_VERSION) throw new Error('schemaVersion 不兼容');
            if (!window.confirm('导入会覆盖当前本地工作台数据，确定继续吗？')) return;
            const result = repository.replace(normalized);
            if (!result.ok) throw result.error || new Error('写入失败');
            state = result.state;
            ui.taskFilter = 'all';
            render();
            showToast('快照已导入');
        } catch (error) {
            console.warn('[PersonalWorkbench] 导入失败', error);
            showToast('导入失败：文件格式不正确。', true);
        } finally {
            importFile.value = '';
        }
    }

    function resetLocalData() {
        if (!isAdult || !window.confirm('确定清除当前成人工作台吗？此操作只影响当前成人版，建议先导出 JSON 备份。')) return;
        const result = repository.reset();
        if (!result.ok) {
            showToast('清除失败，请检查浏览器本地存储权限。', true);
            return;
        }
        state = result.state;
        ui.taskFilter = 'all';
        setPage('overview', true);
        showToast('当前成人工作台已恢复初始数据。');
    }

    function shouldAutoCloseSidebar() {
        if (!isPreschool || typeof global.matchMedia !== 'function') return true;
        return global.matchMedia('(max-width: 760px)').matches
            && global.matchMedia('(max-aspect-ratio: 1 / 1)').matches;
    }

    function openSidebar() { sidebar.classList.add('is-open'); sidebarScrim.classList.add('is-visible'); }
    function closeSidebar() { sidebar.classList.remove('is-open'); sidebarScrim.classList.remove('is-visible'); }

    document.addEventListener('click', function (event) {
        const target = event.target.closest('[data-action]');
        if (!target) return;
        const action = target.dataset.action;
        if (isPreschool && action !== 'toggle-music' && getPreschoolFeedbackPreference('musicEnabled', false)) startPreschoolMusic();
        if (action === 'navigate') {
            if (target.dataset.openBadges === '1') ui.badgeBoxOpen = true;
            setPage(target.dataset.page, false, target.dataset.courseId, target.dataset.tab);
        }
        if (action === 'toggle-badge-box') togglePreschoolBadgeBox();
        if (action === 'review-badge') reviewPreschoolBadge(target);
        if (action === 'filter-badge-group') {
            ui.badgeFilter = target.dataset.group || 'all';
            render();
        }
        if (action === 'badge-confetti' && global.PersonalWorkbenchAchievements && typeof global.PersonalWorkbenchAchievements.burstBadgeConfetti === 'function') {
            global.PersonalWorkbenchAchievements.burstBadgeConfetti();
        }
        if (action === 'open-world-game') {
            const forcedTheme = target.dataset.themeId || '';
            if (!openPreschoolWorldGame(forcedTheme || undefined)) setPage('battle');
            return;
        }
        if (action === 'open-course-wall' || action === 'toggle-course-nav') {
            const onWall = ui.page === 'courses' && !ui.courseId;
            if (onWall) {
                ui.courseNavExpanded = !ui.courseNavExpanded;
                setCourseNavExpanded(ui.courseNavExpanded);
                return;
            }
            ui.courseNavExpanded = true;
            setPage('courses');
            return;
        }
        if (action === 'open-sidebar') openSidebar();
        if (action === 'close-sidebar') closeSidebar();
        if (action === 'close-dialog') closeDialog();
        if (action === 'add-plan') openDialog('plan');
        if (action === 'edit-plan') openDialog('plan', target.dataset.id, '', target.dataset.date);
        if (action === 'open-timed-checkin') openDialog('timed-checkin', target.dataset.id, '', target.dataset.date);
        if (action === 'open-plan-course') {
            const plan = findDailyPlan(state.dailyPlans, target.dataset.id, target.dataset.date);
            const courseId = target.dataset.courseId || getPreschoolPlanCourseId(plan);
            if (!courseId) {
                showToast('这项还没有对应的学习页', true);
                return;
            }
            setPage('courses', false, courseId);
            return;
        }
        if (action === 'delete-plan') deleteEntry('plan', target.dataset.id, target.dataset.date);
        if (action === 'toggle-plan') {
            const before = findDailyPlan(state.dailyPlans, target.dataset.id, target.dataset.date);
            const completed = before ? !before.done : false;
            let rewardGranted = false;
            let newBadges = [];
            const ok = commit(function (next) {
                const item = findDailyPlan(next.dailyPlans, target.dataset.id, target.dataset.date);
                if (!item) throw new Error('找不到这项计划，请刷新页面后重试。');
                item.done = !item.done;
                item.completedAt = item.done ? new Date().toISOString() : null;
                if (item.done) {
                    const rewardId = storage.getPreschoolPlanRewardId(item);
                    if (!item.completionRewardId) {
                        item.completionRewardId = rewardId;
                        rewardGranted = awardSunlight(next, rewardId, 10);
                    }
                    item.completionSource = item.completionSource || 'check-in';
                    archiveItem(next, 'plan', item);
                    newBadges = applyPreschoolAchievements(next);
                    if (global.PersonalWorkbenchPet) next.growth = global.PersonalWorkbenchPet.awardExp(next.growth || {}, 5);
                } else {
                    item.completionSource = '';
                    const rewardId = storage.getPreschoolPlanRewardId(item);
                    item.completionRewardId = item.completionRewardId || rewardId;
                }
            }, '');
            if (ok) {
                showToast(completed ? (isChild ? (rewardGranted ? '计划完成了，获得 10 阳光' : '计划完成了，阳光已经领取过啦') : '计划完成了') : '计划已恢复');
                if (completed) speakPraise('今天的点亮完成啦！');
                presentPreschoolAchievements(newBadges);
            }
        }
        if (action === 'add-task') openDialog('task');
        if (action === 'edit-task') openDialog('task', target.dataset.id);
        if (action === 'delete-task') deleteEntry('task', target.dataset.id);
        if (action === 'add-mistake') openDialog('mistake');
        if (action === 'edit-mistake') openDialog('mistake', target.dataset.id);
        if (action === 'delete-mistake') deleteEntry('mistake', target.dataset.id);
        if (action === 'toggle-mistake') commit(function (next) { const item = next.mistakes.find(entry => entry.id === target.dataset.id); if (item) item.status = item.status === 'mastered' ? 'todo' : 'mastered'; }, target.closest('.mistake-card').classList.contains('is-mastered') ? '已重新加入复习' : '已标记掌握');
        if (action === 'add-reading') openDialog('reading');
        if (action === 'edit-reading') openDialog('reading', target.dataset.id);
        if (action === 'delete-reading') deleteEntry('reading', target.dataset.id);
        if (action === 'add-goal') openDialog('goal');
        if (action === 'edit-goal') openDialog('goal', target.dataset.id);
        if (action === 'delete-goal') deleteEntry('goal', target.dataset.id);
        if (action === 'add-review') openDialog('review');
        if (action === 'edit-review') openDialog('review', target.dataset.id);
        if (action === 'delete-review') deleteEntry('review', target.dataset.id);
        if (action === 'add-life-entry') openDialog('life', '', target.dataset.area || '');
        if (action === 'edit-life-entry') openDialog('life', target.dataset.id);
        if (action === 'delete-life-entry') deleteEntry('life', target.dataset.id);
        if (action === 'add-milestone') openDialog('milestone');
        if (action === 'edit-milestone') openDialog('milestone', target.dataset.id);
        if (action === 'delete-milestone') deleteEntry('milestone', target.dataset.id);
        if (action === 'add-habit') openDialog('habit');
        if (action === 'edit-habit') openDialog('habit', target.dataset.id);
        if (action === 'delete-habit') deleteEntry('habit', target.dataset.id);
        if (action === 'toggle-habit') {
            const today = storage.localDate();
            commit(function (next) { const item = next.adult.habits.find(entry => entry.id === target.dataset.id); if (item) { const index = item.checkedDates.indexOf(today); if (index === -1) item.checkedDates.push(today); else item.checkedDates.splice(index, 1); } }, '习惯状态已更新');
        }
        if (action === 'add-family') setPage('family');
        if (action === 'claim-reward') claimReward(target.dataset.id);
        if (action === 'claim-streak-reward') claimStreakReward(target.dataset.id);
        if (action === 'select-style') selectGrowthStyle(target.dataset.id);
        if (action === 'select-preschool-theme') selectPreschoolTheme(target.dataset.themeId);
        if (action === 'set-math-band') setMathPracticeBand(target.dataset.band);
        if (action === 'set-practice-level') setPracticeLevel(target.dataset.track, target.dataset.level);
        if (action === 'set-minecraft-band') setMinecraftBand(target.dataset.level);
        if (action === 'select-plant') selectPreschoolPlant(target.dataset.id);
        if (action === 'water-plant') waterGrowthPlant();
        if (action === 'repair-streak') repairGrowthStreak();
        if (action === 'feed-pet') feedPreschoolPet();
        if (action === 'pat-pet') patPreschoolPet();
        if (action === 'review-growth-flower') {
            if (global.PersonalWorkbenchGrowthWorld && typeof global.PersonalWorkbenchGrowthWorld.showReview === 'function') {
                global.PersonalWorkbenchGrowthWorld.showReview('flower', target.dataset);
            }
            reviewGrowthWorld(target.dataset.char, 'zh-CN', '');
        }
        if (action === 'review-growth-brick') {
            if (global.PersonalWorkbenchGrowthWorld && typeof global.PersonalWorkbenchGrowthWorld.showReview === 'function') {
                global.PersonalWorkbenchGrowthWorld.showReview('brick', target.dataset);
            }
            reviewGrowthWorld(target.dataset.word, 'en-US', '');
        }
        if (action === 'review-growth-stop') {
            const name = target.dataset.name || '这里';
            showToast(target.dataset.unlocked === 'true' ? `已经到达${name}` : `再坚持${target.dataset.remain || '?'}天就能到达${name}`);
        }
        if (action === 'open-growth-world') {
            ui.growthWorld = target.dataset.world === 'map' || target.dataset.world === 'builder' ? target.dataset.world : 'garden';
            render();
            return;
        }
        if (action === 'close-growth-world') {
            ui.growthWorld = '';
            render();
            return;
        }
        if (action === 'spawn-invader') spawnPreschoolInvader();
        if (action === 'fire-pea') firePreschoolPea();
        if (action === 'start-defense-game') startPreschoolDefenseGame();
        if (action === 'spawn-defense-wave') spawnPreschoolDefenseWave();
            if (action === 'place-defense-plant') {
                if (preschoolSuppressNextPlacementClick) {
                    preschoolSuppressNextPlacementClick = false;
                    return;
                }
                placePreschoolDefensePlant(target.dataset.lane, target.dataset.column);
            }
        if (action === 'complete-lesson') completeCourseLesson(target.dataset.id);
        if (action === 'open-lesson') openLessonDialog(target.dataset.id);
        if (action === 'flashcard-reveal') revealPreschoolFlashcard();
        if (action === 'flashcard-mark') markPreschoolFlashcard(target.dataset.known === '1');
        if (action === 'flashcard-prev') { if (ui.courseCards) { ui.courseCards.index = Math.max(0, ui.courseCards.index - 1); render(); } }
        if (action === 'flashcard-next') { if (ui.courseCards) { ui.courseCards.index = Math.min(ui.courseCards.items.length, ui.courseCards.index + 1); render(); } }
        if (action === 'flashcard-poem-mark') markPreschoolPoem(target.dataset.known === '1');
        if (action === 'flashcard-motion-done') markPreschoolMotionDone();
        if (action === 'media-open') {
            const bvid = String(target.dataset.bvid || '');
            ui.mediaBvid = ui.mediaBvid === bvid ? '' : bvid;
            if (ui.mediaBvid) checkInPreschoolEnglishFromMedia();
            render();
        }
        if (action === 'media-close') { ui.mediaBvid = ''; render(); }
        if (action === 'course-tab') applyCourseTab(target.dataset.tab);
        if (action === 'flashcard-summer-open') {
            ui.summerLibraryCategory = getSummerLibraryCategory(target.dataset.category).id;
            ui.summerLibraryItem = Math.max(0, Number(target.dataset.index) || 0);
            applyCourseTab('media');
        }
        if (action === 'flashcard-classic') applyCourseTab('menu');
        if (action === 'flashcard-cards') applyCourseTab('today');
        if (action === 'parent-detail-open') {
            const detail = document.querySelector('.preschool-course-parent-detail');
            if (detail) {
                detail.open = true;
                if (typeof detail.scrollIntoView === 'function') detail.scrollIntoView({ block: 'nearest' });
            }
        }
        if (action === 'open-plan-practice') openPreschoolPlanPractice(target.dataset.id, target.dataset.date);
        if (action === 'open-review-practice') openReviewPractice();
        if (action === 'speak-resource') speakResource(target.dataset.text);
        if (action === 'open-resource') openExternalResource(target.dataset.url);
        if (action === 'summer-library-category') { ui.summerLibraryCategory = getSummerLibraryCategory(target.dataset.category).id; ui.summerLibraryItem = 0; render(); }
        if (action === 'summer-library-step') { const entries = getSummerLibraryEntries(ui.summerLibraryCategory); ui.summerLibraryItem = Math.max(0, Math.min(Math.max(0, entries.length - 1), (Number(ui.summerLibraryItem) || 0) + Number(target.dataset.direction || 0))); render(); }
        if (action === 'lesson-answer') answerLesson(target.dataset.index);
        if (action === 'literacy-speak') speakLiteracy(target.dataset.text);
        if (action === 'english-speak') playVocabAudio(target.dataset.audio, target.dataset.text, 'en-US');
        if (action === 'english-known') markEnglishKnown(target.dataset.word, target.dataset.known === '1');
        if (action === 'play-flip') flipPlayCard(target.dataset.index);
        if (action === 'play-spell') tapPlaySpell(target.dataset.letter);
        if (action === 'play-order') tapPlayOrder(target.dataset.value);
        if (action === 'play-odd') tapPlayOdd(target.dataset.index);
        if (action === 'play-odd-next') advancePlayOdd();
        if (action === 'play-schulte') tapPlaySchulte(target.dataset.index);
        if (action === 'play-sudoku-cell') tapPlaySudokuCell(target.dataset.index);
        if (action === 'play-sudoku-num') tapPlaySudokuNum(target.dataset.value);
        if (action === 'play-simon') tapPlaySimon(target.dataset.index);
        if (action === 'play-search') tapPlaySearch(target.dataset.index);
        if (action === 'focus-pick-level') selectFocusPlayLevel(target.dataset.level);
        if (action === 'focus-start-level') startFocusPlayFromIdle();
        if (action === 'focus-refresh') refreshFocusArcade();
        if (action === 'focus-next-level') nextFocusPlayLevel();
        if (action === 'focus-replay') replayFocusPlayLevel();
        if (action === 'focus-pick-map') backFocusPlayMap();
        if (action === 'motion-done') completeMotionTimer();
        if (action === 'literacy-mark') markLiteracyFlash(target.dataset.char, target.dataset.known === '1');
        if (action === 'literacy-teach-start') startLiteracyTeach();
        if (action === 'literacy-teach-next') advanceLiteracyTeach();
        if (action === 'literacy-remember') rememberLiteracyTeach();
        if (action === 'literacy-stroke') {
            if (ui.lessonSession && ui.lessonSession.literacy) {
                ui.lessonSession.literacy.strokePlay = (Number(ui.lessonSession.literacy.strokePlay) || 0) + 1;
                renderLessonDialog();
            }
        }
        if (action === 'literacy-hint') toggleLiteracyHint();
        if (action === 'literacy-next') advanceLiteracy();
        if (action === 'bank-quiz-next') advanceBankQuiz();
        if (action === 'bank-quiz-speak') speakLiteracy(target.dataset.text, target.dataset.lang || 'zh-CN');
        if (action === 'literacy-bloom') toggleLiteracyBloom(target.dataset.word);
        if (action === 'lesson-finish') finishLesson();
        if (action === 'close-lesson') closeLessonDialog();
        if (action === 'open-focus') openDialog('focus');
        if (action === 'export') exportSnapshot();
        if (action === 'import-trigger') importFile.click();
        if (action === 'task-filter') { ui.taskFilter = target.dataset.filter || 'all'; render(); }
        if (action === 'account-login') authenticateAccount(target, 'login');
        if (action === 'account-register') authenticateAccount(target, 'register');
        if (action === 'account-logout') { api.logout().then(function () { accountView.households = []; accountView.children = []; accountView.selectedHouseholdId = ''; render(); showToast('已退出登录，本地工作台仍可继续使用。'); }); }
        if (action === 'account-select-child') selectAccountChild(target.dataset.id);
        if (action === 'account-pull') pullRemoteSnapshot();
        if (action === 'account-push') pushRemoteSnapshot();
        if (action === 'set-language') {
            const language = target.dataset.language === 'en-US' ? 'en-US' : 'zh-CN';
            commit(function (next) { next.adult.language = language; }, language === 'en-US' ? 'English 导航已启用' : '已切换为简体中文');
        }
        if (action === 'clear-local-data') resetLocalData();
    });

    document.addEventListener('dragstart', function (event) {
        const target = event.target.closest('[data-action="select-plant"][data-plant-id]');
        if (!target || target.disabled || !event.dataTransfer) return;
        clearPreschoolPointerDrag();
        event.dataTransfer.effectAllowed = 'copy';
        event.dataTransfer.setData('text/plain', target.dataset.plantId);
    });

    document.addEventListener('dragover', function (event) {
        const target = event.target.closest('[data-action="place-defense-plant"]');
        if (!target || target.dataset.occupied === 'true') return;
        event.preventDefault();
        target.classList.add('is-drop-target');
    });

    document.addEventListener('dragleave', function (event) {
        const target = event.target.closest('[data-action="place-defense-plant"]');
        if (target) target.classList.remove('is-drop-target');
    });

    document.addEventListener('drop', function (event) {
        const target = event.target.closest('[data-action="place-defense-plant"]');
        if (!target || target.dataset.occupied === 'true') return;
        event.preventDefault();
        target.classList.remove('is-drop-target');
        const plantId = event.dataTransfer && event.dataTransfer.getData('text/plain');
        if (plantId) placePreschoolDefensePlant(target.dataset.lane, target.dataset.column, plantId);
    });

    document.addEventListener('dragend', function () {
        document.querySelectorAll('.pixel-battle-slot.is-drop-target').forEach(function (slot) { slot.classList.remove('is-drop-target'); });
    });

    function preschoolPointerDropTarget(event) {
        const element = document.elementFromPoint(event.clientX, event.clientY);
        const target = element && element.closest ? element.closest('[data-action="place-defense-plant"]') : null;
        return target && target.dataset.occupied !== 'true' ? target : null;
    }

    function clearPreschoolPointerDrag() {
        preschoolPointerDrag = null;
        document.querySelectorAll('.pixel-battle-slot.is-drop-target').forEach(function (slot) { slot.classList.remove('is-drop-target'); });
    }

    // Native HTML5 drag is unavailable on some touch surfaces and browser test drivers.
    // Keep a pointer fallback, but route the final drop through the same placement action.
    document.addEventListener('pointerdown', function (event) {
        const target = event.target.closest('[data-action="select-plant"][data-plant-id]');
        if (!target || target.disabled || target.getAttribute('draggable') !== 'true') return;
        preschoolPointerDrag = { plantId: target.dataset.plantId, pointerId: event.pointerId, moved: false };
    });

    document.addEventListener('pointermove', function (event) {
        const drag = preschoolPointerDrag;
        if (!drag || (drag.pointerId != null && event.pointerId !== drag.pointerId)) return;
        const target = preschoolPointerDropTarget(event);
        document.querySelectorAll('.pixel-battle-slot.is-drop-target').forEach(function (slot) {
            if (slot !== target) slot.classList.remove('is-drop-target');
        });
        if (!target) return;
        drag.moved = true;
        event.preventDefault();
        target.classList.add('is-drop-target');
    });

    document.addEventListener('pointerup', function (event) {
        const drag = preschoolPointerDrag;
        if (!drag || (drag.pointerId != null && event.pointerId !== drag.pointerId)) return;
        const target = preschoolPointerDropTarget(event);
        clearPreschoolPointerDrag();
        if (!drag.moved || !target) return;
        event.preventDefault();
        preschoolSuppressNextPlacementClick = true;
        window.setTimeout(function () { preschoolSuppressNextPlacementClick = false; }, 0);
        placePreschoolDefensePlant(target.dataset.lane, target.dataset.column, drag.plantId);
    });

    document.addEventListener('pointercancel', clearPreschoolPointerDrag);

    document.addEventListener('change', function (event) {
        const target = event.target;
        if (target.dataset.action === 'task-progress') {
            const progress = clamp(target.value, 0, 100);
            const ok = commit(function (next) { const item = next.tasks.find(entry => entry.id === target.dataset.id); if (item) { item.progress = progress; item.status = progress >= 100 ? 'done' : progress > 0 ? 'doing' : 'todo'; item.completedAt = progress >= 100 ? new Date().toISOString() : null; if (progress >= 100) { awardSunlight(next, `task:${item.id}`, 15); archiveItem(next, 'task', item); } } }, progress >= 100 ? (isChild ? '任务完成了，获得 15 阳光' : '任务完成了') : '进度已更新');
            if (ok && progress >= 100) speakPraise('学习任务完成啦！');
        }
        if (target.dataset.action === 'goal-progress') {
            const progress = clamp(target.value, 0, 100);
            commit(function (next) { const item = next.goals.find(entry => entry.id === target.dataset.id); if (item) { item.progress = progress; item.updatedAt = new Date().toISOString(); } }, '目标进度已更新');
        }
        if (target.dataset.action === 'toggle-voice') {
            commit(function (next) {
                next.growth = global.PersonalWorkbenchChildGrowth.setVoiceEnabled(next.growth, target.checked);
            }, target.checked ? '已打开语音夸奖' : '已关闭语音夸奖');
        }
        if (target.dataset.action === 'toggle-music') setPreschoolFeedbackPreference('musicEnabled', target.checked);
        if (target.dataset.action === 'toggle-motion') setPreschoolFeedbackPreference('motionEnabled', target.checked);
        if (target.dataset.action === 'summer-library-item') { ui.summerLibraryItem = Math.max(0, Number(target.value) || 0); render(); }
        if (target.matches('[data-account-household]')) { accountView.selectedHouseholdId = target.value; render(); }
    });

    entryForm.addEventListener('submit', submitForm);
    document.addEventListener('submit', function (event) {
        const form = event.target;
        if (form.matches('[data-family-form]')) {
            event.preventDefault();
            submitFamilyForm(form);
        }
        if (form.matches('[data-account-base-form]')) {
            event.preventDefault();
            saveApiBase(form.querySelector('button[type="submit"]') || form);
        }
        if (form.matches('[data-household-form]')) {
            event.preventDefault();
            createHousehold(form.querySelector('button[type="submit"]') || form);
        }
        if (form.matches('[data-child-form]')) {
            event.preventDefault();
            createChild(form.querySelector('button[type="submit"]') || form);
        }
    });
    importFile.addEventListener('change', function () { importSnapshot(importFile.files && importFile.files[0]); });
    window.addEventListener('hashchange', function () { const route = getRouteFromHash(); ui.page = getPageFromHash(); ui.courseId = route.page === 'courses' ? route.courseId : ''; ui.courseTab = getCourseTabFromHash(); ui.courseClassic = ui.courseTab === 'menu'; render(); if (shouldAutoCloseSidebar()) closeSidebar(); window.scrollTo(0, 0); });
    entryDialog.addEventListener('click', function (event) { if (event.target === entryDialog) closeDialog(); });
    if (lessonDialog) {
        lessonDialog.addEventListener('click', function (event) { if (event.target === lessonDialog) closeLessonDialog(); });
        lessonDialog.addEventListener('close', function () { clearLessonMotionTimer(); clearLessonSimonTimer(); ui.lessonSession = null; if (lessonDialogContent) lessonDialogContent.innerHTML = ''; });
    }

    if (!location.hash) history.replaceState(null, '', '#overview');
    global.lucide.createIcons();
    render();
    loadPhonicsReferenceBank();
})(window);
