# 知识花园保卫战

独立横屏学习塔防原型。植物自动防守，普通敌人被击退后掉落一张学习卡；战场安全暂停，完成 10 张后开启最终波。

## 运行

从仓库根目录启动静态服务：

```powershell
python -m http.server 18765 --bind 127.0.0.1 --directory prj
```

浏览器打开：

```text
http://127.0.0.1:18765/games/learning-defense/
```

工作台入口位于“植物大战”页面，按钮名称为“知识花园 · 10 张卡”。

## 目录

- `core/learning-gate.js`：学习闸门和最终波状态机，禁止未完成 10 张卡提前胜利。
- `core/runtime.js`：可暂停时钟、同帧冻结和答题写入重试。
- `data/cards.js`：首版 5 张汉字卡和 5 张英语卡。
- `assets/reused/`：MVP 隔离复用资产。
- `assets/asset-manifest.json`：来源、用途和 SHA256。
- `docs/design.md`：玩法、布局、发音和阶段范围。
- `docs/asset-plan.md`：原创美术替换合同。
- `docs/visual-review.md`：多尺寸视觉验收。

## 测试

```powershell
node --test tests/learning-defense.test.mjs
```

独立页面只需加载共享 bridge 即可写回汉字和英语掌握度；课程页专用全局对象不存在时，bridge 会使用兼容的本地掌握度结构，不修改 `dailyPlans`。
