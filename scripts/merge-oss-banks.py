# Screen preschool words/chars from local OSS clones under tmp/research/.
# Do not copy yxj sentences, kids-learning-cards YAML, or PEP textbook dumps.
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

# text, zh, theme, phrase, phraseZh — phrases are original child English.
OSS_WORDS = [
    ("bag", "书包", "物品", "This is my bag.", "这是我的书包。"),
    ("bed", "床", "物品", "I sleep on the bed.", "我在床上睡觉。"),
    ("bee", "蜜蜂", "动物", "A bee is on the flower.", "花上有一只蜜蜂。"),
    ("blocks", "积木", "物品", "I play with blocks.", "我玩积木。"),
    ("bubble", "泡泡", "物品", "Look at the bubble.", "看这个泡泡。"),
    ("butterfly", "蝴蝶", "动物", "The butterfly is pretty.", "这只蝴蝶很漂亮。"),
    ("candy", "糖果", "食物", "I like candy.", "我喜欢糖果。"),
    ("car", "小汽车", "物品", "The car is red.", "这辆小汽车是红色的。"),
    ("cherry", "樱桃", "食物", "I eat a cherry.", "我吃一颗樱桃。"),
    ("chicken", "鸡", "动物", "The chicken is small.", "这只鸡小小的。"),
    ("clock", "时钟", "物品", "Look at the clock.", "看看时钟。"),
    ("cloud", "云", "自然", "A white cloud is in the sky.", "天上有一朵白云。"),
    ("cookie", "饼干", "食物", "I eat a cookie.", "我吃一块饼干。"),
    ("cow", "奶牛", "动物", "The cow is big.", "这头奶牛很大。"),
    ("dad", "爸爸", "生活", "My dad is here.", "我的爸爸在这里。"),
    ("dance", "跳舞", "动作", "I like to dance.", "我喜欢跳舞。"),
    ("doll", "娃娃", "物品", "This doll is cute.", "这个娃娃很可爱。"),
    ("drink", "喝", "动作", "I drink water.", "我喝水。"),
    ("eat", "吃", "动作", "I eat an apple.", "我吃一个苹果。"),
    ("eight", "八", "描述", "I see eight stars.", "我看见八颗星星。"),
    ("elephant", "大象", "动物", "The elephant is huge.", "大象非常大。"),
    ("five", "五", "描述", "I have five fingers.", "我有五根手指。"),
    ("four", "四", "描述", "I see four birds.", "我看见四只鸟。"),
    ("frog", "青蛙", "动物", "The frog can jump.", "青蛙会跳。"),
    ("giraffe", "长颈鹿", "动物", "The giraffe is tall.", "长颈鹿很高。"),
    ("grandma", "奶奶", "生活", "My grandma is kind.", "我的奶奶很温柔。"),
    ("grandpa", "爷爷", "生活", "My grandpa reads a book.", "我的爷爷在看书。"),
    ("grape", "葡萄", "食物", "I eat a grape.", "我吃一颗葡萄。"),
    ("hair", "头发", "身体", "Touch your hair.", "摸摸你的头发。"),
    ("hat", "帽子", "物品", "I wear a hat.", "我戴一顶帽子。"),
    ("head", "头", "身体", "Touch your head.", "摸摸你的头。"),
    ("horse", "马", "动物", "The horse can run.", "马会跑。"),
    ("kite", "风筝", "物品", "I fly a kite.", "我放风筝。"),
    ("lion", "狮子", "动物", "The lion is strong.", "狮子很强壮。"),
    ("mom", "妈妈", "生活", "My mom is here.", "我的妈妈在这里。"),
    ("mouth", "嘴巴", "身体", "Open your mouth.", "张开你的嘴巴。"),
    ("nine", "九", "描述", "I count to nine.", "我数到九。"),
    ("noodles", "面条", "食物", "I eat noodles.", "我吃面条。"),
    ("nose", "鼻子", "身体", "Touch your nose.", "摸摸你的鼻子。"),
    ("orange", "橘子", "食物", "I eat an orange.", "我吃一个橘子。"),
    ("panda", "熊猫", "动物", "The panda is black and white.", "熊猫是黑白的。"),
    ("peach", "桃子", "食物", "This peach is sweet.", "这个桃子很甜。"),
    ("pear", "梨", "食物", "I eat a pear.", "我吃一个梨。"),
    ("pink", "粉色", "颜色", "The flower is pink.", "这朵花是粉色的。"),
    ("purple", "紫色", "颜色", "The grape is purple.", "葡萄是紫色的。"),
    ("puzzle", "拼图", "物品", "I do a puzzle.", "我玩拼图。"),
    ("rain", "雨", "自然", "The rain is falling.", "下雨了。"),
    ("seven", "七", "描述", "I see seven ducks.", "我看见七只鸭子。"),
    ("sheep", "羊", "动物", "The sheep is white.", "这只羊是白色的。"),
    ("shoe", "鞋子", "物品", "Put on your shoe.", "穿上你的鞋子。"),
    ("sing", "唱歌", "动作", "I like to sing.", "我喜欢唱歌。"),
    ("six", "六", "描述", "I have six crayons.", "我有六支蜡笔。"),
    ("sleep", "睡觉", "动作", "I sleep at night.", "我晚上睡觉。"),
    ("snow", "雪", "自然", "The snow is white.", "雪是白色的。"),
    ("strawberry", "草莓", "食物", "I eat a strawberry.", "我吃一颗草莓。"),
    ("table", "桌子", "物品", "The book is on the table.", "书在桌子上。"),
    ("ten", "十", "描述", "I count to ten.", "我数到十。"),
    ("tiger", "老虎", "动物", "The tiger is orange.", "老虎是橙色的。"),
    ("toy", "玩具", "物品", "This toy is fun.", "这个玩具很好玩。"),
    ("walk", "走", "动作", "I walk to school.", "我走到学校。"),
    ("watermelon", "西瓜", "食物", "The watermelon is sweet.", "西瓜很甜。"),
    ("wind", "风", "自然", "The wind is soft.", "风轻轻的。"),
    ("box", "盒子", "物品", "Open the box.", "打开盒子。"),
    ("door", "门", "物品", "Please close the door.", "请把门关上。"),
    ("dress", "裙子", "物品", "She has a blue dress.", "她有一条蓝裙子。"),
    ("face", "脸", "身体", "Wash your face.", "洗洗脸。"),
    ("hungry", "饿", "描述", "I am hungry.", "我饿了。"),
    ("light", "灯", "物品", "Turn on the light.", "把灯打开。"),
    ("no", "不", "表达", "No, thank you.", "不用了，谢谢。"),
    ("plane", "飞机", "物品", "The plane is in the sky.", "飞机在天上。"),
    ("schoolbag", "书包", "物品", "My schoolbag is heavy.", "我的书包有点重。"),
    ("shirt", "衬衫", "物品", "This shirt is blue.", "这件衬衫是蓝色的。"),
    ("shorts", "短裤", "物品", "I wear shorts today.", "我今天穿短裤。"),
    ("skirt", "短裙", "物品", "The skirt is pink.", "这条短裙是粉色的。"),
    ("socks", "袜子", "物品", "Put on your socks.", "穿上你的袜子。"),
    ("tea", "茶", "食物", "Mom drinks tea.", "妈妈喝茶。"),
    ("teacher", "老师", "生活", "My teacher is kind.", "我的老师很温柔。"),
    ("thirsty", "渴", "描述", "I am thirsty.", "我渴了。"),
    ("train", "火车", "物品", "The train is long.", "火车很长。"),
    ("vegetable", "蔬菜", "食物", "Eat a vegetable.", "吃一点蔬菜。"),
    ("water", "水", "食物", "I drink water.", "我喝水。"),
    ("yes", "是", "表达", "Yes, I like it.", "是的，我喜欢。"),
]

