/**
 * Optional local CORS proxy for BlockLegend buddy.
 * Chat: OpenAI-compatible deepseek-v4-flash (OpenCode Go / CCR).
 * TTS: edge-tts CLI if installed, otherwise 501 so the game falls back
 * to speechSynthesis Microsoft English voices.
 * STT: faster-whisper via whisper-stt.py if installed, otherwise 501.
 *
 *   set OPENAI_BASE_URL=https://opencode.ai/zen/go/v1
 *   set OPENAI_API_KEY=...
 *   set OPENAI_MODEL=deepseek-v4-flash
 *   node prj/games/blocklegend/tools/buddy-proxy.mjs
 */
import http from 'node:http';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.BUDDY_PROXY_PORT || 4210);
const BASE = String(process.env.OPENAI_BASE_URL || 'https://opencode.ai/zen/go/v1').replace(/\/+$/, '');
const MODEL = process.env.OPENAI_MODEL || 'deepseek-v4-flash';
const KEY = process.env.OPENAI_API_KEY || '';

function send(res, status, body, headers) {
    const extra = headers || {};
    const payload = Buffer.isBuffer(body) ? body : Buffer.from(body || '');
    res.writeHead(status, Object.assign({
        'access-control-allow-origin': '*',
        'access-control-allow-headers': 'content-type, authorization, x-prompt',
        'access-control-allow-methods': 'GET, POST, OPTIONS',
        'content-length': payload.length
    }, extra));
    res.end(payload);
}

function readRaw(req) {
    return new Promise(function (resolve, reject) {
        const chunks = [];
        req.on('data', function (c) { chunks.push(c); });
        req.on('end', function () { resolve(Buffer.concat(chunks)); });
        req.on('error', reject);
    });
}

function readBody(req) {
    return readRaw(req).then(function (buf) { return buf.toString('utf8'); });
}

function edgeTts(text, voice) {
    const out = join(tmpdir(), 'bl-buddy-' + Date.now() + '.mp3');
    const args = ['-m', 'edge_tts', '--voice', voice || 'en-US-JennyNeural', '--text', text, '--write-media', out];
    return new Promise(function (resolve, reject) {
        const child = spawn('py', args, { windowsHide: true });
        let err = '';
        child.stderr.on('data', function (d) { err += d; });
        child.on('error', reject);
        child.on('close', function (code) {
            if (code !== 0) {
                reject(new Error(err || ('edge-tts exit ' + code)));
                return;
            }
            readFile(out).then(function (buf) {
                unlink(out).catch(function () {});
                resolve(buf);
            }, reject);
        });
    });
}

function whisperStt(buf, prompt, ext) {
    const suffix = ext && /^\.[a-z0-9]+$/i.test(ext) ? ext : '.webm';
    const inn = join(tmpdir(), 'bl-stt-' + Date.now() + suffix);
    const script = join(HERE, 'whisper-stt.py');
    return writeFile(inn, buf).then(function () {
        return new Promise(function (resolve, reject) {
            const child = spawn('py', [script, inn, String(prompt || '')], { windowsHide: true });
            let out = '';
            let err = '';
            child.stdout.on('data', function (d) { out += d; });
            child.stderr.on('data', function (d) { err += d; });
            child.on('error', reject);
            child.on('close', function (code) {
                unlink(inn).catch(function () {});
                if (code !== 0) {
                    reject(new Error(err || ('whisper-stt exit ' + code)));
                    return;
                }
                resolve(String(out || '').trim());
            });
        });
    });
}

function pathOnly(url) {
    return String(url || '').split('?')[0];
}

const server = http.createServer(async function (req, res) {
    if (req.method === 'OPTIONS') {
        send(res, 204, '');
        return;
    }
    const route = pathOnly(req.url);
    if (req.method === 'GET' && route === '/health') {
        send(res, 200, JSON.stringify({
            ok: true,
            model: MODEL,
            tts: 'edge-tts-optional',
            stt: 'faster-whisper-optional'
        }), {
            'content-type': 'application/json'
        });
        return;
    }
    if (req.method === 'POST' && route === '/v1/chat/completions') {
        if (!KEY) {
            send(res, 503, JSON.stringify({ error: { message: 'OPENAI_API_KEY missing' } }), {
                'content-type': 'application/json'
            });
            return;
        }
        const incoming = JSON.parse((await readBody(req)) || '{}');
        const payload = Object.assign({}, incoming, { model: incoming.model || MODEL, stream: false });
        const upstream = await fetch(BASE + '/chat/completions', {
            method: 'POST',
            headers: { 'content-type': 'application/json', authorization: 'Bearer ' + KEY },
            body: JSON.stringify(payload)
        });
        send(res, upstream.status, await upstream.text(), { 'content-type': 'application/json' });
        return;
    }
    if (req.method === 'POST' && route === '/v1/tts') {
        const incoming = JSON.parse((await readBody(req)) || '{}');
        const text = String(incoming.text || '').slice(0, 120);
        if (!text) {
            send(res, 400, JSON.stringify({ error: { message: 'text required' } }), {
                'content-type': 'application/json'
            });
            return;
        }
        try {
            const mp3 = await edgeTts(text, incoming.voice);
            send(res, 200, mp3, { 'content-type': 'audio/mpeg' });
        } catch (err) {
            send(res, 501, JSON.stringify({ error: { message: 'edge-tts unavailable', detail: String(err.message || err).slice(0, 160) } }), {
                'content-type': 'application/json'
            });
        }
        return;
    }
    if (req.method === 'POST' && route === '/v1/stt') {
        const raw = await readRaw(req);
        if (!raw || !raw.length) {
            send(res, 400, JSON.stringify({ error: { message: 'audio required' } }), {
                'content-type': 'application/json'
            });
            return;
        }
        const prompt = String(req.headers['x-prompt'] || '').slice(0, 80);
        const ctype = String(req.headers['content-type'] || '');
        const ext = /mpeg|mp3/.test(ctype) ? '.mp3' : (/ogg/.test(ctype) ? '.ogg' : (/mp4|m4a/.test(ctype) ? '.m4a' : '.webm'));
        try {
            const text = await whisperStt(raw, prompt, ext);
            send(res, 200, JSON.stringify({ text: text }), { 'content-type': 'application/json' });
        } catch (err) {
            send(res, 501, JSON.stringify({
                error: { message: 'faster-whisper unavailable', detail: String(err.message || err).slice(0, 160) }
            }), { 'content-type': 'application/json' });
        }
        return;
    }
    send(res, 404, 'not found');
});

server.listen(PORT, '127.0.0.1', function () {
    console.log('buddy-proxy http://127.0.0.1:' + PORT + ' model=' + MODEL);
});
