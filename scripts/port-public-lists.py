# Port public lists into preschool banks: Hanyu Pinyin scheme + Dolch 220 + 26 letter keywords.
# Do not copy yxj sentences or PEP textbook sentences.
from pathlib import Path
import json
import subprocess
import sys

root = Path(__file__).resolve().parents[1]
prj = root / "prj"
ORIGINAL = {
    "kind": "project-original",
    "license": "project-original",
    "attribution": "个人工作台幼儿课程组",
}
DOLCH_SOURCE = {
    "kind": "public-domain",
    "license": "public-domain",
    "attribution": "Dolch sight words",
}

INITIALS = [
    ("b", "爸", "bà", "initial", "lips"),
    ("p", "皮", "pí", "initial", "lips"),
    ("m", "妈", "mā", "initial", "lips"),
    ("f", "飞", "fēi", "initial", "lips"),
    ("d", "大", "dà", "initial", "tip"),
    ("t", "土", "tǔ", "initial", "tip"),
    ("n", "你", "nǐ", "initial", "tip"),
    ("l", "乐", "lè", "initial", "tip"),
    ("g", "哥", "gē", "initial", "root"),
    ("k", "可", "kě", "initial", "root"),
    ("h", "火", "huǒ", "initial", "root"),
    ("j", "鸡", "jī", "initial", "palatal"),
    ("q", "七", "qī", "initial", "palatal"),
    ("x", "西", "xī", "initial", "palatal"),
    ("zh", "知", "zhī", "initial", "retroflex"),
    ("ch", "吃", "chī", "initial", "retroflex"),
    ("sh", "师", "shī", "initial", "retroflex"),
    ("r", "日", "rì", "initial", "retroflex"),
    ("z", "字", "zì", "initial", "dental"),
    ("c", "草", "cǎo", "initial", "dental"),
    ("s", "丝", "sī", "initial", "dental"),
    ("y", "衣", "yī", "initial", "semi"),
    ("w", "乌", "wū", "initial", "semi"),
]

FINALS = [
    ("a", "啊", "ā", "final", "simple"),
    ("o", "哦", "ó", "final", "simple"),
    ("e", "鹅", "é", "final", "simple"),
    ("i", "衣", "yī", "final", "simple"),
    ("u", "乌", "wū", "final", "simple"),
    ("ü", "鱼", "yú", "final", "simple"),
    ("ai", "爱", "ài", "final", "compound"),
    ("ei", "诶", "ēi", "final", "compound"),
    ("ui", "喂", "wèi", "final", "compound"),
    ("ao", "袄", "ǎo", "final", "compound"),
    ("ou", "欧", "ōu", "final", "compound"),
    ("iu", "优", "yōu", "final", "compound"),
    ("ie", "耶", "yē", "final", "compound"),
    ("üe", "月", "yuè", "final", "compound"),
    ("er", "耳", "ěr", "final", "special"),
    ("an", "安", "ān", "final", "front-nasal"),
    ("en", "恩", "ēn", "final", "front-nasal"),
    ("in", "因", "yīn", "final", "front-nasal"),
    ("un", "温", "wēn", "final", "front-nasal"),
    ("ün", "云", "yún", "final", "front-nasal"),
    ("ang", "昂", "áng", "final", "back-nasal"),
    ("eng", "亨", "hēng", "final", "back-nasal"),
    ("ing", "英", "yīng", "final", "back-nasal"),
    ("ong", "翁", "wēng", "final", "back-nasal"),
]

WHOLE = [
    ("zhi", "知", "zhī", "whole", "whole"),
    ("chi", "吃", "chī", "whole", "whole"),
    ("shi", "师", "shī", "whole", "whole"),
    ("ri", "日", "rì", "whole", "whole"),
    ("zi", "字", "zì", "whole", "whole"),
    ("ci", "次", "cì", "whole", "whole"),
    ("si", "丝", "sī", "whole", "whole"),
    ("yi", "衣", "yī", "whole", "whole"),
    ("wu", "乌", "wū", "whole", "whole"),
    ("yu", "鱼", "yú", "whole", "whole"),
    ("ye", "叶", "yè", "whole", "whole"),
    ("yue", "月", "yuè", "whole", "whole"),
    ("yuan", "元", "yuán", "whole", "whole"),
    ("yin", "因", "yīn", "whole", "whole"),
    ("yun", "云", "yún", "whole", "whole"),
    ("ying", "英", "yīng", "whole", "whole"),
]

