// E1 动态知识门浏览器端到端走查（交接包 005 · 待做实验.md §E1）
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
let shotSeq = 0;
function record(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail == null ? '' : String(detail) });
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  :: ' + detail : ''));
}
async function shot(page, tag) {
  shotSeq += 1;
  const file = path.join(EVIDENCE, `e1-${String(shotSeq).padStart(2, '0')}-${tag}.png`);
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

// 点击画布草坪（lane3 一排，col 2..7）；若本次预期弹卡/种下都未发生（可能点到阳光），重试一次
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
    const now = Math.max(0, Number(state.growth.sunlight) || 0);
    if (now < want) state.growth.sunlight = want;
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
    const r = bridge.grantPlayPass('garden-defense', { source: 'e2e-seed', date: bridge.today() });
    return !!(r && r.ok);
  });
  record('E1-pre 休息层 -> grantPlayPass', ok, ok ? '已补发，重进' : 'grant 失败');
  return true;
}

async function enterStage(page, stageIndex) {
  await page.waitForSelector('.stage-card:not([disabled])', { timeout: 15000 });
  const card = page.locator('.stage-card:not([disabled])').nth(stageIndex);
  await card.click();
  await page.waitForSelector('#panel-play:not(.is-hidden)', { timeout: 5000 });
}

async function plantsCount(page) {
  return page.evaluate(() => (window.WorkbenchGameBridge.readState().growth.garden.defense.plants || []).length);
}

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
record('E1.1b 跳转 URL 带 sim-android=1', page.url().includes('sim-android=1'), page.url());
record('E1.1c 跳转 URL 带 theme=garden-defense', page.url().includes('theme=garden-defense'), page.url());
record('E1.1d html.is-android-app 生效', await page.evaluate(() => document.documentElement.classList.contains('is-android-app')));

const keysBefore = await page.evaluate(() => Object.keys(localStorage).sort());

// ── 2. 准备：阳光种子 + 进第 1 关 ────────────────────────────
await seedSunlight(page, 600);
await grantPassIfNeeded(page);
await enterStage(page, 0);
record('E1.2 进入第 1 关战斗页', await page.evaluate(() => !document.getElementById('panel-play').classList.contains('is-hidden')));

// speech 探针（wrap speak 计数；若模块缺失则 present=false）
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

// 选向日葵种子（默认已选，仍点一次以符合操作流）
await page.locator('#seed-tray .seed-card:not([disabled])').first().click();

// ── 3. 第 1 棵：动态弹卡（拼音三选一）─────────────────────────
const quiz = await page.evaluate(() => window.WorkbenchGameBridge.drawLiteracyQuiz({ count: 1 })[0]);
record('E1.3 抽题返回非空', !!quiz, quiz ? `${quiz.char} / ${quiz.pinyin} / [${quiz.options.join(',')}]` : '空（走兜底）');

const s1 = await clickLawn(page, 393.5, 410, true);

const dom1 = await page.evaluate(() => {
  const layer = document.querySelector('.quiz-gate');
  const prompt = layer.querySelector('.quiz-gate-prompt').textContent;
  const opts = Array.from(layer.querySelectorAll('.quiz-gate-option')).map((b) => ({ id: b.dataset.id, text: (b.querySelector('b') || {}).textContent }));
  return {
    prompt,
    opts,
    textMode: !!layer.querySelector('.quiz-gate-options-text'),
    imgCount: layer.querySelectorAll('.quiz-gate-option img').length
  };
});
record('E1.4 弹「X怎么读」拼音选项（非图卡）', dom1.textMode && dom1.imgCount === 0 && dom1.prompt === `「${quiz.char}」怎么读？`,
  `prompt=${dom1.prompt} opts=${dom1.opts.length} imgs=${dom1.imgCount}`);
record('E1.4b 三个选项 = 抽题 options（含正确拼音）',
  dom1.opts.length === 3 && dom1.opts.every((o) => quiz.options.includes(o.id)) && quiz.options.every((p) => dom1.opts.some((o) => o.id === p)),
  JSON.stringify(dom1.opts.map((o) => o.id)));

