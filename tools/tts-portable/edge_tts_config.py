"""
儿童绘本 edge-tts 配置
pip install edge-tts
无需 API Key，无需 GPU，完全免费
"""

import asyncio
import edge_tts
from pathlib import Path

# ─────────────────────────────────────────────
# 音色预设（儿童绘本场景）
# 选音色的核心原则：
#   XiaoyiNeural → ContentCategories = Cartoon  ← 绘本首选
#   XiaoxiaoNeural → ContentCategories = Novel  ← 睡前故事首选
#   YunxiaNeural → 儿童音色                      ← 小主角独白
# ─────────────────────────────────────────────
VOICE_PRESETS = {

    # ★ 首推：绘本旁白
    "温柔姐姐": {
        "voice": "zh-CN-XiaoxiaoNeural",   # 晓晓，温暖自然，最像妈妈讲故事
        "rate":  "-18%",                   # 放慢，孩子听清楚
        "pitch": "+2Hz",                   # 轻微提高，听感更亲切
        "volume": "+0%",
        "desc": "最像妈妈讲睡前故事，温柔自然，适合大部分绘本"
    },

    # ★ 首推：活泼故事
    "活泼老师": {
        "voice": "zh-CN-XiaoyiNeural",     # 晓伊，官方标注 Cartoon 类，天生适合绘本
        "rate":  "-10%",                   # 略慢即可，本身语气就活泼
        "pitch": "+6Hz",                   # 稍微提高音调，更有活力
        "volume": "+0%",
        "desc": "官方 Cartoon 音色，活泼生动，适合冒险/搞笑类绘本"
    },

    # 小朋友旁白（主角独白）
    "小朋友声音": {
        "voice": "zh-CN-YunxiaNeural",     # 云夏，儿童音色
        "rate":  "-12%",
        "pitch": "+10Hz",                  # 提高音调，更像小孩
        "volume": "+0%",
        "desc": "儿童音色，适合以小主角第一人称叙述的故事"
    },

    # 慈祥爷爷（民间故事/寓言）
    "慈祥爷爷": {
        "voice": "zh-CN-YunxiNeural",      # 云希，自然男声
        "rate":  "-22%",                   # 明显放慢，体现年长感
        "pitch": "-8Hz",                   # 降低音调
        "volume": "+0%",
        "desc": "适合民间故事、寓言、爷爷讲故事场景"
    },

    # 台湾腔（可爱风，适合引进台版绘本）
    "台湾腔姐姐": {
        "voice": "zh-TW-HsiaoYuNeural",    # 台湾腔女声
        "rate":  "-15%",
        "pitch": "+4Hz",
        "volume": "+0%",
        "desc": "台湾腔，适合台版引进绘本，口感偏软萌"
    },

    # 粤语（粤语绘本专用）
    "粤语姐姐": {
        "voice": "zh-HK-HiuMaanNeural",    # 香港粤语女声，流畅自然
        "rate":  "-15%",
        "pitch": "+2Hz",
        "volume": "+0%",
        "desc": "粤语旁白，适合香港/广东地区用户"
    },
}

# 默认首选（可在 .env 里覆盖）
DEFAULT_PRESET = "活泼老师"


# ─────────────────────────────────────────────
# 核心 TTS 函数
# ─────────────────────────────────────────────
async def generate_tts(
    text: str,
    output_path: str,
    preset_name: str = DEFAULT_PRESET,
) -> float:
    """
    生成语音文件，返回时长（秒）
    output_path 建议用 .mp3（edge-tts 原生输出）
    """
    preset = VOICE_PRESETS.get(preset_name, VOICE_PRESETS[DEFAULT_PRESET])

    communicate = edge_tts.Communicate(
        text=text,
        voice=preset["voice"],
        rate=preset["rate"],
        pitch=preset["pitch"],
        volume=preset["volume"],
    )

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    await communicate.save(output_path)

    # 获取音频时长（用 mutagen，比 librosa 轻量）
    duration = _get_mp3_duration(output_path)
    return duration


