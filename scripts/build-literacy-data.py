from pathlib import Path
import json

root = Path(__file__).resolve().parents[1]
prj = root / "prj"
bank = json.loads((prj / "data" / "preschool" / "识字" / "character-bank.json").read_text(encoding="utf-8"))
rules = json.loads((prj / "data" / "preschool" / "识字" / "review-rules.json").read_text(encoding="utf-8"))
payload = {"bank": bank, "reviewRules": rules}
body = json.dumps(payload, ensure_ascii=False)
js = (
    "(function (global) {\n"
    "    'use strict';\n"
    "    global.PersonalWorkbenchLiteracyData = "
    + body
    + ";\n"
    "})(typeof window !== 'undefined' ? window : globalThis);\n"
)
out = prj / "preschool-literacy-data.js"
out.write_text(js, encoding="utf-8")
print(out, out.stat().st_size)
