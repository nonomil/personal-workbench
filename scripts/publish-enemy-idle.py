# -*- coding: utf-8 -*-
from pathlib import Path
import runpy
import sys

SRC = Path(r"C:\Users\No'mi'l\.cursor\projects\g-StudyCode\assets")
script = Path(__file__).resolve().parent / "align-enemy-frames.py"
sys.argv = [str(script), str(SRC), "slime-idle", "shroom-idle"]
runpy.run_path(str(script), run_name="__main__")
