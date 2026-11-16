# pinyin-pronunciation-kit · 拼音发音独立套件

把「拼音卡片发音 + 三段拼读」从个人工作台里抽成的**可复制独立套件**：
拷走整个文件夹，5 个 `<script>` 标签就能在别的项目里用。

## 它解决什么问题

幼儿拼音卡上「听拼音」按钮的经典错误：**声母 b 的卡片播的是例字"爸"**，
孩子按 b 听到的永远是"爸"，声母本音（呼读音）从来没发过；拼读
（b-a→ba 两音相连）更是缺失。

正确做法分三层：

1. **呼读音映射**：声母不直接读字母，TTS 读它的呼读音汉字
   （b→波、p→坡、zh→知…共 23 个）；韵母读呼读字（a→啊、ao→凹…共 24 个）。
2. **预烤音频 + 三级兜底**：呼读字先用 edge-tts 预烤成 mp3（音色统一、离线可用），
   播放器本地命中直接放；缺失时回退 Capacitor 原生 TTS，再回退 Web Speech。
3. **三段拼读**：`['波','啊','爸']`——声母轻短(0.7 速) → 韵母响亮 → 音节相连(0.85 速)，
   段间 340ms，即小学课堂的"两拼法"。

## 用了什么库？（重要）

**没有用任何第三方发音库/数据集。** 评估结论：

| 候选 | 结论 |
| --- | --- |
| [shikangkai/Chinese-Pinyin-Audio](https://github.com/shikangkai/Chinese-Pinyin-Audio) | 1617 个音节×四声 mp3（女声），**仓库无 LICENSE**，上游来源授权不明 |
| [zispace/hanyu-pinyin-audio](https://github.com/zispace/hanyu-pinyin-audio) | 网络采集合集，许可不明 |
| [blocklegend pinyin-db](https://github.com/) | 音节数据层很好（本套件的合法音节表即移植自它），但**零音频** |

发音音频全部由 **edge-tts**（微软 Edge 在线 TTS，Python 包 `edge-tts`）按呼读字
表自烤，音色与项目其他 4500+ 条预烤音频一致；标调、拼读、合法音节三张表都是
自维护纯数据。许可干净、离线可用。

## 目录

```
pinyin-pronunciation-kit/
├── README.md                        ← 本文件
├── data/
│   ├── pinyin-call-table.js         ← 23 声母呼读 + 24 韵母呼读映射（核心数据）
│   ├── pinyin-legal-syllables.js    ← 403 个合法音节（无调书写形，v 系约定见下）
│   └── pinyin-tone.js               ← 去调 / 标调 / 四声形态（bā bá bǎ bà）
├── blend.js                         ← 拼读组合器：callText / blendParts / syllableFor / legalFinals
├── pinyin-speech.js                 ← 独立播放器：本地 mp3 → 原生 TTS → Web Speech
├── audio/
│   ├── manifest.json                ← {"波":"波.mp3", ...} 70 条（按"文本"索引，与音色 hash 解耦）
│   └── *.mp3                        ← 预烤音频（edge-tts zh-CN-XiaoyiNeural -10%）
└── scripts/
    └── bake_call_audio.py           ← 用 edge-tts 重烤/补烤音频（可换音色）
```

## 快速接入

```html
<script src="pinyin-pronunciation-kit/data/pinyin-call-table.js"></script>
<script src="pinyin-pronunciation-kit/data/pinyin-tone.js"></script>
<script src="pinyin-pronunciation-kit/data/pinyin-legal-syllables.js"></script>
<script src="pinyin-pronunciation-kit/blend.js"></script>
<script src="pinyin-pronunciation-kit/pinyin-speech.js"></script>
<script>
  // ① 发某个字母的呼读音
  PinyinSpeech.speak({ text: PinyinBlend.callText({ kind: 'initial', initial: 'b', text: 'b', sample: '爸' }) });

  // ② 三段拼读 b-a→ba
  PinyinSpeech.speakBlend(['波', '啊', '爸']);

  // ③ 四声形态
  PinyinTone.pinyinToneForms('ba');  // ['bā','bá','bǎ','bà']

  // ④ 拼读转盘：b 能配哪些韵母
  PinyinBlend.legalFinals('b');      // ['a','o','i','u','ai','ei','ao','an','en','ang','eng','ing']
</script>
```

卡片数据形状约定（与源项目 `preschool-pinyin.js parseBank` 拆平后的字段一致）：

```js
{ text: 'b', kind: 'initial', initial: 'b', pinyin: 'bà', sample: '爸' }
```

⚠️ 历史坑：源项目里数据行曾被拆平、**`extra` 字段不存在**——拼读器只读顶层
字段，读 `item.extra` 会静默回退成例字发音。

## 音频再生成

```bash
pip install edge-tts
python scripts/bake_call_audio.py          # 只补缺失
python scripts/bake_call_audio.py --force  # 全部重烤（换音色改脚本顶部 VOICE）
```

## 已知边界

- 未覆盖：轻声、儿化、多音字按字库单一读音。
- 合法音节表是"无调书写形"，校验组合合法性用；ü 系拼写规则见数据文件头注释
  （nv/lv 保留 v；j/q/x 后写 ju/qu/xu）。
- 415 全音节×四声的完整真人音频如需引入，可再评估上述开源集的授权（当前未采用）。

## 来源

从个人工作台（G:\StudyCode\个人工作台）抽出，2026-08-29。
上游实现：`prj/preschool-speech.js`（播放器）、`prj/app.js PINYIN_*_CALL`（呼读表）、
`tools/tts-portable/generate-content-audio.py`（烘焙管线）。
