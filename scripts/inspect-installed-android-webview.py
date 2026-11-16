#!/usr/bin/env python3
"""Read-only layout inspection for a debuggable installed Android WebView."""

from __future__ import annotations

import argparse
import json
import time
import urllib.request

import websocket


class Cdp:
    def __init__(self, url: str) -> None:
        self.socket = websocket.create_connection(url, timeout=10)
        self.sequence = 0

    def close(self) -> None:
        self.socket.close()

    def send(self, method: str, params: dict | None = None) -> dict:
        self.sequence += 1
        request_id = self.sequence
        self.socket.send(json.dumps({"id": request_id, "method": method, "params": params or {}}))
        while True:
            message = json.loads(self.socket.recv())
            if message.get("id") != request_id:
                continue
            if "error" in message:
                raise RuntimeError(json.dumps(message["error"], ensure_ascii=False))
            return message.get("result", {})

    def evaluate(self, expression: str):
        result = self.send(
            "Runtime.evaluate",
            {"expression": expression, "awaitPromise": True, "returnByValue": True},
        )
        if result.get("exceptionDetails"):
            raise RuntimeError(json.dumps(result["exceptionDetails"], ensure_ascii=False))
        return result.get("result", {}).get("value")


INSPECT_EXPRESSION = r"""
(() => {
  const rect = (node) => {
    const box = node?.getBoundingClientRect();
    return box ? {
      x: Math.round(box.x), y: Math.round(box.y),
      width: Math.round(box.width), height: Math.round(box.height),
      right: Math.round(box.right), bottom: Math.round(box.bottom)
    } : null;
  };
  const rail = document.querySelector('.preschool-mobile-nav');
  const railStyle = rail ? getComputedStyle(rail) : null;
  const pages = Array.from(document.querySelectorAll('.preschool-native-page'));
  const controls = Array.from(document.querySelectorAll('button, a[href], [role="button"]')).map((node) => {
    const box = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return {
      text: (node.textContent || node.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 30),
      className: String(node.className || ''),
      id: node.id || '',
      width: Math.round(box.width), height: Math.round(box.height),
      visible: box.width > 0 && box.height > 0 && box.right > 0 && box.bottom > 0 && box.left < innerWidth && box.top < innerHeight && style.display !== 'none' && style.visibility !== 'hidden'
    };
  });
  return {
    url: location.href,
    nativeClass: document.documentElement.classList.contains('is-android-app'),
    viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
    document: {
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      clientHeight: document.documentElement.clientHeight,
      scrollHeight: document.documentElement.scrollHeight,
      bodyOverflow: getComputedStyle(document.body).overflow
    },
    rail: rail ? {
      rect: rect(rail), display: railStyle.display, visibility: railStyle.visibility,
      opacity: railStyle.opacity, position: railStyle.position, zIndex: railStyle.zIndex,
      gridTemplateRows: railStyle.gridTemplateRows, transform: railStyle.transform
    } : null,
    railButtons: rail ? Array.from(rail.querySelectorAll('button')).map((node) => {
      const style = getComputedStyle(node);
      return { text: (node.textContent || '').trim(), rect: rect(node), display: style.display, visibility: style.visibility, opacity: style.opacity };
    }) : [],
    main: rect(document.querySelector('.main-content')),
    pager: rect(document.querySelector('.preschool-native-pager')),
    pages: pages.map((page) => ({
      kind: page.dataset.nativeKind,
      rect: rect(page),
      overflowX: Math.max(0, page.scrollWidth - page.clientWidth),
      overflowY: Math.max(0, page.scrollHeight - page.clientHeight)
    })),
    undersized: controls.filter((item) => item.visible && (item.width < 44 || item.height < 44)),
    loaded: {
      css: document.querySelector('link[href*="preschool-workbench.css"]')?.href || '',
      childCss: document.querySelector('link[href*="44-child-game-world.css"]')?.href || '',
      app: document.querySelector('script[src*="/app.js"]')?.src || '',
      courses: document.querySelector('script[src*="child-courses.js"]')?.src || '',
      bridge: document.querySelector('script[src*="workbench-bridge.js"]')?.src || ''
    }
  };
})()
"""


def read_targets(base_url: str) -> list[dict]:
    with urllib.request.urlopen(f"{base_url.rstrip('/')}/json", timeout=10) as response:
        return json.load(response)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cdp", default="http://127.0.0.1:9224")
    parser.add_argument("--hash", dest="route_hash", default="")
    args = parser.parse_args()

    targets = [target for target in read_targets(args.cdp) if target.get("type") == "page"]
    if not targets:
        raise RuntimeError("No debuggable Android WebView page found")

    cdp = Cdp(targets[0]["webSocketDebuggerUrl"])
    try:
        cdp.send("Runtime.enable")
        if args.route_hash:
            cdp.evaluate(f"location.hash = {json.dumps(args.route_hash)}")
            time.sleep(1.0)
        snapshot = cdp.evaluate(INSPECT_EXPRESSION)
        print(json.dumps(snapshot, ensure_ascii=False, indent=2))
    finally:
        cdp.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
