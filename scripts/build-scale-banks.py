# Build preschool banks to 1500 hanzi + 500 english from reference lists.
# Runtime must not call cnchar; build-time cnchar fills missing 组词 only.
from __future__ import annotations

import csv
import json
import re
import subprocess
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
refs = root / "docs" / "学习项目设计" / "refs"
prj = root / "prj"

HANZI_TARGET = 1500
ENGLISH_TARGET = 500
BANNED = {"坡", "始", "游", "她", "店"}
THEMES = {
    "self", "body", "nature", "number", "family", "food",
    "life", "color", "animal", "action", "quantity", "school",
}

THEME_RULES = [
    ("body", re.compile(r"身体|手|口|耳|目|头|足|眼|鼻|牙|发|脚")),
    ("animal", re.compile(r"动物|猫|狗|兔|鸡|鸭|鹅|猪|龙|虎|象|牛|羊|鸟|鱼|虫|马")),
    ("food", re.compile(r"食物|水果|米|饭|菜|果|瓜|茶|汤|吃")),
    ("family", re.compile(r"家庭|人物|爸|妈|爷|奶|兄|姐|弟|妹|亲")),
    ("number", re.compile(r"数字|一|二|三|四|五|六|七|八|九|十")),
    ("color", re.compile(r"颜色|红|黄|蓝|绿|白|黑")),
    ("action", re.compile(r"动作|走|跑|跳|看|听|说|读|写|玩")),
    ("school", re.compile(r"学校|学|书|字|笔|纸|课")),
    ("nature", re.compile(r"自然|日|月|水|火|山|石|田|土|木|禾|云|雨|风|雪|电|天|地|江|河|湖|海")),
    ("quantity", re.compile(r"多少|大小")),
]


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload):
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def guess_theme(char: str, words: list[str], blob: str = "") -> str:
    text = blob or (char + "".join(words))
    for theme, pattern in THEME_RULES:
        if pattern.search(text):
            return theme
    return "life"


def load_yxj_hanzi():
    path = refs / "yxj-workbench" / "js" / "data-hanzi.js"
    if not path.exists():
        return []
    script = f"""
    const fs = require('fs'); const vm = require('vm');
    const ctx = {{ window: {{}} }}; vm.createContext(ctx);
    vm.runInContext(fs.readFileSync({json.dumps(str(path))}, 'utf8'), ctx);
    process.stdout.write(JSON.stringify(ctx.window.YXJ_HANZI || []));
    """
    raw = subprocess.check_output(["node", "-e", script], cwd=str(root))
    return json.loads(raw)


def load_yxj_english():
    path = refs / "yxj-workbench" / "js" / "data-english.js"
    if not path.exists():
        return {"words": [], "sentences": []}
    script = f"""
    const fs = require('fs'); const vm = require('vm');
    const ctx = {{ window: {{}} }}; vm.createContext(ctx);
    vm.runInContext(fs.readFileSync({json.dumps(str(path))}, 'utf8'), ctx);
    process.stdout.write(JSON.stringify(ctx.window.YXJ_ENGLISH || {{ words: [], sentences: [] }}));
    """
    raw = subprocess.check_output(["node", "-e", script], cwd=str(root))
    return json.loads(raw)


def load_chineseproject_words():
    data_dir = refs / "chineseproject" / "src" / "data"
    words = []
    if not data_dir.exists():
        return words
    for file in data_dir.glob("*.ts"):
        text = file.read_text(encoding="utf-8")
        words.extend(re.findall(r"word:\s*'([^']+)'", text))
    return [w for w in words if w and "/" not in w]


def load_words_game():
    path = refs / "words-game" / "words_game.html"
    if not path.exists():
        return []
    text = path.read_text(encoding="utf-8")
    items = []
    for pattern in (
        re.compile(r"\{en:'((?:\\'|[^'])+)',cn:'((?:\\'|[^'])+)'\}"),
        re.compile(r'\{en:"((?:\\"|[^"])+)",cn:\'((?:\\\'|[^\'])+)\'\}'),
    ):
        for match in pattern.finditer(text):
            items.append({
                "text": match.group(1).replace("\\'", "'").replace('\\"', '"').strip(),
                "zh": match.group(2).replace("\\'", "'").strip(),
                "theme": "生活",
                "attribution": "words-game 译林 4A/4B",
            })
    return items


