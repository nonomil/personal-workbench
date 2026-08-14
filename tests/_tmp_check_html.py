from pathlib import Path
import sys
import re
p = Path(sys.argv[1])
t = p.read_text(encoding="utf-8")
print("css", re.search(r"preschool-workbench\.css\?v=[^\"']+", t).group(0))
print("app", re.search(r"app\.js\?v=[^\"']+", t).group(0))
m = re.search(r"script src=\"[^\"]*world\.js[^\"]*\"", t)
print("world", m.group(0) if m else "MISSING")
m = re.search(r"script src=\"[^\"]*workshop\.js[^\"]*\"", t)
print("workshop", m.group(0) if m else "MISSING")
