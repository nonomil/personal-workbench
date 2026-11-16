# MVP 横屏视觉验收

## 已检查尺寸

| 视口 | 文档尺寸 | 结果 |
|---|---:|---|
| 800×360 | 800×360 | 无横向/纵向溢出 |
| 915×412 | 915×412 | 无横向/纵向溢出 |
| 1280×800 | 1280×800 | 无横向/纵向溢出 |
| 412×915 | 412×915 | 旋转提示完整覆盖 |

800×360 战斗页分配：HUD 53px、战场 239px、植物栏 68px。学习卡为 720×248，错误纠正状态增高到约 254px，仍完整位于视口内。

## 截图

### 开场

![开场界面](./screenshots/learning-defense-start-800x360.png)

### 战斗

![战斗界面](./screenshots/learning-defense-battle-800x360.png)

### 学习卡

![学习卡界面](./screenshots/learning-defense-card-800x360.png)

### 错误纠正

![错误纠正界面](./screenshots/learning-defense-correction-800x360.png)

## 视觉结论

- 开场采用完整场景插画，不使用工作台侧栏。
- 战场是最大视觉主体，HUD 和植物栏保持单行。
- 学习卡使用左侧大字、右侧三张图片的矮横屏结构。
- 学习时有半透明安全罩，能明确表达“战斗被冻结”。
- 选项和纠错按钮均满足移动端触控尺寸。

## MuMu APK 实机链路

最终 debug APK 在 3200×1400 横屏 MuMu 中完成了真实点击链路：启动页 → 植物僵尸工作台 → 植物大战选择页 → 知识花园开场 → 战斗 → 第一张学习卡。全程没有纵向滚动。

### 双游戏选择页

![MuMu 中的经典花园与知识花园入口](./screenshots/mumu-learning-defense-entry-20260825.png)

### 新游戏开场

![MuMu 中的知识花园开场](./screenshots/mumu-learning-defense-start-20260825.png)

### 全屏战斗

![MuMu 中的全屏战斗](./screenshots/mumu-learning-defense-battle-20260825.png)

### 学习安全罩

![MuMu 中掉落的学习卡](./screenshots/mumu-learning-defense-card-20260825.png)