LETTERS = [
    ("a", "a", "apple"), ("b", "b", "bat"), ("c", "c", "cat"), ("d", "d", "dog"),
    ("e", "e", "egg"), ("f", "f", "fan"), ("g", "g", "goat"), ("h", "h", "hat"),
    ("i", "i", "igloo"), ("j", "j", "jam"), ("k", "k", "kite"), ("l", "l", "leaf"),
    ("m", "m", "map"), ("n", "n", "net"), ("o", "o", "octopus"), ("p", "p", "pan"),
    ("q", "q", "queen"), ("r", "r", "rat"), ("s", "s", "sun"), ("t", "t", "tap"),
    ("u", "u", "umbrella"), ("v", "v", "van"), ("w", "w", "web"), ("x", "x", "box"),
    ("y", "y", "yellow"), ("z", "z", "zip"),
]

DOLCH = [
    ("a", "一个"), ("and", "和"), ("away", "离开"), ("big", "大"), ("blue", "蓝色"),
    ("can", "能"), ("come", "来"), ("down", "向下"), ("find", "找到"), ("for", "为了"),
    ("funny", "有趣"), ("go", "去"), ("help", "帮助"), ("here", "这里"), ("i", "我"),
    ("in", "在里面"), ("is", "是"), ("it", "它"), ("jump", "跳"), ("little", "小的"),
    ("look", "看"), ("make", "做"), ("me", "我"), ("my", "我的"), ("not", "不"),
    ("one", "一"), ("play", "玩"), ("red", "红色"), ("run", "跑"), ("said", "说"),
    ("see", "看见"), ("the", "这"), ("three", "三"), ("to", "到"), ("two", "二"),
    ("up", "向上"), ("we", "我们"), ("where", "哪里"), ("yellow", "黄色"), ("you", "你"),
    ("all", "全部"), ("am", "是"), ("are", "是"), ("at", "在"), ("ate", "吃了"),
    ("be", "是"), ("black", "黑色"), ("brown", "棕色"), ("but", "但是"), ("came", "来了"),
    ("did", "做了"), ("do", "做"), ("eat", "吃"), ("four", "四"), ("get", "得到"),
    ("good", "好"), ("have", "有"), ("he", "他"), ("into", "进入"), ("like", "喜欢"),
    ("must", "必须"), ("new", "新"), ("no", "不"), ("now", "现在"), ("on", "在上面"),
    ("our", "我们的"), ("out", "出去"), ("please", "请"), ("pretty", "漂亮"), ("ran", "跑了"),
    ("ride", "骑"), ("saw", "看见了"), ("say", "说"), ("she", "她"), ("so", "所以"),
    ("soon", "很快"), ("that", "那个"), ("there", "那里"), ("they", "他们"), ("this", "这个"),
    ("too", "也"), ("under", "在下面"), ("want", "想要"), ("was", "是"), ("well", "好"),
    ("went", "去了"), ("what", "什么"), ("white", "白色"), ("who", "谁"), ("will", "将"),
    ("with", "和"), ("yes", "是的"),
    ("after", "之后"), ("again", "再一次"), ("an", "一个"), ("any", "任何"), ("as", "作为"),
    ("ask", "问"), ("by", "在旁边"), ("could", "能够"), ("every", "每个"), ("fly", "飞"),
    ("from", "从"), ("give", "给"), ("going", "正在去"), ("had", "有过"), ("has", "有"),
    ("her", "她的"), ("him", "他"), ("his", "他的"), ("how", "怎样"), ("just", "只是"),
    ("know", "知道"), ("let", "让"), ("live", "住"), ("may", "可以"), ("of", "的"),
    ("old", "旧"), ("once", "一次"), ("open", "打开"), ("over", "在上面"), ("put", "放"),
    ("round", "圆的"), ("some", "一些"), ("stop", "停"), ("take", "拿"), ("thank", "谢谢"),
    ("them", "他们"), ("then", "然后"), ("think", "想"), ("walk", "走"), ("were", "是"),
    ("when", "什么时候"),
    ("always", "总是"), ("around", "周围"), ("because", "因为"), ("been", "已经"),
    ("before", "之前"), ("best", "最好"), ("both", "两个"), ("buy", "买"), ("call", "叫"),
    ("cold", "冷"), ("does", "做"), ("fast", "快"), ("first", "第一"), ("five", "五"),
    ("found", "找到了"), ("gave", "给了"), ("goes", "去"), ("green", "绿色"), ("its", "它的"),
    ("made", "做了"), ("many", "许多"), ("off", "离开"), ("or", "或者"), ("pull", "拉"),
    ("read", "读"), ("right", "对"), ("sing", "唱"), ("sit", "坐"), ("sleep", "睡"),
    ("tell", "告诉"), ("their", "他们的"), ("these", "这些"), ("those", "那些"),
    ("upon", "在之上"), ("us", "我们"), ("use", "用"), ("very", "非常"), ("wash", "洗"),
    ("which", "哪一个"), ("why", "为什么"), ("wish", "希望"), ("work", "工作"),
    ("would", "会"), ("write", "写"), ("your", "你的"),
    ("about", "关于"), ("better", "更好"), ("bring", "带来"), ("carry", "搬"),
    ("clean", "干净"), ("cut", "切"), ("done", "做完"), ("draw", "画"), ("drink", "喝"),
    ("eight", "八"), ("fall", "落下"), ("far", "远"), ("full", "满"), ("got", "得到了"),
    ("grow", "生长"), ("hold", "拿着"), ("hot", "热"), ("hurt", "疼"), ("if", "如果"),
    ("keep", "保持"), ("kind", "善良"), ("laugh", "笑"), ("light", "灯"), ("long", "长"),
    ("much", "许多"), ("myself", "我自己"), ("never", "从不"), ("only", "只有"),
    ("own", "自己的"), ("pick", "挑选"), ("seven", "七"), ("show", "展示"), ("six", "六"),
    ("small", "小"), ("start", "开始"), ("ten", "十"), ("today", "今天"),
    ("together", "一起"), ("try", "尝试"), ("warm", "暖和"),
]


