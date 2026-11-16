// E1v2 动态知识门浏览器端到端走查（交接包 005 · 待做实验.md §E1 + L1 落地后扩展）
// v2 变更：准备度闸门（未学字→「先学一学」卡）、三选一带"不会/跳过"出口、
//         未知复现（练习中优先）、干扰项已见字过滤；断网兜底与节奏断言保留。
// 运行：node e2e-quiz-gate.mjs   （cwd = 本文件所在目录，依赖同目录 node_modules/playwright-core）
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://127.0.0.1:8642';
const WB_BATTLE = BASE + '/prj/preschool-workbench/index.html?theme=garden-defense&sim-android#battle';
const WB_HOME = BASE + '/prj/preschool-workbench/index.html?theme=garden-defense&sim-android#overview';
const GAME_RE = /\/prj\/games\/garden-defense\/index\.html/;
const EVIDENCE = process.env.E1_EVIDENCE || 'G:/StudyCode/个人工作台/docs/plans/T20260829-pvz-learning-loop/e1-evidence';
fs.mkdirSync(EVIDENCE, { recursive: true });

const results = [];
let shotSeq = 20;
function record(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail == null ? '' : String(detail) });
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  :: ' + detail : ''));
}
async function shot(page, tag) {
  shotSeq += 1;
  const file = path.join(EVIDENCE, `e1-v2-${String(shotSeq).padStart(2, '0')}-${tag}.png`);
  await page.screenshot({ path: file });
  return file;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function canvasClientPoint(page, px, py) {
  return page.evaluate(([px, py]) => {
    const canvas = document.getElementById('world-canvas');
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: rect.left + (px / 1280) * rect.width, y: rect.top + (py / 540) * rect.height };
  }, [px, py]);
}
async function clickLawn(page, px, py, expectQuiz) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const c = await canvasClientPoint(page, px, py);
    await page.mouse.click(c.x, c.y);
    await sleep(250);
    const state = await page.evaluate(() => ({
      quiz: !!document.querySelector('.quiz-gate'),
      plants: ((window.WorkbenchGameBridge && WorkbenchGameBridge.readState()
        .growth.garden.defense.plants) || []).length
    }));
    if (expectQuiz ? state.quiz : !state.quiz) return state;
  }
  return await page.evaluate(() => ({
    quiz: !!document.querySelector('.quiz-gate'),
    plants: ((window.WorkbenchGameBridge && WorkbenchGameBridge.readState()
      .growth.garden.defense.plants) || []).length
  }));
}
async function seedSunlight(page, want) {
  await page.evaluate(([want]) => {
    const KEY = window.WorkbenchGameBridge.STORAGE_KEY;
    const raw = localStorage.getItem(KEY);
    const state = raw ? JSON.parse(raw) : {};
    state.growth = state.growth || {};
    if (Number(state.growth.sunlight) < want) state.growth.sunlight = want;
    localStorage.setItem(KEY, JSON.stringify(state));
  }, [want]);
}
async function grantPassIfNeeded(page) {
  const rest = await page.evaluate(() => {
    const layer = document.getElementById('rest-layer');
    return !!layer && !layer.classList.contains('is-hidden');
  });
  if (!rest) return false;
  const ok = await page.evaluate(() => {
    const bridge = window.WorkbenchGameBridge;
    if (!bridge || !bridge.grantPlayPass) return false;
    const r = bridge.grantPlayPass('garden-defense', { date: bridge.today() });
    return !!(r && r.ok);
  });
  record('E1-pre 休息层 -> grantPlayPass(learn)', ok, ok ? '已补发，重进' : 'grant 失败');
  return true;
}
async function enterStage(page, stageIndex) {
  await page.waitForSelector('.stage-card:not([disabled])', { timeout: 15000 });
  await page.locator('.stage-card:not([disabled])').nth(stageIndex).click();
  await page.waitForSelector('#panel-play:not(.is-hidden)', { timeout: 5000 });
}
async function plantsCount(page) {
  return page.evaluate(() => (window.WorkbenchGameBridge.readState().growth.garden.defense.plants || []).length);
}
const quizDom = () => page.evaluate(() => {
  const layer = document.querySelector('.quiz-gate');
  const opts = Array.from(layer.querySelectorAll('.quiz-gate-option')).map((b) => ({ id: b.dataset.id, text: (b.querySelector('b') || {}).textContent }));
  return {
    prompt: (layer.querySelector('.quiz-gate-prompt') || {}).textContent || '',
    opts,
    textMode: !!layer.querySelector('.quiz-gate-options-text'),
    isTeach: !!layer.querySelector('.quiz-gate-card-teach'),
    imgCount: layer.querySelectorAll('.quiz-gate-option img').length
  };
});

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext({ viewport: { width: 800, height: 360 } });
const page = await ctx.newPage();
const consoleLog = [];
page.on('console', (msg) => { if (msg.type() === 'error' || msg.type() === 'warning') consoleLog.push('console.' + msg.type() + ': ' + msg.text()); });
page.on('pageerror', (err) => consoleLog.push('pageerror: ' + String(err && err.message || err)));

