import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const PAGE = process.env.GARDEN_PAGE
    || 'http://127.0.0.1:4180/prj/games/garden-defense/index.html';
const CHROME = process.env.CHROME_PATH
    || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = Number(process.env.CDP_PORT || 9232);
const OUTPUT_DIR = path.resolve('_tmp_mobile_preview');
const VIEWPORTS = [
    { width: 800, height: 260, name: '800x260' },
    { width: 800, height: 360, name: '800x360' },
    { width: 915, height: 412, name: '915x412' },
    { width: 1463, height: 616, name: '1463x616-mumu' }
];

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
                catch (error) { reject(new Error(`JSON parse failed for ${url}: ${body.slice(0, 160)}`)); }
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
            if (!message.id || !this.pending.has(message.id)) return;
            const pending = this.pending.get(message.id);
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
        const result = await this.send('Runtime.evaluate', {
            expression,
            awaitPromise: true,
            returnByValue: true
        });
        if (result.exceptionDetails) {
            throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'evaluate failed');
        }
        return result.result?.value;
    }

    close() {
        if (this.ws) this.ws.close();
    }
}

async function waitHttp(url, timeoutMs = 10000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
        try {
            await requestJson(url);
            return;
        } catch {
            await sleep(150);
        }
    }
    throw new Error(`CDP endpoint not ready: ${url}`);
}

async function waitFor(cdp, expression, timeoutMs = 15000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
        try {
            if (await cdp.evaluate(expression)) return;
        } catch {
            // The page can briefly replace its execution context while navigating.
        }
        await sleep(150);
    }
    throw new Error(`timed out waiting for: ${expression}`);
}

function assertSnapshot(snapshot, viewport) {
    const tolerance = 2;
    if (!snapshot.nativeClass) throw new Error(`${viewport.name}: native Android class missing`);
    if (snapshot.verticalOverflow > tolerance) {
        throw new Error(`${viewport.name}: page vertically overflows by ${snapshot.verticalOverflow}px`);
    }
    if (snapshot.bodyOverflow !== 'hidden') {
        throw new Error(`${viewport.name}: body overflow is ${snapshot.bodyOverflow}`);
    }
    if (!snapshot.firstScreenFits) {
        throw new Error(`${viewport.name}: a required battle control is outside the first screen`);
    }
    if (Math.abs(snapshot.canvasRatio - 1280 / 540) > 0.03) {
        throw new Error(`${viewport.name}: canvas ratio is ${snapshot.canvasRatio}`);
    }
    if (snapshot.canvas.height < Math.min(240, viewport.height * 0.7)) {
        throw new Error(`${viewport.name}: canvas is unexpectedly small (${snapshot.canvas.height}px high)`);
    }
}

