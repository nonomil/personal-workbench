(function (global) {
    'use strict';

    const MAP_STOPS = [
        { id: 'house', at: 1, name: '小木屋' },
        { id: 'path', at: 3, name: '小路' },
        { id: 'bridge', at: 5, name: '小石桥' },
        { id: 'forest', at: 10, name: '魔法森林' },
        { id: 'river', at: 20, name: '河流码头' },
        { id: 'full', at: 30, name: '整张地图' }
    ];

    const TOWN_LEVELS = [
        { level: 0, name: '空地', need: 0 },
        { level: 1, name: '地基', need: 1 },
        { level: 2, name: '墙', need: 15 },
        { level: 3, name: '屋顶', need: 30 },
        { level: 4, name: '小木屋', need: 50 },
        { level: 5, name: '小镇', need: 100 }
    ];

    const GARDEN_LANDMARKS = [
        { id: 'fence', at: 20, name: '小篱笆' },
        { id: 'hut', at: 50, name: '小木屋' },
        { id: 'estate', at: 100, name: '小庄园' }
    ];

    const FLOWER_COLORS = ['#FF6B6B', '#F4A261', '#E9C46A', '#2A9D8F', '#4D96FF', '#C77DFF'];

    function asArray(value) {
        return Array.isArray(value) ? value : [];
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function isEnglishWord(value) {
        return /^[A-Za-z][A-Za-z'-]{0,24}$/.test(String(value || '').trim());
    }

    function bankIndex() {
        const literacy = global.PersonalWorkbenchPreschoolLiteracy;
        const items = literacy && typeof literacy.getRuntimeBank === 'function' ? literacy.getRuntimeBank() : [];
        const map = {};
        asArray(items).forEach(function (item) {
            if (item && item.char) map[item.char] = item;
        });
        return map;
    }

    function collectEnglishBricks(state, catalog) {
        const completed = new Set(asArray(state && state.courseProgress && state.courseProgress.completedLessonIds));
        const words = [];
        const seen = new Set();
        asArray(catalog).forEach(function (course) {
            if (!/english|phonics/i.test(String(course && course.id || ''))) return;
            asArray(course.lessons).forEach(function (lesson) {
                if (!lesson || !completed.has(lesson.id)) return;
                asArray(lesson.activity && lesson.activity.options).forEach(function (option) {
                    const word = String(option || '').trim().toLowerCase();
                    if (!isEnglishWord(word) || seen.has(word)) return;
                    seen.add(word);
                    words.push({ word: word, meaning: String(lesson.title || word), lessonId: lesson.id });
                });
                if (!asArray(lesson.activity && lesson.activity.options).some(isEnglishWord) && !seen.has(lesson.id)) {
                    seen.add(lesson.id);
                    words.push({ word: String(lesson.title || lesson.id), meaning: '英语课', lessonId: lesson.id });
                }
            });
        });
        const mastery = state && state.courseProgress && state.courseProgress.english && state.courseProgress.english.mastery
            ? state.courseProgress.english.mastery
            : {};
        const vocab = global.PersonalWorkbenchPreschoolEnglishVocab;
        const bank = vocab && typeof vocab.getRuntimeBank === 'function' ? vocab.getRuntimeBank() : [];
        const meaning = {};
        asArray(bank).forEach(function (item) {
            if (!item || !item.text) return;
            meaning[String(item.text).toLowerCase()] = String(item.zh || item.phraseZh || item.text);
        });
        Object.keys(mastery).forEach(function (word) {
            const key = String(word || '').trim().toLowerCase();
            if (!isEnglishWord(key) || seen.has(key)) return;
            seen.add(key);
            words.push({ word: key, meaning: meaning[key] || '英语词', lessonId: 'english-mastery' });
        });
        return words;
    }

    function townFromCount(count) {
        let current = TOWN_LEVELS[0];
        TOWN_LEVELS.forEach(function (item) {
            if (count >= item.need) current = item;
        });
        return current;
    }

    function getView(state, catalog, options) {
        const opts = options || {};
        const today = String(opts.today || '');
        const mastery = state && state.courseProgress && state.courseProgress.literacy && state.courseProgress.literacy.mastery
            ? state.courseProgress.literacy.mastery
            : {};
        const chars = Object.keys(mastery);
        const bank = bankIndex();
        const flowers = chars.map(function (char, index) {
            const item = bank[char] || {};
            const dates = mastery[char] && Array.isArray(mastery[char].dates) ? mastery[char].dates : [];
            return {
                char: char,
                pinyin: item.pinyin || '',
                word: Array.isArray(item.words) ? item.words[0] || '' : '',
                color: FLOWER_COLORS[index % FLOWER_COLORS.length],
                plantedAt: dates[0] ? String(dates[0]) : ''
            };
        });
        const checkinDates = asArray(state && state.growth && state.growth.checkinDates)
            .filter(function (date) { return /^\d{4}-\d{2}-\d{2}$/.test(String(date)); });
        const days = Array.from(new Set(checkinDates)).length;
        const locations = MAP_STOPS.map(function (stop) {
            return Object.assign({}, stop, { unlocked: days >= stop.at });
        });
        const bricks = collectEnglishBricks(state, catalog);
        const town = townFromCount(bricks.length);
        const landmarks = GARDEN_LANDMARKS.map(function (item) {
            return Object.assign({}, item, { unlocked: flowers.length >= item.at });
        });
        return {
            garden: {
                flowers: flowers,
                butterflies: Math.floor(flowers.length / 10),
                level: Math.max(1, Math.floor(flowers.length / 20) + 1),
                landmarks: landmarks
            },
            adventure: {
                days: days,
                locations: locations,
                todayHighlight: Boolean(today && checkinDates.indexOf(today) >= 0),
                pathPercent: Math.max(0, Math.min(100, Math.round(days / 30 * 100))),
                complete: days >= 30
            },
            builder: {
                bricks: bricks,
                townLevel: town.level,
                buildingName: town.name
            }
        };
    }

    function renderFlower(item) {
        return `<button class="growth-world-flower" type="button" data-action="review-growth-flower" data-char="${escapeHtml(item.char)}" data-pinyin="${escapeHtml(item.pinyin)}" data-word="${escapeHtml(item.word)}" data-color="${escapeHtml(item.color)}" data-planted="${escapeHtml(item.plantedAt)}" style="--flower:${item.color}" aria-label="复习 ${escapeHtml(item.char)}"><i></i><b>${escapeHtml(item.char)}</b><small>${escapeHtml(item.pinyin || item.word || '')}</small></button>`;
    }

    function renderGardenBody(view) {
        const flowers = view.garden.flowers.length
            ? view.garden.flowers.slice(0, 80).map(renderFlower).join('')
            : '<p class="growth-world-empty">认一个字，花园就开一朵花。</p>';
        const butterflies = view.garden.butterflies
            ? Array.from({ length: Math.min(view.garden.butterflies, 8) }).map(function () {
                return '<i class="growth-world-butterfly" aria-hidden="true"></i>';
            }).join('')
            : '';
        const landmarks = view.garden.landmarks.map(function (item) {
            return `<span class="growth-world-landmark ${item.unlocked ? 'is-on' : 'is-off'}">${escapeHtml(item.name)}</span>`;
        }).join('');
        return `<div class="growth-world-landmarks">${landmarks}</div><div class="growth-world-butterflies">${butterflies}</div><div class="growth-world-flowers">${flowers}</div>`;
    }

    function renderMapBody(view) {
        const stops = view.adventure.locations.map(function (stop) {
            const remain = Math.max(0, stop.at - view.adventure.days);
            return `<button class="growth-world-stop ${stop.unlocked ? 'is-on' : 'is-off'}" type="button" data-action="review-growth-stop" data-name="${escapeHtml(stop.name)}" data-unlocked="${stop.unlocked ? 'true' : 'false'}" data-remain="${remain}"><b>${stop.at}</b><span>${escapeHtml(stop.name)}</span><small>${stop.unlocked ? '已到达' : `再 ${remain} 天`}</small></button>`;
        }).join('');
        const complete = view.adventure.complete ? '<p class="growth-world-complete">整张地图点亮了！</p>' : '';
        return `${complete}<div class="growth-world-path" role="progressbar" aria-valuenow="${view.adventure.pathPercent}" aria-valuemin="0" aria-valuemax="100"><i style="width:${view.adventure.pathPercent}%"></i></div><div class="growth-world-stops">${stops}</div>`;
    }

    function renderBuilderBody(view) {
        const bricks = view.builder.bricks.length
            ? view.builder.bricks.slice(0, 80).map(function (item) {
                return `<button class="growth-world-brick" type="button" data-action="review-growth-brick" data-word="${escapeHtml(item.word)}" data-meaning="${escapeHtml(item.meaning)}" aria-label="复习 ${escapeHtml(item.word)}"><b>${escapeHtml(item.word)}</b><small>${escapeHtml(item.meaning)}</small></button>`;
            }).join('')
            : '<p class="growth-world-empty">学会一个英语词，就添一块砖。</p>';
        return `<div class="growth-world-town is-level-${view.builder.townLevel}" aria-hidden="true"><span class="town-base"></span><span class="town-wall"></span><span class="town-roof"></span><span class="town-house"></span><span class="town-castle"></span></div><div class="growth-world-bricks">${bricks}</div>`;
    }

    function renderChooser(view) {
        const nextLandmark = view.garden.landmarks.find(function (item) { return !item.unlocked; });
        const nextStop = view.adventure.locations.find(function (item) { return !item.unlocked; });
        const gardenHint = nextLandmark
            ? `再认 ${nextLandmark.at - view.garden.flowers.length} 个字点亮${escapeHtml(nextLandmark.name)}`
            : '花园已经长成小庄园';
        const mapHint = nextStop
            ? `再坚持 ${nextStop.at - view.adventure.days} 天到达${escapeHtml(nextStop.name)}`
            : '整张地图已经点亮';
        const gardenMarks = view.garden.landmarks.map(function (item) {
            return `<span class="growth-world-landmark ${item.unlocked ? 'is-on' : 'is-off'}">${escapeHtml(item.name)}</span>`;
        }).join('');
        return `<section class="preschool-growth-world" aria-label="成长世界"><div class="preschool-growth-section-head"><div><span class="preschool-growth-kicker">GROWTH WORLD</span><h2>我的成长世界</h2><p>花、路、砖都来自已经完成的学习，不另做一份假进度。</p></div></div><div class="growth-world-grid"><article class="growth-world-panel is-garden"><h3>花园世界</h3><p>${view.garden.flowers.length} 朵花 · ${view.garden.butterflies} 只蝴蝶</p><div class="growth-world-landmarks">${gardenMarks}</div><small>${gardenHint}</small><button class="growth-world-enter" type="button" data-action="open-growth-world" data-world="garden">进入花园</button></article><article class="growth-world-panel is-map ${view.adventure.todayHighlight ? 'is-today' : ''}"><h3>冒险地图</h3><p>${view.adventure.days} 天打卡 · 路径 ${view.adventure.pathPercent}%</p><div class="growth-world-path" role="progressbar" aria-valuenow="${view.adventure.pathPercent}" aria-valuemin="0" aria-valuemax="100"><i style="width:${view.adventure.pathPercent}%"></i></div><small>${mapHint}</small><button class="growth-world-enter" type="button" data-action="open-growth-world" data-world="map">进入地图</button></article><article class="growth-world-panel is-builder"><h3>建造世界</h3><p>${view.builder.bricks.length} 块砖 · ${escapeHtml(view.builder.buildingName)}</p><div class="growth-world-town is-level-${view.builder.townLevel}" aria-hidden="true"><span class="town-base"></span><span class="town-wall"></span><span class="town-roof"></span><span class="town-house"></span><span class="town-castle"></span></div><button class="growth-world-enter" type="button" data-action="open-growth-world" data-world="builder">进入建造</button></article></div></section>`;
    }

    function renderFocus(view, focus) {
        const titles = { garden: '花园世界', map: '冒险地图', builder: '建造世界' };
        const body = focus === 'garden' ? renderGardenBody(view) : focus === 'map' ? renderMapBody(view) : renderBuilderBody(view);
        return `<section class="preschool-growth-world is-focus is-${escapeHtml(focus)}" aria-label="${escapeHtml(titles[focus] || '成长世界')}"><div class="preschool-growth-section-head"><div><span class="preschool-growth-kicker">GROWTH WORLD</span><h2>${escapeHtml(titles[focus] || '成长世界')}</h2><p>点开花或砖，复习已经学会的内容。</p></div><button class="workbench-text-button" type="button" data-action="close-growth-world">返回三个世界</button></div>${body}</section>`;
    }

    function render(state, catalog, options) {
        const opts = options || {};
        const view = getView(state, catalog, opts);
        if (opts.focus === 'garden' || opts.focus === 'map' || opts.focus === 'builder') {
            return renderFocus(view, opts.focus);
        }
        return renderChooser(view);
    }

    function renderReviewHtml(kind, data) {
        const source = data || {};
        if (kind === 'flower') {
            const planted = source.planted ? `<i>认识于 ${escapeHtml(source.planted)}</i>` : '';
            return `<div class="growth-world-review-dialog" role="dialog" aria-label="复习 ${escapeHtml(source.char || '')}"><span class="growth-world-review-bloom" style="--flower:${escapeHtml(source.color || '#FF6B6B')}"></span><b>${escapeHtml(source.char || '')}</b><small>${escapeHtml(source.pinyin || '')}</small><em>${escapeHtml(source.word || '')}</em>${planted}<button type="button" data-growth-review-close="true">认识了</button></div>`;
        }
        if (kind === 'brick') {
            return `<div class="growth-world-review-dialog" role="dialog" aria-label="复习 ${escapeHtml(source.word || '')}"><b class="is-word">${escapeHtml(source.word || '')}</b><small>${escapeHtml(source.meaning || '')}</small><button type="button" data-growth-review-close="true">认识了</button></div>`;
        }
        return '';
    }

    function showReview(kind, data, doc) {
        const root = doc || (typeof document !== 'undefined' ? document : null);
        const html = renderReviewHtml(kind, data);
        if (!root || !root.body || !html) return;
        const old = root.querySelector('.growth-world-review-overlay');
        if (old) old.remove();
        const overlay = root.createElement('div');
        overlay.className = 'growth-world-review-overlay';
        overlay.innerHTML = html;
        overlay.addEventListener('click', function (event) {
            if (event.target === overlay || event.target.closest('[data-growth-review-close]')) overlay.remove();
        });
        root.body.appendChild(overlay);
    }

    global.PersonalWorkbenchGrowthWorld = {
        MAP_STOPS: MAP_STOPS,
        TOWN_LEVELS: TOWN_LEVELS,
        GARDEN_LANDMARKS: GARDEN_LANDMARKS,
        getView: getView,
        render: render,
        renderReviewHtml: renderReviewHtml,
        showReview: showReview
    };
})(typeof window !== 'undefined' ? window : globalThis);
