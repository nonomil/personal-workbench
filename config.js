(function (global) {
    'use strict';

    const adultPages = {
        overview: { title: '概览', eyebrow: 'TODAY / OVERVIEW', heading: '今天，做一点可持续的进步', description: '把最重要的一步先做完，剩下的交给节奏。' },
        plans: { title: '今日计划', eyebrow: 'TODAY / PLAN', heading: '今天要完成什么', description: '只保留今天真正值得完成的几件事。' },
        tasks: { title: '成长任务', eyebrow: 'WORKSPACE / TASKS', heading: '把正在推进的事看清楚', description: '任务有方向、进度和下一步，才会慢慢变轻。' },
        reading: { title: '阅读记录', eyebrow: 'INPUT / READING', heading: '把输入变成自己的积累', description: '记录时间，也留下真正值得回看的内容。' },
        goals: { title: '长期目标', eyebrow: 'DIRECTION / GOALS', heading: '给长期目标一个可见的进度', description: '目标不用每天催促，但需要经常被看见。' },
        life: { title: '生活分区', eyebrow: 'LIFE OS / AREAS', heading: '把生活也放进工作台', description: '学习、健身、护肤和生活清单，按自己的节奏轻量维护。' },
        archive: { title: '归档与统计', eyebrow: 'LIFE OS / ARCHIVE', heading: '看见已经完成的时间', description: '完成的事项自动沉淀，年度统计只用来理解节奏，不用制造压力。' },
        family: { title: '家庭互动', eyebrow: 'FAMILY / FEEDBACK', heading: '把一句鼓励送到对方那里', description: '家长可以留下鼓励和约定，孩子也能分享今天完成的事。' },
        reviews: { title: '每周复盘', eyebrow: 'REFLECT / REVIEW', heading: '把经历整理成下一步', description: '记下发生了什么，再决定下一步怎么做。' },
        account: { title: '账号与同步', eyebrow: 'ACCOUNT / SYNC', heading: '把本地工作台带到另一台设备', description: '登录现有自托管服务，按孩子档案上传或恢复快照。' },
        settings: { title: '偏好设置', eyebrow: 'WORKBENCH / SETTINGS', heading: '让工作台更贴合你的节奏', description: '管理语言、本地数据和导入导出，不影响离线使用。' }
    };

    const childPages = {
        overview: { title: '今天', eyebrow: 'TODAY / CHECK-IN', heading: '今天，完成三件小事', description: '先打卡，再玩耍；每一步都算数。' },
        growth: { title: '成长地图', eyebrow: 'GROW / ADVENTURE', heading: '让阳光、植物和星芒一起长大', description: '完成真实行动，照顾自己的小花园，也为星芒解锁新造型。' },
        plans: { title: '今日打卡', eyebrow: 'TODAY / CHECK-IN', heading: '今天的成长清单', description: '把学习、运动和自己的小习惯排成一条清楚的路线。' },
        tasks: { title: '学习任务', eyebrow: 'LEARN / MISSIONS', heading: '把学习任务变成小关卡', description: '拖动进度，记录已经走到哪一步。' },
        mistakes: { title: '错题本', eyebrow: 'LEARN / REVIEW', heading: '把卡住的题变成下一次会做', description: '记录错因和正确思路，复习时只看最需要的几道。' },
        courses: { title: '语数英课程', eyebrow: 'LEARN / COURSES', heading: '每天推进一小节，三门课都看得见', description: '语文、数学、英语各自有小课节，完成一节就留下一个成长脚印。' },
        reading: { title: '阅读记录', eyebrow: 'READ / JOURNAL', heading: '把读过的故事留下来', description: '记下书名、页数和最喜欢的一句话。' },
        goals: { title: '成长目标', eyebrow: 'GROW / BADGES', heading: '给想坚持的事一枚徽章', description: '目标可以很小，持续完成就会越来越亮。' },
        rewards: { title: '奖励中心', eyebrow: 'GROW / REWARDS', heading: '用阳光换一个期待', description: '完成真实的学习和生活行动，再选择一个值得期待的小奖励。' },
        family: { title: '家长互动', eyebrow: 'FAMILY / SHARE', heading: '把今天的成长分享给家长', description: '看到鼓励，也让家长知道你今天完成了什么。' },
        account: { title: '账号与同步', eyebrow: 'ACCOUNT / SYNC', heading: '在自己的设备上继续成长', description: '登录现有自托管服务，和家庭共享同一份快照。' },
        reviews: { title: '成长日记', eyebrow: 'REFLECT / DIARY', heading: '今天的自己有什么发现', description: '写下一件做得好的事，再给明天留一个小提示。' }
    };

    const preschoolPages = {
        overview: { title: '今天', eyebrow: 'TODAY', heading: '今天玩三项', description: '选一张图，开始一小步。' },
        growth: { title: '成长', eyebrow: 'GROW', heading: '我的小花园', description: '阳光、植物和星芒一起长大。' },
        plans: { title: '打卡', eyebrow: 'CHECK-IN', heading: '今天做什么', description: '做完一项，就点亮一颗星。' },
        courses: { title: '课程', eyebrow: 'LEARN', heading: '一起学一会儿', description: '语文、数学、英语，选一张开始。' },
        mistakes: { title: '改错', eyebrow: 'TRY AGAIN', heading: '再试一次', description: '不会的题，和家长一起看看。' },
        rewards: { title: '奖励', eyebrow: 'REWARDS', heading: '阳光换礼物', description: '攒阳光，选一个小期待。' },
        family: { title: '家长', eyebrow: 'FAMILY', heading: '告诉家长', description: '把今天的小成就分享出去。' },
        account: { title: '设置', eyebrow: 'SETTINGS', heading: '家长设置', description: '账号和多设备同步。' }
    };

    const variants = {
        adult: {
            id: 'adult',
            name: '成人成长工作台',
            shortName: '成长工作台',
            englishName: 'ADULT GROWTH WORKBENCH',
            path: '../成人成长工作台/',
            switchIcon: 'layout-dashboard',
            switchTone: 'orange',
            switchSummary: '计划、阅读、目标与复盘',
            avatar: '我',
            statusNote: '本地快照 · 独立保存',
            storageKey: 'petbank_huchuliang_adult_workbench_state_v1',
            heroSrc: '../assets/generated/workbench-hero-adult.webp',
            heroAlt: '深色桌面上的空白笔记本与专注工具',
            pageMeta: adultPages,
            actions: { 'add-plan': '添加今日计划', 'add-task': '添加成长任务', 'add-life-entry': '添加生活记录', 'add-milestone': '添加截止/考试', 'add-habit': '添加习惯', 'add-family': '写家庭互动', 'add-review': '添加每周复盘' }
        },
        child: {
            id: 'child',
            name: '儿童学习工作台',
            shortName: '学习工作台',
            englishName: 'CHILD LEARNING WORKBENCH',
            path: '../儿童学习工作台/',
            switchIcon: 'book-open',
            switchTone: 'blue',
            switchSummary: '语数英、错题、奖励与互动',
            avatar: '星',
            statusNote: '本地快照 · 家长可备份',
            storageKey: 'petbank_huchuliang_child_workbench_state_v1',
            heroSrc: '../assets/generated/workbench-hero-child.webp',
            heroAlt: '明亮学习桌上的书本、彩色便签与成长徽章',
            pageMeta: childPages,
            childRewards: [
                { id: 'reward-story-choice', title: '今晚选一个故事', description: '今天的睡前故事由你来选。', cost: 40, icon: 'book-open', tone: 'blue' },
                { id: 'reward-family-choice', title: '周末活动提案', description: '提出一个周末活动，和家人一起讨论。', cost: 80, icon: 'sparkles', tone: 'orange' },
                { id: 'reward-family-time', title: '专属亲子时间', description: '兑换一次由你选择的亲子时光。', cost: 120, icon: 'heart-handshake', tone: 'lime' }
            ],
            childCourses: [
                { id: 'chinese', title: '语文', description: '阅读、表达和文字观察', icon: 'book-open', tone: 'orange', lessons: [{ id: 'course-chinese-1', title: '找出一句拟人句', minutes: 15 }, { id: 'course-chinese-2', title: '读一段故事并说出感受', minutes: 20 }, { id: 'course-chinese-3', title: '写下今天的新词', minutes: 10 }] },
                { id: 'math', title: '数学', description: '口算、图形和生活中的数字', icon: 'calculator', tone: 'blue', lessons: [{ id: 'course-math-1', title: '完成两位数口算', minutes: 15 }, { id: 'course-math-2', title: '找出身边的三种图形', minutes: 10 }, { id: 'course-math-3', title: '用数字记录一次购物', minutes: 15 }] },
                { id: 'english', title: '英语', description: '词卡、句子和听说输入', icon: 'languages', tone: 'lime', lessons: [{ id: 'course-english-1', title: '复习 20 张词卡', minutes: 20 }, { id: 'course-english-2', title: '读出五个完整句子', minutes: 15 }, { id: 'course-english-3', title: '写下三个今天会用的词', minutes: 10 }] }
            ],
            actions: { 'add-plan': '添加打卡项', 'add-task': '添加学习任务', 'add-mistake': '记录错题', 'add-reading': '记录阅读', 'add-goal': '添加成长目标', 'add-family': '分享今日成长', 'add-review': '写成长日记' }
        },
        preschool: {
            id: 'preschool',
            name: '幼儿学习工作台',
            shortName: '小小工作台',
            englishName: 'PRESCHOOL LEARNING WORKBENCH',
            path: '../preschool-workbench/',
            switchIcon: 'sprout',
            switchTone: 'lime',
            switchSummary: '大图打卡、花园、收集与奖励',
            assetBase: '../assets/generated/preschool/',
            avatar: '芽',
            statusNote: '本地快照 · 家长可备份',
            storageKey: 'petbank_huchuliang_preschool_workbench_state_v1',
            heroSrc: '../assets/generated/preschool/preschool-garden-hero.webp',
            heroAlt: '阳光花园里的植物伙伴和星星',
            pageMeta: preschoolPages,
            childRewards: [
                { id: 'preschool-reward-story', title: '选故事', description: '今晚选一本喜欢的故事。', cost: 20, icon: 'book-open', tone: 'blue' },
                { id: 'preschool-reward-play', title: '选游戏', description: '和家人玩一个小游戏。', cost: 40, icon: 'gamepad-2', tone: 'orange' },
                { id: 'preschool-reward-family', title: '亲子时光', description: '和家人一起做喜欢的事。', cost: 60, icon: 'heart-handshake', tone: 'lime' }
            ],
            childCourses: [
                { id: 'preschool-chinese', title: '语文', description: '听一听，说一说', icon: 'book-open', tone: 'orange', lessons: [{ id: 'preschool-chinese-1', title: '听故事', minutes: 10 }, { id: 'preschool-chinese-2', title: '找一找', minutes: 10 }, { id: 'preschool-chinese-3', title: '说一说', minutes: 10 }] },
                { id: 'preschool-math', title: '数学', description: '数一数，认一认', icon: 'calculator', tone: 'blue', lessons: [{ id: 'preschool-math-1', title: '数水果', minutes: 10 }, { id: 'preschool-math-2', title: '找图形', minutes: 10 }, { id: 'preschool-math-3', title: '比大小', minutes: 10 }] },
                { id: 'preschool-english', title: '英语', description: '听一听，跟着说', icon: 'languages', tone: 'lime', lessons: [{ id: 'preschool-english-1', title: 'Hello', minutes: 8 }, { id: 'preschool-english-2', title: '颜色', minutes: 8 }, { id: 'preschool-english-3', title: '动物', minutes: 8 }] }
            ],
            actions: { 'add-plan': '加一项', 'add-task': '加任务', 'add-mistake': '记下来', 'add-family': '告诉家长' }
        }
    };

    const body = typeof document !== 'undefined' ? document.body : null;
    const variantId = body && body.dataset && body.dataset.workbenchVariant ? body.dataset.workbenchVariant : 'adult';
    const selected = variants[variantId] || variants.adult;
    const configuredStorageKey = body && body.dataset && body.dataset.storageKey ? body.dataset.storageKey : '';
    const configuredHeroSrc = body && body.dataset && body.dataset.heroSrc ? body.dataset.heroSrc : '';
    const launcher = global.PersonalWorkbenchLauncher;

    if (launcher && typeof launcher.remember === 'function') launcher.remember(selected.id);

    global.PersonalWorkbenchConfig = {
        variant: selected.id,
        current: Object.assign({}, selected, {
            storageKey: configuredStorageKey || selected.storageKey,
            heroSrc: configuredHeroSrc || selected.heroSrc
        }),
        variants: variants,
        pageMeta: selected.pageMeta,
        actions: selected.actions,
        childRewards: selected.childRewards || [],
        childCourses: selected.childCourses || []
    };

    if (!body) return;
    body.classList.add(`variant-${selected.id}`);
    document.title = selected.name;
    const labelMap = {
        '.brand strong': selected.name,
        '.brand small': selected.englishName,
        '.sidebar-section-label': selected.id === 'preschool' ? '小小路线' : selected.id === 'child' ? '学习路线' : '工作台',
        '.topbar-context strong': selected.pageMeta.overview.title,
        '.mode-status strong': '本地模式',
        '.mode-status small': selected.statusNote,
        '.sidebar-footnote': selected.id === 'preschool' ? 'v0.3 · 幼儿版' : selected.id === 'child' ? 'v0.2 · 儿童版' : 'v0.2 · 成人版',
        '.avatar': selected.avatar
    };
    Object.keys(labelMap).forEach(function (selector) {
        const element = document.querySelector(selector);
        if (element) element.textContent = labelMap[selector];
    });
    document.querySelectorAll('.nav-item').forEach(function (item) {
        const page = item.dataset.page;
        const span = item.querySelector('span');
        if (span && selected.pageMeta[page]) span.textContent = selected.pageMeta[page].title;
    });
    const focusLabel = document.querySelector('.topbar-focus-button span');
    if (focusLabel && selected.id === 'child') focusLabel.textContent = '记录学习';
    if (focusLabel && selected.id === 'preschool') focusLabel.textContent = '开始学习';

    const topbarActions = document.querySelector('.topbar-actions');
    if (topbarActions && !topbarActions.querySelector('.topbar-workbench-switcher')) {
        const switcher = document.createElement('details');
        switcher.className = 'topbar-workbench-switcher';
        const summary = document.createElement('summary');
        summary.className = 'topbar-mode-link';
        summary.title = '切换工作台';
        summary.setAttribute('aria-label', '切换工作台');
        summary.innerHTML = '<i data-lucide="layout-dashboard"></i><span>切换工作台</span>';
        const menu = document.createElement('div');
        menu.className = 'topbar-workbench-menu';
        Object.keys(variants).forEach(function (id) {
            const item = variants[id];
            const link = document.createElement('a');
            link.className = `topbar-workbench-option ${id === selected.id ? 'is-current' : ''}`;
            link.href = launcher && typeof launcher.getSiblingPath === 'function' ? launcher.getSiblingPath(selected.id, id) : (item.path || '../');
            link.dataset.workbenchVariant = id;
            if (id === selected.id) link.setAttribute('aria-current', 'page');
            link.innerHTML = `<i data-lucide="${item.switchIcon || 'layout-dashboard'}"></i><span><strong>${item.name}</strong><small>${item.switchSummary || item.statusNote || ''}</small></span>${id === selected.id ? '<b>当前</b>' : ''}`;
            menu.appendChild(link);
        });
        switcher.append(summary, menu);
        topbarActions.insertBefore(switcher, topbarActions.firstChild);
    }
})(typeof window !== 'undefined' ? window : globalThis);