const probeAfterPrompt = await page.evaluate(() => window.__speechProbe);
record('E1.4c 题面自动朗读（speech 模块存在并已调用）',
  probeAfterPrompt.present && probeAfterPrompt.calls.some((t) => t === quiz.char),
  `present=${probeAfterPrompt.present} calls=[${probeAfterPrompt.calls.join(',')}]`);
await shot(page, 'dynamic-quiz');

// ── 4. 答错：该项变红、正确项变绿、850ms 后弹层关、仍种下 ─────
const wrongId = dom1.opts.find((o) => o.id !== quiz.pinyin).id;
await page.click(`.quiz-gate-option[data-id="${wrongId}"]`);
const wrongState = await page.evaluate(([wrongId, correctId]) => {
  const layer = document.querySelector('.quiz-gate');
  const wrongNodes = Array.from(layer.querySelectorAll('.quiz-gate-option.is-wrong'));
  const correct = layer.querySelector(`.quiz-gate-option[data-id="${correctId}"]`);
  return { wrongIds: wrongNodes.map((n) => n.dataset.id), correctGreen: !!(correct && correct.classList.contains('is-correct')) };
}, [wrongId, quiz.pinyin]);
record('E1.5 答错项变红 is-wrong', wrongState.wrongIds.length === 1 && wrongState.wrongIds[0] === wrongId, `wrongIds=${JSON.stringify(wrongState.wrongIds)}`);
record('E1.5b 正确项同时变绿 is-correct（等待期提示）', wrongState.correctGreen, `correctGreen=${wrongState.correctGreen}`);
await shot(page, 'wrong-answer');

await page.waitForSelector('.quiz-gate', { state: 'detached', timeout: 3000 });
await sleep(200);
record('E1.5c 答错也种下（plants=1）', (await plantsCount(page)) === 1, 'plants=' + await plantsCount(page));

const memory = await page.evaluate((ch) => {
  const key = 'workbench:memory:v1';
  const raw = localStorage.getItem(key);
  const state = raw ? JSON.parse(raw) : {};
  const words = (state && state.words) || {};
  return { keyExists: !!raw, wordKeys: Object.keys(words).filter((k) => k.includes(ch)), all: Object.keys(words).length };
}, quiz.char);
record('E1.5d recordLearningOutcome 回流 workbench:memory:v1', memory.keyExists && memory.wordKeys.length > 0,
  `key=${memory.keyExists} wordKeys=${JSON.stringify(memory.wordKeys)}`);

// ── 5. 连种 4 棵不弹；第 6 棵（计数 5）再弹 ───────────────────
const colsNoQuiz = [486.9, 580.3, 673.7, 767.1]; // col 3,4,5,6
let noQuizOk = true;
for (let i = 0; i < colsNoQuiz.length; i += 1) {
  const st = await clickLawn(page, colsNoQuiz[i], 410, false);
  if (st.quiz) noQuizOk = false;
}
record('E1.6 连种 4 棵不再弹（计数 1..4）', noQuizOk, 'plants=' + await plantsCount(page));

const s6 = await clickLawn(page, 860.5, 410, true); // col 7 → 计数 5
record('E1.7 第 6 棵（计数 5）再弹动态卡', s6.quiz, `plants=${s6.plants}`);
const dom6 = await page.evaluate(() => {
  const layer = document.querySelector('.quiz-gate');
  return { textMode: !!layer.querySelector('.quiz-gate-options-text'), opts: Array.from(layer.querySelectorAll('.quiz-gate-option')).map((b) => b.dataset.id) };
});
record('E1.7b 第 6 棵弹卡仍是拼音三选一', dom6.textMode && dom6.opts.length === 3, JSON.stringify(dom6.opts));
await shot(page, 'quiz-every-5th');

const quiz6 = await page.evaluate(() => window.WorkbenchGameBridge.drawLiteracyQuiz({ count: 1 })[0]);
await page.click(`.quiz-gate-option[data-id="${quiz6.pinyin}"]`);
const correctState = await page.evaluate(() => !!document.querySelector('.quiz-gate-option.is-correct'));
record('E1.8 答对项变绿 is-correct', correctState);
await page.waitForSelector('.quiz-gate', { state: 'detached', timeout: 3000 });
await sleep(200);
record('E1.8b 答对后种下（plants=6）', (await plantsCount(page)) === 6, 'plants=' + await plantsCount(page));