// ── 0. 服务探活 ──────────────────────────────────────────────
try {
  const r = await page.goto(BASE + '/prj/games/garden-defense/index.html', { timeout: 8000 });
  record('E1-pre http 服务可用', r.status() === 200, 'status ' + r.status());
} catch (e) {
  record('E1-pre http 服务可用', false, '无法访问 8642（先起 python -m http.server 8642）');
  process.exit(1);
}

// ── 1. 工作台 #battle → 去花园游戏（跳转带 sim-android）──────
await page.goto(WB_BATTLE, { waitUntil: 'domcontentloaded', timeout: 20000 });
let launchBtn = page.locator('button[data-action="open-world-game"]:visible').first();
try {
  await launchBtn.waitFor({ state: 'visible', timeout: 20000 });
} catch (e) {
  await page.goto(WB_HOME, { waitUntil: 'domcontentloaded', timeout: 20000 });
  launchBtn = page.locator('button[data-action="open-world-game"]:visible').first();
  await launchBtn.waitFor({ state: 'visible', timeout: 20000 });
}
await launchBtn.click();
try {
  await page.waitForURL(GAME_RE, { timeout: 10000 });
  record('E1.1 跳转至花园保卫页', true, page.url());
} catch (e) {
  record('E1.1 跳转至花园保卫页', false, '未跳转，当前 ' + page.url());
}
record('E1.1b 跳转 URL 带 sim-android=1', page.url().includes('sim-android=1'));
record('E1.1c 跳转 URL 带 theme=garden-defense', page.url().includes('theme=garden-defense'));
record('E1.1d html.is-android-app 生效', await page.evaluate(() => document.documentElement.classList.contains('is-android-app')));

const keysBefore = await page.evaluate(() => Object.keys(localStorage).sort());

// ── 2. 准备：阳光种子 + 进第 1 关 ────────────────────────────
await seedSunlight(page, 600);
await grantPassIfNeeded(page);
await enterStage(page, 0);
record('E1.2 进入第 1 关战斗页', await page.evaluate(() => !document.getElementById('panel-play').classList.contains('is-hidden')));

await page.evaluate(() => {
  window.__speechProbe = { present: !!window.PersonalWorkbenchPreschoolSpeech, calls: [] };
  if (window.PersonalWorkbenchPreschoolSpeech && window.PersonalWorkbenchPreschoolSpeech.speak) {
    const orig = window.PersonalWorkbenchPreschoolSpeech.speak.bind(window.PersonalWorkbenchPreschoolSpeech);
    window.PersonalWorkbenchPreschoolSpeech.speak = function (input) {
      window.__speechProbe.calls.push(input && input.text ? input.text : input);
      return orig(input);
    };
  }
});
await page.locator('#seed-tray .seed-card:not([disabled])').first().click();

// ── 3. 第 1 棵：准备度闸门 →「先学一学」卡（未学字不三选一）──
const s1 = await clickLawn(page, 393.5, 410, true); // lane3 col2
const teach1 = await quizDom();
record('E1.3 首棵弹「先学一学」卡（未学闸门，非三选一）',
  teach1.isTeach && !teach1.textMode && teach1.prompt.includes('先认识一下'),
  `prompt=${teach1.prompt} textMode=${teach1.textMode}`);
record('E1.3b teach 卡双出口：还不会/会了',
  teach1.opts.some((o) => o.id === '__learning_unknown__') && teach1.opts.some((o) => o.id === '__learning_known__'),
  JSON.stringify(teach1.opts.map((o) => o.id)));
const probeAfterPrompt = await page.evaluate(() => window.__speechProbe);
record('E1.3c teach 卡自动朗读（speech 模块存在并已调用）', probeAfterPrompt.present && probeAfterPrompt.calls.length >= 1,
  `present=${probeAfterPrompt.present} calls=[${probeAfterPrompt.calls.join(',')}]`);
await shot(page, 'teach-card');

