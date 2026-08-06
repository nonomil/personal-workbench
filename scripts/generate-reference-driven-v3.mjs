import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';

function arg(name, fallback = '') {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const promptFile = arg('prompt-file');
const outputFile = arg('out');
if (!promptFile || !outputFile) throw new Error('Usage: node generate-reference-driven-v3.mjs --prompt-file <file> --out <png>');

const prompt = await readFile(resolve(promptFile), 'utf8');
const baseUrl = (process.env.CLIPROXY_BASE_URL || 'https://rn6.nonom.top/v1').replace(/\/$/, '');
const apiKey = process.env.CLIPROXY_API_KEY;
if (!apiKey) throw new Error('CLIPROXY_API_KEY is required and must come from a local private credential source');

const payload = {
  model: 'gpt-image-2',
  prompt,
  n: 1,
  size: arg('size', '1024x1536'),
  quality: arg('quality', 'high')
};

async function request(body) {
  const response = await fetch(`${baseUrl}/images/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`Image API returned non-JSON HTTP ${response.status}`); }
  if (!response.ok) {
    const message = data?.error?.message || data?.error || `HTTP ${response.status}`;
    throw new Error(String(message));
  }
  return data;
}

let data;
try {
  data = await request(payload);
} catch (error) {
  if (!/quality|unsupported/i.test(String(error.message))) throw error;
  const retry = { ...payload };
  delete retry.quality;
  data = await request(retry);
}

const item = data?.data?.[0];
let bytes;
let format = 'png';
if (item?.b64_json) {
  bytes = Buffer.from(item.b64_json, 'base64');
} else if (item?.url) {
  const imageResponse = await fetch(item.url);
  if (!imageResponse.ok) throw new Error(`Image URL download failed: HTTP ${imageResponse.status}`);
  bytes = Buffer.from(await imageResponse.arrayBuffer());
  format = 'url-download';
} else {
  throw new Error('Image API response has neither data[0].b64_json nor data[0].url');
}

await mkdir(dirname(resolve(outputFile)), { recursive: true });
await writeFile(resolve(outputFile), bytes);
await writeFile(`${resolve(outputFile)}.meta.json`, JSON.stringify({
  model: payload.model,
  promptFile: resolve(promptFile),
  requestedSize: payload.size,
  requestedQuality: payload.quality,
  bytes: bytes.length,
  format,
  generatedAt: new Date().toISOString()
}, null, 2) + '\n');
console.log(JSON.stringify({ output: resolve(outputFile), bytes: bytes.length, format }));