const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'garden-android-layout-'));
const chrome = spawn(CHROME, [
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profileDir}`,
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
    const target = await requestJson(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent('about:blank')}`, 'PUT');
    cdp = new Cdp(target.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
        source: `window.Capacitor = {
            getPlatform: function () { return 'android'; },
            isNativePlatform: function () { return true; }
        };
        try { localStorage.clear(); } catch (error) {}`
    });

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    const results = [];
    for (const viewport of VIEWPORTS) {
        await cdp.send('Emulation.setDeviceMetricsOverride', {
            width: viewport.width,
            height: viewport.height,
            deviceScaleFactor: 1,
            mobile: true,
            screenWidth: viewport.width,
            screenHeight: viewport.height,
            screenOrientation: { type: 'landscapePrimary', angle: 90 }
        });
        await cdp.send('Page.navigate', { url: `${PAGE}?layout-check=${viewport.name}-${Date.now()}` });
        await waitFor(cdp, `Boolean(document.querySelector('.stage-card') && document.documentElement.classList.contains('is-android-app'))`);
        const mapSnapshot = await cdp.evaluate(`(() => {
            const panel = document.getElementById('panel-map').getBoundingClientRect();
            const cards = Array.from(document.querySelectorAll('.stage-card')).map((node) => {
                const box = node.getBoundingClientRect();
                return { left: box.left, top: box.top, right: box.right, bottom: box.bottom };
            });
            return {
                cardCount: cards.length,
                cardsFit: cards.every((box) => box.left >= panel.left - 1 && box.top >= panel.top - 1 && box.right <= panel.right + 1 && box.bottom <= panel.bottom + 1),
                verticalOverflow: Math.max(0, Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - document.documentElement.clientHeight),
                panel: { left: panel.left, top: panel.top, right: panel.right, bottom: panel.bottom, width: panel.width, height: panel.height }
            };
        })()`);
        if (mapSnapshot.cardCount !== 18 || !mapSnapshot.cardsFit || mapSnapshot.verticalOverflow > 2) {
            throw new Error(`${viewport.name}: stage chooser failed ${JSON.stringify(mapSnapshot)}`);
        }
        const mapScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
        fs.writeFileSync(path.join(OUTPUT_DIR, `garden-android-map-${viewport.name}.png`), Buffer.from(mapScreenshot.data, 'base64'));
        await cdp.evaluate(`document.querySelector('.stage-card:not(.is-locked)').click()`);
        await waitFor(cdp, `Boolean(!document.getElementById('panel-play').classList.contains('is-hidden'))`);
        await sleep(250);

        const snapshot = await cdp.evaluate(`(() => {
            const rect = (selector) => {
                const node = document.querySelector(selector);
                if (!node) return null;
                const box = node.getBoundingClientRect();
                return { left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: box.width, height: box.height };
            };
            const required = ['#world-canvas', '#seed-tray', '#spawn-btn', '#restart-btn', '[data-play-page="battle"]', '[data-play-page="guide"]'];
            const boxes = required.map(rect);
            const canvas = rect('#world-canvas');
            const rootHeight = document.documentElement.clientHeight;
            const scrollHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
            return {
                nativeClass: document.documentElement.classList.contains('is-android-app'),
                viewport: { width: innerWidth, height: innerHeight },
                bodyOverflow: getComputedStyle(document.body).overflow,
                verticalOverflow: Math.max(0, scrollHeight - rootHeight),
                firstScreenFits: boxes.every((box) => box && box.left >= -1 && box.top >= -1 && box.right <= innerWidth + 1 && box.bottom <= innerHeight + 1),
                canvas,
                canvasRatio: canvas.width / canvas.height,
                seedTray: rect('#seed-tray'),
                header: rect('.world-bar'),
                pager: { width: document.getElementById('play-pager').clientWidth, scrollLeft: document.getElementById('play-pager').scrollLeft }
            };
        })()`);
        assertSnapshot(snapshot, viewport);

        await cdp.evaluate(`document.querySelector('[data-play-page="guide"]').click()`);
        await waitFor(cdp, `(() => {
            const pager = document.getElementById('play-pager');
            return Math.abs(pager.scrollLeft - (pager.scrollWidth - pager.clientWidth)) <= 4;
        })()`);
        const guide = await cdp.evaluate(`(() => {
            const pager = document.getElementById('play-pager');
            const box = document.getElementById('play-page-guide').getBoundingClientRect();
            return {
                selected: document.querySelector('[data-play-page="guide"]').getAttribute('aria-selected'),
                scrollLeft: pager.scrollLeft,
                expectedLeft: pager.scrollWidth - pager.clientWidth,
                visible: box.left >= -2 && box.right <= innerWidth + 2 && box.top >= -2 && box.bottom <= innerHeight + 2,
                contentFits: Array.from(document.querySelectorAll('#play-page-guide > *')).every((node) => {
                    if (getComputedStyle(node).display === 'none') return true;
                    const child = node.getBoundingClientRect();
                    return child.left >= -2 && child.right <= innerWidth + 2 && child.top >= -2 && child.bottom <= innerHeight + 2;
                }),
                verticalOverflow: Math.max(0, Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - document.documentElement.clientHeight)
            };
        })()`);
        if (guide.selected !== 'true' || !guide.visible || !guide.contentFits || Math.abs(guide.scrollLeft - guide.expectedLeft) > 4 || guide.verticalOverflow > 2) {
            throw new Error(`${viewport.name}: guide page failed ${JSON.stringify(guide)}`);
        }

        const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
        fs.writeFileSync(path.join(OUTPUT_DIR, `garden-android-guide-${viewport.name}.png`), Buffer.from(screenshot.data, 'base64'));
        await cdp.evaluate(`document.querySelector('[data-play-page="battle"]').click()`);
        await waitFor(cdp, `Math.abs(document.getElementById('play-pager').scrollLeft) <= 4`);
        const battleScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
        fs.writeFileSync(path.join(OUTPUT_DIR, `garden-android-battle-${viewport.name}.png`), Buffer.from(battleScreenshot.data, 'base64'));
        results.push({ viewport: viewport.name, map: mapSnapshot, battle: snapshot, guide });
    }

    cdp.close();
    cdp = null;

    const webTarget = await requestJson(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent('about:blank')}`, 'PUT');
    cdp = new Cdp(webTarget.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
        source: `try { localStorage.clear(); } catch (error) {}`
    });
    await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: 390,
        height: 844,
        deviceScaleFactor: 1,
        mobile: true,
        screenWidth: 390,
        screenHeight: 844,
        screenOrientation: { type: 'portraitPrimary', angle: 0 }
    });
    await cdp.send('Page.navigate', { url: `${PAGE}?layout-check=web-portrait-${Date.now()}` });
    await waitFor(cdp, `Boolean(document.querySelector('.stage-card'))`);
    await cdp.evaluate(`document.querySelector('.stage-card:not(.is-locked)').click()`);
    await waitFor(cdp, `Boolean(!document.getElementById('panel-play').classList.contains('is-hidden'))`);
    await sleep(250);
    const webPortrait = await cdp.evaluate(`(() => {
        const canvas = document.getElementById('world-canvas').getBoundingClientRect();
        const pageSwitch = document.querySelector('.play-page-switch');
        return {
            nativeClass: document.documentElement.classList.contains('is-android-app'),
            viewport: { width: innerWidth, height: innerHeight },
            bodyOverflow: getComputedStyle(document.body).overflow,
            pageSwitchDisplay: getComputedStyle(pageSwitch).display,
            horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
            verticalOverflow: Math.max(0, document.documentElement.scrollHeight - document.documentElement.clientHeight),
            canvas: { left: canvas.left, top: canvas.top, right: canvas.right, bottom: canvas.bottom, width: canvas.width, height: canvas.height }
        };
    })()`);
    if (webPortrait.nativeClass || webPortrait.bodyOverflow === 'hidden' || webPortrait.pageSwitchDisplay !== 'none' || webPortrait.horizontalOverflow > 2) {
        throw new Error(`web portrait mode changed unexpectedly: ${JSON.stringify(webPortrait)}`);
    }
    const webScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    fs.writeFileSync(path.join(OUTPUT_DIR, 'garden-web-portrait-390x844.png'), Buffer.from(webScreenshot.data, 'base64'));

    console.log(JSON.stringify({ ok: true, results, webPortrait }, null, 2));
} finally {
    if (cdp) cdp.close();
    chrome.kill();
}
