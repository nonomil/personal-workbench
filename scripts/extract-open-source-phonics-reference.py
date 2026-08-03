from pathlib import Path
import json
import re

import pdfplumber


ROOT = Path(__file__).resolve().parents[1]
SOURCE_PDF = ROOT / "docs" / "自然拼读" / "research" / "resources" / "open-source-phonics" / "all-1-120-lessons.pdf"
OUTPUT = ROOT / "data" / "preschool" / "english" / "phonics" / "reference-bank.json"

LESSON_RE = re.compile(r"^LESSON\s+(\d+)$", re.IGNORECASE)
PATTERN_RE = re.compile(r"([A-Za-z][A-Za-z-]*(?:/[A-Za-z])?|-[A-Za-z]+)\s*\(")
WORD_RE = re.compile(r"\b[A-Za-z][A-Za-z'-]*\b")
SECTION_MARKERS = (
    "introduce ",
    "have the student ",
    "make the sound",
    "review ",
    "warm up",
    "new material:",
    "words to read",
    "the student ",
    "student view",
    "practice ",
    "writing ",
    "explain ",
    "tell the student",
    "ask the student",
    "read aloud",
)

SECTION_STOP_RE = re.compile(
    r"^(?:introduce the new high-frequency|have the student|"
    r"student view|choose any of the stories|do a|words to read|lesson\s+\d+|review the material)",
    re.IGNORECASE,
)
FOOTNOTE_RE = re.compile(r"^\d+\s")
REFERENCE_NOISE_WORDS = {
    "already", "decodable", "irregular", "making", "read", "sound", "student",
    "words", "write",
}


def clean_words(lines, limit=36):
    words = []
    seen = set()
    for line in lines:
        for value in WORD_RE.findall(line.lower()):
            value = value.strip("'-")
            if len(value) < 2 or value in REFERENCE_NOISE_WORDS:
                continue
            if value not in seen:
                seen.add(value)
                words.append(value)
            if len(words) >= limit:
                return words
    return words


def extract_section(lines, marker_pattern, limit=48):
    """Return only the source lines belonging to a named practice section."""
    marker = re.compile(marker_pattern, re.IGNORECASE)
    start = next((index for index, line in enumerate(lines) if marker.search(line.strip())), None)
    if start is None:
        return []
    selected = []
    for line in lines[start + 1:]:
        stripped = line.strip()
        if not stripped:
            continue
        if FOOTNOTE_RE.match(stripped) or SECTION_STOP_RE.match(stripped):
            break
        selected.append(stripped)
        if len(selected) >= limit:
            break
    return selected


def clean_section_words(lines, limit=36):
    """Extract tokens from isolated source material, not lesson instructions."""
    words = []
    seen = set()
    for line in lines:
        line = re.sub(r"\d+$", "", line.strip())
        for value in WORD_RE.findall(line.lower()):
            value = value.strip("'-")
            if len(value) < 2 or value in REFERENCE_NOISE_WORDS:
                continue
            if value not in seen:
                seen.add(value)
                words.append(value)
            if len(words) >= limit:
                return words
    return words


def extract_high_frequency_words(lines):
    marker = re.compile(r"pronouncing the word[s]?:", re.IGNORECASE)
    for index, line in enumerate(lines):
        if marker.search(line):
            for candidate in lines[index + 1:index + 3]:
                stripped = candidate.strip()
                if not stripped or FOOTNOTE_RE.match(stripped):
                    break
                return clean_section_words([part.strip() for part in stripped.split(",")], limit=12)
    return []


def normalize_phrases(lines):
    """Join PDF-wrapped sentences while keeping short word-list rows intact."""
    if not any(re.search(r"[.!?][\"”’)]?$", line.strip()) for line in lines):
        return lines[:12]
    phrases = []
    current = []
    for line in lines:
        current.append(line.strip())
        if re.search(r"[.!?][\"”’)]?$", line.strip()):
            phrases.append(" ".join(current))
            current = []
    if current:
        phrases.append(" ".join(current))
    return phrases[:12]


def extract_focus(lines, patterns):
    for index, line in enumerate(lines):
        stripped = line.strip()
        if stripped.lower().startswith("new material:"):
            tail = stripped.split(":", 1)[1].strip()
            if tail:
                return {"kind": "new-material", "text": tail}
            for candidate in lines[index + 1:index + 4]:
                candidate = candidate.strip()
                if candidate and not candidate.startswith("•"):
                    return {"kind": "new-material", "text": candidate}
        if "(as in" in stripped.lower() and patterns:
            return {"kind": "sound-spelling", "text": stripped}
        if "which makes" in stripped.lower() and patterns:
            return {"kind": "sound-spelling", "text": stripped}
    if patterns:
        return {"kind": "sound-spelling", "text": patterns[0]}
    return {"kind": "review-or-spelling-rule", "text": "本课拼写规则或复习材料"}


