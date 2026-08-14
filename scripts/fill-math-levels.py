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
    item = by_id[f"math-problem-{index:02d}"]
    item["skillId"] = "addition" if op == "+" else "take-away"
    item["level"] = "L3"
    item["left"] = left
    item["right"] = right
    item["op"] = op
    item["answer"] = answer
    item["prompt"] = f"{left} {op} {right} = ?"

path.write_text(json.dumps(bank, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("updated", path)
