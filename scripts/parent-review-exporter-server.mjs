import fs from 'node:fs';
import fsp from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { buildExportPlan, normalizeReviewPackage, renderHtml, renderMarkdown } from './parent-review-exporter-core.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const DEFAULT_PORT = 4177;

function envPath(name, fallback) {
  const value = String(process.env[name] || '').trim();
  return value || fallback;
}

function getMinecraftRoot(options = {}) {
  return options.minecraftRoot || envPath('MINECRAFT_AI_ROOT', 'E:\\MineCraft\\Minecraft-AI');
}

function getToolPaths(options = {}) {
  const root = getMinecraftRoot(options);
  return {
    root,
    docx: path.join(root, 'tools', '生成每日学习资料DOCX.py'),
    pdf: path.join(root, 'tools', '生成每日学习资料PDF.ps1')
  };
}

function fileExists(file) {
  try {
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
}

function toolStatus(options = {}) {
  const tools = getToolPaths(options);
  return {
    root: tools.root,
    docx: { path: tools.docx, available: fileExists(tools.docx) },
    pdf: { path: tools.pdf, available: fileExists(tools.pdf) },
    outputRoot: options.exportRoot || path.join(projectRoot, 'exports', 'parent-review')
  };
}

function sendJson(response, status, value) {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': 'http://127.0.0.1:' + (process.env.PARENT_REVIEW_PORT || DEFAULT_PORT)
  });
  response.end(body);
}

function contentType(file) {
  return ({
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8'
  })[path.extname(file).toLowerCase()] || 'application/octet-stream';
}

function safeStaticPath(root, requestPath) {
  const relative = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
  const target = path.resolve(root, relative);
  return target === root || target.startsWith(root + path.sep) ? target : null;
}

function readBody(request, maxBytes = 5 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error('请求内容过大'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
  });
}

function runProgram(command, args, options = {}) {
  const runner = options.runner;
  if (typeof runner === 'function') return Promise.resolve(runner(command, args));
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd: projectRoot, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => resolve({ ok: false, code: null, stdout, stderr: error.message }));
    child.on('close', (code) => resolve({ ok: code === 0, code, stdout, stderr }));
  });
}

async function exportReviewPackage(payload, options = {}) {
  const input = payload && payload.package ? payload.package : payload;
  const pkg = normalizeReviewPackage(input);
  const exportRoot = options.exportRoot || path.join(projectRoot, 'exports', 'parent-review');
  const plan = buildExportPlan(pkg, exportRoot);
  await fsp.mkdir(plan.directory, { recursive: true });
  await fsp.writeFile(plan.markdownPath, renderMarkdown(pkg), 'utf8');
  await fsp.writeFile(plan.htmlPath, renderHtml(pkg), 'utf8');

  const wanted = new Set(Array.isArray(payload && payload.formats) ? payload.formats : ['markdown', 'html', 'docx', 'pdf']);
  const status = toolStatus(options);
  const conversions = {};
  if (wanted.has('docx')) {
    if (!status.docx.available) conversions.docx = { ok: false, skipped: true, reason: 'Minecraft-AI DOCX 脚本不存在', path: plan.docxPath };
    else conversions.docx = await runProgram(
      envPath('PARENT_REVIEW_PYTHON', 'python'),
      [status.docx.path, plan.markdownPath],
      options
    );
  }
  if (wanted.has('pdf')) {
    if (!status.pdf.available) conversions.pdf = { ok: false, skipped: true, reason: 'Minecraft-AI PDF 脚本不存在', path: plan.pdfPath };
    else conversions.pdf = await runProgram(
      // PowerShell 7 reads the UTF-8 Minecraft-AI wrapper correctly; Windows
      // PowerShell 5.1 treats the no-BOM Chinese script as an ANSI file.
      envPath('PARENT_REVIEW_POWERSHELL', 'pwsh'),
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        status.pdf.path,
        '-MarkdownPath',
        plan.markdownPath
      ],
      options
    );
  }
  return {
    ok: true,
    package: { child: pkg.child, range: pkg.range, itemCount: pkg.items.length },
    plan,
    files: { markdown: plan.markdownPath, html: plan.htmlPath, docx: fileExists(plan.docxPath) ? plan.docxPath : null, pdf: fileExists(plan.pdfPath) ? plan.pdfPath : null },
    conversions,
    tools: status
  };
}

export function createParentReviewServer(options = {}) {
  const staticRoot = options.staticRoot || path.join(projectRoot, 'prj', 'parent-review-exporter');
  const server = http.createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url || '/', 'http://127.0.0.1');
      if (request.method === 'OPTIONS') {
        response.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' });
        response.end();
        return;
      }
      if (request.method === 'GET' && requestUrl.pathname === '/api/health') {
        sendJson(response, 200, { ok: true, service: 'parent-review-exporter', tools: toolStatus(options) });
        return;
      }
      if (request.method === 'POST' && requestUrl.pathname === '/api/export') {
        const body = JSON.parse(await readBody(request));
        const result = await exportReviewPackage(body, options);
        sendJson(response, 200, result);
        return;
      }
      if (request.method === 'GET') {
        const file = safeStaticPath(staticRoot, requestUrl.pathname);
        if (file && fileExists(file)) {
          response.writeHead(200, { 'Content-Type': contentType(file), 'Cache-Control': 'no-store' });
          fs.createReadStream(file).pipe(response);
          return;
        }
      }
      sendJson(response, 404, { ok: false, error: 'not_found' });
    } catch (error) {
      sendJson(response, 400, { ok: false, error: String(error && error.message || error) });
    }
  });
  return server;
}

export { exportReviewPackage, getToolPaths, toolStatus };

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const port = Math.max(1, Number(process.env.PARENT_REVIEW_PORT) || DEFAULT_PORT);
  const server = createParentReviewServer();
  server.listen(port, '127.0.0.1', () => {
    console.log(`家庭复习单工具已启动：http://127.0.0.1:${port}`);
    console.log(`Minecraft-AI 根目录：${getMinecraftRoot()}`);
  });
}