async def generate_tts_with_subtitle(
    text: str,
    audio_path: str,
    subtitle_path: str,
    preset_name: str = DEFAULT_PRESET,
) -> tuple[float, str]:
    """
    同时生成音频 + SRT 字幕（edge-tts 原生支持，不需要 Whisper）
    返回 (时长秒, 字幕文件路径)
    """
    preset = VOICE_PRESETS.get(preset_name, VOICE_PRESETS[DEFAULT_PRESET])

    communicate = edge_tts.Communicate(
        text=text,
        voice=preset["voice"],
        rate=preset["rate"],
        pitch=preset["pitch"],
        volume=preset["volume"],
    )

    submaker = edge_tts.SubMaker()
    Path(audio_path).parent.mkdir(parents=True, exist_ok=True)

    with open(audio_path, "wb") as audio_file:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_file.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                submaker.create_sub(
                    (chunk["offset"], chunk["duration"]),
                    chunk["text"]
                )

    with open(subtitle_path, "w", encoding="utf-8") as f:
        f.write(submaker.generate_subs())

    duration = _get_mp3_duration(audio_path)
    return duration, subtitle_path


def generate_tts_sync(text: str, output_path: str, preset_name: str = DEFAULT_PRESET) -> float:
    """同步版本（Celery worker 里用这个）"""
    return asyncio.run(generate_tts(text, output_path, preset_name))


def _get_mp3_duration(path: str) -> float:
    """获取 MP3 时长，依赖 mutagen（pip install mutagen）"""
    try:
        from mutagen.mp3 import MP3
        return MP3(path).info.length
    except Exception:
        # fallback：用 ffprobe
        import subprocess, json
        result = subprocess.run(
            ["ffprobe", "-v", "quiet", "-print_format", "json",
             "-show_format", path],
            capture_output=True, text=True
        )
        return float(json.loads(result.stdout)["format"]["duration"])


# ─────────────────────────────────────────────
# 批量生成（整本书一次性处理）
# ─────────────────────────────────────────────
async def generate_book_audio(
    pages: list[dict],   # [{"page_id": ..., "text": ...}, ...]
    output_dir: str,
    preset_name: str = DEFAULT_PRESET,
    with_subtitle: bool = True,
) -> list[dict]:
    """
    并发生成整本书的音频（限制并发数避免被限速）
    返回 [{"page_id", "audio_path", "subtitle_path", "duration"}, ...]
    """
    semaphore = asyncio.Semaphore(3)  # 最多同时 3 个请求

    async def process_page(page: dict) -> dict:
        async with semaphore:
            pid = page["page_id"]
            audio_path = f"{output_dir}/{pid}.mp3"
            subtitle_path = f"{output_dir}/{pid}.srt"

            if with_subtitle:
                duration, _ = await generate_tts_with_subtitle(
                    page["text"], audio_path, subtitle_path, preset_name
                )
            else:
                duration = await generate_tts(page["text"], audio_path, preset_name)
                subtitle_path = None

            return {
                "page_id": pid,
                "audio_path": audio_path,
                "subtitle_path": subtitle_path,
                "duration": duration,
            }

    tasks = [process_page(p) for p in pages]
    return await asyncio.gather(*tasks)


# ─────────────────────────────────────────────
# 快速测试（python tts_service.py）
# ─────────────────────────────────────────────
if __name__ == "__main__":
    test_text = "从前，在一片茂密的大森林里，住着一只小兔子。它有着雪白的毛发和长长的耳朵，每天都快乐地在草地上蹦蹦跳跳。"

    async def test_all_presets():
        print("🎙️  测试所有儿童绘本音色预设\n")
        for name, cfg in VOICE_PRESETS.items():
            path = f"test_output/{name}.mp3"
            dur = await generate_tts(test_text, path, name)
            print(f"  ✅ {name:<12} | {cfg['voice']:<30} | {dur:.1f}s | {cfg['desc']}")

    asyncio.run(test_all_presets())