def write_json(path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_pinyin():
    rows = []
    for text, sample, pinyin, kind, group in INITIALS + FINALS + WHOLE:
        rows.append({
            "id": f"pinyin-{kind}-{text}",
            "text": text,
            "initial": text if kind == "initial" else "",
            "sample": sample,
            "pinyin": pinyin,
            "kind": kind,
            "group": group,
            "source": ORIGINAL,
        })
    write_json(prj / "data" / "preschool" / "识字" / "pinyin-initial-bank.json", rows)
    print("pinyin", len(rows))


def write_letters():
    rows = []
    for letter, sound, keyword in LETTERS:
        group = "amt" if letter in "amt" else ("fb" if letter in "fb" else "alpha")
        rows.append({
            "id": f"letter-{letter}",
            "letter": letter,
            "sound": sound,
            "keyword": keyword,
            "group": group,
            "source": ORIGINAL,
        })
    write_json(prj / "data" / "preschool" / "english" / "phonics" / "letter-bank.json", rows)
    print("letters", len(rows))


def append_dolch():
    path = prj / "data" / "preschool" / "英语" / "vocabulary-bank.json"
    bank = json.loads(path.read_text(encoding="utf-8"))
    existing = {str(item.get("text") or "").strip().lower() for item in bank}
    next_id = len(bank) + 1
    added = 0
    for text, zh in DOLCH:
        key = text.lower()
        if key in existing:
            continue
        phrase = f"I know {text}."
        if key not in phrase.lower():
            phrase = f"{text} is here."
        bank.append({
            "id": f"english-word-{next_id:02d}",
            "text": text,
            "theme": "高频词",
            "image": "",
            "source": DOLCH_SOURCE,
            "zh": zh,
            "phrase": phrase,
            "phraseZh": f"我认识{zh}。",
        })
        existing.add(key)
        added += 1
        next_id += 1
    path.write_text(json.dumps(bank, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("english added", added, "total", len(bank))
    return len(bank)


if __name__ == "__main__":
    write_pinyin()
    write_letters()
    append_dolch()
    subprocess.check_call([sys.executable, str(root / "scripts" / "build-preschool-banks.py")], cwd=str(root))
