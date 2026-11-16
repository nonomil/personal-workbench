import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const BASE_URL = process.env.WORKBENCH_BASE_URL || 'http://127.0.0.1:4180/prj';
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = Number(process.env.CDP_PORT || 9234);
const OUTPUT_DIR = path.resolve('_tmp_mobile_preview');
const VIEWPORTS = [
    { width: 1080, height: 608, name: '1080x608' },
    { width: 1440, height: 810, name: '1440x810' },
    { width: 1463, height: 640, name: '1463x640-mumu-css' }
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
                catch { reject(new Error(`JSON parse failed for ${url}: ${body.slice(0, 160)}`)); }
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

async function waitFor(cdp, expression, timeoutMs = 20000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
        try {
            if (await cdp.evaluate(expression)) return;
        } catch {
            // Navigation briefly replaces the execution context.
        }
        await sleep(150);
    }
    throw new Error(`timed out waiting for: ${expression}`);
}

async function screenshot(cdp, name) {
    const result = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    fs.writeFileSync(path.join(OUTPUT_DIR, name), Buffer.from(result.data, 'base64'));
}

async function setViewport(cdp, viewport, portrait = false) {
    await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1,
        mobile: true,
        screenWidth: viewport.width,
        screenHeight: viewport.height,
        screenOrientation: { type: portrait ? 'portraitPrimary' : 'landscapePrimary', angle: portrait ? 0 : 90 }
    });
}

async function inspectLauncher(cdp) {
    return cdp.evaluate(`(() => {
        const pager = document.querySelector('.launcher-app-pager');
        const pages = Array.from(document.querySelectorAll('.launcher-app-page'));
        const rootHeight = document.documentElement.clientHeight;
        const scrollHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
        const pagerBox = pager.getBoundingClientRect();
        const controls = Array.from(document.querySelectorAll('.launcher-page-switch button')).map((node) => {
            const box = node.getBoundingClientRect();
            return { width: box.width, height: box.height };
        });
        return {
            nativeClass: document.documentElement.classList.contains('is-android-app'),
            bodyOverflow: getComputedStyle(document.body).overflow,
            verticalOverflow: Math.max(0, scrollHeight - rootHeight),
            pageCount: pages.length,
            pager: { width: pager.clientWidth, height: pager.clientHeight, scrollWidth: pager.scrollWidth, left: pagerBox.left, top: pagerBox.top, right: pagerBox.right, bottom: pagerBox.bottom },
            pagesFitVertically: pages.every((page) => {
                const box = page.getBoundingClientRect();
                return box.top >= pagerBox.top - 2 && box.bottom <= pagerBox.bottom + 2 && page.scrollHeight <= page.clientHeight + 2;
            }),
            controlsAreTouchable: controls.every((box) => box.width >= 43 && box.height >= 43)
        };
    })()`);
}

function assertLauncher(snapshot, viewport) {
    if (!snapshot.nativeClass || snapshot.bodyOverflow !== 'hidden') {
        throw new Error(`${viewport.name} launcher is not in native fullscreen: ${JSON.stringify(snapshot)}`);
    }
    if (snapshot.verticalOverflow > 2 || snapshot.pageCount !== 2 || !snapshot.pagesFitVertically || !snapshot.controlsAreTouchable) {
        throw new Error(`${viewport.name} launcher layout failed: ${JSON.stringify(snapshot)}`);
    }
}

