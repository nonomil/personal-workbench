# 我的世界版 · 兴趣英语

Minecraft 兴趣词 324 条（入门 + 进阶）。不和正常版混级。格式与 wordquest-vocab-2026.08.15 相同。

## Files

- catalog.json: runtime vocabulary cards.
- chapters.json: chapters, groups, and card order.
- media/: package-local images and audio.
- manifest.json: schema, version, counts.
- 词表.csv: spreadsheet view.

## Consumer usage

```js
const catalog = await fetch("./minecraft-english-2026.08.15/catalog.json").then((r) => r.json());
const chapters = await fetch("./minecraft-english-2026.08.15/chapters.json").then((r) => r.json());
const card = catalog.cards[0];
// card.image / card.audio are URLs relative to this package.
```

## Counts

- cards: 324
- chapters: 2
- groups: 33
- images: 324
- audio: 110

Catalog schema: wordquest.vocab-runtime.v1
Package schema: wordquest.vocab-release.v1
