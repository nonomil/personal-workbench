from pathlib import Path
import json

root = Path(__file__).resolve().parents[1]
prj = root / "prj"
levels = json.loads((prj / "data" / "preschool" / "levels.json").read_text(encoding="utf-8"))

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


def is_schema_v1(bank):
    return bool(bank) and isinstance(bank[0], dict) and ("media" in bank[0] or bank[0].get("kind"))


def build_english():
    path = prj / "data" / "preschool" / "英语" / "vocabulary-bank.json"
    bank = json.loads(path.read_text(encoding="utf-8"))
    rules = json.loads((prj / "data" / "preschool" / "英语" / "review-rules.json").read_text(encoding="utf-8"))
    write_data_js("PersonalWorkbenchEnglishVocabData", {"bank": bank, "reviewRules": rules, "levels": levels, "schemaVersion": 1 if is_schema_v1(bank) else 0}, "preschool-english-vocab-data.js")
    print("english words", len(bank), "schema", "v1" if is_schema_v1(bank) else "legacy")
    mc_path = prj / "data" / "preschool" / "英语" / "minecraft-bank.json"
    if mc_path.exists():
        mc = json.loads(mc_path.read_text(encoding="utf-8"))
        write_data_js("PersonalWorkbenchMinecraftVocabData", {"bank": mc, "reviewRules": rules, "schemaVersion": 1}, "preschool-minecraft-vocab-data.js")
        print("minecraft words", len(mc))


def build_phonics():
    bank = json.loads((prj / "data" / "preschool" / "english" / "phonics" / "word-bank.json").read_text(encoding="utf-8"))
    letters_path = prj / "data" / "preschool" / "english" / "phonics" / "letter-bank.json"
    letters = json.loads(letters_path.read_text(encoding="utf-8")) if letters_path.exists() else []
    write_data_js("PersonalWorkbenchPhonicsData", {"bank": bank, "letters": letters, "levels": levels}, "preschool-phonics-data.js")


def build_pinyin():
    path = prj / "data" / "preschool" / "识字" / "pinyin-initial-bank.json"
    if not path.exists():
        return
    bank = json.loads(path.read_text(encoding="utf-8"))
    write_data_js("PersonalWorkbenchPinyinData", {"bank": bank, "levels": levels}, "preschool-pinyin-data.js")


def build_poetry():
    bank = json.loads((prj / "data" / "preschool" / "古诗" / "poem-bank.json").read_text(encoding="utf-8"))
    write_data_js("PersonalWorkbenchPoetryData", {"bank": bank, "levels": levels}, "preschool-poetry-data.js")


def build_math():
    bank = json.loads((prj / "data" / "preschool" / "数学" / "problem-bank.json").read_text(encoding="utf-8"))
    write_data_js("PersonalWorkbenchMathBankData", {"bank": bank, "levels": levels}, "preschool-math-data.js")


if __name__ == "__main__":
    write_data_js("PersonalWorkbenchPreschoolLevels", levels, "preschool-levels-data.js")
    build_english()
    build_phonics()
    build_pinyin()
    build_poetry()
    build_math()
