# 自然拼读专项

这是独立的自然拼读资料包，供英语专区和家长执行使用。

## 目录

```text
docs/自然拼读/
├─ 00-README.md
├─ 01-课程总方案.md
├─ 02-60日课程表.md
├─ 03-每日教案模板.md
├─ 04-家长执行手册.md
├─ 05-资料生产与版权规范.md
└─ research/
   ├─ sources.md
   ├─ research.md
   └─ raw/
```

运行数据在 `data/preschool/english/phonics/`；可发布素材在 `assets/generated/preschool/phonics/`；下载缓存和网页快照不进入发布制品。

## 现状

- 60 日路线和运行数据已经落地；课程、词库和短句均通过结构 QA。
- `word-bank.json` 和 `sentence-bank.json` 是内容 QA 的规范化输入，句子引用必须能被每日课程解析。
- 课程属于英语专区，不新增顶层导航、积分账本或 localStorage 根键。
