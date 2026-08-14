import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const PAGE = 'http://127.0.0.1:4180/prj/preschool-workbench/index.html?cb=20260813-real-workflow-card-v1#overview';
const KEY = 'petbank_huchuliang_preschool_workbench_state_v1';
const CHROME = process.env.CHROME_PATH
  || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = Number(process.env.CDP_PORT || 9223);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestJson(url, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (error) { reject(new Error(`JSON parse failed for ${url}: ${body.slice(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function getJson(url) {
  return requestJson(url, 'GET');
}

class Cdp {
  constructor(url) {
    this.url = url;
    this.seq = 0;
    this.pending = new Map();
    this.ws = null;
  }

  async connect() {
    this.ws = new WebSocket(this.url);
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
    this.ws.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(JSON.stringify(message.error)));
        else resolve(message.result);
      }
    });
  }

  send(method, params = {}) {
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    if (result.exceptionDetails) {
      const detail = result.exceptionDetails.exception && result.exceptionDetails.exception.description
        ? result.exceptionDetails.exception.description
        : (result.exceptionDetails.text || 'evaluate failed');
      throw new Error(detail);
    }
    return result.result ? result.result.value : undefined;
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function waitFor(cdp, expression, timeoutMs = 20000) {
  const started = Date.now();
  let lastError = '';
  while (Date.now() - started < timeoutMs) {
    try {
      const value = await cdp.evaluate(expression);
      if (value) return value;
    } catch (error) {
      lastError = String(error.message || error);
    }
    await sleep(250);
  }
  throw new Error(`timed out waiting for: ${expression}; last=${lastError}`);
}

async function waitHttp(url, timeoutMs = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      await getJson(url);
      return;
    } catch {
      await sleep(200);
    }
  }
  throw new Error(`CDP endpoint not ready: ${url}`);
}

const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-workflow-'));
const chrome = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${userData}`,
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-extensions',
  'about:blank'
], { stdio: 'ignore' });

let cdp;
try {
  await waitHttp(`http://127.0.0.1:${PORT}/json/version`);
  const created = await requestJson(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(PAGE)}`, 'PUT');
  const wsUrl = created.webSocketDebuggerUrl;
  if (!wsUrl) throw new Error(`no page websocket: ${JSON.stringify(created)}`);
  cdp = new Cdp(wsUrl);
  await cdp.connect();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Page.navigate', { url: PAGE });
  await waitFor(cdp, `Boolean(document.querySelector('.preschool-home-workflow-card'))`);
  await cdp.evaluate(`localStorage.removeItem(${JSON.stringify(KEY)}); location.reload();`);
  await waitFor(cdp, `Boolean(document.querySelector('.preschool-home-workflow-card'))`);

  const before = await cdp.evaluate(`({
    text: document.querySelector('.preschool-home-workflow-card')?.innerText || '',
    action: document.querySelector('.preschool-home-workflow-card')?.getAttribute('data-action') || '',
    id: document.querySelector('.preschool-home-workflow-card')?.getAttribute('data-id') || ''
  })`);
  if (!before.text.includes('朗读一首古诗') || before.action !== 'open-plan-practice') {
    throw new Error(`unexpected workflow card before practice: ${JSON.stringify(before)}`);
  }

  await cdp.evaluate(`document.querySelector('.preschool-home-workflow-card').click()`);
  await waitFor(cdp, `Boolean(document.querySelector('.lesson-dialog-option'))`);
  await cdp.evaluate(`document.querySelectorAll('.lesson-dialog-option')[0].click()`);
  await waitFor(cdp, `(() => { const btn = document.querySelector('[data-action="lesson-finish"]'); return Boolean(btn && !btn.disabled); })()`);
  await cdp.evaluate(`document.querySelector('[data-action="lesson-finish"]').click()`);
  await waitFor(cdp, `(() => { const dialog = document.querySelector('dialog.lesson-dialog'); const card = document.querySelector('.preschool-home-workflow-card'); return Boolean(card && (!dialog || !dialog.open)); })()`);

  const after = await cdp.evaluate(`(() => {
    const raw = localStorage.getItem(${JSON.stringify(KEY)});
    const state = raw ? JSON.parse(raw) : null;
    const plan = state && Array.isArray(state.dailyPlans)
      ? state.dailyPlans.find((item) => item.id === 'preschool-plan-count')
      : null;
    const awarded = state && state.growth && Array.isArray(state.growth.awardedIds)
      ? state.growth.awardedIds
      : [];
    return {
      card: document.querySelector('.preschool-home-workflow-card')?.innerText || '',
      done: Boolean(plan && plan.done),
      source: plan ? plan.completionSource : '',
      awarded: awarded.includes('lesson:preschool-poetry-1'),
      sunlight: state && state.growth ? state.growth.sunlight : null
    };
  })()`);
  if (!after.done || after.source !== 'practice' || !after.awarded) {
    throw new Error(`practice did not persist: ${JSON.stringify(after)}`);
  }

  await cdp.evaluate(`location.reload()`);
  await waitFor(cdp, `Boolean(document.querySelector('.preschool-home-workflow-card'))`);
  const reloaded = await cdp.evaluate(`(() => {
    const raw = localStorage.getItem(${JSON.stringify(KEY)});
    const state = raw ? JSON.parse(raw) : null;
    const plan = state && Array.isArray(state.dailyPlans)
      ? state.dailyPlans.find((item) => item.id === 'preschool-plan-count')
      : null;
    return {
      card: document.querySelector('.preschool-home-workflow-card')?.innerText || '',
      source: plan ? plan.completionSource : '',
      done: Boolean(plan && plan.done)
    };
  })()`);
  if (!reloaded.done || reloaded.source !== 'practice') {
    throw new Error(`refresh lost practice evidence: ${JSON.stringify(reloaded)}`);
  }
  if (reloaded.card.includes('下一步：朗读一首古诗') || !reloaded.card.includes('数学闯关')) {
    throw new Error(`workflow card did not advance after practice: ${JSON.stringify(reloaded)}`);
  }

  console.log(JSON.stringify({
    ok: true,
    before,
    after,
    reloaded
  }, null, 2));
} finally {
  if (cdp) cdp.close();
  chrome.kill();
}