def load_pep_primary(max_grade: str = "3"):
    path = refs / "pep-english-vocabulary" / "public" / "data" / "pep_english_vocabulary_full.csv"
    if not path.exists():
        return []
    allowed = {str(n) for n in range(1, int(max_grade) + 1)}
    rows = []
    with path.open(encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            grade = str(row.get("grade") or "").strip()
            if grade not in allowed:
                continue
            text = str(row.get("english") or "").strip()
            zh = str(row.get("chinese") or "").strip()
            if not text or not zh:
                continue
            rows.append({
                "text": text,
                "zh": zh,
                "theme": "学校",
                "attribution": f"pep-english-vocabulary grade {grade}",
            })
    return rows


def load_dolch():
    dolch_path = root / "scripts" / "port-public-lists.py"
    text = dolch_path.read_text(encoding="utf-8")
    block = text.split("DOLCH = [", 1)[1].split("]", 1)[0]
    rows = []
    for match in re.finditer(r'\("([^"]+)",\s*"([^"]+)"\)', block):
        rows.append({
            "text": match.group(1),
            "zh": match.group(2),
            "theme": "高频词",
            "attribution": "Dolch sight words",
        })
    return rows


def load_common_chars(limit: int = 3500):
    freq_path = refs / "kids-learning-cards" / "hanzi-card" / "references" / "hanzi_freq.csv"
    chars = []
    if freq_path.exists():
        with freq_path.open(encoding="utf-8") as handle:
            reader = csv.DictReader(handle)
            for row in reader:
                char = str(row.get("character") or "").strip()
                if len(char) == 1 and char not in BANNED:
                    chars.append(char)
                if len(chars) >= limit:
                    break
    if not chars:
        gsc_path = refs / "general_standard_chinese" / "gsc_level_1.txt"
        for line in gsc_path.read_text(encoding="utf-8").splitlines():
            parts = line.strip().split()
            if len(parts) >= 2 and parts[1] not in BANNED:
                chars.append(parts[1])
            if len(chars) >= limit:
                break
    return set(chars)


def load_freq_char_stream(limit: int = 1800):
    freq_path = refs / "kids-learning-cards" / "hanzi-card" / "references" / "hanzi_freq.csv"
    gsc_path = refs / "general_standard_chinese" / "gsc_level_1.txt"
    pinyin_map = {}
    pinyin_csv = refs / "general_standard_chinese" / "gsc_pinyin_with_tone.csv"
    if pinyin_csv.exists():
        with pinyin_csv.open(encoding="utf-8") as handle:
            reader = csv.DictReader(handle)
            for row in reader:
                word = str(row.get("word") or "").strip()
                if len(word) == 1:
                    pinyin_map[word] = str(row.get("pinyin") or "").split(",")[0].strip()

    stream = []
    if freq_path.exists():
        with freq_path.open(encoding="utf-8") as handle:
            reader = csv.DictReader(handle)
            for row in reader:
                char = str(row.get("character") or "").strip()
                if len(char) != 1 or char in BANNED:
                    continue
                stream.append({
                    "char": char,
                    "pinyin": str(row.get("pinyin") or "").split(",")[0].strip() or pinyin_map.get(char, ""),
                    "explain": "",
                })
    elif gsc_path.exists():
        for line in gsc_path.read_text(encoding="utf-8").splitlines():
            parts = line.strip().split()
            if len(parts) < 2:
                continue
            char = parts[1]
            if len(char) != 1 or char in BANNED:
                continue
            stream.append({"char": char, "pinyin": pinyin_map.get(char, ""), "explain": ""})
    return stream[:limit]


def load_freq_chars(limit: int = HANZI_TARGET):
    return load_freq_char_stream(limit)[:limit]


def build_word_pool(existing_bank, poem_bank):
    pool = set()
    for row in existing_bank:
        for word in row[3]:
            if 2 <= len(word) <= 4:
                pool.add(word)
    for item in load_yxj_hanzi():
        word = str(item.get("word") or "").strip()
        if 2 <= len(word) <= 4:
            pool.add(word)
    for word in load_chineseproject_words():
        if 2 <= len(word) <= 4:
            pool.add(word)
    for poem in poem_bank:
        for line in poem.get("lines") or []:
            chunks = re.findall(r"[\u4e00-\u9fff]{2,4}", line)
            pool.update(chunks)
    gsc_words = refs / "general_standard_chinese" / "backup" / "word_05_31.csv"
    if gsc_words.exists():
        with gsc_words.open(encoding="utf-8") as handle:
            reader = csv.DictReader(handle)
            for row in reader:
                word = str(row.get("word") or "").split(",")[0].strip()
                if 2 <= len(word) <= 4 and all("\u4e00" <= ch <= "\u9fff" for ch in word):
                    pool.add(word)
    return sorted(pool, key=lambda w: (len(w), w))


def pick_words(char: str, pool: list[str], allowed: set[str]):
    picked = []
    seen = set()
    for word in pool:
        if char not in word or word in seen or word == "山寨":
            continue
        if any(b in word for b in BANNED):
            continue
        hanzi = [c for c in word if "\u4e00" <= c <= "\u9fff"]
        if not hanzi or any(c not in allowed for c in hanzi):
            continue
        seen.add(word)
        picked.append(word)
        if len(picked) >= 2:
            break
    return picked


def cnchar_words(missing: list[str], allowed: set[str]):
    if not missing:
        return {}
    script = root / "scripts" / "cnchar-word-lookup.mjs"
    temp = root / "scripts" / ".cnchar-lookup-input.json"
    merged = {}
    try:
        for start in range(0, len(missing), 120):
            chunk = missing[start:start + 120]
            payload = json.dumps({"chars": chunk, "allowed": sorted(allowed)}, ensure_ascii=False)
            temp.write_text(payload, encoding="utf-8")
            raw = subprocess.check_output(["node", str(script), f"@{temp}"], cwd=str(root))
            merged.update(json.loads(raw))
    finally:
        if temp.exists():
            temp.unlink()
    return merged


def resolve_words(char: str, row_words: list[str], pool: list[str], allowed: set[str], lookup: dict):
    words = [w for w in row_words if char in w and w != "山寨" and not any(b in w for b in BANNED)]
    if len(words) < 2:
        words.extend(pick_words(char, pool, allowed))
    if len(words) < 2:
        words.extend(lookup.get(char) or [])
    merged = []
    seen = set()
    for word in words:
        if not isinstance(word, str) or char not in word or word in seen or word == "山寨":
            continue
        if any(b in word for b in BANNED):
            continue
        hanzi = [c for c in word if "\u4e00" <= c <= "\u9fff"]
        if hanzi and any(c not in allowed for c in hanzi):
            continue
        seen.add(word)
        merged.append(word)
        if len(merged) >= 2:
            break
    if len(merged) < 2:
        for word in pool:
            if char not in word or word in seen or word == "山寨" or any(b in word for b in BANNED):
                continue
            hanzi = [c for c in word if "\u4e00" <= c <= "\u9fff"]
            if hanzi and any(c not in allowed for c in hanzi):
                continue
            seen.add(word)
            merged.append(word)
            if len(merged) >= 2:
                break
    return merged[:2]


def build_hanzi_bank():
    path = prj / "data" / "preschool" / "识字" / "character-bank.json"
    existing = read_json(path)
    existing_map = {row[0]: row for row in existing}
    poem_bank = read_json(prj / "data" / "preschool" / "古诗" / "poem-bank.json")
    stream = load_freq_char_stream(HANZI_TARGET + 400)
    common_chars = load_common_chars(3500)
    allowed = set(common_chars)
    pool = build_word_pool(existing, poem_bank)
    lookup = cnchar_words([item["char"] for item in stream], allowed)

    bank = []
    skipped = []
    for item in stream:
        if len(bank) >= HANZI_TARGET:
            break
        char = item["char"]
        row = existing_map.get(char)
        row_words = list(row[3]) if row else []
        words = resolve_words(char, row_words, pool, allowed, lookup)
        if len(words) < 2:
            skipped.append(char)
            continue
        if row:
            next_row = row[:]
            next_row[3] = words
            if item["pinyin"]:
                next_row[1] = next_row[1] or item["pinyin"]
            bank.append(next_row)
            continue
        theme = guess_theme(char, words, item.get("explain", ""))
        next_row = [char, item["pinyin"], theme if theme in THEMES else "life", words]
        if item.get("explain"):
            next_row.append(item["explain"])
        bank.append(next_row)

    if len(bank) < HANZI_TARGET:
        raise SystemExit(f"hanzi bank short: {len(bank)} < {HANZI_TARGET}, skipped {len(set(skipped))}")

    write_json(path, bank)
    print("hanzi", len(bank), "skipped", len(set(skipped)))
    return len(bank)


def word_pattern(text: str):
    key = re.escape(str(text or "").strip().lower()).replace(r"\ ", r"\s+")
    return re.compile(rf"(?:^|[^a-z]){key}(?:[^a-z]|$)", re.I)


def find_yxj_sentence(text: str, sentences: list[dict]):
    pattern = word_pattern(text)
    for item in sentences:
        if pattern.search(str(item.get("en") or "")):
            return item
    return None


def next_english_id(bank):
    max_id = 0
    for item in bank:
        match = re.search(r"(\d+)$", str(item.get("id") or ""))
        if match:
            max_id = max(max_id, int(match.group(1)))
    return max_id + 1


def append_english(bank, existing, item, sentences, next_id):
    key = item["text"].lower()
    if not item["text"] or not item["zh"] or key in existing:
        return next_id, 0
    hit = find_yxj_sentence(item["text"], sentences)
    phrase = str(hit["en"]).strip() if hit else item["text"]
    phrase_zh = str(hit.get("zh") or item["zh"]).strip() if hit else item["zh"]
    if not word_pattern(item["text"]).search(phrase) and phrase.lower() != key:
        phrase = item["text"]
        phrase_zh = item["zh"]
    bank.append({
        "id": f"english-word-{next_id:02d}",
        "text": item["text"],
        "theme": item.get("theme") or "生活",
        "image": "",
        "source": {
            "kind": "reference-port",
            "license": "reference",
            "attribution": item.get("attribution") or "reference",
        },
        "zh": item["zh"],
        "phrase": phrase,
        "phraseZh": phrase_zh,
    })
    existing.add(key)
    return next_id + 1, 1


def upgrade_phrases(bank, sentences):
    upgraded = 0
    for item in bank:
        hit = find_yxj_sentence(item["text"], sentences)
        if not hit:
            continue
        phrase = str(hit["en"]).strip()
        phrase_zh = str(hit.get("zh") or item.get("phraseZh") or item["zh"]).strip()
        if phrase == item.get("phrase"):
            continue
        if not word_pattern(item["text"]).search(phrase):
            continue
        item["phrase"] = phrase
        item["phraseZh"] = phrase_zh
        item["source"] = {
            "kind": "reference-port",
            "license": "reference",
            "attribution": "yxj-workbench sentences",
        }
        upgraded += 1
    return upgraded


def build_english_bank():
    path = prj / "data" / "preschool" / "英语" / "vocabulary-bank.json"
    bank = read_json(path)
    existing = {str(item.get("text") or "").strip().lower() for item in bank}
    yxj = load_yxj_english()
    sentences = yxj.get("sentences") or []
    next_id = next_english_id(bank)
    added = 0

    incoming = []
    for item in yxj.get("words") or []:
        incoming.append({
            "text": str(item.get("en") or "").strip(),
            "zh": str(item.get("zh") or "").strip(),
            "theme": str(item.get("theme") or "生活"),
            "attribution": "yxj-workbench words",
        })
    incoming.extend(load_words_game())
    incoming.extend(load_pep_primary("3"))
    incoming.extend(load_dolch())

    for item in incoming:
        next_id, delta = append_english(bank, existing, item, sentences, next_id)
        added += delta

    if len(bank) < ENGLISH_TARGET:
        raise SystemExit(f"english bank short: {len(bank)} < {ENGLISH_TARGET} after adding {added}")

    upgraded = upgrade_phrases(bank, sentences)
    write_json(path, bank)
    print("english", len(bank), "added", added, "phrases_upgraded", upgraded)
    return len(bank)


def run_build_scripts():
    subprocess.check_call([sys.executable, str(root / "scripts" / "assign-bank-levels.py")], cwd=str(root))
    subprocess.check_call([sys.executable, str(root / "scripts" / "build-literacy-data.py")], cwd=str(root))
    subprocess.check_call([sys.executable, str(root / "scripts" / "build-preschool-banks.py")], cwd=str(root))


if __name__ == "__main__":
    hanzi = build_hanzi_bank()
    english = build_english_bank()
    run_build_scripts()
    print(json.dumps({"hanzi": hanzi, "english": english}, ensure_ascii=False))
