from pathlib import Path
import json

root = Path(__file__).resolve().parents[1]
prj = root / "prj"

SOURCE = {
    "kind": "project-original",
    "license": "project-original",
    "attribution": "个人工作台幼儿课程组",
}

NEW_WORDS = [
    ("go", "走", "动作", "Let's go home.", "我们回家吧。"),
    ("come", "来", "动作", "Come here, please.", "请到这里来。"),
    ("read", "读", "动作", "I read a book.", "我读一本书。"),
    ("write", "写", "动作", "I write my name.", "我写我的名字。"),
    ("draw", "画", "动作", "I draw a sun.", "我画一个太阳。"),
    ("thank", "谢谢", "表达", "Thank you very much.", "非常感谢你。"),
    ("father", "爸爸", "生活", "My father is tall.", "我的爸爸很高。"),
    ("mother", "妈妈", "生活", "My mother is kind.", "我的妈妈很温柔。"),
    ("brother", "哥哥", "生活", "I have a brother.", "我有一个哥哥。"),
    ("sister", "姐姐", "生活", "I have a sister.", "我有一个姐姐。"),
    ("friend", "朋友", "生活", "You are my friend.", "你是我的朋友。"),
    ("baby", "宝宝", "生活", "The baby is cute.", "宝宝很可爱。"),
    ("duck", "鸭子", "动物", "The duck can swim.", "鸭子会游泳。"),
    ("pig", "猪", "动物", "The pig is pink.", "小猪是粉色的。"),
    ("bear", "熊", "动物", "The bear is big.", "熊很大。"),
    ("monkey", "猴子", "动物", "The monkey can climb.", "猴子会爬。"),
    ("rabbit", "兔子", "动物", "The rabbit is white.", "兔子是白色的。"),
    ("bread", "面包", "食物", "I like bread.", "我喜欢面包。"),
    ("rice", "米饭", "食物", "I eat rice.", "我吃米饭。"),
    ("cake", "蛋糕", "食物", "I love cake.", "我喜欢蛋糕。"),
    ("juice", "果汁", "食物", "I drink juice.", "我喝果汁。"),
    ("egg", "鸡蛋", "食物", "I eat an egg.", "我吃一个鸡蛋。"),
    ("pen", "笔", "物品", "I write with a pen.", "我用笔写字。"),
    ("pencil", "铅笔", "物品", "I draw with a pencil.", "我用铅笔画画。"),
    ("ruler", "尺子", "物品", "This is my ruler.", "这是我的尺子。"),
    ("desk", "书桌", "物品", "I sit at the desk.", "我坐在书桌前。"),
    ("chair", "椅子", "物品", "I sit on the chair.", "我坐在椅子上。"),
    ("tall", "高", "描述", "The tree is tall.", "这棵树很高。"),
    ("short", "矮", "描述", "The cat is short.", "这只猫很矮。"),
    ("long", "长", "描述", "The road is long.", "这条路很长。"),
    ("new", "新", "描述", "I have a new bag.", "我有一个新书包。"),
    ("old", "旧", "描述", "This book is old.", "这本书是旧的。"),
    ("me", "我", "表达", "Look at me.", "看看我。"),
    ("you", "你", "表达", "I love you.", "我爱你。"),
    ("he", "他", "表达", "He is a boy.", "他是一个男孩。"),
    ("she", "她", "表达", "She is a girl.", "她是一个女孩。"),
    ("it", "它", "表达", "It is cute.", "它很可爱。"),
    ("hi", "嗨", "表达", "Hi, how are you?", "嗨，你好吗？"),
    ("nice", "好", "表达", "Nice to meet you.", "很高兴见到你。"),
    ("sorry", "对不起", "表达", "I am sorry.", "对不起。"),
    ("okay", "好的", "表达", "It's okay.", "没关系。"),
    ("please", "请", "表达", "Please help me.", "请帮帮我。"),
    ("white", "白色", "颜色", "The cloud is white.", "云是白色的。"),
    ("black", "黑色", "颜色", "The cat is black.", "这只猫是黑色的。"),
    ("one", "一", "描述", "I have one book.", "我有一本书。"),
    ("two", "二", "描述", "I see two birds.", "我看见两只鸟。"),
    ("three", "三", "描述", "I have three apples.", "我有三个苹果。"),
    ("ear", "耳朵", "身体", "Touch your ear.", "摸摸你的耳朵。"),
    ("foot", "脚", "身体", "Stamp your foot.", "跺一跺脚。"),
    ("milk", "牛奶", "食物", "I drink milk.", "我喝牛奶。"),
]


def write_data_js(global_name, payload, out_name):
    body = json.dumps(payload, ensure_ascii=False)
    js = (
        "(function (global) {\n"
        "    'use strict';\n"
        f"    global.{global_name} = "
        + body
        + ";\n"
        "})(typeof window !== 'undefined' ? window : globalThis);\n"
    )
    out = prj / out_name
    out.write_text(js, encoding="utf-8")
    print(out, out.stat().st_size)


def expand_english():
    path = prj / "data" / "preschool" / "英语" / "vocabulary-bank.json"
    bank = json.loads(path.read_text(encoding="utf-8"))
    existing = {str(item.get("text") or "").strip().lower() for item in bank}
    next_id = len(bank) + 1
    for text, zh, theme, phrase, phrase_zh in NEW_WORDS:
        key = text.lower()
        if key in existing:
            continue
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
        existing.add(key)
        next_id += 1
    path.write_text(json.dumps(bank, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    rules = json.loads((prj / "data" / "preschool" / "英语" / "review-rules.json").read_text(encoding="utf-8"))
    write_data_js("PersonalWorkbenchEnglishVocabData", {"bank": bank, "reviewRules": rules}, "preschool-english-vocab-data.js")
    print("english words", len(bank))


def build_phonics():
    bank = json.loads((prj / "data" / "preschool" / "english" / "phonics" / "word-bank.json").read_text(encoding="utf-8"))
    letters_path = prj / "data" / "preschool" / "english" / "phonics" / "letter-bank.json"
    letters = json.loads(letters_path.read_text(encoding="utf-8")) if letters_path.exists() else []
    write_data_js("PersonalWorkbenchPhonicsData", {"bank": bank, "letters": letters}, "preschool-phonics-data.js")


def build_pinyin():
    path = prj / "data" / "preschool" / "识字" / "pinyin-initial-bank.json"
    if not path.exists():
        return
    bank = json.loads(path.read_text(encoding="utf-8"))
    write_data_js("PersonalWorkbenchPinyinData", {"bank": bank}, "preschool-pinyin-data.js")


def build_poetry():
    bank = json.loads((prj / "data" / "preschool" / "古诗" / "poem-bank.json").read_text(encoding="utf-8"))
    write_data_js("PersonalWorkbenchPoetryData", {"bank": bank}, "preschool-poetry-data.js")


def build_math():
    bank = json.loads((prj / "data" / "preschool" / "数学" / "problem-bank.json").read_text(encoding="utf-8"))
    write_data_js("PersonalWorkbenchMathBankData", {"bank": bank}, "preschool-math-data.js")


if __name__ == "__main__":
    expand_english()
    build_phonics()
    build_pinyin()
    build_poetry()
    build_math()
