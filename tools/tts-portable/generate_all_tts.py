"""
儿童绘本全量 TTS 生成脚本（预生成模式）
从所有 HTML 页面提取可朗读文本，用 edge-tts 生成 MP3，输出 map.json

本脚本是【预生成模式】：用于固定文本批量生成 MP3，前端查 map.json 播放。
当前工程（宠物积分系统）存在大量动态文本（战斗伤害、数学题、随机事件），
无法预先穷举，这类动态文本请走 tts_server.py 实时服务（FastAPI）。

用法：
    python generate_all_tts.py                          # 默认扫描 ./courseware
    python generate_all_tts.py --dir /path/to/html      # 指定扫描目录
    COURSEWARE_DIR=/path/to/html python generate_all_tts.py   # 用环境变量指定
依赖：pip install edge-tts
"""

import asyncio
import hashlib
import json
import os
import re
import sys
import time
from pathlib import Path

import edge_tts

# Windows 控制台 UTF-8 支持
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# ─────────────────────────────────────────────
# 配置（扫描目录可被环境变量 COURSEWARE_DIR 或命令行参数 --dir 覆盖）
# ─────────────────────────────────────────────
def _resolve_courseware_dir() -> Path:
    """解析要扫描的 HTML 目录：命令行 --dir > 环境变量 COURSEWARE_DIR > 默认 ./courseware"""
    # 命令行参数
    if "--dir" in sys.argv:
        idx = sys.argv.index("--dir")
        if idx + 1 < len(sys.argv):
            return Path(sys.argv[idx + 1]).resolve()
    # 环境变量
    env_dir = os.environ.get("COURSEWARE_DIR")
    if env_dir:
        return Path(env_dir).resolve()
    # 默认：脚本同级 courseware 目录
    return Path(__file__).parent / "courseware"


COURSEWARE_DIR = _resolve_courseware_dir()
TTS_DIR = COURSEWARE_DIR / "audio" / "tts"

# 音色配置
VOICE_CN = "zh-CN-XiaoyiNeural"   # 活泼老师
VOICE_EN = "en-US-AnaNeural"      # 卡通英文
RATE_CN = "-10%"
PITCH_CN = "+6Hz"
RATE_EN = "-10%"
PITCH_EN = "+2Hz"

# 并发控制
MAX_CONCURRENT = 3

# 文本过滤
MIN_TEXT_LEN = 1
MAX_TEXT_LEN = 500


# ─────────────────────────────────────────────
# 文本清理
# ─────────────────────────────────────────────
# Emoji 正则（注意：不要用过宽的范围，会误杀 CJK 汉字）
# 必须用单个字符串字面量，不要分开拼接（Python re 的 \U 转义有坑）
_EMOJI_RE = re.compile(
    '[\U0001F600-\U0001F64F\U0001F300-\U0001F5FF\U0001F680-\U0001F6FF'
    '\U0001F900-\U0001F9FF\U0001FA00-\U0001FAFF'
    '\U00002600-\U000027BF\U0000FE00-\U0000FE0F'
    '\U0000200D\U000020E3\U0000231A-\U0000231B'
    '\U000023E9-\U000023F3\U000023F8-\U000023FA'
    '\U000025AA-\U000025AB\U000025B6\U000025C0'
    '\U00002934-\U00002935\U00002B05-\U00002B07'
    '\U00002B1B-\U00002B1C\U00002B50\U00002B55'
    '\U00003030\U0000303D\U00003297\U00003299]+',
    flags=re.UNICODE,
)


def clean_text(text: str) -> str:
    """清理文本，去掉不适合朗读的字符"""
    if not text:
        return ""
    # 去掉 HTML 标签
    text = re.sub(r"<[^>]+>", "", text)
    # 去掉 emoji
    text = _EMOJI_RE.sub("", text)
    # 去掉特殊符号（保留基本标点）
    text = re.sub(r"[💫✨🎉🎊🔥⭐🌟💥]", "", text)
    # 合并空白
    text = re.sub(r"\s+", " ", text).strip()
    return text


def is_template_var(text: str) -> bool:
    """判断是否为 JS 模板变量"""
    return "${" in text or text.startswith("var ") or text.startswith("let ") or text.startswith("const ")


def is_valid_text(text: str) -> bool:
    """判断文本是否值得生成语音"""
    if not text or len(text) < MIN_TEXT_LEN or len(text) > MAX_TEXT_LEN:
        return False
    if is_template_var(text):
        return False
    # 跳过纯数字、纯标点
    if re.match(r"^[\d\s\.\,\!\?\;\:]+$", text):
        return False
    # 跳过看起来像代码片段的文本（含引号拼接、方括号等）
    if re.search(r"['\"]\s*\+\s*\w", text) or text.startswith("[") or text.startswith("'"):
        return False
    # 跳过纯短变量名（英文2字符以下）
    if re.match(r"^[a-zA-Z_][a-zA-Z0-9_]*$", text) and len(text) < 3:
        return False
    # 跳过 HTML 实体 / 纯符号
    if re.match(r"^[\&\#\;\s]+$", text):
        return False
    return True