// 点"会了"→ 种下 + memory 回流 known
await page.click('.quiz-gate-option-known');
await page.waitForSelector('.quiz-gate', { state: 'detached', timeout: 3000 });
await sleep(200);
record('E1.4 teach「会了」→ 仍种下（plants=1）', (await plantsCount(page)) === 1, 'plants=' + await plantsCount(page));
const memory1 = await page.evaluate(() => {
  const key = 'workbench:memory:v1';
  const raw = localStorage.getItem(key);
  const state = raw ? JSON.parse(raw) : {};
  const rows = Object.values((state && state.words) || {});
  return { keyExists: !!raw, total: rows.length, known: rows.filter((r) => r.lastOutcome === 'known').length };
});
record('E1.4b 回流 workbench:memory:v1（known）', memory1.keyExists && memory1.total >= 1 && memory1.known >= 1,
  JSON.stringify(memory1));

// ── 4. 连种 4 棵不弹；第 6 棵（计数 5）再弹三选一 ───────────
const colsNoQuiz = [486.9, 580.3, 673.7, 767.1]; // lane3 col3..6
let noQuizOk = true;
for (let i = 0; i < colsNoQuiz.length; i += 1) {
  const st = await clickLawn(page, colsNoQuiz[i], 410, false);
  if (st.quiz) noQuizOk = false;
}
record('E1.5 连种 4 棵不再弹（计数 1..4）', noQuizOk, 'plants=' + await plantsCount(page));

const s6 = await clickLawn(page, 860.5, 410, true); // lane3 col7 → 计数 5
record('E1.6 第 6 棵（计数 5）再弹', s6.quiz, `plants=${s6.plants}`);
const quiz6 = await page.evaluate(() => window.WorkbenchGameBridge.drawLiteracyQuiz({ count: 1 })[0]);
const dom6 = await quizDom();
record('E1.6b 已是已学字 → 拼音三选一（非 teach）',
  !dom6.isTeach && dom6.textMode && dom6.opts.filter((o) => o.id !== '__learning_unknown__').length === 3 && !quiz6.teachOnly,
  `prompt=${dom6.prompt} opts=${JSON.stringify(dom6.opts.map((o) => o.id))}`);
record('E1.6c 三选一带「不会/跳过」诚实出口',
  dom6.opts.some((o) => o.id === '__learning_unknown__'), JSON.stringify(dom6.opts.map((o) => o.id)));
await shot(page, 'dynamic-quiz-v2');

// 点"不会/跳过"→ 仍种下 + unknown 回流
await page.click('.quiz-gate-option-unknown');
await page.waitForSelector('.quiz-gate', { state: 'detached', timeout: 3000 });
await sleep(200);
record('E1.7 点"不会/跳过" → 仍种下（plants=6，无惩罚）', (await plantsCount(page)) === 6, 'plants=' + await plantsCount(page));
const memoryUnknown = await page.evaluate(() => {
  const key = 'workbench:memory:v1';
  const state = JSON.parse(localStorage.getItem(key) || '{}');
  const rows = Object.values((state && state.words) || {});
  return { unknownNow: rows.filter((r) => r.lastOutcome === 'unknown').length, needsReteach: rows.filter((r) => r.needsReteach === true).length };
});
record('E1.7b unknown 回流（needsReteach 重教优先）', memoryUnknown.unknownNow >= 1 && memoryUnknown.needsReteach >= 1,
  JSON.stringify(memoryUnknown));

// ── 5. 再种 4 棵不弹；第 11 棵（计数 10）练习中字优先复现 ────
const colsNoQuiz2 = [393.5, 486.9, 580.3, 673.7]; // lane1 col2..5（y=310）
let noQuizOk2 = true;
for (let i = 0; i < colsNoQuiz2.length; i += 1) {
  const st = await clickLawn(page, colsNoQuiz2[i], 310, false);
  if (st.quiz) noQuizOk2 = false;
}
record('E1.8 再连种 4 棵不再弹（计数 6..9）', noQuizOk2, 'plants=' + await plantsCount(page));

const s11 = await clickLawn(page, 767.1, 310, true); // lane1 col6 → 计数 10
record('E1.9 第 11 棵（计数 10）再弹', s11.quiz, `plants=${s11.plants}`);
const quiz11 = await page.evaluate(() => window.WorkbenchGameBridge.drawLiteracyQuiz({ count: 1 })[0]);
const dom11 = await quizDom();
record('E1.9b 练习中（unknown）字优先复现，仍为拼音三选一',
  !!quiz11 && !quiz11.teachOnly && dom11.prompt === `「${quiz11.char}」怎么读？` && dom11.textMode,
  `prompt=${dom11.prompt} teachOnly=${!!(quiz11 && quiz11.teachOnly)}`);