// ── 6. 断网兜底：题库脚本加载失败 → LearningDefenseCards 图卡 ──
// （bank 与页面同包，纯"断网"会让整页加载失败；最近真的资源失败 = bank 脚本请求被断，
//   故用 route-abort 精确模拟该请求失败，走生产兜底路径）
await ctx.route('**/*literacy-quiz-bank.js*', (route) => route.abort());
await page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForSelector('.stage-card:not([disabled])', { timeout: 15000 });
await grantPassIfNeeded(page);
await enterStage(page, 0);
const bankMissing = await page.evaluate(() => !window.LiteracyQuizBank);
record('E1.9 题库脚本请求被断（模拟断网）', bankMissing, 'LiteracyQuizBank=' + (bankMissing ? 'undefined' : 'present'));

const sf = await clickLawn(page, 393.5, 410, true);
record('E1.10 断网重试首棵：回退图卡', sf.quiz, `quiz=${sf.quiz} plants=${sf.plants}`);
const fallback = await page.evaluate(() => {
  const layer = document.querySelector('.quiz-gate');
  const prompt = layer.querySelector('.quiz-gate-prompt').textContent;
  const imgs = Array.from(layer.querySelectorAll('.quiz-gate-option img'));
  return {
    textMode: !!layer.querySelector('.quiz-gate-options-text'),
    imgCount: imgs.length,
    prompt,
    imgsLoaded: imgs.length > 0 && imgs.every((img) => img.complete && img.naturalWidth > 0)
  };
});
record('E1.10b 回退卡为图卡（LearningDefenseCards，3 图）', !fallback.textMode && fallback.imgCount === 3, `prompt=${fallback.prompt}`);
record('E1.10c 回退卡图片加载成功', fallback.imgsLoaded);
const card0 = await page.evaluate(() => window.LearningDefenseCards.cards[0]);
record('E1.10d 回退卡与 LearningDefenseCards 首位一致', fallback.prompt === card0.prompt, `expect=${card0.prompt}`);
await shot(page, 'fallback-card');

await page.click(`.quiz-gate-option[data-id="${card0.answer}"]`);
await page.waitForSelector('.quiz-gate', { state: 'detached', timeout: 3000 });
await sleep(200);
record('E1.10e 回退卡答对仍种下（plants=1）', (await plantsCount(page)) === 1, 'plants=' + await plantsCount(page));
await ctx.unroute('**/*literacy-quiz-bank.js*');

// ── 7. 收尾：storage key 审计 + 控制台错误 ────────────────────
const keysAfter = await page.evaluate(() => Object.keys(localStorage).sort());
const added = keysAfter.filter((k) => !keysBefore.includes(k));
const allowed = ['workbench:memory:v1', 'petbank_huchuliang_preschool_workbench_state_v1'];
const unknown = added.filter((k) => !allowed.includes(k));
record('E1.11 未新增 storage key', added.length === 0 || unknown.length === 0,
  `newKeys=${JSON.stringify(added)}`);

const realErrors = consoleLog.filter((m) => !/literacy-quiz-bank/.test(m) && !/Failed to load resource/.test(m));
record('E1.12 过程无异常控制台错误（除故意断开的 bank）', realErrors.length === 0, realErrors.slice(0, 5).join(' | '));

// ── 汇总 ────────────────────────────────────────────────────
const failed = results.filter((r) => !r.ok);
const summary = {
  url: page.url(),
  results,
  failed: failed.map((f) => f.name),
  total: results.length,
  pass: results.length - failed.length,
  consoleErrors: consoleLog,
  evidenceDir: EVIDENCE
};
fs.writeFileSync(path.join(EVIDENCE, 'e1-summary.json'), JSON.stringify(summary, null, 2), 'utf8');
console.log('\n==== E1 汇总：' + (results.length - failed.length) + '/' + results.length + ' PASS ====');
failed.forEach((f) => console.log('  FAIL: ' + f.name + ' :: ' + f.detail));
await browser.close();
process.exit(failed.length ? 1 : 0);