# 自然拼读 · 词+字母

工作台自然拼读 94 词 + 26 字母。格式与 core-english 相同。

源库：`prj/data/preschool/`。本包只是和英语词库相同的 catalog 包装，不另造题。

## Files

- catalog.json: runtime cards (`word` / `translation` / `kind`).
- chapters.json: chapters, groups, and card order.
- manifest.json: schema, version, counts.
- 词表.csv: spreadsheet view.

## Consumer usage

```js
const catalog = await fetch("./core-phonics-2026.08.19/catalog.json").then((r) => r.json());
const card = catalog.cards[0];
// card.word / card.translation / card.kind
```

## Counts

- cards: 120
- chapters: 5
- groups: 14

Catalog schema: wordquest.vocab-runtime.v1
Package schema: wordquest.vocab-release.v1
