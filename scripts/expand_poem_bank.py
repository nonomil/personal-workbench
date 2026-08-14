# Expand poem-bank.json with public-domain 小学必背 verses.
# Does not copy yxj-workbench translations; lines only.
from pathlib import Path
import json

root = Path(__file__).resolve().parents[1]
path = root / "prj" / "data" / "preschool" / "古诗" / "poem-bank.json"
SOURCE = {
    "kind": "public-domain",
    "license": "public-domain",
    "attribution": "原诗公有领域",
}

def poem(poem_id, title, author, theme, lines):
    return {
        "id": poem_id,
        "title": title,
        "author": author,
        "theme": theme,
        "lines": lines,
        "source": SOURCE,
    }

# Keep the existing 8 first so current lesson ids stay stable.
EXISTING = json.loads(path.read_text(encoding="utf-8"))
existing_ids = {item["id"] for item in EXISTING}

NEW = [
    poem("poem-dengguanquelou", "登鹳雀楼", "王之涣", "climb", ["白日依山尽", "黄河入海流", "欲穷千里目", "更上一层楼"]),
    poem("poem-minnong-1", "悯农（其一）", "李绅", "labor", ["春种一粒粟", "秋收万颗子", "四海无闲田", "农夫犹饿死"]),
    poem("poem-gulangyuexing", "古朗月行", "李白", "moon", ["小时不识月", "呼作白玉盘", "又疑瑶台镜", "飞在青云端"]),
    poem("poem-feng", "风", "李峤", "nature", ["解落三秋叶", "能开二月花", "过江千尺浪", "入竹万竿斜"]),
    poem("poem-shancun", "山村咏怀", "邵雍", "numbers", ["一去二三里", "烟村四五家", "亭台六七座", "八九十枝花"]),
    poem("poem-chishang", "池上", "白居易", "summer", ["小娃撑小艇", "偷采白莲回", "不解藏踪迹", "浮萍一道开"]),
    poem("poem-hua", "画", "王维", "art", ["远看山有色", "近听水无声", "春去花还在", "人来鸟不惊"]),
    poem("poem-jiangnan", "江南", "汉乐府", "lotus", ["江南可采莲", "莲叶何田田", "鱼戏莲叶间", "鱼戏莲叶东", "鱼戏莲叶西", "鱼戏莲叶南", "鱼戏莲叶北"]),
    poem("poem-chilege", "敕勒歌", "北朝民歌", "grassland", ["敕勒川阴山下", "天似穹庐笼盖四野", "天苍苍野茫茫", "风吹草低见牛羊"]),
    poem("poem-cao", "草", "白居易", "spring", ["离离原上草", "一岁一枯荣", "野火烧不尽", "春风吹又生"]),
    poem("poem-wanglu", "望庐山瀑布", "李白", "waterfall", ["日照香炉生紫烟", "遥看瀑布挂前川", "飞流直下三千尺", "疑是银河落九天"]),
    poem("poem-zaofa", "早发白帝城", "李白", "river", ["朝辞白帝彩云间", "千里江陵一日还", "两岸猿声啼不住", "轻舟已过万重山"]),
    poem("poem-wangtianmen", "望天门山", "李白", "mountain", ["天门中断楚江开", "碧水东流至此回", "两岸青山相对出", "孤帆一片日边来"]),
    poem("poem-biedongda", "别董大", "高适", "friendship", ["千里黄云白日曛", "北风吹雁雪纷纷", "莫愁前路无知己", "天下谁人不识君"]),
    poem("poem-jueju", "绝句", "杜甫", "spring", ["两个黄鹂鸣翠柳", "一行白鹭上青天", "窗含西岭千秋雪", "门泊东吴万里船"]),
    poem("poem-jiangxue", "江雪", "柳宗元", "winter", ["千山鸟飞绝", "万径人踪灭", "孤舟蓑笠翁", "独钓寒江雪"]),
    poem("poem-xunyinzhe", "寻隐者不遇", "贾岛", "mountain", ["松下问童子", "言师采药去", "只在此山中", "云深不知处"]),
    poem("poem-fengqiao", "枫桥夜泊", "张继", "night", ["月落乌啼霜满天", "江枫渔火对愁眠", "姑苏城外寒山寺", "夜半钟声到客船"]),
    poem("poem-chusai", "出塞", "王昌龄", "frontier", ["秦时明月汉时关", "万里长征人未还", "但使龙城飞将在", "不教胡马度阴山"]),
    poem("poem-liangzhou", "凉州词", "王之涣", "frontier", ["黄河远上白云间", "一片孤城万仞山", "羌笛何须怨杨柳", "春风不度玉门关"]),
    poem("poem-jiuyuejiuri", "九月九日忆山东兄弟", "王维", "family", ["独在异乡为异客", "每逢佳节倍思亲", "遥知兄弟登高处", "遍插茱萸少一人"]),
    poem("poem-huixiang", "回乡偶书", "贺知章", "home", ["少小离家老大回", "乡音无改鬓毛衰", "儿童相见不相识", "笑问客从何处来"]),
    poem("poem-xiaoerchuidiao", "小儿垂钓", "胡令能", "child", ["蓬头稚子学垂纶", "侧坐莓苔草映身", "路人借问遥招手", "怕得鱼惊不应人"]),
    poem("poem-suojian", "所见", "袁枚", "child", ["牧童骑黄牛", "歌声振林樾", "意欲捕鸣蝉", "忽然闭口立"]),
    poem("poem-meihua", "梅花", "王安石", "winter", ["墙角数枝梅", "凌寒独自开", "遥知不是雪", "为有暗香来"]),
    poem("poem-yuanri", "元日", "王安石", "festival", ["爆竹声中一岁除", "春风送暖入屠苏", "千门万户曈曈日", "总把新桃换旧符"]),
]

added = [item for item in NEW if item["id"] not in existing_ids]
bank = EXISTING + added
path.write_text(json.dumps(bank, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"wrote {len(bank)} poems ({len(added)} new) -> {path}")