# ─────────────────────────────────────────────
# 语言检测
# ─────────────────────────────────────────────
def detect_lang(text: str) -> str:
    """检测文本语言：zh=中文, en=英文"""
    cn_chars = len(re.findall(r"[一-鿿]", text))
    en_chars = len(re.findall(r"[a-zA-Z]", text))
    if cn_chars > en_chars:
        return "zh"
    return "en"


def get_voice_params(lang: str) -> dict:
    """根据语言返回语音参数"""
    if lang == "zh":
        return {"voice": VOICE_CN, "rate": RATE_CN, "pitch": PITCH_CN, "volume": "+0%"}
    return {"voice": VOICE_EN, "rate": RATE_EN, "pitch": PITCH_EN, "volume": "+0%"}


# ─────────────────────────────────────────────
# 文本提取
# ─────────────────────────────────────────────
def extract_from_html(filepath: Path) -> set[str]:
    """从单个 HTML 文件提取所有可朗读文本"""
    texts = set()
    try:
        content = filepath.read_text(encoding="utf-8", errors="replace")
    except Exception as e:
        print(f"  ⚠ 读取失败: {filepath.name} — {e}")
        return texts

    # 1) speakText('...') / speakText("...")
    for m in re.finditer(r"""speakText\(\s*["'](.+?)["']\s*\)""", content):
        t = clean_text(m.group(1))
        if is_valid_text(t):
            texts.add(t)

    # 2) speak('...') / speak("...")  — 只取静态字符串
    for m in re.finditer(r"""(?<![a-zA-Z])speak\(\s*["'](.+?)["']\s*\)""", content):
        t = clean_text(m.group(1))
        if is_valid_text(t):
            texts.add(t)

    # 3) data-text="..."
    for m in re.finditer(r'data-text="([^"]+)"', content):
        t = clean_text(m.group(1))
        if is_valid_text(t):
            texts.add(t)

    # 4) data-answer="..."
    for m in re.finditer(r'data-answer="([^"]+)"', content):
        t = clean_text(m.group(1))
        if is_valid_text(t):
            texts.add(t)

    # 5) JS 数据中的 word: '...' / word: "..."
    for m in re.finditer(r"""word:\s*["'](.+?)["']""", content):
        t = clean_text(m.group(1))
        if is_valid_text(t):
            texts.add(t)

    # 6) speakLabel / speak-text / data-say 属性（部分模板使用）
    for m in re.finditer(r'data-say="([^"]+)"', content):
        t = clean_text(m.group(1))
        if is_valid_text(t):
            texts.add(t)

    # 7) quiz 选项文字 (quizPick 调用中的第二个参数)
    for m in re.finditer(r"""quizPick\([^,]+,\s*["'](.+?)["']\s*\)""", content):
        t = clean_text(m.group(1))
        if is_valid_text(t):
            texts.add(t)

    return texts


def extract_all_texts(html_dir: Path) -> dict[str, list[str]]:
    """扫描所有 HTML 文件，返回 {filepath: [texts]} """
    all_texts = {}
    html_files = sorted(html_dir.glob("**/*.html"))
    print(f"📂 扫描目录: {html_dir}")
    print(f"📄 找到 {len(html_files)} 个 HTML 文件\n")

    for f in html_files:
        texts = extract_from_html(f)
        if texts:
            all_texts[str(f.relative_to(html_dir))] = sorted(texts)

    total = sum(len(v) for v in all_texts.values())
    unique = set()
    for v in all_texts.values():
        unique.update(v)
    print(f"📊 提取统计:")
    print(f"   涉及文件: {len(all_texts)}")
    print(f"   文本总条目: {total}")
    print(f"   去重后: {len(unique)}")
    return all_texts


# ─────────────────────────────────────────────
# MP3 生成
# ─────────────────────────────────────────────
def text_to_hash(text: str) -> str:
    """文本 → MD5 hash（文件名）"""
    return hashlib.md5(text.encode("utf-8")).hexdigest()


