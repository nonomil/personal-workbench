import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const baseUrl = process.env.WORKBENCH_BASE_URL || 'http://127.0.0.1:4180/prj';
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = Number(process.env.CDP_PORT || 9241);

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
async function json(url, options) { return await (await fetch(url, options)).json(); }

class Cdp {
    constructor(url) { this.url = url; this.seq = 0; this.pending = new Map(); }
    async connect() {
        this.ws = new WebSocket(this.url);
        await new Promise((resolve, reject) => {
            this.ws.addEventListener('open', resolve, { once: true });
            this.ws.addEventListener('error', reject, { once: true });
        });
        this.ws.addEventListener('message', (event) => {
            const message = JSON.parse(String(event.data));
            const pending = this.pending.get(message.id);
            if (!pending) return;
            this.pending.delete(message.id);
            if (message.error) pending.reject(new Error(JSON.stringify(message.error)));
            else pending.resolve(message.result);
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
        const result = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
        if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'evaluate failed');
        return result.result?.value;
    }
    close() { this.ws?.close(); }
}

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'workbench-android-diagnose-'));
const chrome = spawn(chromePath, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-extensions', 'about:blank'
], { stdio: 'ignore' });

let cdp;
try {
    const started = Date.now();
    let version;
    while (!version && Date.now() - started < 10000) {
        try { version = await json(`http://127.0.0.1:${port}/json/version`); } catch { await sleep(150); }
    }
    if (!version) throw new Error('Chrome CDP did not start');
    const target = await json(`http://127.0.0.1:${port}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' });
    cdp = new Cdp(target.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    const diagnosticWidth = Number(process.env.WORKBENCH_DIAG_WIDTH || 800);
    const diagnosticHeight = Number(process.env.WORKBENCH_DIAG_HEIGHT || 360);
    await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: diagnosticWidth, height: diagnosticHeight, deviceScaleFactor: 1, mobile: true,
        screenWidth: diagnosticWidth, screenHeight: diagnosticHeight,
        screenOrientation: { type: 'landscapePrimary', angle: 90 }
    });
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
        source: `window.Capacitor = { getPlatform: () => 'android', isNativePlatform: () => true }; try { localStorage.clear(); } catch {}`
    });
    const diagnosticRoute = process.env.WORKBENCH_DIAG_ROUTE || 'overview';
    await cdp.send('Page.navigate', { url: `${baseUrl}/preschool-workbench/index.html?diagnose=${Date.now()}&theme=garden-defense#${diagnosticRoute}` });
    const ready = Date.now();
    while (Date.now() - ready < 15000) {
        if (await cdp.evaluate(`Boolean(document.querySelector('.preschool-native-page') && document.documentElement.classList.contains('is-android-app'))`)) break;
        await sleep(150);
    }
    await sleep(250);
    const report = await cdp.evaluate(`(() => {
        const describe = (node, selector) => {
            const box = node.getBoundingClientRect();
            const style = getComputedStyle(node);
            return {
                selector, tag: node.tagName, className: String(node.className || ''),
                rect: { x: box.x, y: box.y, width: box.width, height: box.height, bottom: box.bottom },
                scrollHeight: node.scrollHeight, clientHeight: node.clientHeight,
                overflowY: node.scrollHeight - node.clientHeight,
                display: style.display, position: style.position, height: style.height,
                minHeight: style.minHeight, gridTemplateRows: style.gridTemplateRows,
                padding: style.padding, gap: style.gap,
                margin: style.margin,
                pseudoBefore: { content: getComputedStyle(node, '::before').content, height: getComputedStyle(node, '::before').height, display: getComputedStyle(node, '::before').display },
                pseudoAfter: { content: getComputedStyle(node, '::after').content, height: getComputedStyle(node, '::after').height, display: getComputedStyle(node, '::after').display }
            };
        };
        return Array.from(document.querySelectorAll('.preschool-native-page')).map((page) => {
            const candidates = [page, ...page.querySelectorAll('.preschool-native-frame, .preschool-flashcard-page, .preschool-flashcard-top, .preschool-flashcard, .preschool-flashcard-main, .preschool-flashcard-rows, .preschool-flashcard-cover, .preschool-flashcard-toolbar, .preschool-flashcard-actions, .preschool-flashcard-foot, .preschool-home-overview, .preschool-home-top, .preschool-home-hero, .preschool-home-hero-card, .preschool-home-hero-copy, .preschool-home-hero-art, .child-game-companion-panel, .preschool-home-battlefield, .preschool-home-lanes, .preschool-home-lane, .preschool-home-exits')];
            const frame = page.querySelector('.preschool-native-frame');
            const flashcard = page.querySelector('.preschool-flashcard-page');
            return {
                kind: page.dataset.nativeKind,
                frameChildren: frame ? Array.from(frame.children).map((node) => describe(node, '.' + Array.from(node.classList).join('.'))) : [],
                flashcardChildren: flashcard ? Array.from(flashcard.children).map((node) => describe(node, '.' + Array.from(node.classList).join('.'))) : [],
                candidates: candidates.map((node) => describe(node, node === page ? '.preschool-native-page' : '.' + Array.from(node.classList).join('.')))
            };
        });
    })()`);
    console.log(JSON.stringify(report, null, 2));
} finally {
    cdp?.close();
    chrome.kill();
}