await shot(page, 'reappear-practice');
await page.click(`.quiz-gate-option[data-id="${quiz11.pinyin}"]`);
const correctState = await page.evaluate(() => !!document.querySelector('.quiz-gate-option.is-correct'));
record('E1.10 答对项变绿 is-correct', correctState);
await page.waitForSelector('.quiz-gate', { state: 'detached', timeout: 3000 });
await sleep(200);
record('E1.10b 答对后种下（plants=11）', (await plantsCount(page)) === 11, 'plants=' + await plantsCount(page));

// ── 6. 断网兜底：题库脚本加载失败 → LearningDefenseCards 图卡 ──
await ctx.route('**/*literacy-quiz-bank.js*', (route) => route.abort());
await page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForSelector('.stage-card:not([disabled])', { timeout: 15000 });
await grantPassIfNeeded(page);
await enterStage(page, 0);
const bankMissing = await page.evaluate(() => !window.LiteracyQuizBank);
record('E1.11 题库脚本请求被断（模拟资源缺失）', bankMissing, 'LiteracyQuizBank=' + (bankMissing ? 'undefined' : 'present'));

const sf = await clickLawn(page, 393.5, 410, true);
record('E1.12 断网重试首棵：回退图卡', sf.quiz, `quiz=${sf.quiz} plants=${sf.plants}`);
const fallback = await page.evaluate(() => {
  const layer = document.querySelector('.quiz-gate');
  const prompt = (layer.querySelector('.quiz-gate-prompt') || {}).textContent || '';
  const imgs = Array.from(layer.querySelectorAll('.quiz-gate-option img'));
  return { textMode: !!layer.querySelector('.quiz-gate-options-text'), imgCount: imgs.length, prompt,
    imgsLoaded: imgs.length > 0 && imgs.every((img) => img.complete && img.naturalWidth > 0) };
});
record('E1.12b 回退卡为图卡（LearningDefenseCards，3 图）', !fallback.textMode && fallback.imgCount === 3, `prompt=${fallback.prompt}`);
record('E1.12c 回退卡图片加载成功', fallback.imgsLoaded);
const card0 = await page.evaluate(() => window.LearningDefenseCards.cards[0]);
record('E1.12d 回退卡与 LearningDefenseCards 首位一致', fallback.prompt === card0.prompt, `expect=${card0.prompt}`);
await shot(page, 'fallback-card-v2');
await page.click(`.quiz-gate-option[data-id="${card0.answer}"]`);
await page.waitForSelector('.quiz-gate', { state: 'detached', timeout: 3000 });
await sleep(200);
record('E1.12e 回退卡答对仍种下（plants=1）', (await plantsCount(page)) === 1, 'plants=' + await plantsCount(page));
await ctx.unroute('**/*literacy-quiz-bank.js*');

// ── 7. 收尾：storage key 审计 + 控制台错误 ────────────────────
const keysAfter = await page.evaluate(() => Object.keys(localStorage).sort());
const added = keysAfter.filter((k) => !keysBefore.includes(k));
const allowed = ['workbench:memory:v1', 'petbank_huchuliang_preschool_workbench_state_v1'];
const unknown = added.filter((k) => !allowed.includes(k));
record('E1.13 未新增 storage key', added.length === 0 || unknown.length === 0, `newKeys=${JSON.stringify(added)}`);

const realErrors = consoleLog.filter((m) => !/literacy-quiz-bank/.test(m) && !/Failed to load resource/.test(m));
record('E1.14 过程无异常控制台错误（除故意断开的 bank）', realErrors.length === 0, realErrors.slice(0, 5).join(' | '));

const failed = results.filter((r) => !r.ok);
const summary = { url: page.url(), results, failed: failed.map((f) => f.name),
  total: results.length, pass: results.length - failed.length, consoleErrors: consoleLog, evidenceDir: EVIDENCE };
fs.writeFileSync(path.join(EVIDENCE, 'e1-v2-summary.json'), JSON.stringify(summary, null, 2), 'utf8');
console.log('\n==== E1v2 汇总：' + (results.length - failed.length) + '/' + results.length + ' PASS ====');
failed.forEach((f) => console.log('  FAIL: ' + f.name + ' :: ' + f.detail));
await browser.close();
process.exit(failed.length ? 1 : 0);