import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildExportPlan, normalizeReviewPackage } from '../scripts/parent-review-exporter-core.mjs';
import { exportReviewPackage } from '../scripts/parent-review-exporter-server.mjs';

test('复习包只保留家长可行动的最多十条内容', () => {
  const input = {
    schemaVersion: 'learning-review-package/v1',
    child: { id: 'local-child', name: '小星' },
    range: { from: '2026-08-26', to: '2026-08-26' },
    items: Array.from({ length: 12 }, (_, index) => ({
      contentId: 'hanzi:' + index,
      track: 'literacy',
      label: '字' + index,
      prompt: '读一读',
      options: [{ label: '正确', correct: true }, { label: '不会 / 跳过', kind: 'unknown' }],
      reasonCode: 'repeated-unknown'
    }))
  };
  const pkg = normalizeReviewPackage(input);
  assert.equal(pkg.items.length, 10);
  assert.equal(pkg.items[0].options.at(-1).kind, 'unknown');
  const plan = buildExportPlan(pkg, 'G:/StudyCode/个人工作台/exports/parent-review');
  assert.equal(plan.markdownPath.endsWith('家庭复习单.md'), true);
  assert.equal(plan.htmlPath.endsWith('家庭复习单.html'), true);
  assert.equal(plan.docxPath.endsWith('家庭复习单.docx'), true);
  assert.equal(plan.pdfPath.endsWith('家庭复习单.pdf'), true);
});

test('复习包拒绝错误版本和空的孩子身份', () => {
  assert.throws(() => normalizeReviewPackage({ schemaVersion: 'wrong', child: { name: '小星' }, items: [] }), /schemaVersion/);
  assert.throws(() => normalizeReviewPackage({ schemaVersion: 'learning-review-package/v1', child: {}, items: [] }), /child/);
});

test('导出服务用 argv 调用 Minecraft-AI 的 DOCX/PDF 转换入口', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-workbench-review-'));
  const tools = path.join(root, 'tools');
  fs.mkdirSync(tools);
  fs.writeFileSync(path.join(tools, '生成每日学习资料DOCX.py'), '# test');
  fs.writeFileSync(path.join(tools, '生成每日学习资料PDF.ps1'), '# test');
  const calls = [];
  const result = await exportReviewPackage({
    package: { schemaVersion: 'learning-review-package/v1', child: { id: 'child', name: '小星' }, range: { from: '2026-08-26', to: '2026-08-26' }, items: [{ contentId: 'hanzi:山', track: 'literacy', label: '山', answer: 'shān' }] },
    formats: ['docx', 'pdf']
  }, {
    minecraftRoot: root,
    exportRoot: path.join(root, 'exports'),
    runner: async (command, args) => {
      calls.push({ command, args });
      const markdownPath = command === 'python' ? args[1] : args[args.indexOf('-MarkdownPath') + 1];
      fs.writeFileSync(markdownPath.replace(/\.md$/, command === 'python' ? '.docx' : '.pdf'), 'generated');
      return { ok: true, code: 0, stdout: '', stderr: '' };
    }
  });
  assert.equal(result.ok, true);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].args.slice(0, 1), [path.join(tools, '生成每日学习资料DOCX.py')]);
  assert.deepEqual(calls[1].args.slice(0, 6), ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(tools, '生成每日学习资料PDF.ps1'), '-MarkdownPath']);
  assert.equal(result.files.docx.endsWith('.docx'), true);
  assert.equal(result.files.pdf.endsWith('.pdf'), true);
  fs.rmSync(root, { recursive: true, force: true });
});
