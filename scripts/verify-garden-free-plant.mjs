import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const PAGE = 'http://127.0.0.1:4180/prj/games/garden-defense/index.html?cb=20260814-lawn-bound-v1';
const KEY = 'petbank_huchuliang_preschool_workbench_state_v1';
const CHROME = process.env.CHROME_PATH
  || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = Number(process.env.CDP_PORT || 9224);

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
      await requestJson(url);
      return;
    } catch {
      await sleep(200);
    }
  }
  throw new Error(`CDP endpoint not ready: ${url}`);
}

const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-garden-plant-'));
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
  await waitFor(cdp, `Boolean(document.querySelector('.stage-card') && !document.querySelector('.stage-card').disabled)`);

  await cdp.evaluate(`document.querySelector('.stage-card').click()`);
  await waitFor(cdp, `Boolean(document.getElementById('world-canvas') && !document.getElementById('panel-play').classList.contains('is-hidden'))`);

  await cdp.evaluate(`(() => {
    const bridge = window.WorkbenchGameBridge;
    const state = bridge.readState();
    state.growth.sunlight = Math.max(80, Number(state.growth.sunlight) || 0);
    bridge.writeState(state);
  })()`);

  const planted = await cdp.evaluate(`(() => {
    const canvas = document.getElementById('world-canvas');
    const rect = canvas.getBoundingClientRect();
    const left = Math.round(canvas.width * 0.125);
    const top = Math.round(canvas.height * 0.375);
    const right = Math.round(canvas.width * 0.855);
    const width = right - left;
    const height = (canvas.height - 6) - top;
    function clickLawn(nx, ny) {
      const clientX = rect.left + (left + nx * width) * (rect.width / canvas.width);
      const clientY = rect.top + (top + ny * height) * (rect.height / canvas.height);
      canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX, clientY, bubbles: true }));
    }
    clickLawn(0.22, 0.5);
    clickLawn(0.58, 0.5);
    clickLawn(0.24, 0.5);
    const raw = localStorage.getItem(${JSON.stringify(KEY)});
    const state = raw ? JSON.parse(raw) : null;
    const plants = state && state.growth && state.growth.garden && state.growth.garden.defense
      ? state.growth.garden.defense.plants
      : [];
    const tip = document.getElementById('message-tip')?.textContent || '';
    const hasGridDraw = false;
    return {
      plantCount: plants.length,
      xs: plants.map((p) => p.x),
      lanes: plants.map((p) => p.lane),
      tip,
      canvasW: canvas.width,
      canvasH: canvas.height
    };
  })()`);

  if (planted.plantCount !== 2) {
    throw new Error(`expected 2 free-lawn plants, got ${JSON.stringify(planted)}`);
  }
  if (Math.abs(planted.xs[0] - 0.22) > 0.03 || Math.abs(planted.xs[1] - 0.58) > 0.03) {
    throw new Error(`plants did not keep free x: ${JSON.stringify(planted)}`);
  }
  if (planted.lanes.some((lane) => lane !== 2)) {
    throw new Error(`plants not on same lane: ${JSON.stringify(planted)}`);
  }

  console.log(JSON.stringify({ ok: true, planted }, null, 2));
} finally {
  if (cdp) cdp.close();
  chrome.kill();
}
