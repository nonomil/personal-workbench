(function (global) {
    'use strict';

    const ICONS = ['sparkles', 'target', 'circle-check', 'book-open', 'heart'];

    function asArray(value) {
        return Array.isArray(value) ? value : [];
    }

    function attachGuide(lesson, source) {
        const row = source && typeof source === 'object' ? source : {};
        const steps = row.fourSteps && typeof row.fourSteps === 'object' ? row.fourSteps : {};
        lesson.fourSteps = {
            warmup: String(steps.warmup || ''),
            teach: String(steps.teach || ''),
            practice: String(steps.practice || ''),
            apply: String(steps.apply || '')
        };
        lesson.evidence = asArray(row.evidence).map(function (item) { return String(item || '').trim(); }).filter(Boolean);
        return lesson;
    }

    function resolveFourSteps(lesson) {
        const source = lesson && lesson.fourSteps && typeof lesson.fourSteps === 'object' ? lesson.fourSteps : {};
        const fallback = {
            warmup: '先看一看',
            teach: '听一听、认一认',
            practice: String((lesson && lesson.tip) || '练一练'),
            apply: '用一用'
        };
        return {
            warmup: String(source.warmup || fallback.warmup),
            teach: String(source.teach || fallback.teach),
            practice: String(source.practice || fallback.practice),
            apply: String(source.apply || fallback.apply),
            fromData: Boolean(source.warmup || source.teach || source.practice || source.apply),
            evidence: asArray(lesson && lesson.evidence).map(function (item) { return String(item || '').trim(); }).filter(Boolean)
        };
    }

    function isPictureMatchType(type) {
        const name = String(type || '');
        return name === 'image-character-match' || name === 'character-picture-match' || /character-match$/.test(name);
    }

    function choiceLesson(row, extras) {
        const source = row && typeof row === 'object' ? row : {};
        const options = asArray(source.options).map(function (item) { return String(item); }).filter(Boolean);
        if (options.length < 1) return null;
        const answer = typeof source.answer === 'number'
            ? Math.max(0, Math.min(options.length - 1, source.answer))
            : 0;
        const pictureMatch = isPictureMatchType(source.activityType);
        return attachGuide(Object.assign({
            id: String(source.id || ''),
            title: String(source.title || ''),
            minutes: Number(source.minutes) || 8,
            meta: source.day ? ('第 ' + source.day + ' 天') : '课程包',
            tip: String(source.tip || '先看清楚，再选一个答案。'),
            activity: {
                mode: pictureMatch ? 'picture-match' : 'choice',
                activityType: String(source.activityType || ''),
                prompt: String(source.prompt || source.title || '选一个答案'),
                hint: String(source.tip || '慢慢看。'),
                options: options,
                answer: answer,
                optionIcons: options.map(function (_item, index) { return ICONS[index % ICONS.length]; }),
                success: String(source.success || '答对啦！')
            }
        }, extras || {}), source);
    }

    function timerLesson(id, title, prompt, durationSec, safety, extras) {
        const opts = extras && typeof extras === 'object' ? extras : {};
        const extraActivity = opts.activity && typeof opts.activity === 'object' ? opts.activity : {};
        const activity = Object.assign({
            mode: 'motion-timer',
            prompt: String(prompt || title || '开始做'),
            durationSec: Math.max(15, Math.min(90, Number(durationSec) || 45)),
            safety: asArray(safety),
            level: 'L1',
            success: '做完啦！'
        }, extraActivity);
        return Object.assign({
            id: String(id || ''),
            title: String(title || '做一项运动'),
            minutes: Math.max(1, Math.round((Number(durationSec) || 45) / 60) || 1),
            meta: (Number(durationSec) || 45) + ' 秒',
            tip: asArray(safety).join(' · ') || '成人在旁，慢慢做。',
            activity: activity
        }, opts, { activity: activity });
    }

    function packData() {
        return global.PersonalWorkbenchLessonPackData && typeof global.PersonalWorkbenchLessonPackData === 'object'
            ? global.PersonalWorkbenchLessonPackData
            : { hanzi: [], math: [], english: [], poetry: [], phonics: [], focusDays: [], moveDays: [], motionBank: [] };
    }

    function choiceLessons(rows) {
        return asArray(rows).map(function (row) { return choiceLesson(row); }).filter(Boolean);
    }

    function extractPhonicsTokens(examples) {
        const letters = [];
        const words = [];
        function addLetter(value) {
            const letter = String(value || '').trim().toLowerCase();
            if (/^[a-z]$/.test(letter) && letters.indexOf(letter) < 0) letters.push(letter);
        }
        function addWord(value) {
            const word = String(value || '').trim().toLowerCase().replace(/[^a-z]/g, '');
            if (/^[a-z]{2,}$/.test(word) && words.indexOf(word) < 0) words.push(word);
        }
        asArray(examples).forEach(function (raw) {
            const text = String(raw || '').trim();
            if (!text) return;
            if (text.indexOf('/') >= 0) {
                addWord(text.replace(/\//g, ' '));
                return;
            }
            if (/[-\u2013]/.test(text) && /[a-z]/i.test(text)) {
                text.split(/[-\u2013]/).forEach(function (part) {
                    const bit = part.trim();
                    if (/^[a-z]$/i.test(bit)) addLetter(bit);
                    else addWord(bit);
                });
                return;
            }
            if (/^[a-z]$/i.test(text)) addLetter(text);
            else if (/^[a-z]{2,}$/i.test(text)) addWord(text);
        });
        return { letters: letters, words: words };
    }

    function phonicsLesson(row) {
        const source = row && typeof row === 'object' ? row : {};
        const tokens = extractPhonicsTokens(source.examples);
        const letters = tokens.letters;
        const words = tokens.words;
        const type = String(source.activityType || '');
        const extras = {
            id: String(source.id || ''),
            title: String(source.title || ''),
            minutes: Number(source.minutes) || 8,
            meta: source.day ? ('第 ' + source.day + ' 天') : '拼读',
            tip: String(source.tip || source.prompt || source.objective || '先听声音，再看字母和音标。')
        };
        const wantWords = /blend|cvc|rhyme|syllable|oral|decodable|word-family/i.test(type);
        if ((wantWords && words.length) || (!letters.length && words.length)) {
            return attachGuide(Object.assign({}, extras, {
                activity: {
                    mode: 'phonics-cvc',
                    preferred: words[0],
                    size: Math.min(10, Math.max(3, words.length)),
                    prompt: String(source.prompt || '听一听，哪个词？'),
                    hint: extras.tip,
                    options: ['听一听', '选一个词', '下一题'],
                    answer: 0,
                    optionIcons: ['volume-2', 'target', 'sparkles'],
                    success: String(source.success || '拼对啦！')
                }
            }), source);
        }
        return attachGuide(Object.assign({}, extras, {
            activity: {
                mode: 'phonics-letter',
                preferred: letters[0] || 'm',
                groups: letters.length ? '' : 'amt',
                size: Math.min(8, Math.max(3, letters.length || 3)),
                prompt: String(source.prompt || '听一听，哪个字母？'),
                hint: extras.tip,
                options: ['听一听', '选字母', '下一题'],
                answer: 0,
                optionIcons: ['languages', 'target', 'sparkles'],
                success: String(source.success || '字母听出来啦！')
            }
        }), source);
    }

    function phonicsLessons(rows) {
        return asArray(rows).map(function (row) { return phonicsLesson(row); }).filter(Boolean);
    }

    function preferredMotion(bank) {
        const preferred = ['开合跳', '深蹲', '原地跑', '高抬腿'];
        const items = asArray(bank).filter(function (item) { return item && item.type !== 'focus'; });
        items.sort(function (left, right) {
            const leftRank = preferred.indexOf(left.name);
            const rightRank = preferred.indexOf(right.name);
            return (leftRank < 0 ? 99 : leftRank) - (rightRank < 0 ? 99 : rightRank);
        });
        return items;
    }

    function exerciseSeedLessons() {
        return preferredMotion(packData().motionBank).map(function (item, index) {
            const lesson = timerLesson(
                item.id,
                item.name,
                '做：' + item.name,
                item.durationSec,
                item.safety,
                { activity: { level: String(item.level || 'L1') } }
            );
            if (index === 0) lesson.id = 'preschool-exercise-1';
            if (index === 1) lesson.id = 'preschool-exercise-2';
            if (index === 2) lesson.id = 'preschool-exercise-3';
            if (item && item.id) lesson.activity.motionId = String(item.id);
            return lesson;
        });
    }

    function getMotionBank() {
        return asArray(packData().motionBank).map(function (item) {
            const source = item && typeof item === 'object' ? item : {};
            return {
                id: String(source.id || ''),
                name: String(source.name || ''),
                level: String(source.level || 'L1'),
                type: String(source.type || 'movement'),
                durationSec: Number(source.durationSec) || 45,
                safety: Array.isArray(source.safety) ? source.safety.map(function (item) { return String(item); }) : [],
                howTo: String(source.howTo || '')
            };
        }).filter(function (item) { return item.id; });
    }

    function mergeLessons(existing, extra) {
        const have = {};
        const merged = [];
        asArray(existing).concat(asArray(extra)).forEach(function (lesson) {
            if (!lesson || !lesson.id || have[lesson.id]) return;
            have[lesson.id] = true;
            merged.push(lesson);
        });
        return merged;
    }

    function courseLists() {
        const config = global.PersonalWorkbenchConfig;
        const lists = [];
        if (config && Array.isArray(config.childCourses)) lists.push(config.childCourses);
        if (config && config.variants && config.variants.preschool && Array.isArray(config.variants.preschool.childCourses)) {
            lists.push(config.variants.preschool.childCourses);
        }
        return lists;
    }

    function attachCourse(courseId, extra, replace) {
        courseLists().forEach(function (courses) {
            const course = courses.find(function (item) { return item && item.id === courseId; });
            if (!course) return;
            course.lessons = mergeLessons(replace ? extra : asArray(course.lessons), extra);
            course.badge = (course.lessons.length || 0) + ' 关';
        });
    }

    function attachLessonPacks() {
        const data = packData();
        attachCourse('preschool-literacy', choiceLessons(data.hanzi), false);
        attachCourse('preschool-math', choiceLessons(data.math), false);
        attachCourse('preschool-english', choiceLessons(data.english), false);
        attachCourse('preschool-poetry', choiceLessons(data.poetry), false);
        attachCourse('preschool-phonics', phonicsLessons(data.phonics), false);
        attachCourse('preschool-focus', asArray(data.focusDays).map(function (row) {
            return timerLesson(row.id, row.title, row.prompt, 45, ['成人在旁', '慢慢看'], { meta: row.day ? ('第 ' + row.day + ' 天') : '专注', fourSteps: row.fourSteps, evidence: row.evidence });
        }), false);
        attachCourse('preschool-exercise', exerciseSeedLessons().concat(asArray(data.moveDays).map(function (row) {
            return timerLesson(row.id, row.title, row.prompt, 45, ['成人在旁', '地面清空'], { meta: row.day ? ('第 ' + row.day + ' 天') : '运动', fourSteps: row.fourSteps, evidence: row.evidence });
        })), true);
        const preschoolCourses = (global.PersonalWorkbenchConfig.variants && global.PersonalWorkbenchConfig.variants.preschool && global.PersonalWorkbenchConfig.variants.preschool.childCourses) || global.PersonalWorkbenchConfig.childCourses || [];
        const literacy = preschoolCourses.find(function (item) { return item.id === 'preschool-literacy'; });
        const math = preschoolCourses.find(function (item) { return item.id === 'preschool-math'; });
        const english = preschoolCourses.find(function (item) { return item.id === 'preschool-english'; });
        const poetry = preschoolCourses.find(function (item) { return item.id === 'preschool-poetry'; });
        const phonics = preschoolCourses.find(function (item) { return item.id === 'preschool-phonics'; });
        const focus = preschoolCourses.find(function (item) { return item.id === 'preschool-focus'; });
        const exercise = preschoolCourses.find(function (item) { return item.id === 'preschool-exercise'; });
        if (literacy) literacy.note = '今日闪卡还在，60 日识字课也接到同一条路线。';
        if (math) math.note = '三关题库还在，60 日点数课也接到同一条路线。';
        if (english) english.note = '听词和拼读还在，60 日英语课也接到同一条路线。';
        if (poetry) poetry.note = '诗库连句还在，60 日古诗课也接到同一条路线。';
        if (phonics) phonics.note = '字母和短词还在，60 日拼读课也接到同一条路线。';
        if (focus) {
            focus.badge = (focus.lessons && focus.lessons.length || 0) + ' 关';
            focus.note = '舒尔特、数独、记忆翻牌、顺序记忆和视觉搜索还在，后面的专注课用倒计时认真做。';
        }
        if (exercise) {
            exercise.badge = (exercise.lessons && exercise.lessons.length || 0) + ' 关';
            exercise.note = '大圆倒计时，做完了就能点亮。成人在旁。';
            exercise.highlights = ['开合跳', '深蹲', '原地跑'];
        }
    }

    attachLessonPacks();

    global.PersonalWorkbenchLessonPack = {
        choiceLessons: choiceLessons,
        phonicsLessons: phonicsLessons,
        isPictureMatchType: isPictureMatchType,
        resolveFourSteps: resolveFourSteps,
        timerLesson: timerLesson,
        exerciseSeedLessons: exerciseSeedLessons,
        getMotionBank: getMotionBank,
        attachLessonPacks: attachLessonPacks
    };
})(typeof window !== 'undefined' ? window : globalThis);
