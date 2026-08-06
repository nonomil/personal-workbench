import fs from 'node:fs';
import path from 'node:path';

const IMPORT_RE = /@import\s+url\(["']([^"']+)["']\)\s*;?/g;

export function readCssGraph(entryPath, seen = new Set()) {
  const absolutePath = path.resolve(entryPath);
  if (seen.has(absolutePath)) return '';
  seen.add(absolutePath);
  const source = fs.readFileSync(absolutePath, 'utf8');
  return source.replace(IMPORT_RE, (_match, href) => {
    if (/^(?:https?:)?\/\//.test(href)) return '';
    const localHref = href.split('?')[0].split('#')[0];
    return readCssGraph(path.resolve(path.dirname(absolutePath), localHref), seen);
  });
}
