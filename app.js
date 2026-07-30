(function (global) {
    'use strict';

    const storage = global.PersonalWorkbenchStorage;
    const workbenchConfig = global.PersonalWorkbenchConfig || {};
    const repository = storage.repository;
    const pageContent = document.getElementById('page-content');
    const entryDialog = document.getElementById('entry-dialog');
    const entryForm = document.getElementById('entry-form');
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

    const PAGE_META = workbenchConfig.pageMeta || {
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

    const CATEGORY_COLORS = { 学习: 'orange', 阅读: 'blue', 实践: 'lime', 运动: 'gold', 自控: 'orange', 其它: 'blue' };
    const PRIORITY_LABELS = { high: '高优先', medium: '常规', low: '低优先' };
    const STATUS_LABELS = { todo: '待开始', doing: '进行中', done: '已完成' };
    const ui = { page: getPageFromHash(), taskFilter: 'all', dialogType: '', dialogId: '', dialogArea: '' };
    const isPreschool = workbenchConfig.variant === 'preschool';
    const isChild = workbenchConfig.variant === 'child' || isPreschool;
    const isAdult = workbenchConfig.variant === 'adult';
    const preschoolGarden = global.PersonalWorkbenchPreschoolGarden;
    const PIXEL_ASSET_BASE = '../assets/generated/preschool-pixel/reference/gpt-output-20260730/published-gpt-v2/';
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
        'star-companion': 'star-companion.png'
    };
    let state = repository.load();
    let preschoolCelebrationTimer = 0;
    let preschoolPeaTimer = 0;
    let preschoolMusic = null;

    function getPageFromHash() {
        const candidate = (location.hash || '#overview').slice(1);
        return PAGE_META[candidate] ? candidate : 'overview';
    }

    function icon(name, className) {
        return `<i data-lucide="${name}"${className ? ` class="${className}"` : ''}></i>`;
    }

    function preschoolAssetSrc(name) {
        if (isPreschool && PIXEL_ASSET_FILES[name]) return `${PIXEL_ASSET_BASE}${PIXEL_ASSET_FILES[name]}`;
        const base = workbenchConfig.current && workbenchConfig.current.assetBase ? workbenchConfig.current.assetBase : '../assets/generated/preschool/';
        return `${base}${name}.webp`;
    }

    function preschoolAsset(name, alt) {
        return `<img class="preschool-generated-art" src="${escapeHtml(preschoolAssetSrc(name))}" alt="${escapeHtml(alt || '')}" loading="lazy" onerror="this.hidden=true">`;
    }

    function preschoolAssetForIcon(iconName) {
        const assets = {
            sun: 'sun-token',
            sprout: 'seedling-node',
            droplets: 'water-drop-token',
            'book-open': 'storybook-token',
            gift: 'treasure-chest',
            bug: 'cloud-invader',
            sparkles: 'star-companion',
            heart: 'star-companion',
            'heart-handshake': 'star-companion',
            calculator: 'sun-token',
            languages: 'storybook-token',
            'flower-2': 'flower-checkpoint',
            moon: 'star-companion',
            'shield-check': 'growth-tree',
            rainbow: 'growth-tree',
            crown: 'star-companion',
            'gamepad-2': 'treasure-chest',
            stamp: 'sun-smile-badge',
            map: 'quest-flag-pedestal'
        };
        return assets[iconName] || '';
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
        return { today, todayPlans, week, focusByDate, readingByDate, todayFocus, weekFocus, weekReading, weekPages, monthReading, completedPlans, completedTasks, streak, adult, yearFocus, yearReading, yearCompleted, yearDaysActive, dueSoon, overdueMilestones, todayHabits };
    }

    function setPage(page, replace) {
        ui.page = PAGE_META[page] ? page : 'overview';
        if (replace) history.replaceState(null, '', `#${ui.page}`);
        else if (location.hash !== `#${ui.page}`) location.hash = ui.page;
        render();
        closeSidebar();
    }

    function render() {
        const meta = PAGE_META[ui.page];
        const derived = getDerived();
        if (isPreschool) document.body.classList.toggle('preschool-no-motion', !getPreschoolFeedbackPreference('motionEnabled', true));
        updateModeStatus();
        document.querySelectorAll('.nav-item').forEach(function (item) {
            item.classList.toggle('is-active', item.dataset.page === ui.page);
        });
        pageName.textContent = meta.title;
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
        }
        applyLanguagePreference();
        global.lucide.createIcons({ root: pageContent });
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
        const resolvedActionLabel = workbenchConfig.actions && workbenchConfig.actions[action] ? workbenchConfig.actions[action] : actionLabel;
        const primary = action ? `<button class="btn-primary" type="button" data-action="${action}">${icon('plus')}${resolvedActionLabel}</button>` : '';
        return `<div class="page-intro"><div><span class="eyebrow">${meta.eyebrow}</span><h1>${meta.heading}</h1><p>${meta.description}</p></div><div class="page-intro-actions">${secondary || ''}${primary}</div></div>`;
    }

    function renderPreschoolIntro(meta, action, actionLabel, secondary) {
        const resolvedActionLabel = workbenchConfig.actions && workbenchConfig.actions[action] ? workbenchConfig.actions[action] : actionLabel;
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

    function renderPreschoolGardenBoard(growth, compact) {
        const garden = growth.garden || {};
        const activePlant = garden.activePlant || (preschoolGarden && preschoolGarden.PLANT_CATALOG ? preschoolGarden.PLANT_CATALOG[0] : { id: 'plant-sun-sprout', title: '太阳芽', icon: 'sun' });
        const invader = garden.invader || { active: false };
        const plantCount = garden.plants ? garden.plants.length : 1;
        const unlockedCount = garden.collection ? garden.collection.unlockedIds.length : 0;
        const action = invader.active ? 'navigate' : 'navigate';
        return `<section class="preschool-garden-board ${invader.active ? 'has-invader' : 'is-calm'} ${compact ? 'is-compact' : ''}">
            <div class="preschool-garden-board-head"><div><span class="eyebrow">SUN GARDEN</span><h2>${invader.active ? '小怪来捣乱了' : '我的阳光花园'}</h2><p>${invader.active ? '做完一项小任务，就能把它送回云朵外。' : '每一束阳光，都会让植物伙伴长大。'}</p></div><span class="garden-count-badge">${icon('album')} ${unlockedCount}/${garden.collection ? garden.collection.total : 0}</span></div>
            <div class="preschool-garden-scene">
                <div class="garden-sun-orbit"><span class="garden-sun-token">${preschoolAsset('sun-token', '阳光')}</span><span>+${growth.sunlight}</span></div>
                <div class="garden-cloud cloud-one"></div><div class="garden-cloud cloud-two"></div>
                <div class="garden-plant-spot"><span class="garden-plant-halo"></span><span class="garden-plant-icon tone-${escapeHtml(activePlant.tone || 'lime')}">${preschoolAsset(preschoolAssetForIcon(activePlant.icon) || 'preschool-sprout', activePlant.title)}</span><strong>${escapeHtml(activePlant.title)}</strong><small>${plantCount} 位植物伙伴</small></div>
                ${invader.active ? `<button class="garden-invader" type="button" data-action="${action}" data-page="plans"><span>${preschoolAsset('cloud-invader', '小怪')}</span><strong>小怪入侵</strong><small>完成一项赶走</small></button>` : `<span class="garden-calm-badge">${icon('shield-check')} 花园安全</span>`}
                <span class="garden-ground-line"></span>
            </div>
            <div class="preschool-garden-board-foot"><div class="garden-progress-copy"><span>植物伙伴</span><strong>${plantCount} / ${plantCount + 3}</strong></div><div class="garden-progress-track"><span style="width:${Math.round((plantCount / (plantCount + 3)) * 100)}%"></span></div><button class="btn-secondary" type="button" data-action="navigate" data-page="growth">看花园${icon('arrow-up-right')}</button></div>
        </section>`;
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

    function renderPreschoolPlanRows(items) {
        if (!items.length) return renderEmpty('sparkles', '先加一项');
        return `<div class="preschool-plan-list">${items.map(function (item) {
            return `<div class="preschool-plan-row ${item.done ? 'is-done' : ''}"><button class="preschool-plan-check" type="button" data-action="toggle-plan" data-id="${escapeHtml(item.id)}" aria-label="${item.done ? '取消完成' : '完成'}${escapeHtml(item.title)}">${item.done ? icon('check') : ''}</button><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.category || '学习')}</small></div></div>`;
        }).join('')}</div>`;
    }

    function pixelQuestAsset(item) {
        const category = String(item && item.category || '学习');
        if (category === '语文' || category === '阅读') return 'storybook-token';
        if (category === '数学') return 'sun-smile-badge';
        if (category === '英语') return 'water-drop-token';
        if (category === '运动') return 'seedling-node';
        return 'star-companion';
    }

    function pixelQuestCard(item, index) {
        const done = Boolean(item.done);
        const label = done ? '已点亮' : '完成 +10 阳光';
        const asset = pixelQuestAsset(item);
        return `<button class="pixel-quest-card quest-tone-${index % 3} ${done ? 'is-done' : ''}" type="button" data-action="toggle-plan" data-id="${escapeHtml(item.id)}" aria-label="${done ? '取消完成' : '完成'}${escapeHtml(item.title)}">
            <span class="pixel-quest-ribbon">${escapeHtml(item.category || '学习')}</span>
            <span class="pixel-quest-art">${preschoolAsset(asset, item.title)}</span>
            <span class="pixel-quest-copy"><small>${done ? '已点亮' : '今天的冒险'}</small><strong>${escapeHtml(item.title)}</strong><em>${label}任务 <span>${done ? icon('check') : icon('arrow-right')}</span></em></span>
            <span class="pixel-quest-status ${done ? 'is-done' : ''}">${done ? icon('check') : ''}</span>
        </button>`;
    }

    function renderPixelMap(growth, plans, compact) {
        const garden = growth.garden || {};
        const invader = garden.invader || { active: false };
        const defense = getPreschoolDefense(growth);
        const activePlant = garden.activePlant || { title: '太阳芽', icon: 'sun', tone: 'gold' };
        const nodes = plans.slice(0, 3).map(function (item, index) {
            const active = !item.done && plans.slice(0, index).every(entry => entry.done);
            return `<button class="pixel-map-node ${item.done ? 'is-done' : active ? 'is-active' : ''}" type="button" data-action="toggle-plan" data-id="${escapeHtml(item.id)}" aria-label="${item.done ? '取消完成' : '完成'}${escapeHtml(item.title)}"><span class="pixel-node-flag">${item.done ? icon('check') : index + 1}</span><span class="pixel-node-icon">${preschoolAsset(pixelQuestAsset(item), item.title)}</span><strong>${escapeHtml(item.title)}</strong></button>`;
        }).join('');
        const health = Math.max(0, Number(invader.health) || 0);
        const maxHealth = Math.max(1, Number(invader.maxHealth) || 3);
        const plantAsset = preschoolAssetForIcon(activePlant.icon) || 'seedling-node';
        const laneRows = Array.from({ length: 3 }, function (_, laneIndex) {
            const isTarget = Boolean(invader.active && laneIndex === 1);
            const pathCells = Array.from({ length: 4 }, function (_, cellIndex) {
                return `<span class="pixel-battle-path-cell" aria-hidden="true"><i></i><b>${cellIndex + 1}</b></span>`;
            }).join('');
            return `<div class="pixel-battle-lane-row ${isTarget ? 'is-target' : ''}" data-lane="${laneIndex + 1}" aria-label="第 ${laneIndex + 1} 路花园防守">
                <span class="pixel-battle-plant-column">${preschoolAsset(plantAsset, activePlant.title)}</span>
                <span class="pixel-battle-path">${pathCells}</span>
                <span class="pixel-battle-invader-column">${isTarget ? `<span class="pixel-battle-invader">${preschoolAsset('cloud-invader', '小怪')}</span><span class="pixel-hit-flash" aria-hidden="true"></span>` : ''}</span>
            </div>`;
        }).join('');
        return `<section class="pixel-map-panel ${compact ? 'is-compact' : ''} ${invader.active ? 'has-invader' : ''}">
            <div class="pixel-map-copy"><span class="pixel-panel-kicker">SUN GARDEN / DEFENSE</span><h2>${invader.active ? '小怪来捣乱了' : '花园防守场'}</h2><p>${invader.active ? `第 ${invader.wave || 1} 波 · 再发射 ${health} 次就能赶走。` : '完成任务收集阳光，种下植物守护花园。'}</p></div>
            <div class="pixel-map-hud"><span class="pixel-map-sun">${preschoolAsset('sun-token', '阳光')}<b>${growth.sunlight}</b></span><span class="pixel-defense-energy">${icon('circle-dot')} 豌豆 ${defense.energy}</span><span class="pixel-wave-badge">${invader.active ? `生命 ${health}/${maxHealth}` : '花园安全'}</span></div>
            <div class="pixel-battlefield" aria-label="三路六列阳光花园防守场景"><div class="pixel-battle-sky"><span class="pixel-battle-cloud cloud-a"></span><span class="pixel-battle-cloud cloud-b"></span><span class="pixel-battle-sun">${preschoolAsset('sun-token', '阳光')}</span></div><div class="pixel-battle-grid"><span class="pixel-battle-row-label">三路</span><div class="pixel-battle-lanes">${laneRows}</div></div><div class="pixel-battle-ground"></div></div>
            <div class="pixel-defense-actions">${invader.active ? `<button class="pixel-pea-button" type="button" data-action="fire-pea" ${defense.canFire ? '' : 'disabled'}>${icon('zap')} 发射豌豆 <b>${defense.energy}</b></button>` : `<button class="pixel-pea-button is-practice" type="button" data-action="spawn-invader">${icon('swords')} 来一波练习</button>`}<span class="pixel-defense-hint">${invader.active ? (defense.canFire ? '点一下，植物会发射豌豆！' : '先完成一个小任务，收集豌豆能量。') : '想练习防守？召唤一朵云朵小怪。'}</span></div>
            <div class="pixel-map-route"><span class="pixel-route-line"></span>${nodes || `<span class="pixel-map-empty">先加一项小任务</span>`}</div>
            <div class="pixel-map-companion"><span>${preschoolAsset('star-companion', '星芒')}</span><div><strong>星芒在陪你</strong><small>连续 ${growth.streak} 天</small></div></div>
            ${invader.active ? `<span class="pixel-map-invader"><span>${preschoolAsset('cloud-invader', '小怪')}</span><strong>小怪入侵</strong><small>${defense.energy ? '准备发射' : '完成任务得能量'}</small></span>` : `<span class="pixel-map-safe">${icon('shield-check')} 花园安全</span>`}
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
        const activePlant = garden.activePlant || { title: '太阳芽' };
        const collection = garden.collection || { unlockedIds: [], total: 0 };
        const stats = [
            { label: '阳光', value: growth.sunlight, note: '可兑换', asset: 'sun-token', tone: 'sun' },
            { label: '植物', value: garden.unlockedPlantIds ? garden.unlockedPlantIds.length : 1, note: activePlant.title, asset: 'seedling-node', tone: 'plant' },
            { label: '豌豆', value: defense.energy, note: '防守能量', asset: 'water-drop-token', tone: 'pea' },
            { label: '等级', value: `Lv.${growth.level}`, note: `${growth.petXp} XP`, asset: 'star-companion', tone: 'level' },
            { label: '连续', value: `${growth.streak} 天`, note: '每天点亮', asset: 'sun-smile-badge', tone: 'streak' },
            { label: '收藏', value: `${collection.unlockedIds.length}/${collection.total}`, note: '已发现', asset: 'treasure-chest', tone: 'collection' }
        ];
        return `<section class="pixel-stat-strip" aria-label="成长状态">${stats.map(function (stat) {
            return `<article class="pixel-stat-card tone-${stat.tone}"><span class="pixel-stat-art">${preschoolAsset(stat.asset, stat.label)}</span><span class="pixel-stat-copy"><small>${escapeHtml(stat.label)}</small><strong>${escapeHtml(stat.value)}</strong><em>${escapeHtml(stat.note)}</em></span></article>`;
        }).join('')}</section>`;
    }

    function renderPreschoolOverview(derived) {
        const growth = getChildGrowth();
        const done = derived.todayPlans.filter(item => item.done).length;
        const plans = derived.todayPlans;
        const total = plans.length;
        const defense = getPreschoolDefense(growth);
        return `<div class="pixel-home">
            <section class="pixel-page-header"><div><span class="pixel-panel-kicker">TODAY / ADVENTURE</span><h1>今天的冒险开始啦</h1><p>${done}/${total || 0} 个任务已点亮，完成一小步，花园就多一束光。</p></div><div class="pixel-header-actions"><span class="pixel-hud-sun">${preschoolAsset('sun-token', '阳光')}<strong>${growth.sunlight}</strong></span><span class="pixel-hud-defense">${icon('zap')} <strong>${defense.energy}</strong> 豌豆</span><span class="pixel-hud-streak">${icon('flame')} ${growth.streak} 天</span><button class="pixel-settings-button" type="button" data-action="navigate" data-page="account" aria-label="打开设置" title="打开设置">${icon('settings-2')}</button></div></section>
            ${renderPixelStats(growth, defense)}
            <div class="pixel-world-grid">${renderPixelMap(growth, plans, true)}<section class="pixel-quest-board"><div class="pixel-board-heading"><div><span class="pixel-panel-kicker">TODAY QUESTS</span><h2>完成任务，收集阳光</h2></div><span class="pixel-board-count">${done} / ${total || 0} 完成</span></div><div class="pixel-quest-grid">${plans.map(pixelQuestCard).join('')}</div></section><aside class="pixel-side-stack">${renderPixelChest(growth, done, total)}${renderPixelCollection(growth)}</aside></div>
            <section class="pixel-bottom-bar"><div><span class="pixel-panel-kicker">LITTLE ROUTE</span><strong>语文 · 数学 · 英语</strong><small>每完成一项，阳光会照亮花园。</small></div><button class="pixel-side-button" type="button" data-action="navigate" data-page="courses">${icon('book-open')} 去上小课</button><button class="pixel-side-link" type="button" data-action="navigate" data-page="family">告诉家长${icon('heart')}</button></section>
        </div>`;
    }

    function renderPreschoolGrowth() {
        const growth = getChildGrowth();
        const garden = growth.garden || { invaderActive: growth.zombieActive, invader: { active: growth.zombieActive }, plants: [], collection: { unlockedIds: [], total: 0 } };
        const activeStyle = growth.styles.find(item => item.id === growth.activeStyleId) || growth.styles[0];
        const waterAvailable = growth.lastWateredDate !== storage.localDate() && growth.sunlight >= 5;
        const rewardCards = growth.streakRewards.map(function (reward) {
            const unlocked = growth.unlockedStreakRewardIds.includes(reward.id);
            const claimed = growth.claimedStreakRewardIds.includes(reward.id);
            return `<div class="preschool-streak-card ${claimed ? 'is-claimed' : ''}"><span>${escapeHtml(reward.days)}天</span><strong>${escapeHtml(reward.title)}</strong>${claimed ? `<small>已领</small>` : unlocked ? `<button class="row-action" type="button" data-action="claim-streak-reward" data-id="${escapeHtml(reward.id)}" aria-label="领取${escapeHtml(reward.title)}" title="领取奖励">${icon('gift')}</button>` : `<small>继续</small>`}</div>`;
        }).join('');
        return `${renderPreschoolIntro(PAGE_META.growth, '', '', `<span class="points-chip">${icon('sun')}${growth.sunlight}</span>`)}
            <section class="preschool-growth-hero"><div><span class="preschool-big-number">${growth.sunlight}</span><span class="preschool-big-label">阳光</span><div class="growth-meter"><span style="width:${growth.levelProgress}%"></span></div><p>星芒 · ${escapeHtml(activeStyle.title)}</p></div><div class="preschool-growth-art"><img src="${escapeHtml(preschoolAssetSrc('preschool-garden-hero'))}" alt="阳光花园里的植物伙伴和星星" onerror="this.hidden=true"><span>${preschoolVisual(activeStyle.icon, preschoolAssetForIcon(activeStyle.icon), activeStyle.title)}<b>Lv.${growth.level}</b></span></div></section>
            ${renderPreschoolGardenBoard(growth, false)}
            <div class="preschool-stat-grid"><article class="preschool-stat-card tone-lime">${preschoolVisual('sprout', 'seedling-node', growth.plant.title)}<strong>${escapeHtml(growth.plant.title)}</strong><small>植物阶段 ${growth.plant.stage}</small></article><article class="preschool-stat-card tone-blue">${preschoolVisual('sparkles', 'star-companion', growth.unicorn.name)}<strong>${escapeHtml(growth.unicorn.name)}</strong><small>${growth.petXp} XP</small></article><article class="preschool-stat-card tone-gold">${preschoolVisual('sun', 'sun-token', '连续打卡')}<strong>${growth.streak} 天</strong><small>连续打卡</small></article><article class="preschool-stat-card ${garden.invaderActive ? 'tone-pink is-alert' : 'tone-orange'}">${preschoolVisual(garden.invaderActive ? 'bug' : 'shield-check', garden.invaderActive ? 'cloud-invader' : 'growth-tree', garden.invaderActive ? '小怪' : '花园安全')}<strong>${garden.invaderActive ? '有小怪' : '很安全'}</strong><small>${garden.invaderActive ? '完成一项就赶走' : '继续保持'}</small></article></div>
            <section class="preschool-growth-actions"><button class="btn-primary" type="button" data-action="water-plant" ${waterAvailable ? '' : 'disabled'}>${icon('droplets')}${growth.lastWateredDate === storage.localDate() ? '已浇水' : '浇水'}</button><label class="voice-toggle"><input type="checkbox" data-action="toggle-voice" ${growth.voiceEnabled ? 'checked' : ''}><span class="voice-toggle-track"></span><span>语音鼓励</span></label><button class="btn-secondary" type="button" data-action="navigate" data-page="plans">去打卡${icon('arrow-up-right')}</button></section>
            <section class="preschool-section"><div class="preschool-section-head"><div><span class="eyebrow">STREAK</span><h2>连续奖励</h2></div></div><div class="preschool-streak-grid">${rewardCards}</div></section>
            <section class="preschool-section"><div class="preschool-section-head"><div><span class="eyebrow">PLANTS</span><h2>植物伙伴</h2></div><span class="tag lime">点一下换伙伴</span></div><div class="preschool-plant-grid">${garden.plants.map(function (plant) { const unlocked = garden.unlockedPlantIds.includes(plant.id); const active = plant.id === garden.activePlantId; const assetName = preschoolAssetForIcon(plant.icon); return `<button class="preschool-plant-card ${active ? 'is-active' : ''} ${unlocked ? '' : 'is-locked'} tone-${escapeHtml(plant.tone || 'lime')}" type="button" data-action="select-plant" data-id="${escapeHtml(plant.id)}" ${unlocked ? '' : 'disabled'}><span class="${assetName ? 'has-image' : ''}">${assetName ? preschoolAsset(assetName, unlocked ? plant.title : '未出现') : icon(plant.icon)}</span><strong>${escapeHtml(unlocked ? plant.title : '未出现')}</strong><small>${escapeHtml(unlocked ? plant.description : `${plant.unlockAt} 阳光出现`)}</small></button>`; }).join('')}</div></section>
            ${renderPreschoolCollection(garden)}
            <section class="preschool-section"><div class="preschool-section-head"><div><span class="eyebrow">STYLE</span><h2>星芒造型</h2></div></div><div class="preschool-style-grid">${growth.styles.map(function (style) { const unlocked = growth.unlockedStyleIds.includes(style.id); const active = style.id === growth.activeStyleId; const assetName = preschoolAssetForIcon(style.icon); return `<button class="preschool-style-card ${active ? 'is-active' : ''} ${unlocked ? '' : 'is-locked'}" type="button" data-action="select-style" data-id="${escapeHtml(style.id)}" ${unlocked ? '' : 'disabled'}><span class="${assetName ? 'has-image' : ''}">${assetName ? preschoolAsset(assetName, style.title) : icon(style.icon)}</span><strong>${escapeHtml(style.title)}</strong></button>`; }).join('')}</div></section>`;
    }

    function renderPreschoolPlans(derived) {
        const done = derived.todayPlans.filter(item => item.done).length;
        return `${renderPreschoolIntro(PAGE_META.plans, 'add-plan', '加一项', `<span class="points-chip">${icon('circle-check')}${done}/${derived.todayPlans.length}</span>`)}<section class="preschool-plan-card"><div class="preschool-section-head"><div><span class="eyebrow">TODAY</span><h2>做完就点亮</h2></div></div>${renderPreschoolPlanRows(derived.todayPlans)}</section>`;
    }

    function renderPreschoolCourses() {
        const catalog = Array.isArray(workbenchConfig.childCourses) ? workbenchConfig.childCourses : [];
        const courses = global.PersonalWorkbenchChildCourses && typeof global.PersonalWorkbenchChildCourses.getCourseView === 'function'
            ? global.PersonalWorkbenchChildCourses.getCourseView(catalog, state.courseProgress)
            : catalog;
            return `${renderPreschoolIntro(PAGE_META.courses, '', '', '<span class="tag lime">每天一张</span>')}<div class="preschool-course-grid">${courses.map(function (course) { return `<article class="preschool-course-card tone-${escapeHtml(course.tone || 'blue')}"><div class="preschool-course-head">${preschoolVisual(course.icon || 'book-open', preschoolAssetForIcon(course.icon || 'book-open'), course.title)}<div><h2>${escapeHtml(course.title)}</h2><small>${escapeHtml(course.description || '')}</small></div><strong>${course.completed || 0}/${course.total || 0}</strong></div><div class="preschool-course-lessons">${(course.lessons || []).map(function (lesson) { const completed = (state.courseProgress.completedLessonIds || []).includes(lesson.id); return `<button class="preschool-lesson ${completed ? 'is-done' : ''}" type="button" data-action="complete-lesson" data-id="${escapeHtml(lesson.id)}" ${completed ? 'disabled' : ''}><span>${icon(completed ? 'check' : 'play')}</span><strong>${escapeHtml(lesson.title)}</strong><small>${completed ? '完成' : `${lesson.minutes} 分钟`}</small></button>`; }).join('')}</div></article>`; }).join('')}</div>`;
    }

    function renderPreschoolMistakes() {
        const items = state.mistakes.slice().sort((a, b) => String(a.reviewDate || a.date).localeCompare(String(b.reviewDate || b.date)));
        return `${renderPreschoolIntro(PAGE_META.mistakes, 'add-mistake', '记下来')}<section class="preschool-mistake-card"><div class="preschool-section-head"><div><span class="eyebrow">TRY AGAIN</span><h2>${items.length ? '再试一次' : '还没有题'}</h2></div><span class="preschool-card-visual">${icon('triangle-alert')}</span></div>${items.length ? `<div class="preschool-mistake-list">${items.map(function (item) { return `<article class="preschool-mistake-row"><span class="preschool-card-visual">${icon(item.status === 'mastered' ? 'check' : 'pencil')}</span><div><strong>${escapeHtml(item.question)}</strong><small>${escapeHtml(item.subject || '学习')} · ${item.status === 'mastered' ? '会了' : '再看看'}</small></div><button class="row-action" type="button" data-action="toggle-mistake" data-id="${escapeHtml(item.id)}" aria-label="标记${item.status === 'mastered' ? '未掌握' : '掌握'}" title="更新状态">${icon(item.status === 'mastered' ? 'rotate-ccw' : 'check')}</button></article>`; }).join('')}</div>` : renderEmpty('pencil', '把不会的题记下来')}</section>`;
    }

    function renderPreschoolRewards() {
        const growth = getChildGrowth();
        const rewards = getChildRewards();
        const tiers = ['小奖励', '开心奖励', '亲子奖励', '特别奖励'].map(function (tier) {
            return { name: tier, items: rewards.filter(function (reward) { return (reward.tier || '开心奖励') === tier; }) };
        }).filter(function (group) { return group.items.length; });
        const tierDescriptions = { '小奖励': '马上就能兑现的小惊喜', '开心奖励': '完成几项任务，换一个快乐时刻', '亲子奖励': '和家长一起完成的约定', '特别奖励': '坚持一阵子后的大宝藏' };
        const tierMarkup = tiers.map(function (group, index) {
            return `<section class="preschool-reward-tier tier-${index}"><div class="preschool-reward-tier-head"><div><span class="eyebrow">TIER ${String(index + 1).padStart(2, '0')}</span><h2>${escapeHtml(group.name)}</h2><p>${escapeHtml(tierDescriptions[group.name] || '')}</p></div><span class="preschool-reward-tier-count">${group.items.length} 份</span></div><div class="preschool-reward-tier-grid">${group.items.map(function (reward) { const claimed = growth.claimedRewardIds.includes(reward.id); const remaining = Math.max(0, Number(reward.cost) - growth.sunlight); const disabled = claimed || remaining > 0; const assetName = preschoolAssetForIcon(reward.icon || 'gift') || 'treasure-chest'; return `<article class="preschool-reward-card tone-${escapeHtml(reward.tone || 'orange')} ${claimed ? 'is-claimed' : ''}">${preschoolVisual(reward.icon || 'gift', assetName, reward.title)}<h2>${escapeHtml(reward.title)}</h2><strong>${escapeHtml(reward.cost)} 阳光</strong><button class="btn-primary" type="button" data-action="claim-reward" data-id="${escapeHtml(reward.id)}" ${disabled ? 'disabled' : ''}>${icon(claimed ? 'check' : 'gift')}${claimed ? '已领' : remaining ? `还差 ${remaining}` : '领取'}</button></article>`; }).join('')}</div></section>`;
        }).join('');
        return `${renderPreschoolIntro(PAGE_META.rewards, '', '', `<span class="points-chip">${icon('sun')}${growth.sunlight}</span>`)}<div class="preschool-reward-tier-list">${tierMarkup}</div>${renderPreschoolCollection(growth)}`;
    }

    function renderPreschoolFamily() {
        const messages = familyRepository ? familyRepository.load().messages : [];
        return `${renderPreschoolIntro(PAGE_META.family, '', '', `<span class="tag lime">${messages.length} 条</span>`)}<section class="preschool-family-card"><div class="preschool-card-visual">${icon('message-circle-heart')}</div><h2>我想告诉家长</h2><form data-family-form><input type="hidden" name="author" value="小朋友"><input type="hidden" name="kind" value="child-share"><textarea name="body" maxlength="200" required placeholder="我今天会了……"></textarea><button class="btn-primary" type="submit">发出去${icon('send')}</button></form></section><section class="preschool-section"><div class="preschool-section-head"><div><span class="eyebrow">FAMILY</span><h2>家长说</h2></div></div><div class="preschool-family-feed">${messages.length ? messages.slice(0, 5).map(function (item) { return `<article><span class="preschool-card-visual">${icon(item.author === '家长' ? 'heart' : 'sparkles')}</span><div><strong>${escapeHtml(item.body)}</strong><small>${escapeHtml(item.author)}</small></div></article>`; }).join('') : renderEmpty('heart', '还没有留言')}</div></section>`;
    }

    function renderPreschoolPage(derived) {
        if (ui.page === 'overview') return renderPreschoolOverview(derived);
        if (ui.page === 'growth') return renderPreschoolGrowth();
        if (ui.page === 'plans') return renderPreschoolPlans(derived);
        if (ui.page === 'courses') return renderPreschoolCourses();
        if (ui.page === 'mistakes') return renderPreschoolMistakes();
        if (ui.page === 'rewards') return renderPreschoolRewards();
        if (ui.page === 'family') return renderPreschoolFamily();
        if (ui.page === 'account') return renderAccount();
        return renderPreschoolOverview(derived);
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

    function renderOverview(derived) {
        const todayPercent = derived.todayPlans.length ? Math.round((derived.completedPlans / derived.todayPlans.length) * 100) : 0;
        const nextTask = state.tasks.find(item => item.status !== 'done' && Number(item.progress) < 100) || state.tasks[0];
        const goalProgress = state.goals.reduce((sum, item) => sum + Number(item.progress || 0), 0) / Math.max(1, state.goals.length);
        const growth = getChildGrowth();
        const metrics = isChild
            ? `${renderMetric('今日阳光', `${growth.sunlight}`, '完成打卡会增加', 'sun', 'positive')}${renderMetric('今日完成率', `${todayPercent}%`, `${derived.completedPlans}/${derived.todayPlans.length || 0} 项打卡`, 'circle-check', todayPercent >= 60 ? 'positive' : '')}${renderMetric('连续行动', `${derived.streak} 天`, derived.streak ? '稳定比冲刺重要' : '从今天开始', 'flame', derived.streak ? 'positive' : '')}${renderMetric('本周阅读', formatDuration(derived.weekReading), `${state.readingLogs.filter(item => derived.week.includes(item.date)).length} 条记录`, 'book-open', '')}`
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
            return `<div class="plan-row ${item.done ? 'is-done' : ''}"><button class="plan-check ${item.done ? 'is-done' : ''}" type="button" data-action="toggle-plan" data-id="${escapeHtml(item.id)}" aria-label="${item.done ? '取消完成' : '标记完成'}">${item.done ? icon('check') : ''}</button><div class="plan-row-content"><div class="plan-row-title">${escapeHtml(item.title)}</div><div class="plan-row-meta">${escapeHtml(item.category || '其它')} · ${item.done ? '已完成' : '待完成'}</div></div><div class="row-actions"><button class="row-action" type="button" data-action="edit-plan" data-id="${escapeHtml(item.id)}" aria-label="编辑计划" title="编辑计划">${icon('edit-3')}</button><button class="row-action danger" type="button" data-action="delete-plan" data-id="${escapeHtml(item.id)}" aria-label="删除计划" title="删除计划">${icon('trash-2')}</button></div></div>`;
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
        return `${renderIntro(PAGE_META.growth, '', '', `<span class="points-chip">${icon('sun')}${growth.sunlight} 阳光</span>`)}<section class="growth-map-hero"><div class="growth-map-copy"><span class="eyebrow">STARLIGHT / GROWTH MAP</span><h2>星芒正在穿过自己的小花园</h2><p>当前是 ${escapeHtml(activeStyle.title)}，成长等级 ${growth.level}。完成一件真实的小事，给植物和星芒都留下一点能量。</p><div class="growth-map-actions"><button class="btn-primary" type="button" data-action="navigate" data-page="plans">去完成今天的行动${icon('arrow-up-right')}</button><label class="voice-toggle"><input type="checkbox" data-action="toggle-voice" ${growth.voiceEnabled ? 'checked' : ''}><span class="voice-toggle-track"></span><span>语音夸奖</span></label></div></div><div class="growth-map-art"><img src="${escapeHtml(workbenchConfig.current.heroSrc)}" alt="明亮学习桌上的书本和成长徽章"><div class="growth-pet-badge">${icon(activeStyle.icon)}<strong>${escapeHtml(growth.unicorn.name)}</strong><small>LEVEL ${growth.level}</small></div></div></section><div class="growth-feature-grid"><section class="growth-feature-card plant-feature"><div class="growth-feature-head"><span class="list-card-mark lime">${icon(growth.plant.icon)}</span><div><span class="eyebrow">PLANT / GARDEN</span><h3>${escapeHtml(growth.plant.title)}</h3></div><span class="tag lime">阶段 ${growth.plant.stage}</span></div><p>累计获得 ${growth.totalSunlightEarned} 阳光，植物会从种子慢慢长成自己的小森林。</p><div class="progress-track"><span style="width:${Math.min(100, Math.round((growth.totalSunlightEarned % 120) / 120 * 100))}%"></span></div><div class="growth-feature-foot"><small>浇水 ${growth.plantWaterCount} 次</small><button class="btn-secondary" type="button" data-action="water-plant" ${waterAvailable ? '' : 'disabled'}>${icon('droplets')}${growth.lastWateredDate === storage.localDate() ? '今天已浇水' : '浇水 · 5 阳光'}</button></div></section><section class="growth-feature-card pet-feature"><div class="growth-feature-head"><span class="list-card-mark orange">${icon(activeStyle.icon)}</span><div><span class="eyebrow">UNICORN / COMPANION</span><h3>${escapeHtml(growth.unicorn.name)}</h3></div><span class="tag orange">LEVEL ${growth.level}</span></div><p>当前造型：${escapeHtml(activeStyle.title)}。再积累 ${100 - (growth.petXp % 100)} XP 就会靠近下一级。</p><div class="progress-track"><span style="width:${growth.petXp % 100}%"></span></div><div class="growth-feature-foot"><small>${growth.petXp} XP · 已解锁 ${growth.unlockedStyleIds.length} 种造型</small><button class="btn-quiet" type="button" data-action="navigate" data-page="rewards">去看奖励${icon('chevron-right')}</button></div></section><section class="growth-feature-card zombie-feature ${growth.zombieActive ? 'is-alert' : ''}"><div class="growth-feature-head"><span class="list-card-mark ${growth.zombieActive ? 'gold' : 'blue'}">${icon(growth.zombieActive ? 'ghost' : 'shield-check')}</span><div><span class="eyebrow">GARDEN / GUARD</span><h3>${growth.zombieActive ? '小僵尸来捣蛋了' : '花园今天很平安'}</h3></div></div><p>${growth.zombieActive ? '昨天没有留下成长记录，完成今天的一项行动就能把它驱散。' : `已经驱散 ${growth.zombieDefeated} 次，继续用行动守住自己的节奏。`}</p><div class="growth-feature-foot"><small>${growth.zombieActive ? '等待今日第一次打卡' : '守护状态正常'}</small><button class="btn-secondary" type="button" data-action="navigate" data-page="plans">${icon('shield')}${growth.zombieActive ? '去驱散' : '查看打卡'}</button></div></section></div><div class="growth-detail-grid"><section class="work-card"><div class="work-card-header"><div><h2>连续奖励</h2><p>当前连续 ${growth.streak} 天 · 最好 ${growth.bestStreak} 天</p></div>${icon('flame')}</div><div class="streak-reward-list">${streakRewards}</div></section><section class="work-card"><div class="work-card-header"><div><h2>造型衣橱</h2><p>完成成长和连续奖励，逐步解锁星芒的新样子。</p></div>${icon('shirt')}</div><div class="style-options">${styles}</div></section></div>`;
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

    function renderWorkbenchSwitcher() {
        const variants = workbenchConfig.variants || {};
        const order = ['adult', 'child', 'preschool'];
        const cards = order.map(function (id) {
            const item = variants[id];
            if (!item) return '';
            const current = item.id === workbenchConfig.variant;
            const href = global.PersonalWorkbenchLauncher && typeof global.PersonalWorkbenchLauncher.getSiblingPath === 'function' ? global.PersonalWorkbenchLauncher.getSiblingPath(workbenchConfig.variant, id) : (item.path || '../');
            return `<a class="workbench-switch-card ${current ? 'is-current' : ''}" data-workbench-variant="${escapeHtml(id)}" href="${escapeHtml(href)}" ${current ? 'aria-current="page"' : ''}><span class="workbench-switch-card-icon ${escapeHtml(item.switchTone || 'blue')}">${icon(item.switchIcon || 'layout-dashboard')}</span><span class="workbench-switch-card-copy"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.switchSummary || item.statusNote || '')}</small></span><span class="workbench-switch-card-action">${current ? `<span class="tag lime">当前</span>` : icon('arrow-right')}</span></a>`;
        }).join('');
        return `<section class="workbench-switcher-panel" aria-labelledby="workbench-switcher-title"><div class="workbench-switcher-head"><div><span class="eyebrow">WORKBENCH / SWITCH</span><h2 id="workbench-switcher-title">切换工作台</h2><p>三个版本分别保存自己的数据，可以随时切换。</p></div><span class="workbench-switcher-mark">${icon('layout-dashboard')}</span></div><div class="workbench-switch-grid">${cards}</div></section>`;
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
        return `${renderIntro(PAGE_META.account, '', '', `<span class="tag ${status.id === 'ready' ? 'lime' : status.id === 'signed-out' ? 'orange' : ''}">${escapeHtml(status.label)}</span>`)}${renderWorkbenchSwitcher()}${isPreschool ? renderPreschoolFeedbackSettings() : ''}${body}`;
    }

    function renderPreschoolFeedbackSettings() {
        const growth = getChildGrowth();
        const musicEnabled = getPreschoolFeedbackPreference('musicEnabled', false);
        const motionEnabled = getPreschoolFeedbackPreference('motionEnabled', true);
        return `<section class="pixel-feedback-settings"><div class="pixel-feedback-copy"><span class="pixel-panel-kicker">GARDEN / FEEDBACK</span><h2>声音和反馈</h2><p>音乐默认关闭，点击后才会播放；关闭动效时，任务和防守仍然正常。</p></div><div class="pixel-feedback-options"><label class="pixel-feedback-option"><input type="checkbox" data-action="toggle-music" ${musicEnabled ? 'checked' : ''}><span>${icon('music-2')}</span><strong>花园音乐</strong><small>${musicEnabled ? '正在准备' : '轻轻的冒险旋律'}</small></label><label class="pixel-feedback-option"><input type="checkbox" data-action="toggle-motion" ${motionEnabled ? 'checked' : ''}><span>${icon('sparkles')}</span><strong>动效</strong><small>${motionEnabled ? '植物会呼吸' : '只保留状态变化'}</small></label><label class="pixel-feedback-option"><input type="checkbox" data-action="toggle-voice" ${growth.voiceEnabled ? 'checked' : ''}><span>${icon('volume-2')}</span><strong>语音夸奖</strong><small>${growth.voiceEnabled ? '完成任务会夸夸' : '需要时再打开'}</small></label></div></section>`;
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

    function showPreschoolCelebration(payload) {
        if (!isPreschool || !payload) return;
        const old = document.querySelector('.preschool-celebration');
        if (old) old.remove();
        if (preschoolCelebrationTimer) window.clearTimeout(preschoolCelebrationTimer);
        const rewards = collectionTitles(payload.rewardIds || []);
        const message = payload.invaderDefeated ? '小怪被赶走啦！' : payload.message || '做得真棒！';
        const detail = [payload.detail || '', payload.amount ? `阳光 +${payload.amount}` : '', rewards.length ? `获得：${rewards.join('、')}` : ''].filter(Boolean).join(' · ');
        const node = document.createElement('div');
        node.className = 'preschool-celebration';
        node.setAttribute('role', 'status');
        node.setAttribute('aria-live', 'polite');
        node.innerHTML = `<span class="preschool-celebration-icon">${icon(payload.invaderDefeated ? 'shield-check' : rewards.length ? 'album' : 'sparkles')}</span><strong>${escapeHtml(message)}</strong>${detail ? `<small>${escapeHtml(detail)}</small>` : ''}`;
        document.body.appendChild(node);
        global.lucide.createIcons({ root: node });
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

    function completeCourseLesson(id) {
        const catalog = Array.isArray(workbenchConfig.childCourses) ? workbenchConfig.childCourses : [];
        const valid = catalog.some(course => Array.isArray(course.lessons) && course.lessons.some(lesson => lesson.id === id));
        if (!valid || !global.PersonalWorkbenchChildCourses) return showToast('这节课暂时不可用。', true);
        const ok = commit(function (next) {
            const result = global.PersonalWorkbenchChildCourses.completeLesson(next.courseProgress, id);
            if (!result.changed) throw new Error('这节课已经完成了');
            next.courseProgress = result.progress;
            awardSunlight(next, `lesson:${id}`, 20);
        }, '课程完成，获得 20 阳光');
        if (ok) {
            speakPraise('太棒了，你完成了一节课！');
        }
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
            if (!result.changed) throw new Error('花园里已经有一波小怪了');
            next.growth = result.growth;
        }, '小怪来啦，准备守护花园！');
        if (ok) showPreschoolCelebration({ message: '小怪来啦！', detail: '完成任务收集豌豆能量。' });
    }

    function animatePreschoolPea() {
        const battlefield = document.querySelector('.pixel-battlefield');
        const lane = battlefield && (battlefield.querySelector('.pixel-battle-lane-row.is-target') || battlefield.querySelector('.pixel-battle-lane-row'));
        if (!battlefield || !lane) return;
        if (preschoolPeaTimer) window.clearTimeout(preschoolPeaTimer);
        battlefield.classList.remove('preschool-pea-fired');
        void battlefield.offsetWidth;
        battlefield.classList.add('preschool-pea-fired');
        const projectile = document.createElement('span');
        projectile.className = 'pixel-pea-projectile';
        projectile.setAttribute('aria-hidden', 'true');
        const flash = lane.querySelector('.pixel-hit-flash');
        lane.appendChild(projectile);
        if (flash) flash.setAttribute('data-hit', 'true');
        preschoolPeaTimer = window.setTimeout(function () {
            projectile.remove();
            if (flash) flash.removeAttribute('data-hit');
            battlefield.classList.remove('preschool-pea-fired');
            preschoolPeaTimer = 0;
        }, getPreschoolFeedbackPreference('motionEnabled', true) ? 680 : 40);
    }

    function firePreschoolPea() {
        if (!isPreschool || !preschoolGarden || typeof preschoolGarden.firePea !== 'function') return;
        let result;
        const ok = commit(function (next) {
            result = preschoolGarden.firePea(next.growth, storage.localDate());
            if (!result.ok) throw new Error(result.reason);
            next.growth = result.growth;
        }, null);
        if (!ok || !result) return;
        animatePreschoolPea();
        speakPraise(result.defeated ? '太棒啦，小怪被赶走了！' : '命中啦，再来一颗豌豆！');
        showPreschoolCelebration({ message: result.defeated ? '小怪被赶走啦！' : '豌豆命中！', detail: result.defeated ? '花园安全了，继续收集阳光。' : '植物伙伴正在守护花园。', invaderDefeated: result.defeated });
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

    function openDialog(type, id, area) {
        ui.dialogType = type;
        ui.dialogId = id || '';
        const item = id ? findItem(type, id) : null;
        ui.dialogArea = area || (item && item.area) || '';
        const today = storage.localDate();
        const configs = {
            plan: { eyebrow: 'NEW PLAN', title: id ? '编辑今日计划' : '添加今日计划', form: `<div class="form-grid"><div class="field full"><label for="entry-title">计划内容</label><input id="entry-title" name="title" required maxlength="80" placeholder="例如：阅读 30 分钟" value="${escapeHtml(item ? item.title : '')}"></div><div class="field"><label for="entry-category">分类</label><select id="entry-category" name="category"><option>学习</option><option>阅读</option><option>实践</option><option>运动</option><option>自控</option><option>其它</option></select></div><div class="field"><label for="entry-date">日期</label><input id="entry-date" name="date" type="date" required value="${escapeHtml(item ? item.date : today)}"></div></div>` },
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
    }

    function findItem(type, id) {
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
                ui.pendingCelebration = { message: gardenEvent.invaderDefeated ? '小怪被赶走啦！' : '做得真棒！', amount: Math.max(0, Number(amount) || 0) + result.dailyBonus, rewardIds: gardenEvent.rewardIds, invaderDefeated: gardenEvent.invaderDefeated };
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
            result = repository.update(mutator);
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
        const existing = id ? findItem(type, id) : null;
        const attachmentInput = entryForm.querySelector('[name="attachments"]');
        const attachments = attachmentInput && attachmentInput.files ? Array.from(attachmentInput.files).slice(0, 12).map(function (file) { return { name: file.name, type: file.type, size: file.size }; }) : [];
        let message = '已保存';
        const ok = commit(function (next) {
            if (type === 'plan') {
                const item = Object.assign({ id: id || storage.createId('plan'), date: storage.localDate(), title: '', category: '学习', done: false, order: next.dailyPlans.length + 1, createdAt: now, completedAt: null }, existing || {}, { title: String(values.title || '').trim(), date: values.date || storage.localDate(), category: values.category || '其它' });
                if (!item.title) throw new Error('计划内容不能为空');
                upsert(next.dailyPlans, item);
                if (item.done) { awardSunlight(next, `plan:${item.id}`, 10); archiveItem(next, 'plan', item); }
                message = id ? '计划已更新' : '计划已添加';
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

    function deleteEntry(type, id) {
        const collection = { plan: 'dailyPlans', task: 'tasks', mistake: 'mistakes', reading: 'readingLogs', goal: 'goals', review: 'reviews', life: 'adult.lifeEntries', milestone: 'adult.milestones', habit: 'adult.habits' }[type];
        if (!collection) return;
        const item = findItem(type, id);
        const label = item && (item.title || item.question) ? item.title || item.question : '这条记录';
        if (!item || !window.confirm(`确定删除“${label}”吗？`)) return;
        commit(function (next) {
            if (collection.indexOf('adult.') === 0) next.adult[collection.slice(6)] = next.adult[collection.slice(6)].filter(entry => entry.id !== id);
            else next[collection] = next[collection].filter(entry => entry.id !== id);
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

    function openSidebar() { sidebar.classList.add('is-open'); sidebarScrim.classList.add('is-visible'); }
    function closeSidebar() { sidebar.classList.remove('is-open'); sidebarScrim.classList.remove('is-visible'); }

    document.addEventListener('click', function (event) {
        const target = event.target.closest('[data-action]');
        if (!target) return;
        const action = target.dataset.action;
        if (isPreschool && action !== 'toggle-music' && getPreschoolFeedbackPreference('musicEnabled', false)) startPreschoolMusic();
        if (action === 'navigate') setPage(target.dataset.page);
        if (action === 'open-sidebar') openSidebar();
        if (action === 'close-sidebar') closeSidebar();
        if (action === 'close-dialog') closeDialog();
        if (action === 'add-plan') openDialog('plan');
        if (action === 'edit-plan') openDialog('plan', target.dataset.id);
        if (action === 'delete-plan') deleteEntry('plan', target.dataset.id);
        if (action === 'toggle-plan') { const before = state.dailyPlans.find(entry => entry.id === target.dataset.id); const completed = before ? !before.done : true; const ok = commit(function (next) { const item = next.dailyPlans.find(entry => entry.id === target.dataset.id); if (item) { item.done = !item.done; item.completedAt = item.done ? new Date().toISOString() : null; if (item.done) { awardSunlight(next, `plan:${item.id}`, 10); archiveItem(next, 'plan', item); } } }, completed ? (isChild ? '计划完成了，获得 10 阳光' : '计划完成了') : '计划已恢复'); if (ok && completed) speakPraise('今天的打卡完成啦！'); }
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
        if (action === 'select-plant') selectPreschoolPlant(target.dataset.id);
        if (action === 'water-plant') waterGrowthPlant();
        if (action === 'spawn-invader') spawnPreschoolInvader();
        if (action === 'fire-pea') firePreschoolPea();
        if (action === 'complete-lesson') completeCourseLesson(target.dataset.id);
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
    window.addEventListener('hashchange', function () { ui.page = getPageFromHash(); render(); closeSidebar(); });
    entryDialog.addEventListener('click', function (event) { if (event.target === entryDialog) closeDialog(); });

    if (!location.hash) history.replaceState(null, '', '#overview');
    global.lucide.createIcons();
    render();
})(window);
