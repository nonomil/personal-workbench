(function (global) {
    'use strict';

    const ICONS = ['sparkles', 'target', 'circle-check', 'book-open', 'heart'];

    function asArray(value) {
        return Array.isArray(value) ? value : [];
    }

    function choiceLesson(row, extras) {
        const source = row && typeof row === 'object' ? row : {};
        const options = asArray(source.options).map(function (item) { return String(item); }).filter(Boolean);
        if (options.length < 1) return null;
        const answer = typeof source.answer === 'number'
            ? Math.max(0, Math.min(options.length - 1, source.answer))
            : 0;
        return Object.assign({
            id: String(source.id || ''),
            title: String(source.title || ''),
            minutes: Number(source.minutes) || 8,
            meta: source.day ? ('第 ' + source.day + ' 天') : '课程包',
            tip: String(source.tip || '先看清楚，再选一个答案。'),
            activity: {
                mode: 'choice',
                prompt: String(source.prompt || source.title || '选一个答案'),
                hint: String(source.tip || '慢慢看。'),
                options: options,
                answer: answer,
                optionIcons: options.map(function (_item, index) { return ICONS[index % ICONS.length]; }),
                success: String(source.success || '答对啦！')
            }
        }, extras || {});
    }

    function timerLesson(id, title, prompt, durationSec, safety, extras) {
        return Object.assign({
            id: String(id || ''),
            title: String(title || '做一项运动'),
            minutes: Math.max(1, Math.round((Number(durationSec) || 45) / 60) || 1),
            meta: (Number(durationSec) || 45) + ' 秒',
            tip: asArray(safety).join(' · ') || '成人在旁，慢慢做。',
            activity: {
                mode: 'motion-timer',
                prompt: String(prompt || title || '开始做'),
                durationSec: Math.max(15, Math.min(90, Number(durationSec) || 45)),
                safety: asArray(safety),
                success: '做完啦！'
            }
        }, extras || {});
    }

    function packData() {
        return global.PersonalWorkbenchLessonPackData && typeof global.PersonalWorkbenchLessonPackData === 'object'
            ? global.PersonalWorkbenchLessonPackData
            : { hanzi: [], math: [], english: [], focusDays: [], moveDays: [], motionBank: [] };
    }

    function choiceLessons(rows) {
        return asArray(rows).map(function (row) { return choiceLesson(row); }).filter(Boolean);
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
                item.safety
            );
            if (index === 0) lesson.id = 'preschool-exercise-1';
            if (index === 1) lesson.id = 'preschool-exercise-2';
            if (index === 2) lesson.id = 'preschool-exercise-3';
            return lesson;
        });
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
        attachCourse('preschool-focus', asArray(data.focusDays).map(function (row) {
            return timerLesson(row.id, row.title, row.prompt, 45, ['成人在旁', '慢慢看'], { meta: row.day ? ('第 ' + row.day + ' 天') : '专注' });
        }), false);
        attachCourse('preschool-exercise', exerciseSeedLessons().concat(asArray(data.moveDays).map(function (row) {
            return timerLesson(row.id, row.title, row.prompt, 45, ['成人在旁', '地面清空'], { meta: row.day ? ('第 ' + row.day + ' 天') : '运动' });
        })), true);
        const preschoolCourses = (global.PersonalWorkbenchConfig.variants && global.PersonalWorkbenchConfig.variants.preschool && global.PersonalWorkbenchConfig.variants.preschool.childCourses) || global.PersonalWorkbenchConfig.childCourses || [];
        const literacy = preschoolCourses.find(function (item) { return item.id === 'preschool-literacy'; });
        const math = preschoolCourses.find(function (item) { return item.id === 'preschool-math'; });
        const english = preschoolCourses.find(function (item) { return item.id === 'preschool-english'; });
        const focus = preschoolCourses.find(function (item) { return item.id === 'preschool-focus'; });
        const exercise = preschoolCourses.find(function (item) { return item.id === 'preschool-exercise'; });
        if (literacy) literacy.note = '今日闪卡还在，60 日识字课也接到同一条路线。';
        if (math) math.note = '三关题库还在，60 日点数课也接到同一条路线。';
        if (english) english.note = '听词和拼读还在，60 日英语课也接到同一条路线。';
        if (focus) {
            focus.badge = (focus.lessons && focus.lessons.length || 0) + ' 关';
            focus.note = '记忆翻牌、找不同、数字排队还在，后面的专注课用倒计时认真做。';
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
        timerLesson: timerLesson,
        exerciseSeedLessons: exerciseSeedLessons,
        attachLessonPacks: attachLessonPacks
    };
})(typeof window !== 'undefined' ? window : globalThis);
