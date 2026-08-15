# test-plan（按科目 Phase）

## 自动化（挂 npm test）

| 用例 | 阶段 | 断言 |
| --- | --- | --- |
| validate-banks 基础 | A2 起逐科扩展 | schema v1 必填字段、id 全库唯一、条数冻结（英语 597 → +MC 324 → 识字 1500 → 拼音 63 → 拼读 94+26） |
| validate-banks 素材 | A1 起 | `media.image/audio` 文件存在；`media.*` 含 `http` 即失败 |
| banks-index 一致性 | A2 起逐科扩展 | index 声明的 path/count 与实际文件一致 |
| 英语卡位图优先 | A1/A3 | 重叠词渲染 `<img src="assets/img/vocab/...`；非重叠词仍出 card-art SVG |
| 虚词无图 | A3 | `media.art === "none"` 的词卡面无 `<img>` 也无 SVG |
| 音频回退 | A1/A3 | 有 `media.audio` 走 audio 分支，无则走 speechSynthesis 分支（源码断言） |
| MC 词库合同 | A4 | minecraft-bank.json 恰 324 条、id 前缀 mc-、无 block/item/color 变体；模板表覆盖 126+17 |
| MC 例句一致性 | A4 | 抽样断言 exampleZh 无「带在包里」错配模板；每条 phrase 含词面 |
| 识字迁移合同 | B | 1500 条对象行、extra.pinyin/words/explain 结构、反哺只补空缺 |
| 拼音干扰项 | C | 63 条、nearPhones 生成的干扰项不含正确答案、不重复 |
| 拼读迁移合同 | D | 94+26 条、extra.graphemes/phonemes/stageId 结构 |
| 缓存戳 | 各阶段 | index.html 版本号与测试断言一致（沿用 refresh 合同测试模式） |
| 现有回归 | 各阶段 | 既有 275+ 用例全绿 |

## 人工验收

1. A1：英语翻卡翻 10 张——重叠词看图、非重叠词看 emoji、虚词看字；"听一听"验证 mp3 与 TTS 两条路。
2. A4：Minecraft 入口抽 20 卡，图词相符、中英例句一致；确认不在每日必修里。
3. B：识字课抽 20 字，组词/讲解不为空。
4. C：拼音练习抽 10 题，干扰项合理。
5. D：拼读课抽 10 词；跑 `inventory-vocab-banks.mjs` 复核全库。
6. 每 Phase 结束用户过目后才进下一科。
