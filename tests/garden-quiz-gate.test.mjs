import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const prjRoot = path.join(repoRoot, 'prj');
const game = fs.readFileSync(path.join(prjRoot, 'games', 'garden-defense', 'game.js'), 'utf8');
const html = fs.readFileSync(path.join(prjRoot, 'games', 'garden-defense', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(prjRoot, 'games', 'garden-defense', 'game.css'), 'utf8');

function sourceBetween(source, startText, endText) {
  const start = source.indexOf(startText);
  assert.ok(start >= 0, `missing source boundary: ${startText}`);
  const end = source.indexOf(endText, start + startText.length);
  assert.ok(end > start, `missing source boundary: ${endText}`);
  return source.slice(start, end);
}

test('G1 garden-defense loads the learning-defense card data and gate', () => {
  assert.match(html, /learning-defense\/data\/cards\.js\?v=/);
  assert.match(html, /learning-defense\/core\/learning-gate\.js\?v=/);
  assert.match(html, /quiz-gate=v1/);
});

test('G2 placeAt routes through the quiz gate, planting lives in doPlace', () => {
  const placeAt = sourceBetween(game, 'function placeAt(event) {', 'function spawnWave() {');
  assert.match(placeAt, /maybeQuizThenPlace\(point\)/);
  assert.match(placeAt, /function doPlace\(point\)/);
  assert.match(placeAt, /placeDefensePlant/);
  assert.match(game, /function maybeQuizThenPlace/);
});

test('G3 quiz gate draws from LearningDefenseCards with rewritten image paths', () => {
  const gate = sourceBetween(game, 'function rewriteLearningImagePath', 'function spawnWave() {');
  assert.match(gate, /LearningDefenseCards/);
  assert.match(gate, /\.\/assets\/reused\/learning\//);
  assert.match(gate, /\.\.\/learning-defense\/assets\/reused\/learning\//);
  // 每 5 棵节奏由计数驱动；弹层关闭后经 quizPendingPoint 落种（E1 走查修复：死变量
  // quizGateDoneThisStage 曾在 'use strict' 下抛 ReferenceError 导致植物永不种下，已移除）
  assert.doesNotMatch(gate, /quizGateDoneThisStage\s*=\s*true/);
});

test('G4 answers record outcomes and wrong answers never block planting', () => {
  const gate = sourceBetween(game, 'function rewriteLearningImagePath', 'function spawnWave() {');
  assert.match(gate, /recordLearningOutcome/);
  assert.match(gate, /doPlace\(quizPendingPoint\)/);
  // 答错也种（幼儿无惩罚），只是展示正确答案
  assert.match(gate, /is-correct/);
});

test('G5 stage reset re-arms the gate counter', () => {
  const stage = sourceBetween(game, 'currentStage = stagesApi.get(id);', 'spawnedThisStage = 0;');
  assert.match(stage, /quizPlantsThisStage = 0/);
});

test('G6 quiz overlay styles exist', () => {
  assert.match(css, /\.quiz-gate/);
  assert.match(css, /\.quiz-gate-option/);
});
