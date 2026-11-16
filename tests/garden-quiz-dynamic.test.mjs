import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const prjRoot = path.join(repoRoot, 'prj');
const bridge = fs.readFileSync(path.join(prjRoot, 'games', 'shared', 'workbench-bridge.js'), 'utf8');
const bank = fs.readFileSync(path.join(prjRoot, 'games', 'shared', 'literacy-quiz-bank.js'), 'utf8');
const game = fs.readFileSync(path.join(prjRoot, 'games', 'garden-defense', 'game.js'), 'utf8');
const html = fs.readFileSync(path.join(prjRoot, 'games', 'garden-defense', 'index.html'), 'utf8');

test('D1 quiz bank ships 400 chars with valid three-option rows', () => {
  assert.match(bank, /global\.LiteracyQuizBank = \[/);
  const rows = bank.match(/\{"char": "/g) || [];
  assert.ok(rows.length >= 400, 'bank too small: ' + rows.length);
  const sampleLine = bank.split('\n').find(line => line.includes('"char": "'));
  const sample = JSON.parse(sampleLine.trim().replace(/,$/, ''));
  assert.ok(sample.options.includes(sample.pinyin));
  assert.equal(new Set(sample.options).size, 3);
});

test('D2 bridge drawLiteracyQuiz prioritizes practicing/due mastery chars with daily rotation', () => {
  assert.match(bridge, /function drawLiteracyQuiz\(/);
  const fn = sourceBetween(bridge, 'function drawLiteracyQuiz(', 'function saveMemory(');
  assert.match(fn, /LiteracyQuizBank/);
  assert.match(fn, /mastery/);
  assert.match(fn, /nextReview/);
  // 练习中/到期优先于未学
  assert.match(fn, /score/);
  // L1 准备度闸门：未学字只返回 teachOnly 卡（不出三选一题）
  assert.match(fn, /teachOnly/);
  assert.match(fn, /buildSeenOptions/);
  // E1 发现并修复的闭环断裂：必须合流 memory（知识门答题回流），否则答过的字永远算未学
  assert.match(fn, /getMemory\(\)/);
  assert.match(fn, /memoryRow/);
});

test('D3 game prefers the dynamic bank and falls back to learning-defense cards', () => {
  const gate = sourceBetween(game, 'function maybeQuizThenPlace', 'function spawnWave() {');
  assert.match(gate, /drawLiteracyQuiz/);
  assert.match(gate, /LearningDefenseCards/);
  assert.match(gate, /「[^」]*」怎么读|怎么读/);
  assert.match(gate, /recordLearningOutcome/);
  // E1 走查回归锁：答错须展示正确答案（幼儿无惩罚提示），与静态图卡一致
  assert.match(gate, /is-correct/);
  // E1 走查回归锁：'use strict' 下 closeQuizGate 不得写未声明变量（曾致 ReferenceError，植物永不种下）
  assert.doesNotMatch(gate, /quizGateDoneThisStage\s*=\s*true/);
  // E1 走查回归锁：动态卡与兜底图卡都必须保存落点，否则答完不种下
  assert.ok((gate.match(/quizPendingPoint = point/g) || []).length >= 2,
    'showDynamicQuiz 与 showLearningCard 都需写 quizPendingPoint = point');
});

test('D4 gate interval is every 5th plant after the stage opener', () => {
  assert.match(game, /QUIZ_GATE_INTERVAL = 5/);
  assert.match(game, /quizPlantsThisStage % QUIZ_GATE_INTERVAL/);
  const place = sourceBetween(game, 'function doPlace(point) {', 'function spawnWave() {');
  assert.match(place, /quizPlantsThisStage \+= 1/);
  const stage = sourceBetween(game, 'currentStage = stagesApi.get(id);', 'spawnedThisStage = 0;');
  assert.match(stage, /quizPlantsThisStage = 0/);
});

test('D5 index loads the quiz bank, memory module and speech module', () => {
  assert.match(html, /shared\/literacy-quiz-bank\.js\?v=/);
  assert.match(html, /shared\/workbench-memory\.js\?v=/);
  // E1 走查回归锁：游戏页必须挂 preschool-speech.js，否则题面从不自动朗读
  assert.match(html, /preschool-speech\.js\?v=/);
});

test('D6 quiz gate offers a teach-first card for unseen chars and an unknown escape on tests', () => {
  const gate = sourceBetween(game, 'function maybeQuizThenPlace', 'function spawnWave() {');
  assert.match(gate, /function showTeachCard\(/);
  assert.match(gate, /quiz-gate-card-teach/);
  assert.match(gate, /还不会/);
  // 三选一题必须带"不会/跳过"诚实出口（幼儿无惩罚：记 unknown 仍种下）
  assert.match(gate, /quiz-gate-option-unknown/);
  assert.match(gate, /__learning_unknown__/);
  assert.match(gate, /recordLearningOutcome\([^)]*'unknown'|'unknown'\)/);
  // teachOnly 卡不做三选一（options 为空）
  assert.match(gate, /teachOnly/);
});

function sourceBetween(source, startText, endText) {
  const start = source.indexOf(startText);
  assert.ok(start >= 0, `missing source boundary: ${startText}`);
  const end = source.indexOf(endText, start + startText.length);
  assert.ok(end > start, `missing source boundary: ${endText}`);
  return source.slice(start, end);
}
