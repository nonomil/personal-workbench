# test-report

> 各阶段完成后在此追加：执行日期、npm test 结果、人工验收记录、遗留问题。

## Phase A 英语（A1 素材 / A2 schema / A3 接口 / A4 Minecraft）

### A1 素材接入（2026-08-15）

- 状态：**已执行，待用户翻卡验收**
- 命令：`node scripts/extract-wordquest-assets.mjs` → 101 图 / 33 音频 / 4002337 bytes / rejected 7
- 合同测试：`tests/preschool-vocab-assets.test.mjs` + `tests/preschool-english-vocab.test.mjs` **绿**
- 抽查剔除 7 张错配图：`sun` / `hello` / `look` / `play` / `friend` / `water` / `tree`
- 未启动 A5。

### 英语自动主题序列（2026-08-15，替换 3 轨）

- 状态：**已执行**
- 规则：无看图词/生活词/认读词；无英语级别条；主题序 颜色→数字→…→高频词；每天 5 张；复习队列不变。
- Day 1 窗口：black / blue / green / pink / purple（颜色）。
- 页面戳：`?v=20260815-english-auto-v1`
- 合同：`tests/preschool-bank-levels.test.mjs` 绿。

### A2 schema 基建（2026-08-15）

- 备份：`.tmp-analysis/banks-backup-20260815/`
- `node scripts/migrate-banks-schema-v1.mjs --bank=english` → 597 对象行；495 `emoji:X` / 102 `none`
- `banks-index.json` 已登记；`node scripts/validate-banks.mjs` ok
- `build-preschool-banks.py` 识别 schema v1

### A3 媒体接口（2026-08-15）

- `resolvePreschoolCardMedia`：位图 > emoji-art > none
- `preschool-card-art.js` 支持 `emoji:X` / `none`
- 英语/识字/拼音/拼读翻卡走该接口
- 合同：`tests/preschool-banks-schema.test.mjs` 绿

### A4 Minecraft 第一批（2026-08-15）

- 状态：**已执行，待用户翻卡验收**
- `scripts/build-minecraft-bank.mjs` → 324 词（MC-D1 60 / MC-D2 264），110 条本地 mp3
- 产物：`prj/data/preschool/英语/minecraft-bank.json`、`prj/preschool-minecraft-vocab-data.js`、`assets/img/vocab-mc/`、`assets/audio/vocab-mc/`
- 入口：卡片墙 `preschool-minecraft` + 英语「更多练习」里的「Minecraft 英语」；入门/进阶条不写花园 L1–L5
- 掌握进度：`courseProgress.minecraft`，错题 `sourceKey: minecraft:`，不进核心 597 复习池
- 合同：`tests/preschool-minecraft-bank.test.mjs` 绿

## Phase A5 音频扩展

- 状态：未启动（等用户拍板）

## Phase B 汉字（2026-08-15）

- schema v1，1500 条未扩张；L1–L5 各 300，级别条保留
- 讲解回填 1500（用本组词，不覆盖已有组词）；外部 800 字库只在组词为空时补词（本次组词已齐，补词 0）
- 反哺报告：`.tmp-analysis/literacy-backfill-20260815.json`
- 识字翻卡走 `resolvePreschoolCardMedia`
- `tests/preschool-literacy.test.mjs` 绿

## Phase C 拼音（2026-08-15）

- schema v1，63 条；40 条合入外部 homophones/nearPhones
- 干扰项优先 `nearPhones`，不足回退原 rotate
- `tests/preschool-reference-banks.test.mjs` 绿

## Phase D 拼读 + 收尾（2026-08-15）

- word-bank 94 + letter-bank 26 schema v1；index 覆盖五库
- `inventory-vocab-banks.mjs`：597 / 1500 / 63 / 94 / 26
- `docs/03-研究与参考/词库整理/` 已同步
- 合同：`tests/phonics-course-data.test.mjs` + `tests/preschool-bank-lessons.test.mjs` 绿

## 本切片指定测试

| 文件 | 结果 |
| --- | --- |
| `tests/preschool-bank-levels.test.mjs` | 绿 |
| `tests/preschool-english-vocab.test.mjs` | 绿 |
| `tests/preschool-vocab-assets.test.mjs` | 绿 |
| `tests/preschool-banks-schema.test.mjs` | 绿 |
| `tests/preschool-literacy.test.mjs` | 绿 |
| `tests/preschool-minecraft-bank.test.mjs` | 绿 |
| `tests/preschool-reference-banks.test.mjs` | 绿 |

未动既有失败：icon 注册缺 `bomb`。A5 未启动。
