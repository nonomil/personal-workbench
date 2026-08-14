from pathlib import Path
import json

root = Path(__file__).resolve().parents[1]
path = root / "prj" / "data" / "preschool" / "数学" / "problem-bank.json"
bank = json.loads(path.read_text(encoding="utf-8"))
by_id = {item["id"]: item for item in bank}

L2 = [
    (2, 5),
    (1, 4),
    (6, 3),
    (8, 2),
    (4, 7),
    (9, 1),
    (3, 8),
    (5, 2),
    (7, 4),
    (2, 9),
]
L3 = [
    (3, 2, "+", 5),
    (4, 5, "+", 9),
    (8, 3, "-", 5),
    (6, 4, "+", 10),
    (9, 4, "-", 5),
    (8, 7, "+", 15),
    (12, 5, "-", 7),
    (9, 6, "+", 15),
    (11, 4, "-", 7),
    (10, 3, "-", 7),
]
L4 = [
    (5, 1, "-", 4),
    (5, 2, "-", 3),
    (5, 3, "-", 2),
    (4, 1, "-", 3),
    (4, 2, "-", 2),
    (3, 1, "-", 2),
    (5, 4, "-", 1),
    (4, 3, "-", 1),
    (5, 0, "-", 5),
    (3, 2, "-", 1),
]
L5 = [
    (6, 3, "+", 9),
    (7, 2, "+", 9),
    (5, 5, "+", 10),
    (8, 2, "+", 10),
    (9, 1, "+", 10),
    (10, 4, "-", 6),
    (9, 3, "-", 6),
    (8, 5, "-", 3),
    (7, 4, "-", 3),
    (10, 6, "-", 4),
]

SOURCE = {
    "kind": "project-original",
    "license": "project-original",
    "attribution": "个人工作台幼儿课程组",
}


def upsert_arithmetic(index, left, right, op, answer, level):
    item_id = f"math-problem-{index:02d}"
    item = by_id.get(item_id) or {
        "id": item_id,
        "manipulatives": ["sun-token", "fruit", "plant"],
        "source": SOURCE,
    }
    item["skillId"] = "addition" if op == "+" else "take-away"
    item["level"] = level
    item["left"] = left
    item["right"] = right
    item["op"] = op
    item["answer"] = answer
    item["prompt"] = f"{left} {op} {right} = ?"
    by_id[item_id] = item

for index, (left, right) in enumerate(L2, start=11):
    item = by_id[f"math-problem-{index:02d}"]
    item["skillId"] = "compare"
    item["level"] = "L2"
    item["left"] = left
    item["right"] = right
    item["op"] = ""
    item["answer"] = max(left, right)
    item["prompt"] = "哪边太阳更多？"

for index, (left, right, op, answer) in enumerate(L3, start=21):
    upsert_arithmetic(index, left, right, op, answer, "L3")

for index, (left, right, op, answer) in enumerate(L4, start=31):
    upsert_arithmetic(index, left, right, op, answer, "L4")

for index, (left, right, op, answer) in enumerate(L5, start=41):
    upsert_arithmetic(index, left, right, op, answer, "L5")

ordered = []
for index in range(1, 51):
    item = by_id.get(f"math-problem-{index:02d}")
    if item:
        ordered.append(item)

path.write_text(json.dumps(ordered, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("updated", path, "count", len(ordered))
