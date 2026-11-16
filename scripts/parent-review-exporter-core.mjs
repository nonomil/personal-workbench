import path from 'node:path';

const SCHEMA_VERSION = 'learning-review-package/v1';

function text(value, fallback = '') {
  const result = String(value ?? '').trim();
  return result || fallback;
}

function markdown(value) {
  return text(value).replace(/[\\`*_{}[\]()#+.!<>|]/g, '\\$&');
}

function html(value) {
  return text(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
}

function safeFilePart(value) {
  return text(value, '孩子').replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 40) || '孩子';
}

function normalizeOption(option) {
  if (typeof option === 'string') return { label: text(option), correct: false };
  const source = option && typeof option === 'object' ? option : {};
  const label = text(source.label || source.text || source.value);
  return {
    label,
    correct: source.correct === true,
    kind: text(source.kind)
  };
}

function isUnknownOption(option) {
  return option.kind === 'unknown' || /不会|跳过/.test(option.label);
}

export function normalizeReviewPackage(input) {
  if (!input || typeof input !== 'object' || input.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`schemaVersion must be ${SCHEMA_VERSION}`);
  }
  const child = input.child && typeof input.child === 'object' ? input.child : {};
  const childId = text(child.id || child.name);
  if (!childId) throw new Error('child is required');
  const range = input.range && typeof input.range === 'object' ? input.range : {};
  const from = text(range.from || range.to, new Date().toISOString().slice(0, 10));
  const to = text(range.to || range.from, from);
  const sourceItems = Array.isArray(input.items) ? input.items : [];
  const items = sourceItems.filter((item) => item && typeof item === 'object').slice(0, 10).map((item, index) => {
    const options = (Array.isArray(item.options) ? item.options : []).map(normalizeOption).filter((option) => option.label);
    if (!options.some(isUnknownOption)) options.push({ label: '不会 / 跳过', correct: false, kind: 'unknown' });
    return {
      contentId: text(item.contentId || item.id || `review:${index + 1}`),
      track: text(item.track, '学习'),
      label: text(item.label || item.text || item.contentId, `复习内容 ${index + 1}`),
      prompt: text(item.prompt, '读一读，说一说，选出你觉得正确的答案。'),
      answer: text(item.answer),
      meaning: text(item.meaning),
      example: text(item.example),
      image: text(item.image),
      reasonCode: text(item.reasonCode, 'practice'),
      reason: text(item.reason, '安排一次轻量复习。'),
      action: text(item.action, '遮住选项，请孩子独立读出或说出答案。'),
      practiceType: text(item.practiceType, 'speak'),
      options
    };
  });
  return {
    schemaVersion: SCHEMA_VERSION,
    child: { id: childId, name: text(child.name, childId) },
    range: { from, to },
    items
  };
}

export function buildExportPlan(pkg, exportRoot) {
  const normalized = normalizeReviewPackage(pkg);
  const root = path.resolve(text(exportRoot, path.join(process.cwd(), 'exports', 'parent-review')));
  const date = safeFilePart(normalized.range.to || normalized.range.from);
  const child = safeFilePart(normalized.child.name);
  const prefix = `${date}_${child}_家庭复习单`;
  const directory = path.join(root, date);
  return {
    directory,
    markdownPath: path.join(directory, `${prefix}.md`),
    htmlPath: path.join(directory, `${prefix}.html`),
    docxPath: path.join(directory, `${prefix}.docx`),
    pdfPath: path.join(directory, `${prefix}.pdf`)
  };
}

function reasonLabel(code) {
  return ({
    'repeated-unknown': '重复选择不会 / 跳过',
    lapses: '最近有答错或混淆',
    unsure: '答对还不够稳定',
    'prereq-blocked': '前置内容还没稳住'
  })[code] || '安排轻量复习';
}

export function renderMarkdown(pkg) {
  const normalized = normalizeReviewPackage(pkg);
  const lines = [
    `# ${normalized.child.name} 家庭复习单`,
    '',
    `- 复习区间：${normalized.range.from} 至 ${normalized.range.to}`,
    `- 内容数量：${normalized.items.length} 条（最多 10 条家长重点）`,
    '',
    '## 给家长的带学说明',
    '',
    '每张卡先让孩子自己想；如果点了“不会 / 跳过”，先按建议讲一遍，再请孩子说出来。不会不等于答错，也不扣奖励。',
    '',
    ...normalized.items.map((item, index) => `${index + 1}. **${markdown(item.label)}**（${markdown(reasonLabel(item.reasonCode))}）\n   - 原因：${markdown(item.reason)}\n   - 建议：${markdown(item.action)}`),
    '',
    '## 孩子练习页',
    '',
    ...normalized.items.map((item, index) => [
      `### ${index + 1}. ${markdown(item.label)}`,
      '',
      item.image ? `![${markdown(item.label)}](${item.image})` : '',
      `**${markdown(item.prompt)}**`,
      '',
      item.meaning ? `意思：${markdown(item.meaning)}` : '',
      item.example ? `例子：${markdown(item.example)}` : '',
      '',
      ...item.options.map((option, optionIndex) => `- [ ] ${String.fromCharCode(65 + optionIndex)}. ${markdown(option.label)}`),
      '',
      '孩子说一说：____________________________',
      '',
      '---',
      ''
    ]).flat(),
    '## 答案与提示（家长保留）',
    '',
    ...normalized.items.map((item, index) => `${index + 1}. **${markdown(item.label)}**\n   - 答案：${markdown(item.answer || item.options.find((option) => option.correct)?.label || '见学习内容')}\n   - 提示：${markdown(item.action)}`)
  ];
  return lines.filter((line, index, all) => !(line === '' && all[index - 1] === '' && all[index + 1] === '')).join('\n');
}

export function renderHtml(pkg) {
  const normalized = normalizeReviewPackage(pkg);
  const parent = normalized.items.map((item, index) => `<li><strong>${index + 1}. ${html(item.label)}</strong><span>${html(reasonLabel(item.reasonCode))}</span><p>原因：${html(item.reason)}</p><p>建议：${html(item.action)}</p></li>`).join('');
  const children = normalized.items.map((item, index) => `<article class="practice-card"><h3>${index + 1}. ${html(item.label)}</h3>${item.image ? `<img src="${html(item.image)}" alt="${html(item.label)}">` : ''}<p class="prompt">${html(item.prompt)}</p>${item.meaning ? `<p>意思：${html(item.meaning)}</p>` : ''}${item.example ? `<p>例子：${html(item.example)}</p>` : ''}<ol>${item.options.map((option) => `<li><span class="box"></span>${html(option.label)}</li>`).join('')}</ol><p class="write-line">孩子说一说：____________________________</p></article>`).join('');
  const answers = normalized.items.map((item, index) => `<li><strong>${index + 1}. ${html(item.label)}</strong>：${html(item.answer || item.options.find((option) => option.correct)?.label || '见学习内容')}<br><span>${html(item.action)}</span></li>`).join('');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${html(normalized.child.name)} 家庭复习单</title><style>
@page{size:A4;margin:15mm}*{box-sizing:border-box}body{margin:0;color:#17253c;font:14px/1.65 "Microsoft YaHei",sans-serif}h1{font-size:27px;margin:0 0 5px}h2{font-size:20px;border-bottom:2px solid #d9e6f2;padding-bottom:5px}h3{font-size:17px;margin:0 0 8px}.meta{color:#60748b}.page{break-after:page}.page:last-child{break-after:auto}.parent-list{padding-left:22px}.parent-list li{margin:0 0 12px}.parent-list span{display:inline-block;margin-left:8px;padding:1px 8px;border-radius:999px;background:#fff0d9;color:#92521b;font-size:12px}.practice-card{break-inside:avoid;border:1px solid #cbd9e5;border-radius:10px;padding:12px;margin:0 0 12px}.practice-card img{display:block;max-width:110px;max-height:90px;object-fit:contain}.prompt{font-weight:700}.practice-card ol{list-style:none;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:6px}.practice-card li{border:1px solid #dfe7ee;padding:7px;border-radius:7px}.box{display:inline-block;width:14px;height:14px;border:1px solid #52677d;margin-right:7px;vertical-align:-2px}.write-line{color:#60748b}.answer-list{padding-left:23px}.answer-list li{margin-bottom:11px}.answer-list span{color:#60748b}.unknown-note{padding:8px 10px;border-left:4px solid #efa54a;background:#fff8eb}
@media print{a{color:inherit;text-decoration:none}}
</style></head><body><section class="page"><h1>${html(normalized.child.name)} 家庭复习单</h1><p class="meta">复习区间：${html(normalized.range.from)} 至 ${html(normalized.range.to)} · 共 ${normalized.items.length} 条</p><p class="unknown-note">“不会 / 跳过”是诚实反馈：不算答错、不扣奖励，按建议重教后再练。</p><h2>给家长的带学说明</h2><ol class="parent-list">${parent}</ol></section><section class="page"><h2>孩子练习页</h2>${children}</section><section><h2>答案与提示（家长保留）</h2><ol class="answer-list">${answers}</ol></section></body></html>`;
}

export { SCHEMA_VERSION };