def extract_lesson_pages():
    lessons = {}
    current = None
    with pdfplumber.open(SOURCE_PDF) as document:
        for page_number, page in enumerate(document.pages, 1):
            for line in (page.extract_text() or "").splitlines():
                match = LESSON_RE.match(line.strip())
                if match:
                    current = int(match.group(1))
                    lessons.setdefault(current, {"pageStart": page_number, "pageEnd": page_number, "lines": []})
                if current is not None:
                    lessons[current]["pageEnd"] = page_number
                    lessons[current]["lines"].append(line)
    return lessons


def build_record(number, item):
    lines = item["lines"]
    patterns = []
    for line in lines:
        lowered = line.lower()
        if "(as in" not in lowered and "which makes" not in lowered:
            continue
        for pattern in PATTERN_RE.findall(line):
            if pattern not in patterns:
                patterns.append(pattern)

    read_word_lines = extract_section(lines, r"words to read and write|words to read")
    read_phrase_lines = extract_section(lines, r"have the student read")
    dictation_lines = extract_section(lines, r"have the student write from your dictation")
    example_lines = [match.group(1) for line in lines if (match := re.search(r"Examples:\s*(.*)$", line, re.IGNORECASE))]
    read_words = clean_section_words(read_word_lines)
    if not read_words:
        read_words = clean_section_words(read_phrase_lines, limit=24)
    dictation_words = clean_section_words(dictation_lines, limit=24)
    high_frequency_words = extract_high_frequency_words(lines)
    example_words = clean_words(example_lines, limit=24)
    focus = extract_focus(lines, patterns)
    question_templates = []
    if patterns:
        question_templates.append({
            "type": "sound-match",
            "prompt": "听目标音，选出对应的字母或字母组合。",
            "stimulus": patterns[0],
            "source": "project-original-template",
        })
    if read_words:
        question_templates.append({
            "type": "read-word",
            "prompt": "读出一个本课练习词，再选择或说出它。",
            "wordPool": read_words[:6],
            "source": "project-original-template",
        })
    if dictation_words:
        question_templates.append({
            "type": "dictation",
            "prompt": "听写一个本课练习词或短语。",
            "wordPool": dictation_words[:6],
            "source": "project-original-template",
        })
    if not patterns and focus["kind"] == "new-material":
        question_templates.append({
            "type": "rule-match",
            "prompt": "看一看本课规则，选出一个练习词。",
            "stimulus": focus["text"],
            "wordPool": read_words[:6],
            "source": "project-original-template",
        })
    return {
        "id": f"open-source-phonics-lesson-{number:03d}",
        "lesson": number,
        "pageStart": item["pageStart"],
        "pageEnd": item["pageEnd"],
        "focus": focus,
        "patterns": patterns,
        "exampleWords": example_words,
        "readWords": read_words,
        "readPhrases": normalize_phrases(read_phrase_lines),
        "dictationWords": dictation_words,
        "dictationPhrases": normalize_phrases(dictation_lines),
        "highFrequencyWords": high_frequency_words,
        "questionTemplates": question_templates,
        "source": {
            "kind": "open-reference-derived",
            "project": "Open Source Phonics",
            "license": "CC BY-NC-SA 4.0",
            "attribution": "Open Source Phonics",
            "url": "https://www.opensourcephonics.org/120-lessons/",
            "licenseUrl": "https://www.opensourcephonics.org/terms-of-use/",
            "materialUrl": "https://www.opensourcephonics.org/wp-content/uploads/2021/09/all-1-120-lessons-8-31.pdf",
            "derivation": "Only selected word tokens and original question templates are retained; source prose and page layout are not copied.",
        },
    }


def main():
    source_lessons = extract_lesson_pages()
    records = [build_record(number, source_lessons[number]) for number in sorted(source_lessons)]
    payload = {
        "id": "open-source-phonics-reference-bank",
        "version": 1,
        "status": "reference-only",
        "description": "从 Open Source Phonics 120 节打印练习册提取的目标模式、练习词和原创题型模板。",
        "source": records[0]["source"] | {"lessonCount": len(records)},
        "lessons": records,
    }
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(OUTPUT), "lessons": len(records), "bytes": OUTPUT.stat().st_size}, ensure_ascii=False))


if __name__ == "__main__":
    main()