async def generate_one(text: str, output_path: Path, params: dict, retries: int = 3) -> bool:
    """生成单个 MP3，支持重试"""
    for attempt in range(retries):
        try:
            communicate = edge_tts.Communicate(
                text=text,
                voice=params["voice"],
                rate=params["rate"],
                pitch=params["pitch"],
                volume=params["volume"],
            )
            output_path.parent.mkdir(parents=True, exist_ok=True)
            await communicate.save(str(output_path))
            return True
        except Exception as e:
            if attempt < retries - 1:
                await asyncio.sleep(2 * (attempt + 1))  # 指数退避
            else:
                print(f"  ✗ 生成失败({retries}次): [{text[:30]}...] — {e}")
                return False
    return False


async def generate_all_mp3(texts: set[str]) -> dict[str, str]:
    """批量生成 MP3，返回 {text: hash} 映射"""
    semaphore = asyncio.Semaphore(MAX_CONCURRENT)
    results = {}
    total = len(texts)
    done = 0
    skipped = 0
    failed = 0

    async def process(text: str):
        nonlocal done, skipped, failed
        async with semaphore:
            h = text_to_hash(text)
            mp3_path = TTS_DIR / f"{h}.mp3"

            # 已存在则跳过
            if mp3_path.exists() and mp3_path.stat().st_size > 100:
                skipped += 1
                done += 1
                results[text] = h
                return

            lang = detect_lang(text)
            params = get_voice_params(lang)
            ok = await generate_one(text, mp3_path, params)
            if ok:
                results[text] = h
            else:
                failed += 1
            done += 1

            if done % 20 == 0 or done == total:
                print(f"   进度: {done}/{total} (跳过已有: {skipped}, 失败: {failed})")

    tasks = [process(t) for t in sorted(texts)]
    await asyncio.gather(*tasks)

    print(f"\n🎵 MP3 生成完成:")
    print(f"   总计: {total}")
    print(f"   新生成: {total - skipped - failed}")
    print(f"   跳过已有: {skipped}")
    print(f"   失败: {failed}")
    return results


# ─────────────────────────────────────────────
# map.json 生成
# ─────────────────────────────────────────────
def build_map(text_to_hash: dict[str, str]) -> dict[str, str]:
    """构建 map.json: text → hash（不含 .mp3 后缀，与 tts-engine.js 兼容）"""
    return dict(sorted(text_to_hash.items()))


def save_map_json(mapping: dict[str, str], output_path: Path):
    """保存 map.json（UTF-8，无 BOM）"""
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(mapping, f, ensure_ascii=False, indent=2)
    print(f"\n💾 map.json 已保存: {output_path}")
    print(f"   条目数: {len(mapping)}")


# ─────────────────────────────────────────────
# 清理旧文件
# ─────────────────────────────────────────────
def cleanup_old_mp3(valid_hashes: set[str]):
    """删除不在新 map 中的旧 MP3 文件"""
    removed = 0
    for mp3_file in TTS_DIR.glob("*.mp3"):
        h = mp3_file.stem
        if h not in valid_hashes:
            mp3_file.unlink()
            removed += 1
    if removed:
        print(f"🧹 清理旧 MP3: 删除 {removed} 个孤立文件")


# ─────────────────────────────────────────────
# 主流程
# ─────────────────────────────────────────────
async def main():
    print("=" * 60)
    print("  儿童绘本全量 TTS 生成")
    print(f"  中文音色: {VOICE_CN}")
    print(f"  英文音色: {VOICE_EN}")
    print("=" * 60 + "\n")

    # 1. 提取文本
    all_texts = extract_all_texts(COURSEWARE_DIR)

    # 汇总所有唯一文本
    unique_texts = set()
    for texts in all_texts.values():
        unique_texts.update(texts)

    print(f"\n🎯 唯一文本数: {len(unique_texts)}")

    # 统计语言分布
    cn_count = sum(1 for t in unique_texts if detect_lang(t) == "zh")
    en_count = len(unique_texts) - cn_count
    print(f"   中文: {cn_count}")
    print(f"   英文: {en_count}")

    # 2. 生成 MP3
    print(f"\n🔊 开始生成 MP3 ...\n")
    t0 = time.time()
    text_hash_map = await generate_all_mp3(unique_texts)
    elapsed = time.time() - t0
    print(f"⏱  耗时: {elapsed:.1f}s")

    # 3. 生成 map.json
    mapping = build_map(text_hash_map)
    save_map_json(mapping, TTS_DIR / "map.json")

    # 4. 清理旧 MP3
    valid_hashes = set(mapping.values())
    cleanup_old_mp3(valid_hashes)

    # 5. 统计
    mp3_count = len(list(TTS_DIR.glob("*.mp3")))
    print(f"\n✅ 完成！TTS 目录现有 {mp3_count} 个 MP3 文件")
    print(f"   map.json 条目: {len(mapping)}")


if __name__ == "__main__":
    asyncio.run(main())
