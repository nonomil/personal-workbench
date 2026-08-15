import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.join(fileURLToPath(new URL('..', import.meta.url)), 'prj');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const entry = fs.readFileSync(path.join(root, '儿童学习工作台', 'index.html'), 'utf8');
const childCss = fs.readFileSync(path.join(root, 'css', 'child.css'), 'utf8');

test('儿童工作台入口继续使用独立 child 变体和共享持久化壳', () => {
    assert.match(entry, /data-workbench-variant="child"/);
    assert.match(entry, /data-storage-key="petbank_huchuliang_child_workbench_state_v1"/);
    assert.match(entry, /\.\.\/app\.js/);
});

test('儿童首页包含冒险基地四个稳定结构', () => {
    assert.match(app, /function renderChildAdventureHome\(/);
    for (const marker of ['child-adventure-home', 'child-identity-card', 'child-plan-board', 'child-growth-map']) {
        assert.match(app, new RegExp(marker));
    }
});

test('儿童首页任务仍通过现有打卡动作，且不新增第二套积分入口', () => {
    assert.match(app, /data-action="toggle-plan"/);
    assert.match(app, /data-action="navigate" data-page="courses"/);
    assert.match(app, /data-action="navigate" data-page="rewards"/);
    assert.doesNotMatch(app, /childSunlight|child_points|awardChildPoints/);
});

test('儿童版样式提供桌面两列、移动单列和减少动效规则', () => {
    assert.match(childCss, /\.child-adventure-layout/);
    assert.match(childCss, /@media \(max-width: 980px\)/);
    assert.match(childCss, /prefers-reduced-motion/);
});

test('儿童今日页不再把先打卡当主路径', () => {
    const config = fs.readFileSync(path.join(root, 'config.js'), 'utf8');
    const childHome = fs.readFileSync(path.join(root, '儿童学习工作台', 'index.html'), 'utf8');
    assert.doesNotMatch(config, /先打卡/);
    assert.match(config, /childPages[\s\S]*overview: \{[^}]*TODAY \/ LEARN/);
    assert.match(config, /plans: \{ title: '今日学习'/);
    assert.doesNotMatch(childHome, /今日打卡/);
    const start = app.indexOf('function renderChildPlanRows(');
    assert.ok(start >= 0);
    const rows = app.slice(start, app.indexOf('\n    function ', start + 10));
    assert.match(rows, /practiceLessonId|category === '学习'/);
    assert.match(rows, /data-action="navigate" data-page="courses"|open-plan-practice/);
    assert.match(rows, /做完再点|去学习/);
});

test('儿童版采用晴空书桌纸感柔光配色', () => {
    assert.match(childCss, /--bg: #eef3f5/);
    assert.match(childCss, /--orange: #5b9bd5/);
    assert.match(childCss, /--gold: #d4b96a/);
    assert.match(childCss, /0 1px 2px rgba\(60, 90, 112, 0\.06\)/);
    assert.doesNotMatch(childCss, /#ff7d5d|#79c96b/);
    assert.match(fs.readFileSync(path.join(root, '儿童学习工作台', 'index.html'), 'utf8'), /child-workbench\.css\?v=20260815-true-wb-v1/);
});
