直接替换掉规格书里的 `tts_service.py` 即可，这是专门为儿童绘本调过的。核心选择逻辑说清楚：

------

**音色怎么挑，一张表看完：**

| 音色           | voice 名         | 官方标注    | 适合场景                       |
| -------------- | ---------------- | ----------- | ------------------------------ |
| 🥇 **活泼老师** | `XiaoyiNeural`   | **Cartoon** | 大多数绘本，官方明确标 Cartoon |
| 🥈 **温柔姐姐** | `XiaoxiaoNeural` | Novel/Warm  | 睡前故事，情绪柔和的绘本       |
| **小朋友声**   | `YunxiaNeural`   | 儿童音色    | 主角独白、第一人称故事         |
| **慈祥爷爷**   | `YunxiNeural`    | 男声        | 寓言、民间故事                 |
| **台湾腔**     | `HsiaoYuNeural`  | 软萌        | 引进台版绘本                   |
| **粤语**       | `HiuMaanNeural`  | 粤语        | 广东/香港用户                  |

**参数调节原则：**

- `rate -10% ~ -20%`：放慢语速，孩子听得清楚，这是最重要的一个参数
- `pitch +2Hz ~ +10Hz`：音调微升，听感更亲切活泼，不要超过 +15Hz 否则变卡通腔
- 字幕是 **edge-tts 原生支持**，不需要跑 Whisper，`generate_tts_with_subtitle()` 直接出 SRT

**与 VoxCPM2 相比：**

| 维度         | edge-tts              | VoxCPM2                |
| ------------ | --------------------- | ---------------------- |
| 部署         | 零配置，`pip install` | 需要 8GB 显存 GPU      |
| 质量         | 自然但风格固定        | 可描述声线，更灵活     |
| 速度         | 极快（网络请求）      | 本地推理，较慢         |
| 费用         | 完全免费              | 免费但需算力           |
| 字幕         | 原生支持 SRT          | 需额外处理             |
| **绘本适配** | `XiaoyiNeural` 够用   | 可定制"妈妈讲故事"声线 |

MVP 阶段直接用 `XiaoyiNeural`，上线稳定后再换 VoxCPM2 提升体验，代码只需换掉 `tts_service.py` 这一个文件。


Other23:45Claude responded: 推荐选第 2 套，但英文换一个声音。评估了儿童绘本应用的双语音色配置方案。评估了儿童绘本应用的双语音色配置方案。推荐选第 2 套，但英文换一个声音。
AriaNeural 的官方标注是 News / Novel，不适合儿童绘本。英文里有一个跟 XiaoyiNeural 完全对应的音色：
中文英文音色名zh-CN-XiaoyiNeuralen-US-AnaNeural官方分类Cartoon, NovelCartoon, Conversation官方性格LivelyCute适合场景儿童绘本 ✅儿童绘本 ✅
AnaNeural 是微软英文声库里少数明确标注 Cartoon 的，跟 XiaoyiNeural 是一对儿，中英文切换时听感最连贯。
所以最终配置是：
pythonVOICE_PRESETS = {
    "zh": {
        "voice": "zh-CN-XiaoyiNeural",
        "rate":  "-10%",
        "pitch": "+6Hz",
    },
    "en": {
        "voice": "en-US-AnaNeural",   # 不是 AriaNeural
        "rate":  "-8%",
        "pitch": "+4Hz",
    },
}
语言检测一行搞定，自动切换：
pythondef detect_lang(text: str) -> str:
    # 有中文字符就用中文音色
    return "zh" if any("\u4e00" <= c <= "\u9fff" for c in text) else "en"You said: XiaoxiaoNeural 这个中文 + en-US-AnaNeural 英文呢XiaoxiaoNeural 这个中文 + en-US-AnaNeural 英文呢23:46Claude responded: 这个组合有一个音色性格错位的问题，直接说清楚：评估了声音组合的音调匹配度与儿童读物适配性。评估了声音组合的音调匹配度与儿童读物适配性。这个组合有一个音色性格错位的问题，直接说清楚：
中文 XiaoxiaoNeural英文 AnaNeural官方分类News, NovelCartoon, Conversation官方性格WarmCute听感温柔成熟的大姐姐活泼可爱的小孩
中文是温柔叙述腔，英文切过去突然变成卡通萌娃，切换时有落差感。

两种解决方向：
如果你坚持 XiaoxiaoNeural，英文应该换成风格更接近的：
python# 温柔路线，中英一致
"zh": "zh-CN-XiaoxiaoNeural",  # Warm
"en": "en-US-AvaNeural",        # Expressive, Caring ← 比 Ana 更配
AvaNeural 的官方性格是 Expressive + Caring，跟 Xiaoxiao 的 Warm 气质是一对儿，切换时不违和。

三套方案横向对比：
方案中文英文整体风格一致性方案 AXiaoyiNeuralAnaNeural活泼卡通✅ 两边都是 Cartoon方案 BXiaoxiaoNeuralAvaNeural温柔亲切✅ 两边都是 Warm/Caring⚠️ 你问的XiaoxiaoNeuralAnaNeural混搭❌ 中文温柔英文萌娃
儿童绘本睡前故事风格选方案 B，冒险/日常风格选方案 A，两个都比混搭好。