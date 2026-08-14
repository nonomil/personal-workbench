# Expand preschool banks from public structures (pinyin initials, letter sounds, Dolch content words).
# Phrases and sample syllables are original. Do not copy yxj sentences.
from pathlib import Path
import json
import subprocess
import sys

root = Path(__file__).resolve().parents[1]
prj = root / "prj"
SOURCE = {
    "kind": "project-original",
    "license": "project-original",
    "attribution": "个人工作台幼儿课程组",
}

PINYIN = [
    ("b", "爸", "bà", "lips"),
    ("p", "皮", "pí", "lips"),
    ("m", "妈", "mā", "lips"),
    ("f", "飞", "fēi", "lips"),
    ("d", "大", "dà", "tip"),
    ("t", "土", "tǔ", "tip"),
    ("n", "你", "nǐ", "tip"),
    ("l", "乐", "lè", "tip"),
    ("g", "哥", "gē", "root"),
    ("k", "可", "kě", "root"),
    ("h", "火", "huǒ", "root"),
    ("j", "鸡", "jī", "palatal"),
    ("q", "七", "qī", "palatal"),
    ("x", "西", "xī", "palatal"),
    ("zh", "中", "zhōng", "retroflex"),
    ("ch", "吃", "chī", "retroflex"),
    ("sh", "山", "shān", "retroflex"),
    ("r", "日", "rì", "retroflex"),
    ("z", "字", "zì", "dental"),
    ("c", "草", "cǎo", "dental"),
    ("s", "三", "sān", "dental"),
    ("y", "雨", "yǔ", "semi"),
    ("w", "我", "wǒ", "semi"),
]

LETTERS = [
    ("a", "a", "apple", "amt"),
    ("m", "m", "map", "amt"),
    ("t", "t", "tap", "amt"),
    ("f", "f", "fan", "fb"),
    ("b", "b", "bat", "fb"),
    ("s", "s", "sat", "extra"),
    ("c", "c", "cat", "extra"),
    ("p", "p", "pat", "extra"),
    ("n", "n", "nap", "extra"),
    ("i", "i", "sit", "extra"),
]

ENGLISH = [
    ("look", "看", "动作", "Look at the sun.", "看看太阳。"),
    ("up", "向上", "描述", "Look up at the sky.", "抬头看天空。"),
    ("down", "向下", "描述", "Sit down, please.", "请坐下。"),
    ("little", "小的", "描述", "I see a little cat.", "我看见一只小猫。"),
    ("help", "帮助", "动作", "Please help me.", "请帮帮我。"),
    ("make", "做", "动作", "I make a cake.", "我做一个蛋糕。"),
    ("find", "找到", "动作", "Find the red ball.", "找到红球。"),
    ("here", "这里", "表达", "Come here, please.", "请到这里来。"),
    ("away", "离开", "动作", "The bird flies away.", "小鸟飞走了。"),
    ("funny", "有趣", "描述", "The monkey is funny.", "猴子很有趣。"),
    ("said", "说", "动作", "Mom said hello.", "妈妈说了你好。"),
    ("we", "我们", "表达", "We like to play.", "我们喜欢玩。"),
    ("they", "他们", "表达", "They are friends.", "他们是朋友。"),
    ("school", "学校", "生活", "I go to school.", "我去学校。"),
    ("student", "学生", "生活", "I am a student.", "我是学生。"),
    ("happy", "高兴", "描述", "I am happy.", "我很高兴。"),
    ("goodbye", "再见", "表达", "Goodbye, see you.", "再见，回头见。"),
    ("where", "哪里", "表达", "Where is my bag?", "我的书包在哪里？"),
    ("mouse", "老鼠", "动物", "The mouse is small.", "老鼠小小的。"),
    ("fox", "狐狸", "动物", "The fox is orange.", "狐狸是橙色的。"),
    ("bus", "公交车", "物品", "The bus is yellow.", "公交车是黄色的。"),
    ("bike", "自行车", "物品", "I ride a bike.", "我骑自行车。"),
]


def write_json(path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("wrote", path, len(payload) if isinstance(payload, list) else "")


def write_pinyin():
    rows = []
    for initial, sample, pinyin, group in PINYIN:
        rows.append({
            "id": f"pinyin-{initial}",
            "initial": initial,
            "sample": sample,
            "pinyin": pinyin,
            "group": group,
            "source": SOURCE,
        })
    write_json(prj / "data" / "preschool" / "识字" / "pinyin-initial-bank.json", rows)


def write_letters():
    rows = []
    for letter, sound, keyword, group in LETTERS:
        rows.append({
            "id": f"letter-{letter}",
            "letter": letter,
            "sound": sound,
            "keyword": keyword,
            "group": group,
            "source": SOURCE,
        })
    write_json(prj / "data" / "preschool" / "english" / "phonics" / "letter-bank.json", rows)


def append_english():
    path = prj / "data" / "preschool" / "英语" / "vocabulary-bank.json"
    bank = json.loads(path.read_text(encoding="utf-8"))
    existing = {str(item.get("text") or "").strip().lower() for item in bank}
    next_id = len(bank) + 1
    added = []
    for text, zh, theme, phrase, phrase_zh in ENGLISH:
        if text.lower() in existing:
            continue
        if text.lower() not in phrase.lower():
            raise SystemExit(f"phrase must contain {text}")
        bank.append({
            "id": f"english-word-{next_id:02d}",
            "text": text,
            "theme": theme,
            "image": "",
            "source": SOURCE,
            "zh": zh,
            "phrase": phrase,
            "phraseZh": phrase_zh,
        })
        existing.add(text.lower())
        added.append(text)
        next_id += 1
    path.write_text(json.dumps(bank, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("english added", added, "total", len(bank))


if __name__ == "__main__":
    write_pinyin()
    write_letters()
    append_english()
    subprocess.check_call([sys.executable, str(root / "scripts" / "build-preschool-banks.py")], cwd=str(root))
