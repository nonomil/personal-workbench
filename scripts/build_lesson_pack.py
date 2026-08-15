# Compile 60-day lesson JSON into a compact runtime pack.
from pathlib import Path
import json

root = Path(__file__).resolve().parents[1]
data = root / "prj" / "data" / "preschool"

FOCUS_HINTS = (
    "focus", "find", "memory", "listen", "same", "attention",
    "route-memory", "two-step", "instruction", "schulte", "pattern",
    "spot", "stroop",
)
MOVE_HINTS = (
    "movement", "walk", "stretch", "clap", "jump", "throw", "catch",
    "balance", "rhythm", "stop-go", "direction", "run", "skip", "squat",
    "coordination", "slow-walk", "soft-throw", "obstacle",
)


def compact_steps(lesson):
    steps = lesson.get("fourSteps") or {}
    return {
        "warmup": str(steps.get("warmup") or ""),
        "teach": str(steps.get("teach") or ""),
        "practice": str(steps.get("practice") or ""),
        "apply": str(steps.get("apply") or ""),
    }


def compact(lesson):
    activity = lesson.get("activity") or {}
    options = [str(item) for item in (activity.get("options") or []) if str(item).strip()]
    answer = activity.get("answer")
    steps = compact_steps(lesson)
    return {
        "id": lesson["id"],
        "title": lesson["title"],
        "day": int(lesson.get("day") or 0),
        "minutes": int(lesson.get("durationMin") or 8),
        "activityType": str(lesson.get("activityType") or ""),
        "prompt": str(activity.get("prompt") or lesson.get("title") or ""),
        "options": options,
        "answer": answer if isinstance(answer, int) else None,
        "success": str(activity.get("success") or "完成一次尝试，花园收到一束阳光。"),
        "tip": str(steps.get("practice") or lesson.get("objective") or ""),
        "fourSteps": steps,
        "evidence": [str(item) for item in (lesson.get("evidence") or []) if str(item).strip()],
        "reviewTags": list(lesson.get("reviewTags") or []),
    }


def is_focus(row):
    blob = " ".join([row["activityType"]] + row["reviewTags"]).lower()
    if any(hint in blob for hint in FOCUS_HINTS):
        return True
    if any(hint in blob for hint in MOVE_HINTS):
        return False
    return "focus" in blob


def load_lessons(folder):
    path = data / folder / "lessons.json"
    return [compact(item) for item in json.loads(path.read_text(encoding="utf-8"))]


def compact_phonics(lesson):
    examples = [str(item) for item in (lesson.get("examples") or []) if str(item).strip()]
    return {
        "id": lesson["id"],
        "title": lesson["title"],
        "day": int(lesson.get("day") or 0),
        "minutes": int(lesson.get("durationMin") or 8),
        "activityType": str(lesson.get("activityType") or ""),
        "prompt": str(lesson.get("objective") or lesson.get("title") or ""),
        "examples": examples,
        "success": "拼对啦！",
        "tip": str(lesson.get("objective") or "先听，再选。"),
        "reviewTags": list(lesson.get("reviewPatterns") or []),
    }


def load_phonics():
    path = data / "english" / "phonics" / "lessons.json"
    return [compact_phonics(item) for item in json.loads(path.read_text(encoding="utf-8"))]


def load_motion():
    path = data / "运动与专注" / "motion-bank.json"
    extra = [
        {"id": "motion-13", "name": "开合跳", "type": "movement", "durationSec": 30, "safety": ["成人在旁", "地面清空"]},
        {"id": "motion-14", "name": "深蹲", "type": "movement", "durationSec": 30, "safety": ["成人在旁", "膝盖不要内扣"]},
        {"id": "motion-15", "name": "原地跑", "type": "movement", "durationSec": 30, "safety": ["成人在旁", "脚下留空"]},
        {"id": "motion-16", "name": "高抬腿", "type": "movement", "durationSec": 30, "safety": ["成人在旁", "扶墙也可以"]},
    ]
    bank = json.loads(path.read_text(encoding="utf-8"))
    have = {item["id"] for item in bank}
    for item in extra:
        if item["id"] not in have:
            item["source"] = {"kind": "project-original", "license": "project-original", "attribution": "个人工作台幼儿课程组"}
            bank.append(item)
    path.write_text(json.dumps(bank, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return [
        {
            "id": item["id"],
            "name": item["name"],
            "type": item.get("type") or "movement",
            "durationSec": int(item.get("durationSec") or 45),
            "safety": list(item.get("safety") or ["成人在旁"]),
            "level": str(item.get("level") or "L1"),
        }
        for item in bank
    ]


hanzi = load_lessons("识字")
math = load_lessons("数学")
english = load_lessons("英语")
poetry = load_lessons("古诗")
phonics = load_phonics()
motion_days = load_lessons("运动与专注")
motion_bank = load_motion()
focus_days = [row for row in motion_days if is_focus(row)]
move_days = [row for row in motion_days if not is_focus(row)]

payload = {
    "hanzi": hanzi,
    "math": math,
    "english": english,
    "poetry": poetry,
    "phonics": phonics,
    "focusDays": focus_days,
    "moveDays": move_days,
    "motionBank": motion_bank,
}

out = root / "prj" / "preschool-lesson-pack-data.js"
body = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
out.write_text(
    "(function (global) {\n    'use strict';\n    global.PersonalWorkbenchLessonPackData = "
    + body
    + ";\n})(typeof window !== 'undefined' ? window : globalThis);\n",
    encoding="utf-8",
)
print(
    "pack",
    len(hanzi),
    len(math),
    len(english),
    "poetry",
    len(poetry),
    "phonics",
    len(phonics),
    "focusDays",
    len(focus_days),
    "moveDays",
    len(move_days),
    "motion",
    len(motion_bank),
    "bytes",
    out.stat().st_size,
)
