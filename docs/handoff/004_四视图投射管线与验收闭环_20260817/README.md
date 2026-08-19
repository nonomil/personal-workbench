# 004 · 四视图投射管线与验收闭环（2026-08-17）

> 完整度模式：完整（含方法、调试经验、验收证据、下一步）
> 类型：A 普通任务交接（无异常升级）

## 当前目标与已完成边界

**目标**：解决"GPT 四视图好看、但 img2threejs 手写盒子模型难看"的流程断层，
打通"图 → 模型"的机械化通道，并建立可复用的验收闭环。

**已完成（已验证，125/125 单测通过）**：

- 新管线跑通：四视图 → `fourview-to-atlas.py` 按 cuboid 规格机械切片 →
  贴图集 PNG + manifest JS → `fourViewModel.js` 建盒重写 UV → three.js 模型。
- **村民、铁傀儡**两个试点通过四向对比验收（正/右/后/左逐格对齐参考图），
  已接入 `review-roster.html` 和 `index.html`（游戏运行时）。
- 验收闭环建立：`compare-four-view.html` 正交四向渲染 vs 参考图并排，
  本次靠它连抓 6 个问题并全部修掉。
- 工具包文档已更新到 v1.4.1（含验收门 + 8 条调试经验）。

**未完成**：

- 猪/牛/羊/鸡/狼 5 只动物还在旧的 `hideMat/faceOf` 程序贴图路线，未迁移到
  atlas 管线（specs.json 里规格已备好，跑两条命令即可生成图集）。
- 顶面/底面是均色平涂；被遮挡侧面靠镜像/正面兜底（见局限）。
- 对比页目前靠人眼+截图验收，未做像素级自动指标（轮廓 IoU 等）。

## 关键产物路径（建议按序阅读）

1. `docs/handoff/004_四视图投射管线与验收闭环_20260817/背景上下文/关键发现.md` —— 断层诊断 + 方法结论
2. `docs/handoff/004_四视图投射管线与验收闭环_20260817/技术分析/解决方案.md` —— 管线细节 + 8 条调试经验
3. `docs/handoff/004_四视图投射管线与验收闭环_20260817/行动项/下一步行动.md` —— 接手后第一步
4. 代码：
   - `prj/games/blocklegend/tools/fourview-to-atlas.py`（核心编译器，~300 行）
   - `prj/games/blocklegend/assets/img2threejs/fourViewModel.js`（运行时构建器）
   - `prj/games/blocklegend/compare-four-view.html`（验收页）
   - `prj/assets/generated/blocklegend-roster/four-view/specs.json`（7 个角色的 cuboid 规格）
5. 证据：`prj/assets/generated/blocklegend-roster/review/{golem,villager}-4view-compare.png`
6. 外部文档：`G:\StudyCode\小游戏项目\docs\游戏资产开发工具\文档\体素角色管线调研-2026-08.md`（调研 + 已验证落地章节）

## 禁区（不要碰的口径/路线）

- **不要**用通用 image-to-3D（TRELLIS/Hunyuan3D/TripoSR/Meshy）产出体素运行时
  资产——出的是平滑网格不是方块脸，且 blocklegend `PROMPTS.md` 明令禁止。
- **不要**回到"人眼看图手写盒子坐标 + 程序噪点贴图"的老路。
- **不要**单角度验收模型；必须走四向对比门。
- GPT 四视图**不作废**：它是 identity/验收参考，下游必须是机械投射。
- 已否决：对大面积贴花（藤蔓）做遮挡剥离（第 7 轮试过，胸甲变白板，已回退为
  只剥离凸出 >1.2px 的部件）。

## 接手确认协议

接手者先用自己的话复述：① 断层是什么 ② 管线四步 ③ 验收门是什么 ④ 下一跳
是什么，经用户确认后再动手。不要跳过复述直接改代码。

## 回溯入口

- **本会话 transcript**（终极回溯，禁止整读，用 rg 定位 + 小窗口读取）：
  `C:\Users\No'mi'l\.cursor\projects\g-StudyCode\agent-transcripts\07c1fc27-aada-47db-b39d-8a26a295e5ec\07c1fc27-aada-47db-b39d-8a26a295e5ec.jsonl`
- 凝蜕状态：本仓库无 `.claude/state/`，不适用；以本交接包为准。
- 历史交接：`docs/handoff/003_blocklegend-视觉调试交接_20260815/`（上一轮视觉工作背景）

## 下一跳建议（接手者第一步）

把 5 只动物迁移到 atlas 管线（预计半小时内）：

```powershell
cd g:\StudyCode\个人工作台
python prj/games/blocklegend/tools/fourview-to-atlas.py --model pig
python prj/games/blocklegend/tools/fourview-to-atlas.py --model cow
python prj/games/blocklegend/tools/fourview-to-atlas.py --model sheep
python prj/games/blocklegend/tools/fourview-to-atlas.py --model chicken
python prj/games/blocklegend/tools/fourview-to-atlas.py --model wolf
```

然后照村民的样子在 `createProps3d.js` 各 create 函数头部加 `BlockLegendFourView.build`
委托，把 atlas js 加进两个 html，打开 `compare-four-view.html`（把动物加进 MODELS
数组）走验收门。注意四足动物的"前"是 +z 头朝向，视图语义与人形一致。