# char, pinyin, theme, words — original child words, not yxj mean/stroke copy.
OSS_HANZI = [
    ["足", "zú", "body", ["足球", "手足"]],
    ["目", "mù", "body", ["目光", "数目"]],
    ["禾", "hé", "nature", ["禾苗", "稻禾"]],
    ["竹", "zhú", "nature", ["竹子", "竹叶"]],
    ["户", "hù", "life", ["窗户", "住户"]],
    ["地", "dì", "nature", ["地上", "土地"]],
    ["入", "rù", "life", ["入口", "进入"]],
    ["国", "guó", "life", ["中国", "国旗"]],
    ["父", "fù", "family", ["父亲", "父母"]],
    ["母", "mǔ", "family", ["母亲", "父母"]],
    ["本", "běn", "school", ["本子", "书本"]],
    ["袜", "wà", "body", ["袜子", "毛袜"]],
    ["百", "bǎi", "number", ["一百", "百花"]],
    ["千", "qiān", "number", ["一千", "千万"]],
    ["万", "wàn", "number", ["一万", "千万"]],
    ["夜", "yè", "nature", ["夜晚", "黑夜"]],
    ["阴", "yīn", "nature", ["阴天", "树阴"]],
    ["江", "jiāng", "nature", ["江水", "大江"]],
    ["湖", "hú", "nature", ["湖水", "小湖"]],
    ["桥", "qiáo", "life", ["大桥", "小桥"]],
    ["楼", "lóu", "life", ["高楼", "楼房"]],
    ["钟", "zhōng", "life", ["时钟", "闹钟"]],
    ["龙", "lóng", "nature", ["小龙", "恐龙"]],
    ["虎", "hǔ", "nature", ["老虎", "小虎"]],
    ["象", "xiàng", "nature", ["大象", "小象"]],
]


def merge_english():
    path = prj / "data" / "preschool" / "英语" / "vocabulary-bank.json"
    bank = json.loads(path.read_text(encoding="utf-8"))
    existing = {str(item.get("text") or "").strip().lower() for item in bank}
    next_id = len(bank) + 1
    added = []
    for text, zh, theme, phrase, phrase_zh in OSS_WORDS:
        key = text.lower()
        if key in existing:
            continue
        if text.lower() not in phrase.lower():
            raise SystemExit(f"phrase must contain {text}: {phrase}")
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
        added.append(text)
        next_id += 1
    path.write_text(json.dumps(bank, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("english added", len(added), "total", len(bank))
    return len(bank)


def merge_hanzi():
    path = prj / "data" / "preschool" / "识字" / "character-bank.json"
    bank = json.loads(path.read_text(encoding="utf-8"))
    existing = {row[0] for row in bank}
    added = []
    for row in OSS_HANZI:
        char = row[0]
        if char in existing:
            continue
        words = row[3]
        if len(words) < 2 or any(char not in word for word in words):
            raise SystemExit(f"bad hanzi row {row}")
        bank.append(row)
        existing.add(char)
        added.append(char)
    path.write_text(json.dumps(bank, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("hanzi added", "".join(added), "total", len(bank))
    return len(bank)


def run(script_name):
    subprocess.check_call([sys.executable, str(root / "scripts" / script_name)], cwd=str(root))


if __name__ == "__main__":
    merge_english()
    merge_hanzi()
    run("build-preschool-banks.py")
    run("build-literacy-data.py")
