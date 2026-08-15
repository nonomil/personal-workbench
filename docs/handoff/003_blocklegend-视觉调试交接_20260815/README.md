# 003 · BlockLegend 视觉翻新二期 + 未解渲染 bug 交接

> 日期：2026-08-15 深夜
> 前置：002（S1–S6 完整功能交付），本会话聚焦视觉翻新

## 本会话已完成

| 改动 | 文件 | 要点 |
|---|---|---|
| 怪物 3D 模型翻新 | `mobs.js`（~400 行，纯程序化零外部资产） | `faceTexture(kind)` 16×16 像素脸贴图（史莱姆绿果冻+红眼、方块兽橙+暗眼+喙、尸壳灰+红眼、Boss 紫大角、商人粉+连眉）；`create(kind)` 多部件 Group（身体/头/眼/腿）；`createViewModel()` 第一人称手臂+剑 |
| game.js 接线 | `game.js` | spawnMonster→MOBS.create；killMonster→MOBS.spawnBurst 粒子爆炸；词卡→MOBS.spawnDamageText 3D 伤害数字；bolt→MOBS.boltMesh 发光体；coin→MOBS.coinMesh 旋转金圆柱；merchant→MOBS.create('merchant') |
| 受击/死亡/回血 | `game.js` + `game.css` + `index.html` | `.bl-hurt` 边缘红闪 overlay；hurtFlash() / respawn()（回出生点+满血+连击清零+绿色粒子）；脱战 4s 回血 0.25/s；删旧 DOM #dmg-pop |
| 接触距离修正 | `data/combat.js` L19 | CONTACT_RANGE 1.15→1.7（旧值低于相机半视场角，贴身怪掉出画面不可见） |
| 调试设施 | `game.js` | `?facemob` 镜头每帧锁最近怪；`?facemob=merchant` 锁商人；`__blDebug.info`（calls/triangles/sceneChildren/sceneGroups） |
| 缓存戳 | `index.html` | look3→look7（多次强制刷新，最终保留 look7） |
| 测试 | `tests/blocklegend.test.mjs` | 38/38 绿（含原有 14 + 并行会话补充）；`npm test` 无新增失败 |

## 未解 Bug（阻塞验收）——**下个会话首查**

### 症状
7 张浏览器截图（不同 yaw/pitch 组合、含 ?facemob 自动锁定）经视觉模型判读**均看不到任何怪物/商人**。地形、树、花、云、右下手臂剑均正常。

### 已排除
- mesh 不在场景：`__blDebug.info` = 32 calls / 12824 tris / sceneChildren 120 / sceneGroups 4（含 3 怪+商人）
- mesh 不可见：`.visible = true`
- 坐标错位：`mesh.position` 与逻辑坐标 (x,y=4,z) 同步
- 镜头没对准：yaw/pitch 精确锁定 atan2(目标-玩家)，数值验证一致
- 缓存旧代码：`__blErr` 空，hp 动态变化，respawn 新逻辑生效
- draw call 吞没：triangles 数合理（地形主占），非怪物被裁剪后 call 归零

### 待查方向（优先级排序）
1. **怪物 Y=4 可能浮在空中高于地形**——engine 高度图平均值约 4–6，mesh.position.y 硬编码为 5/4 可能与实际地形不平，浮在树冠之上或陷入地面。**下会话先打印 engine.world.surfaceAt(monster.x, monster.z) 对比 mesh.position.y**
2. **怪物 Group 被 frustum cull 但 bbox 未更新**——THREE.js Group 的 frustum culling 依赖 children 的 boundingBox/sphere；如果子 mesh 没有手动 computeBoundingSphere，Group 级 bbox 可能为零球，永远被裁。**修法：`group.children.forEach(c => c.geometry.computeBoundingSphere())` 或 `group.frustumCulled = false`**
3. **material transparent/side 配置导致怪物在相机前方被地形 depth-test 遮挡**——检查怪物 MeshBasicMaterial 的 `transparent: true, opacity < 1` 与地形 MeshLambertMaterial 的 depthWrite 交互
4. **engine.js world 的地形 chunk mesh 把怪物 z-buffer 盖掉了**——如果地形最后渲染且 depthTest=true，半透明怪物会被完全遮挡

### 推荐快速验证
```js
// 在浏览器 console 逐行跑：
const m = __blDebug.session.monsters[0];
m.mesh.frustumCulled = false;
// 刷新一帧后截图看是否出现
```
如果 `frustumCulled = false` 后怪物出现 → 根因是方向 2。
如果仍不可见 → 打方向 1（Y 坐标）和方向 3（材质深度）。

## 文件清单

### 游戏本体
```
prj/games/blocklegend/
  index.html          # 入口（mobs.js + game.js，缓存戳 look7）
  game.js              # 主游戏逻辑 IIFE（含 ?facemob 调试）
  game.css             # HUD + .bl-hurt 伤害 overlay
  engine.js            # 48×48 高度图世界 + 第一人称控制
  mobs.js              # 程序化 3D 模型 + 粒子效果（本会话新增）
  data/
    combat.js           # 战斗纯函数（CONTACT_RANGE=1.7）
    words.js            # 词池 + 四选一
    levels.js           # 关卡 + Boss 盾状态机
  vendor/
    three.min.js        # r147 UMD（本地）
    LICENSE
    VERSION.txt
```

### 文档 & 测试
```
docs/plans/T20260815-blocklegend-3d/
  README.md
  task.md
  requirements-checklist.md
  steps.md
  acceptance.md
  test-plan.md
  test-report.md       # 已更新视觉翻新二期记录

docs/handoff/
  002_blocklegend-S1交接_20260815/README.md
  003_blocklegend-视觉调试交接_20260815/README.md   # ← 本文件

tests/blocklegend.test.mjs   # 38/38 绿
```

## 快速复现

```bash
cd "G:\StudyCode\个人工作台"
npx -y http-server -p 4196 -s
# 浏览器打开 http://127.0.0.1:4196/prj/games/blocklegend/index.html?v=look7&facemob
# 等 8 秒怪物生成后截图 → 预期可见怪物但实际不可见
```