async function inspectWorkbench(cdp) {
    return cdp.evaluate(`(() => {
        const pager = document.querySelector('.preschool-native-pager');
        const pages = Array.from(document.querySelectorAll('.preschool-native-page'));
        const rail = document.querySelector('.preschool-mobile-nav');
        const switcher = document.querySelector('.preschool-native-page-switch');
        const pagerBox = pager.getBoundingClientRect();
        const railBox = rail.getBoundingClientRect();
        const switcherBox = switcher ? switcher.getBoundingClientRect() : null;
        const containers = pages.map((page) => {
            const candidates = [page].concat(Array.from(page.querySelectorAll('.preschool-native-frame, .preschool-home-battlefield, .preschool-home-lanes, .preschool-course-wall, .preschool-course-wall-card, .preschool-course-today, .preschool-flashcard-page, .english-dashboard')));
            return {
                kind: page.dataset.nativeKind,
                pageOverflow: Math.max(0, page.scrollHeight - page.clientHeight),
                nestedOverflow: Math.max(0, ...candidates.map((node) => node.scrollHeight - node.clientHeight))
            };
        });
        const controls = Array.from(document.querySelectorAll('.preschool-native-page-switch button, .preschool-mobile-nav button')).map((node) => {
            const box = node.getBoundingClientRect();
            return { width: box.width, height: box.height, visible: box.width > 0 && box.height > 0 };
        });
        const rootHeight = document.documentElement.clientHeight;
        const scrollHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
        return {
            nativeClass: document.documentElement.classList.contains('is-android-app'),
            bodyOverflow: getComputedStyle(document.body).overflow,
            verticalOverflow: Math.max(0, scrollHeight - rootHeight),
            pageCount: pages.length,
            pager: { width: pager.clientWidth, height: pager.clientHeight, scrollWidth: pager.scrollWidth, top: pagerBox.top, bottom: pagerBox.bottom },
            switcher: switcher ? {
                display: getComputedStyle(switcher).display,
                zIndex: getComputedStyle(switcher).zIndex,
                opacity: getComputedStyle(switcher).opacity,
                visibility: getComputedStyle(switcher).visibility,
                rect: { top: switcherBox.top, bottom: switcherBox.bottom, width: switcherBox.width, height: switcherBox.height },
                visible: switcherBox.width > 0 && switcherBox.height > 0 && switcherBox.bottom <= innerHeight + 2
            } : null,
            pagesFitVertically: pages.every((page) => {
                const box = page.getBoundingClientRect();
                return box.top >= pagerBox.top - 2 && box.bottom <= pagerBox.bottom + 2;
            }),
            containers,
            rail: { display: getComputedStyle(rail).display, width: railBox.width, height: railBox.height, rows: getComputedStyle(rail).gridTemplateRows },
            controlsAreTouchable: controls.every((box) => !box.visible || (box.width >= 43 && box.height >= 43))
        };
    })()`);
}

function assertWorkbench(snapshot, viewport, route, expectedMinPages) {
    const worstOverflow = Math.max(0, ...snapshot.containers.map((entry) => entry.nestedOverflow));
    if (!snapshot.nativeClass || snapshot.bodyOverflow !== 'hidden' || snapshot.verticalOverflow > 2) {
        throw new Error(`${viewport.name} ${route} is not fullscreen: ${JSON.stringify(snapshot)}`);
    }
    if (snapshot.pageCount < expectedMinPages || !snapshot.pagesFitVertically || worstOverflow > 3) {
        throw new Error(`${viewport.name} ${route} pagination failed: ${JSON.stringify(snapshot)}`);
    }
    if (!['grid', 'flex'].includes(snapshot.rail.display) || snapshot.rail.width < 140 || snapshot.rail.height < viewport.height - 2 || !snapshot.controlsAreTouchable) {
        throw new Error(`${viewport.name} ${route} navigation rail failed: ${JSON.stringify(snapshot)}`);
    }
}

async function navigate(cdp, url, readyExpression) {
    await cdp.send('Page.navigate', { url });
    await waitFor(cdp, readyExpression);
    await sleep(180);
}

async function showLastPage(cdp, selector) {
    await cdp.evaluate(`(() => {
        const pager = document.querySelector(${JSON.stringify(selector)});
        pager.scrollTo({ left: pager.scrollWidth - pager.clientWidth, behavior: 'auto' });
    })()`);
    await waitFor(cdp, `(() => {
        const pager = document.querySelector(${JSON.stringify(selector)});
        return Math.abs(pager.scrollLeft - (pager.scrollWidth - pager.clientWidth)) <= 4;
    })()`);
}

async function showPage(cdp, selector, index) {
    await cdp.evaluate(`(() => {
        const pager = document.querySelector(${JSON.stringify(selector)});
        const target = Math.min(pager.scrollWidth - pager.clientWidth, ${Number(index)} * pager.clientWidth);
        pager.scrollTo({ left: target, behavior: 'auto' });
    })()`);
    await waitFor(cdp, `(() => {
        const pager = document.querySelector(${JSON.stringify(selector)});
        const target = Math.min(pager.scrollWidth - pager.clientWidth, ${Number(index)} * pager.clientWidth);
        return Math.abs(pager.scrollLeft - target) <= 4;
    })()`);
}

