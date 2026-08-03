import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
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
