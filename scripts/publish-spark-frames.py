# -*- coding: utf-8 -*-
from pathlib import Path
import runpy
import sys

SRC = Path(r"C:\Users\No'mi'l\.cursor\projects\g-StudyCode\assets")
sys.argv = [str(Path(__file__).resolve().parent / "align-spark-frames.py"), str(SRC)]
runpy.run_path(sys.argv[0], run_name="__main__")