async function captureCourseRoute(cdp, workbenchUrl, viewport, courseId, label) {
    await navigate(cdp, `${workbenchUrl}#courses?course=${encodeURIComponent(courseId)}`, `location.hash.includes(${JSON.stringify(courseId)}) && Boolean(document.querySelector('.preschool-flashcard-page'))`);
    const snapshot = await inspectWorkbench(cdp);
    assertWorkbench(snapshot, viewport, label, 1);
    await screenshot(cdp, `workbench-android-${label}-1-${viewport.name}.png`);
    if (snapshot.pageCount > 1) {
        await showPage(cdp, '.preschool-native-pager', 1);
        await screenshot(cdp, `workbench-android-${label}-2-${viewport.name}.png`);
    }
    if (snapshot.pageCount > 2) {
        await showLastPage(cdp, '.preschool-native-pager');
        await screenshot(cdp, `workbench-android-${label}-last-${viewport.name}.png`);
    }
    return snapshot;
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workbench-android-layout-'));
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

    const results = [];
    for (const viewport of VIEWPORTS) {
        await setViewport(cdp, viewport);

        await navigate(cdp, `${BASE_URL}/index.html?layout-check=${viewport.name}-${Date.now()}`, `Boolean(document.querySelector('.launcher-app-pager') && document.documentElement.classList.contains('is-android-app'))`);
        const launcher = await inspectLauncher(cdp);
        assertLauncher(launcher, viewport);
        await screenshot(cdp, `launcher-android-worlds-${viewport.name}.png`);
        await cdp.evaluate(`document.querySelector('[data-launcher-page="1"]').click()`);
        await waitFor(cdp, `(() => { const p = document.querySelector('.launcher-app-pager'); return Math.abs(p.scrollLeft - (p.scrollWidth - p.clientWidth)) <= 4; })()`);
        await screenshot(cdp, `launcher-android-workbenches-${viewport.name}.png`);

        const workbenchUrl = `${BASE_URL}/preschool-workbench/index.html?theme=garden-defense`;
        await navigate(cdp, `${workbenchUrl}#overview`, `document.querySelectorAll('.preschool-native-page').length >= 2`);
        const overview = await inspectWorkbench(cdp);
        assertWorkbench(overview, viewport, 'overview', 2);
        await screenshot(cdp, `workbench-android-overview-1-${viewport.name}.png`);
        await showLastPage(cdp, '.preschool-native-pager');
        await screenshot(cdp, `workbench-android-overview-2-${viewport.name}.png`);

        await navigate(cdp, `${workbenchUrl}#courses`, `document.querySelectorAll('.preschool-native-page').length >= 3`);
        const courses = await inspectWorkbench(cdp);
        assertWorkbench(courses, viewport, 'courses', 3);
        if (courses.containers[0]?.kind !== 'courses-wall') {
            throw new Error(`${viewport.name} courses must open on the learning wall: ${JSON.stringify(courses)}`);
        }
        await screenshot(cdp, `workbench-android-courses-1-${viewport.name}.png`);
        await showPage(cdp, '.preschool-native-pager', 1);
        await screenshot(cdp, `workbench-android-courses-2-${viewport.name}.png`);
        await showLastPage(cdp, '.preschool-native-pager');
        await screenshot(cdp, `workbench-android-courses-last-${viewport.name}.png`);

        await navigate(cdp, `${workbenchUrl}#courses?course=preschool-english`, `document.querySelectorAll('.preschool-native-page').length >= 3`);
        const english = await inspectWorkbench(cdp);
        assertWorkbench(english, viewport, 'english', 3);
        await screenshot(cdp, `workbench-android-english-1-${viewport.name}.png`);
        await showPage(cdp, '.preschool-native-pager', 1);
        await screenshot(cdp, `workbench-android-english-2-${viewport.name}.png`);

        const literacy = await captureCourseRoute(cdp, workbenchUrl, viewport, 'preschool-literacy', 'literacy');
        const pinyin = await captureCourseRoute(cdp, workbenchUrl, viewport, 'preschool-pinyin', 'pinyin');
        const phonics = await captureCourseRoute(cdp, workbenchUrl, viewport, 'preschool-phonics', 'phonics');

        results.push({ viewport: viewport.name, launcher, overview, courses, literacy, pinyin, phonics, english });
    }

    cdp.close();
    cdp = null;

    const portraitTarget = await requestJson(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent('about:blank')}`, 'PUT');
    cdp = new Cdp(portraitTarget.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await setViewport(cdp, { width: 390, height: 844 }, true);
    await navigate(cdp, `${BASE_URL}/preschool-workbench/index.html?theme=garden-defense#courses`, `Boolean(document.querySelector('.preschool-course-wall'))`);
    const portrait = await cdp.evaluate(`(() => ({
        nativeClass: document.documentElement.classList.contains('is-android-app'),
        bodyOverflow: getComputedStyle(document.body).overflow,
        horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
        verticalOverflow: Math.max(0, document.documentElement.scrollHeight - document.documentElement.clientHeight),
        pagerDisplay: document.querySelector('.preschool-native-pager') ? getComputedStyle(document.querySelector('.preschool-native-pager')).display : 'missing'
    }))()`);
    if (portrait.nativeClass || portrait.bodyOverflow === 'hidden' || portrait.horizontalOverflow > 2 || portrait.verticalOverflow < 20) {
        throw new Error(`web portrait natural scrolling changed: ${JSON.stringify(portrait)}`);
    }
    await screenshot(cdp, 'workbench-web-portrait-courses-390x844.png');

    console.log(JSON.stringify({ ok: true, results, portrait }, null, 2));
} finally {
    if (cdp) cdp.close();
    chrome.kill();
}
