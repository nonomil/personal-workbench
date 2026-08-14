# Open Source Phonics 选定资料

本目录只保存已经确认授权方向、且与当前“短测验 + 阳光奖励”目标直接相关的少量原始资料，不进入运行时课程目录。

来源项目： [Open Source Phonics](https://www.opensourcephonics.org/)

官方授权： [Terms of Use](https://www.opensourcephonics.org/terms-of-use/) 明确采用 `CC BY-NC-SA 4.0`。允许非商业使用、改编和再发布；必须署名、说明修改，并对改编版本采用相同许可。

当前下载前 3 个基础 lesson PDF 和一份合并练习册，作为家长/开发者核对材料：

- Lesson 1：`a/m/t`
- Lesson 2：`f`
- Lesson 3：`b`
- 合并练习册：Lesson 1-120，适合按需打印对应页，不改造成绘本或运行时课程。

工作台运行时不复制 PDF 内容，也不依赖 PDF 才能完成测验。幼儿端只显示 3 张原创测验卡，完成后复用现有 `courseProgress.completedLessonIds` 和阳光奖励链路。

从合并练习册提取的 `data/preschool/english/phonics/reference-bank.json` 是独立的 `reference-only` 素材库：按 120 节保存规则焦点、目标模式、练习词、阅读/听写短句、高频词、页码和原创题型模板。它保留必要的 CC BY-NC-SA 署名与修改说明，不替代已有 60 日运行课程数据；网页仅把前三节作为来源对齐记录，题目仍使用工作台自己的原创配置。

提取脚本：`scripts/extract-open-source-phonics-reference.py`。重新生成前需要工作区 Python 环境中的 `pdfplumber`，并核对生成文件的 `status`、节数、页码和许可证字段。

## 文件清单

| 文件 | 原始 URL | 用途 |
| --- | --- | --- |
| `amt-Lesson-1.pdf` | https://www.opensourcephonics.org/wp-content/uploads/2021/08/amt-Lesson-1.pdf | 第一张测验卡的教师核对资料 |
| `f-LESSON-2.pdf` | https://www.opensourcephonics.org/wp-content/uploads/2021/08/f-LESSON-2.pdf | 第二张测验卡的教师核对资料 |
| `b-Lesson-3.pdf` | https://www.opensourcephonics.org/wp-content/uploads/2021/08/b-Lesson-3.pdf | 第三张测验卡的教师核对资料 |
| `all-1-120-lessons.pdf` | https://www.opensourcephonics.org/wp-content/uploads/2021/09/all-1-120-lessons-8-31.pdf | 通用打印练习册；reference-only，不进入运行时 |
| `source-page.html` | https://www.opensourcephonics.org/120-lessons/ | 课程序列来源快照 |
| `license-page.html` | https://www.opensourcephonics.org/terms-of-use/ | 授权证据快照 |
| `data/preschool/english/phonics/reference-bank.json` | 由合并练习册提取 | reference-only 单词/题型素材库，不是商业教材替代品 |

下载日期：2026-08-03

合并练习册 SHA-256：`DBF4C56204580641E8A03F6CFB999E8F56635873B6CCFBEEB5EC9207EF49C499`
