# 正常版 · 生活英语

工作台每日英语用的 597 词。格式与 wordquest-vocab-2026.08.15 相同，可单独拷走。

## Files

- catalog.json: runtime vocabulary cards.
- chapters.json: chapters, groups, and card order.
- media/: package-local images and audio.
- manifest.json: schema, version, counts.
- 词表.csv: spreadsheet view.

## Consumer usage

```js
const catalog = await fetch("./core-english-2026.08.15/catalog.json").then((r) => r.json());
const chapters = await fetch("./core-english-2026.08.15/chapters.json").then((r) => r.json());
const card = catalog.cards[0];
// card.image / card.audio are URLs relative to this package.
```

## Counts

- cards: 597
- chapters: 13
- groups: 66
- images: 101
- audio: 33

Catalog schema: wordquest.vocab-runtime.v1
Package schema: wordquest.vocab-release.v1
